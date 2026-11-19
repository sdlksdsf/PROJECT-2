#!/usr/bin/env node
/**
 * Posts the useful part of a failed packaging log to the diagnostics issue.
 *
 * CI runners cannot be inspected interactively from an agent sandbox, so when
 * electron-builder fails this turns the tail of its output into a readable
 * GitHub issue comment — much faster than guessing from exit codes.
 *
 * Usage: node tools/report-build-failure.mjs <logfile> <platform label>
 */
import fs from 'node:fs';

const [file = 'package.log', label = 'unknown'] = process.argv.slice(2);
const token = process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN;
const repo = process.env.GITHUB_REPOSITORY;
const runId = process.env.GITHUB_RUN_ID;
const server = process.env.GITHUB_SERVER_URL ?? 'https://github.com';

let text = '';
try {
  text = fs.readFileSync(file, 'utf8');
} catch {
  text = 'no log file was produced by electron-builder';
}

const lines = text.split(/\r?\n/);
const interesting = lines
  .filter((line) => /error|⨯|cannot|cannot find|failed|not found|ENOENT|EACCES|invalid|missing/i.test(line))
  .slice(-30);
const tail = lines.slice(-45).join('\n');

const body = [
  `### ${label} packaging failed`,
  '',
  '**Matching lines**',
  '```',
  interesting.join('\n') || '(none)',
  '```',
  '',
  '**Tail**',
  '```',
  tail,
  '```',
  '',
  runId ? `Run: ${server}/${repo}/actions/runs/${runId}` : ''
].join('\n');

if (!token || !repo) {
  console.log(body);
  process.exit(0);
}

try {
  const res = await fetch(`https://api.github.com/repos/${repo}/issues/1/comments`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token}`,
      accept: 'application/vnd.github+json',
      'content-type': 'application/json',
      'user-agent': 'kimmino-ci'
    },
    body: JSON.stringify({ body: body.slice(0, 60000) })
  });
  console.log(res.ok ? 'reported to issue #1' : `report failed: ${res.status} ${await res.text()}`);
} catch (error) {
  console.log(`report failed: ${error.message}`);
  console.log(body);
}
