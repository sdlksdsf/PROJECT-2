# Architecture

How Kimmino is put together, and why each decision was made the way it was.

## The shape of the problem

A browser is three programs pretending to be one:

1. **An engine** that renders untrusted content — Chromium. Not something to reimplement.
2. **A process supervisor** that isolates pages, applies policy to their network traffic, and decides what they may touch.
3. **An interface** that has to stay responsive while (1) and (2) do dangerous work.

Kimmino adopts Chromium (via Electron) and concentrates its own code on (2) and (3). The privacy work therefore lives where it cannot be disabled by a page: in the main process, not in injected scripts alone.

## Process layout

```
main process                     one per app
├── TabManager                   BaseWindow + N WebContentsViews
│   ├── tab 1  (WebContentsView) renderer process
│   ├── tab 2  → sometimes discarded, restored on focus
│   └── split pane (WebContentsView, same window)
├── PrivacyEngine                webRequest hooks, permission handler, header shaping
├── stores                       prefs · profiles · library · downloads · themes · extensions
└── shell view (WebContentsView, full window)  ← React interface

preload (contextBridge)          shell: kmBridge  ·  tab: kmTabBridge
```

The shell is itself a `WebContentsView` pinned to the window bounds. Page views are positioned over the content area by IPC (`view:bounds`). Because native views paint **above** HTML, any overlay that must cover a page (command palette, settings modal, screenshot preview) asks the main process to **freeze** the pane first: it captures a PNG of the visible page, hides the native view, and the shell paints the frozen image behind its UI. On close, the view thaws. This is the same trick Chromium's own UI uses for some surfaces, and it removes the visual glitches of `z-index` fighting.

## Tabs and split view

`TabManager` owns `Tab` records: id, url, title, favicon, muted, loading, discarded, `splitSide`. For each tab it creates a `WebContentsView` with:

```ts
webPreferences: {
  preload: preload/tab.js,
  contextIsolation: true,
  sandbox: true,
  nodeIntegration: false,
  partition: profile.partition,      // per-profile session
  backgroundThrottling: prefs.performance.backgroundThrottle
}
```

Layout is computed in one place:

```ts
layout(): { primary: Rect; split?: Rect; visible: boolean }
```

- No split: `primary` = content area.
- Split: two half-width rects with a 6 px gutter; `tab.splitSide` decides which pane is the active tab.
- When an overlay is open, `visible = false` and both views are hidden rather than moved — cheaper and avoids repaint storms.

