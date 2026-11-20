# Building Kimmino

Everything below works from a clean clone. The repository is an npm workspace with two packages: `browser` (Electron app) and `website` (marketing site).

## Requirements

| Tool | Version | Notes |
| :--- | :--- | :--- |
| Node.js | 22 LTS or newer | `node --version` |
| npm | 10+ | ships with Node 22 |
| Git | any | |
| Python 3 + `fonttools` | optional | only to regenerate screenshots |

Platform toolchain notes:

- **Windows** — no Visual Studio required; Electron ships prebuilt binaries. Code signing needs a certificate, not a compiler.
- **macOS** — Xcode command-line tools only if you rebuild native modules.
- **Linux** — for `.deb` packaging, `fakeroot` and `dpkg` (usually present).

## Install and run

```bash
git clone https://github.com/sdlksdsf/PROJECT-2.git
cd PROJECT-2
npm install
npm run dev
```

`npm run dev` starts electron-vite: main and preload are compiled with esbuild, the React shell gets HMR. Changes to `browser/src/main/**` restart the app; changes to the shell hot-reload in place.

### Working on the interface without Electron

```bash
npm run dev:ui      # http://localhost:5180
```

This runs the shell in a normal browser against `bridge.mock.ts`, an in-memory implementation of the whole IPC surface backed by `localStorage`. Every page, setting, animation and shortcut is reachable; native-only features (real tabs, screenshots, freeze-frame overlays) are replaced by honest placeholders in `components/MockPage.tsx`.

That is also how the screenshots in the README are generated (see below).

## Checks

```bash
npm run typecheck   # tsc --noEmit, strict, both workspaces
npm test            # node --test browser/test/*.test.mjs
npm run build       # production bundles for main, preload and renderer
```

The test suite asserts that the filter bundle is structurally valid and substantial, that packaging produces the advertised installer, that privacy defaults are enabled, and that no telemetry endpoint exists anywhere in `src/`.

## Packaging installers

```bash
npm run package        # current platform
npm run package:win    # NSIS .exe, x64 + arm64
npm run package:mac    # .dmg + .zip, arm64 + x64
npm run package:linux  # AppImage + .deb
```

Artifacts land in `browser/release/`:

```
Kimmino-1.0.0-win-x64.exe
Kimmino-1.0.0-win-arm64.exe
Kimmino-1.0.0-mac-arm64.dmg
Kimmino-1.0.0-mac-x64.dmg
Kimmino-1.0.0-linux-x86_64.AppImage
Kimmino-1.0.0-linux-arm64.AppImage
kimmino_1.0.0_amd64.deb
latest.yml  (auto-update metadata)
```

Cross-compiling is not supported by electron-builder: build each platform on its own OS. The workflow in [`.github/workflows/release.yml`](../.github/workflows/release.yml) does this on tag push and attaches everything to a GitHub Release with `SHA256SUMS.txt`.

### Signing

| Platform | Variable | Effect |
| :--- | :--- | :--- |
| Windows | `CSC_LINK`, `CSC_KEY_PASSWORD` | Signs `Kimmino-Setup.exe` (removes SmartScreen warning once reputation accrues) |
| macOS | `CSC_LINK`, `CSC_KEY_PASSWORD`, `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, `APPLE_TEAM_ID` | Signs and notarises the app and DMG |

Without these variables electron-builder produces unsigned builds — fully functional, but SmartScreen and Gatekeeper will warn on first launch. [INSTALL.md](INSTALL.md) explains what to tell users in that case.

## Filter lists

`browser/resources/filters/default-filters.json` is generated, committed, and shipped inside the app (4.3 MB, ~47k ad domains). Regenerate it with:

```bash
node tools/build-filters.mjs
```

The compiler downloads EasyList and uBlock Origin uAssets sources, normalises domains and patterns, deduplicates, and writes a single versioned bundle. If your network intercepts TLS, export the CA bundle first:

```bash
NODE_EXTRA_CA_CERTS=/etc/ssl/certs/ca-certificates.crt node tools/build-filters.mjs
```

Filter lists change daily. Refreshing them is a normal pull request — the diff size is the only review burden, so batch updates.

## Screenshots and artwork

Screenshots are rendered from the design system rather than captured from a display:

```bash
# one-time: decompress the bundled variable fonts to static instances
bash tools/fonts-setup.sh

npm run screenshots          # assets/screenshots/*.png + website/public copies
node tools/render-icon.mjs   # 1024² app icon for installers
```

CI has no display, and Electron cannot boot headlessly, so this keeps the README honest: change a colour token, re-run, and the screenshots change with it.

## Environment variables

| Variable | Used by | Purpose |
| :--- | :--- | :--- |
| `KIMMINO_SUPABASE_URL` | sync | Override the built-in project URL |
| `KIMMINO_SUPABASE_ANON_KEY` | sync | Override the built-in publishable key |
| `KIMMINO_AI_URL` | AI panel | Point the assistant at your own proxy |
| `GEMINI_API_KEY` | `api/ai.ts` | Server-side key for the Gemini models |
| `GROQ_API_KEY` | `api/ai.ts` | Server-side key for the Llama models |
| `KIMMINO_DEVTOOLS` | development | Opens devtools for the shell on launch |

The two Supabase values are compiled in on purpose: a publishable key can only
read and write the rows row-level security allows, so a downloaded build can
sign a user in but cannot see anyone else's data. Point a build at a different
project with the environment variables above or a `cloud.json` in the profile
folder. The same is true of the assistant: the browser only knows the proxy
address, and the provider keys live on the server that serves `api/ai.ts`.

To run that server locally: `vercel dev` at the repository root, then start the
browser with `KIMMINO_AI_URL=http://localhost:3000/api/ai`.

## Troubleshooting the build

- **`Electron failed to install correctly`** — `rm -rf node_modules && npm install`; a proxy can truncate the Electron zip.
- **`Cannot find module 'out/main/index.js'`** — run `npm run build` before `npm run package`; `package` does this for you, manual electron-builder invocations do not.
- **Blank renderer window in dev** — check the terminal for a Vite transform error; the shell is served from `src/renderer`.
- **`libva`/GPU crashes on Linux** — run `kimmino --disable-gpu` or disable hardware acceleration in Settings → Performance.
