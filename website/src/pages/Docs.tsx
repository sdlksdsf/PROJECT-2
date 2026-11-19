import { Link } from 'react-router-dom';
import { BookOpen, ExternalLink, Github, Terminal } from 'lucide-react';
import { SITE } from '../lib/site';

const TOC = [
  ['getting-started', 'Getting started'],
  ['shortcuts', 'Keyboard shortcuts'],
  ['build', 'Build from source'],
  ['privacy-engine', 'Privacy engine'],
  ['themes', 'Theme files'],
  ['extensions', 'Extensions'],
  ['sync', 'Sync setup'],
  ['faq', 'FAQ']
];

const SHORTCUTS: Array<[string, string]> = [
  ['Ctrl / ⌘ + T', 'New tab'],
  ['Ctrl / ⌘ + W', 'Close tab'],
  ['Ctrl / ⌘ + Shift + T', 'Reopen closed tab'],
  ['Ctrl Tab', 'Next tab'],
  ['Ctrl / ⌘ + 1…9', 'Jump to tab (9 = last)'],
  ['Ctrl / ⌘ + L', 'Focus address bar'],
  ['Ctrl / ⌘ + K', 'Command palette'],
  ['Ctrl / ⌘ + F', 'Find in page'],
  ['Ctrl / ⌘ + Shift + N', 'New private window'],
  ['Ctrl / ⌘ + Shift + B', 'Toggle sidebar rail'],
  ['Ctrl / ⌘ + Alt + V', 'Vertical tabs'],
  ['Ctrl / ⌘ + D', 'Bookmark this page'],
  ['Ctrl / ⌘ + Shift + S', 'Screenshot (visible area)'],
  ['Ctrl / ⌘ + Alt + Shift + S', 'Screenshot (full page)'],
  ['Ctrl / ⌘ + Alt + S', 'Split view with next tab'],
  ['Ctrl / ⌘ + Shift + F', 'Focus mode on / off'],
  ['Ctrl / ⌘ + Shift + A', 'AI assistant panel'],
  ['Ctrl / ⌘ + Shift + U', 'Summarise this page'],
  ['Ctrl / ⌘ + Shift + Del', 'Erase browsing data'],
  ['Ctrl / ⌘ + H / J / Shift + O', 'History · downloads · bookmarks'],
  ['Ctrl / ⌘ + +/−/0', 'Zoom in / out / reset'],
  ['F11', 'Full screen'],
  ['F12', 'Developer tools']
];

function Block({ title, children, id }: { title: string; children: React.ReactNode; id: string }) {
  return (
    <section id={id} style={{ marginTop: 44 }}>
      <h2 style={{ fontSize: 22, scrollMarginTop: 90 }}>{title}</h2>
      {children}
    </section>
  );
}