Discarded tabs keep their record (title, url, scroll offset, form state via `webContents.savePage`-free approach: Chromium's own `setBackgroundThrottling` + `session` cache) and are re-created on activation. Frozen tabs (`view:freeze`) are a separate, lighter state used by the memory saver.

## Privacy engine

`src/main/privacy/` is the part worth reading.

| File | Responsibility |
| :--- | :--- |
| `filters.ts` | Loads the compiled bundle, resolves user-list updates into `userData/filters`, exposes domain/pattern lookups (Set-based, O(1) per hostname suffix) |
| `network.ts` | `onBeforeRequest` blocking + `removeparam` rewrites, `onBeforeSendHeaders` shaping, allowlist evaluation |
| `engine.ts` | Orchestrates a session: installs hooks, cosmetic CSS, fingerprint shims, permission handler; tracks counters |
| `site-rating.ts` | Heuristic "is this origin sketchy" score used for permission warnings |

Order of evaluation for each request:

1. **Allowlist** — an explicit allow entry wins over everything (checkout, SSO, captcha domains). Keeps the web usable.
2. **Malware** — hard block.
3. **Ads / trackers** — blocked unless the site has an exception.
4. **removeparam** — rewrite the URL, dropping only parameters with known tracking semantics.
5. **Headers** — trim `Referer` to origin cross-site, remove client hints beyond a stock set, add `DNT: 1` and `Sec-GPC: 1`.
6. **Cosmetic** — injected stylesheet hides leftover ad frames and cookie banners by selector, plus generic patterns limited to element shapes that almost never match content.

Fingerprint shims are injected at document start into the page's main world, seeded per `(profile, session, site)` so values are stable within a page but uncorrelated across sites. They cover Canvas readback, WebGL vendor/renderer, AudioContext, `navigator.plugins`, `hardwareConcurrency`, `deviceMemory`, screen metrics and timezone.

Permissions are denied by default. A site receives a prompt only if you have explicitly trusted it; everything else gets a silent refusal plus a toast explaining what was blocked, so the browser never becomes a stream of modal dialogs.

## Persistence

Each store is an atomic JSON writer: write to `file.tmp`, `fsync`, `rename`. No database server, no native module, no migration framework — a `version` field plus a `migrate()` switch.

```
<userData>/
├── preferences.json        global UI prefs (per profile copy: profiles/<id>/prefs.json)
├── profiles.json           profile records + active id
├── profiles/<id>/
│   ├── prefs.json
│   ├── bookmarks.json      bookmarks + dials
│   ├── history.json        capped, deduplicated, searchable
│   ├── downloads.json
│   ├── site-exceptions.json
│   ├── themes.json         imported themes
│   └── extensions/         unpacked extension folders
└── filters/default-filters.json
```

Incognito windows get an in-memory profile: no writes, no history, separate partition, destroyed on close.

## Extensions

Electron supports `session.extensions.loadExtension(path)` for **unpacked** extensions only. Kimmino wraps this in `extensions.ts`:

- validates `manifest.json` and version,
- copies (or links, in dev) the folder into the profile,
- produces a compatibility report: `full` · `partial` (MV3 service workers) · `unsupported`,
- surfaces installed extensions with an enable toggle and remove action.

There is no Chrome Web Store integration, because Google's terms forbid third-party clients from installing from it. Pretending otherwise would be the dishonest option; the loader plus a clear explanation is the honest one.

## Sync

`sync.ts` talks to Supabase directly from the main process:

- `POST /auth/v1/otp` → email code, `POST /auth/v1/verify` → JWT.
- Rows in `kimmino_sync` keyed `(user_id, kind, id)`, RLS scoped to `auth.uid()`.
- Payloads are the same JSON the local stores use, so restore is a merge, not a different code path.

No Kimmino-operated backend exists. If the two environment variables are absent, the Sync screen says so and offers a backup file instead.

## Interface

React 19, strict TypeScript, Zustand for state, and hand-written CSS built on custom properties:

```
--bg --surface --surface-2 --text --text-dim --border --accent --radius --ease
```

Every theme is a mapping of these tokens; that is why twenty palettes cost nothing at runtime and why no dialog can end up un-themed. Theming is applied by setting `data-theme` on `<html>` plus a token override block for custom themes.

Animations are capped at 260 ms with `cubic-bezier(0.22, 1, 0.36, 1)`, and `prefers-reduced-motion` disables them everywhere.

## Failure modes worth knowing

| Failure | Handling |
| :--- | :--- |
| Renderer crash | Tab shows a "page crashed" state with reload; other tabs unaffected |
| Filter bundle missing | App starts with blocking disabled and a visible warning; never silently unprotected |
| Profile JSON corrupt | Store falls back to defaults, keeps the corrupt file as `.corrupt` for recovery |
| Sync offline | Writes queue in `sync-queue.json`, flush on next successful auth |
| Update check fails | Silent; early updates are opt-in and never block startup |

## What we deliberately did not do

- **No `<webview>` tags.** Deprecated, slower, and a context-isolation hazard.
- **No fork of Chromium.** Maintenance cost that no small team survives; the privacy gains are available around the engine instead.
- **No native modules.** Keeps `npm install` working everywhere without a compiler.
- **No telemetry, ever.** Architectural, not a setting: there is no client, no endpoint, no key.
