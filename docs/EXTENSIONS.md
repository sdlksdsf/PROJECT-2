# Extensions

Kimmino loads **unpacked Chromium extensions**. It cannot install from the Chrome Web Store, and this page explains exactly why, what does work, and what to expect.

## Why not the Chrome Web Store?

Google's Web Store terms prohibit third-party browsers from installing extensions via their store endpoints. Browsers that appear to support it (Brave, Edge, Opera) use proprietary or bundled mechanisms under agreements Kimmino does not have. Rather than ship a broken "Install from Chrome" button, Kimmino provides a real unpacked loader and tells you the truth about compatibility.

## What works

Electron's `session.extensions.loadExtension()` supports a substantial subset of the Chromium extension API:

| API | Status |
| :--- | :--- |
| `manifest.json` v2 extensions | ✅ Full |
| Content scripts (all `run_at` values) | ✅ Full |
| Background pages (persistent MV2) | ✅ Full |
| `chrome.tabs`, `windows`, `storage`, `runtime`, `i18n` | ✅ Full |
| `chrome.webRequest` (blocking) | ⚠️ Conflicts with Kimmino's privacy engine — the extension wins for its own host permissions, which can weaken blocking |
| `chrome.declarativeNetRequest` (MV2 subset) | ⚠️ Partial |
| Browser action popups | ✅ Full (rendered in a Kimmino popup surface) |
| Options pages | ✅ Full |
| Manifest V3 service workers | ⚠️ Partial — registration is unreliable in Electron 45; extension is labelled "partial" before you enable it |
| Native messaging | ❌ Not supported |

## Installing

1. Obtain the extension as a folder. Options:
   - From GitHub: clone or download the repository, use the folder containing `manifest.json`.
   - From a `.crx`: a CRX is a zip with a header. `unzip extension.crx -d my-extension` usually works; if the header confuses `unzip`, strip the first 16 bytes or use `crx3` tooling.
   - From your existing Chrome profile: `~/.config/google-chrome/Default/Extensions/<id>/<version>/` (Windows: `%LOCALAPPDATA%\Google\Chrome\User Data\Default\Extensions`).
2. **Settings → Extensions → Load unpacked** and choose the folder.
3. Read the compatibility report Kimmino shows — permissions requested, APIs used, verdict.
4. Enable it. Extensions are per profile, like everything else.

Installed extensions appear in the toolbar overflow menu and in the sidebar rail.

## Security model

Extensions are as powerful as they are in Chrome: they can read and modify pages you grant them access to. Kimmino mitigates what it can:

- Install is always explicit (no silent sideloading, no store auto-install).
- The compatibility report lists host permissions in plain language before enabling.
- `chrome.webRequest` extensions are flagged because they can override Kimmino's blocking rules for their hosts.
- Extensions run in the profile's session, so a work profile's extensions cannot see personal browsing.
- Removing an extension deletes its folder and its storage.

Kimmino does not audit third-party extensions. Treat them as you would on any browser.

## Building an extension for Kimmino

Standard Chromium extension development applies; the loader is `extensions.ts`. Two practical notes:

- Target **Manifest V2** for the most reliable behaviour today.
- Keep `webRequest` usage minimal: Kimmino's engine already blocks ads, trackers and malware, and duplicating that work costs performance.

## Roadmap

MV3 service-worker support is tracked in the issue tracker. It depends on Electron's extension layer becoming stable with non-persistent backgrounds; when that lands, the loader will move those extensions from "partial" to "full" without a UI change.