export function Docs() {
  return (
    <div className="container" style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 48, padding: '52px 24px 90px' }}>
      <aside style={{ position: 'sticky', top: 92, alignSelf: 'start' }}>
        <span className="eyebrow" style={{ marginBottom: 14 }}>
          <BookOpen size={13} /> Documentation
        </span>
        <nav style={{ display: 'grid', gap: 2, marginTop: 10 }}>
          {TOC.map(([id, label]) => (
            <a key={id} href={`#${id}`} className="nav-link" style={{ padding: '6px 0' }}>
              {label}
            </a>
          ))}
        </nav>
        <div style={{ borderTop: '1px solid var(--border)', marginTop: 18, paddingTop: 16, display: 'grid', gap: 8 }}>
          <a className="btn btn-ghost btn-sm" href={SITE.repo} target="_blank" rel="noreferrer">
            <Github size={14} /> Repository
          </a>
          <Link className="btn btn-ghost btn-sm" to="/download">
            <Terminal size={14} /> Install
          </Link>
        </div>
      </aside>

      <div style={{ maxWidth: 720 }}>
        <span className="eyebrow">Kimmino 1.0</span>
        <h1 style={{ fontSize: 'clamp(30px,4vw,44px)', margin: '12px 0 12px' }}>Documentation</h1>
        <p className="muted" style={{ fontSize: 15.5, lineHeight: 1.75 }}>
          Everything you need to install Kimmino, learn the shortcuts, build it yourself, and understand exactly how the
          privacy features work under the hood.
        </p>

        <Block id="getting-started" title="Getting started">
          <p className="muted" style={{ fontSize: 15, lineHeight: 1.75 }}>
            Download the installer for your platform from the <Link to="/download">download page</Link> and run it. On
            first launch Kimmino offers to import bookmarks, history, passwords and open tabs from any browser found on
            the machine, and asks you to create a profile. A profile is a complete, isolated browser: its own cookies,
            history, extensions, theme and settings. You can create as many as you like and switch between them from the
            profile button in the title bar.
          </p>
          <p className="muted" style={{ fontSize: 15, lineHeight: 1.75, marginTop: 14 }}>
            The start page is the control centre: search, speed dials, a clock and a wallpaper. Right-click anywhere on
            it to change the wallpaper, toggle the clock or open the layout editor. Settings live behind the gear at the
            bottom of the sidebar; the search field at the top of Settings jumps straight to any setting by name.
          </p>
        </Block>

        <Block id="shortcuts" title="Keyboard shortcuts">
          <p className="muted" style={{ fontSize: 15, lineHeight: 1.75 }}>
            The core shortcuts match Chrome and Firefox conventions, so muscle memory survives the switch. All of them
            can be rebound in Settings → Shortcuts.
          </p>
          <div style={{ marginTop: 16, border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
            {SHORTCUTS.map(([keys, action], index) => (
              <div
                key={keys}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 16,
                  padding: '10px 16px',
                  fontSize: 13.5,
                  background: index % 2 ? 'var(--surface)' : 'transparent',
                  borderBottom: index === SHORTCUTS.length - 1 ? 0 : '1px solid var(--border)'
                }}
              >
                <span className="muted">{action}</span>
                <code className="inline" style={{ whiteSpace: 'nowrap' }}>{keys}</code>
              </div>
            ))}
          </div>
        </Block>

        <Block id="build" title="Build from source">
          <p className="muted" style={{ fontSize: 15, lineHeight: 1.75 }}>
            Requirements: Node.js 22+, npm 10+, and a C toolchain only if you rebuild native modules. The repository is a
            npm workspace with two packages: <code className="inline">browser</code> (the Electron application) and{' '}
            <code className="inline">website</code> (this site).
          </p>
          <pre className="code" style={{ marginTop: 16 }}>{`git clone ${SITE.repo}.git
cd PROJECT-2
npm install

npm run dev        # browser with hot reload
npm run dev:ui     # renderer only, in a browser at :5180
npm run build      # production bundles
npm run typecheck  # tsc --noEmit across both packages
npm run package    # installers into browser/release`}</pre>
          <p className="muted" style={{ fontSize: 15, lineHeight: 1.75, marginTop: 16 }}>
            <code className="inline">npm run package</code> invokes electron-builder and produces an NSIS <code className="inline">.exe</code>,
            a notarisation-ready <code className="inline">.dmg</code>, an <code className="inline">AppImage</code> and a
            <code className="inline"> .deb</code>. Cross-format builds belong on CI — the workflow in{' '}
            <code className="inline">.github/workflows/release.yml</code> builds all three platforms on tag push and
            attaches the artifacts to a draft release.
          </p>
          <p className="muted" style={{ fontSize: 15, lineHeight: 1.75, marginTop: 14 }}>
            Filter lists are compiled at build time by <code className="inline">tools/build-filters.mjs</code>, which
            downloads the current EasyList and uAssets sources and writes a single JSON bundle. Run it before packaging
            if you want fresh lists: <code className="inline">npm run filters</code>.
          </p>
        </Block>

        <Block id="privacy-engine" title="Privacy engine">
          <p className="muted" style={{ fontSize: 15, lineHeight: 1.75 }}>
            Blocking happens in the main process on <code className="inline">session.webRequest</code>, before requests are
            dispatched, so a blocked script never executes and cannot detect that it was blocked. Four layers run in order:
          </p>
          <ul>
            <li><strong>Network block</strong> — 47,000 domains plus 1,240 URL patterns, with an allowlist so checkout and login flows keep working.</li>
            <li><strong>Param stripping</strong> — 1,854 <code className="inline">removeparam</code> rules drop tracking query strings while leaving functional parameters intact.</li>
            <li><strong>Cosmetic filtering</strong> — 29,877 site-specific hiding rules plus 4,000 generic ones remove leftover ad frames and cookie bars.</li>
            <li><strong>Header and fingerprint shaping</strong> — Referer trimmed, client hints standardised, DNT and Sec-GPC set, and script-injected shims answer fingerprint probes with per-session noise.</li>
          </ul>
          <p className="muted" style={{ fontSize: 15, lineHeight: 1.75, marginTop: 14 }}>
            Each layer has its own toggle in Settings → Privacy, and every toggle can be overridden per site from the
            shield menu. Exceptions are stored in the profile’s <code className="inline">site-exceptions.json</code>.
          </p>
        </Block>

        <Block id="themes" title="Theme files">
          <p className="muted" style={{ fontSize: 15, lineHeight: 1.75 }}>
            A theme is a small JSON document. Drop a <code className="inline">.kimmino-theme</code> file onto Settings →
            Themes, or import from the Themes gallery.
          </p>
          <pre className="code" style={{ marginTop: 16 }}>{`{
  "format": "kimmino-theme",
  "version": 1,
  "name": "Midnight Mint",
  "author": "you",
  "base": "dark",
  "colors": {
    "accent": "#33d6a6",
    "surface": "#0b1117",
    "surfaceAlt": "#111a22",
    "text": "#eaf6f2",
    "border": "#1d2b33"
  }
}`}</pre>
          <p className="muted" style={{ fontSize: 15, lineHeight: 1.75, marginTop: 14 }}>
            Missing colours fall back to the base theme, so a three-line file is valid. Themes are per profile and are
            included in backups.
          </p>
        </Block>

        <Block id="extensions" title="Extensions">
          <p className="muted" style={{ fontSize: 15, lineHeight: 1.75 }}>
            Chromium extensions can be loaded unpacked from Settings → Extensions → Load unpacked. Kimmino reads the
            manifest, checks the permissions it requests, and shows a compatibility report: full support, partial
            support, or unsupported. There is no Chrome Web Store integration — Google does not permit third-party
            browsers to install from it, and we will not pretend otherwise.
          </p>
          <p className="muted" style={{ fontSize: 15, lineHeight: 1.75, marginTop: 14 }}>
            To install an extension you already use: download its source or unpack its <code className="inline">.crx</code>{' '}
            (a zip file), then point the loader at the folder containing <code className="inline">manifest.json</code>.
            Manifest V3 extensions that rely on service workers are currently marked partial; the work is tracked in the
            repository.
          </p>
        </Block>

        <Block id="sync" title="Sync setup">
          <p className="muted" style={{ fontSize: 15, lineHeight: 1.75 }}>
            Kimmino has no sync server of its own. To sync, create a Supabase project, run the SQL in{' '}
            <code className="inline">docs/sync-schema.sql</code>, then set two environment variables (or drop a{' '}
            <code className="inline">cloud.json</code> into your profile folder):
          </p>
          <pre className="code" style={{ marginTop: 16 }}>{`KIMMINO_SUPABASE_URL=https://xxxx.supabase.co
KIMMINO_SUPABASE_ANON_KEY=eyJhbGciOi...

# then, in Settings → Sync
#   email → 6-digit code → connected
# tick what to sync: bookmarks · preferences · dials`}</pre>
          <p className="muted" style={{ fontSize: 15, lineHeight: 1.75, marginTop: 14 }}>
            Rows are written to <code className="inline">kimmino_sync</code> with row-level security scoped to your user
            ID. Delete them at any time from Settings → Sync, or with a single <code className="inline">DELETE</code> in
            the Supabase SQL editor.
          </p>
        </Block>

        <Block id="faq" title="FAQ">
          <h3 style={{ fontSize: 16, marginTop: 18 }}>Is Kimmino really free?</h3>
          <p className="muted" style={{ fontSize: 15, lineHeight: 1.75 }}>Yes. No paid tier, no feature gates, no ads in the UI.</p>
          <h3 style={{ fontSize: 16, marginTop: 18 }}>Why is it based on Chromium?</h3>
          <p className="muted" style={{ fontSize: 15, lineHeight: 1.75 }}>
            Compatibility. A browser that breaks your bank is not a browser you can use. The privacy work happens around
            the engine: network layer, permissions, fingerprints, defaults and interface.
          </p>
          <h3 style={{ fontSize: 16, marginTop: 18 }}>Does blocking break websites?</h3>
          <p className="muted" style={{ fontSize: 15, lineHeight: 1.75 }}>
            Occasionally, as with any blocker. The shield menu has a one-click pause for that site, and the allowlist is
            maintained so common login and payment flows keep working.
          </p>
          <h3 style={{ fontSize: 16, marginTop: 18 }}>Do I need an account?</h3>
          <p className="muted" style={{ fontSize: 15, lineHeight: 1.75 }}>
            No. Accounts only exist to sync data you explicitly choose, to a database you configure.
          </p>
          <h3 style={{ fontSize: 16, marginTop: 18 }}>Can I use my Chrome extensions?</h3>
          <p className="muted" style={{ fontSize: 15, lineHeight: 1.75 }}>
            Most Manifest V2 extensions load unpacked; MV3 service-worker extensions are partially supported and labelled
            as such in the loader.
          </p>
          <a className="btn btn-ghost btn-sm" href={`${SITE.repo}/issues`} target="_blank" rel="noreferrer" style={{ marginTop: 22 }}>
            Ask a question on GitHub <ExternalLink size={13} />
          </a>
        </Block>
      </div>
    </div>
  );
}
