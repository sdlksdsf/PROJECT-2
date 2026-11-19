# Contributing to Kimmino

Thanks for wanting to help. Kimmino is maintained in the open, and contributions of every size are welcome — code, filter lists, translations, documentation, bug reports, and honest criticism.

## The one rule

**No telemetry.** No analytics, no crash reporting, no "anonymous usage statistics", no remote config, no advertising identifiers. A test enforces this (`browser/test/privacy.test.mjs`), and a pull request that tries to add any of it will be closed. If you need data to debug something, ask users to attach a log file they chose to export.

## Getting set up

```bash
git clone https://github.com/sdlksdsf/PROJECT-2.git
cd PROJECT-2
npm install
npm run dev        # the browser
npm run dev:ui     # just the interface, in a normal browser
npm run typecheck
npm test
```

`npm run dev:ui` is the fastest way to work on the interface: it uses an in-memory mock of the IPC layer, so you can change settings, open every page and test animations without a native build.

## Branch model

- `main` is always buildable.
- Work happens on a branch: `feat/split-divider`, `fix/cookie-banner-crash`, `docs/sync-guide`.
- Commit messages follow `type(scope): summary` — `feat(privacy): randomise audio context`, `fix(tabs): restore scroll on thaw`, `docs(readme): update screenshots`.
- One logical change per pull request. Refactors separate from behaviour changes.

## Before opening a pull request

1. `npm run typecheck` passes.
2. `npm test` passes.
3. `npm run build` succeeds.
4. If you changed the UI, update the screenshots: `npm run screenshots` (see [docs/BUILD.md](docs/BUILD.md)).
5. If you changed privacy behaviour, say so explicitly in the description — including what gets *less* private, if anything.

## What we are looking for

- **Filter list maintenance** — the bundle ages quickly; refreshing it is a genuinely useful pull request.
- **Translations** — twelve languages are wired up, several need native review.
- **Accessibility** — keyboard traps, focus order, contrast below AA, screen-reader labels.
- **Performance** — smaller memory footprint per tab, faster cold start, fewer layout passes in the shell.
- **Manifest V3 extension support** in `extensions.ts`.

Good first issues are labelled `good first issue` on GitHub.

## Reporting bugs

Include:

- Kimmino version (`kimmino --version`) and OS version,
- what you did, what you expected, what happened,
- whether the privacy shield was on or paused for the site,
- a screenshot or a short screen recording if the bug is visual.

Never paste passwords, cookies or personal data into an issue. If a site breaks with blocking on, the shield menu's "Copy blocked request log" gives us exactly what we need without your session.

## Security

Do not open a public issue for a vulnerability. Follow [SECURITY.md](SECURITY.md).

## Code style

- TypeScript strict; no `any` unless the alternative is worse and commented.
- Main-process code never trusts renderer input — validate IPC payloads.
- React components are function components with explicit prop types; no default exports except pages.
- CSS: tokens only, no hard-coded colours outside `styles/base.css`.
- Comments explain *why*, not *what*.

## Licensing of contributions

By contributing you agree your work is licensed under the MPL-2.0, and that you have the right to submit it. No CLA, no copyright assignment.
