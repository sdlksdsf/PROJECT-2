import { app } from 'electron';
import type { KimminoWindow } from './window';
import { logStartup } from './log';

/**
 * End-to-end self-check, run only when `KIMMINO_SMOKE=1`.
 *
 * CI can prove that a window paints, but painting a window says nothing about
 * whether a page loads, whether a tab closes or whether a screenshot is a real
 * image. This drives the actual TabManager the user drives: navigate to the two
 * sites that were reported broken, close a tab, capture the page, and report the
 * memory the running browser is really using.
 */

export function smokeRequested(): boolean {
  return process.env.KIMMINO_SMOKE === '1';
}

interface StepResult {
  name: string;
  ok: boolean;
  detail: string;
}

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

export async function runSmokeTest(win: KimminoWindow): Promise<never> {
  const steps: StepResult[] = [];
  const record = (name: string, ok: boolean, detail = '') => {
    steps.push({ name, ok, detail });
    const line = `SMOKE ${ok ? 'ok  ' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`;
    console.log(line);
    logStartup(line);
  };

  const targets = [
    { name: 'loads www.google.com', url: 'https://www.google.com/', host: 'google.com' },
    { name: 'loads www.youtube.com', url: 'https://www.youtube.com/', host: 'youtube.com' }
  ];

  for (const target of targets) {
    const id = win.tabs.create(target.url, { active: true });
    const outcome = await waitForTab(win, id, 40_000);
    const onTarget = outcome.url.includes(target.host);
    record(target.name, outcome.ok && onTarget, `${outcome.detail}`);
    if (!outcome.ok || !onTarget) {
      // A retry distinguishes a flaky network from a browser that cannot load
      // the page at all.
      const retryId = win.tabs.create(target.url, { active: true });
      const retry = await waitForTab(win, retryId, 40_000);
      record(`${target.name} (retry)`, retry.ok && retry.url.includes(target.host), retry.detail);
      win.tabs.close(retryId);
    }
    win.tabs.close(id);
  }

  // Tab closing: the reported bug was that the × did nothing.
  const before = win.tabs.order.length;
  const throwaway = win.tabs.create('kimmino://newtab', { active: true });
  const afterCreate = win.tabs.order.length;
  win.tabs.close(throwaway);
  await delay(120);
  record(
    'closes a tab',
    afterCreate === before + 1 && win.tabs.order.length === before && !win.tabs.tabs.has(throwaway),
    `${before} → ${afterCreate} → ${win.tabs.order.length}`
  );

  // Screenshot: must be a real PNG of non-trivial size, not an empty buffer.
  const shotTab = win.tabs.create('data:text/html,<h1 style="font:700 40px sans-serif">Kimmino screenshot check</h1>', {
    active: true
  });
  await waitForTab(win, shotTab, 10_000);
  await delay(400);
  try {
    const image = await win.tabs.captureActive();
    const buffer = image ? image.toPNG() : null;
    const valid = Boolean(buffer && buffer.length > 1000 && buffer.subarray(0, 8).equals(PNG_SIGNATURE));
    record('captures a screenshot', valid, buffer ? `${buffer.length} bytes` : 'no image returned');
  } catch (error) {
    record('captures a screenshot', false, String(error));
  }
  win.tabs.close(shotTab);

  // Measured memory, so the download page can quote a real number.
  const metrics = app.getAppMetrics();
  const workingSetKb = metrics.reduce((sum, metric) => sum + (metric.memory?.workingSetSize ?? 0), 0);
  const privateKb = metrics.reduce((sum, metric) => sum + (metric.memory?.privateBytes ?? 0), 0);
  const mb = (kb: number) => Math.round(kb / 1024);
  console.log(`SMOKE memory workingSet=${mb(workingSetKb)}MB private=${mb(privateKb)}MB processes=${metrics.length}`);
  logStartup(`smoke memory workingSet=${mb(workingSetKb)}MB private=${mb(privateKb)}MB processes=${metrics.length}`);

  const failed = steps.filter((step) => !step.ok);
  const summary = failed.length ? `smoke failed: ${failed.length}/${steps.length} checks` : `smoke ok: ${steps.length}/${steps.length} checks`;
  console.log(`SMOKE ${summary}`);
  logStartup(summary);

  app.exit(failed.length ? 1 : 0);
  // `app.exit` does not return control; this satisfies the `never` signature.
  await new Promise<void>(() => undefined);
  throw new Error('unreachable');
}

async function waitForTab(
  win: KimminoWindow,
  id: string,
  timeoutMs: number
): Promise<{ ok: boolean; detail: string; url: string }> {
  const started = Date.now();
  let last = '';
  while (Date.now() - started < timeoutMs) {
    const tab = win.tabs.tabs.get(id);
    if (!tab) return { ok: false, detail: 'tab disappeared', url: last };
    if (tab.crashed) return { ok: false, detail: 'renderer crashed', url: tab.url };
    if (tab.title === 'Page not available' || tab.url.startsWith('data:text/html;charset=utf-8,')) {
      return { ok: false, detail: 'error page shown', url: last };
    }
    if (!tab.loading && tab.url && tab.url !== 'kimmino://newtab') {
      return { ok: true, detail: `“${tab.title}” ${tab.url}`, url: tab.url };
    }
    last = tab.url;
    await delay(200);
  }
  return { ok: false, detail: `timed out after ${Math.round(timeoutMs / 1000)}s`, url: last };
}
