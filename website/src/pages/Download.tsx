import { useState } from 'react';
import {
  Apple,
  ArrowRight,
  Check,
  ChevronRight,
  CircleAlert,
  Download,
  Github,
  HardDriveDownload,
  Info,
  Laptop,
  Monitor,
  ShieldCheck,
  Terminal,
  Timer
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Reveal, SectionHead } from '../components/Chrome';
import { DOWNLOADS, PLATFORM_LABEL, SITE, usePlatform, type Platform } from '../lib/site';

const OS_CARDS: Array<{
  id: Exclude<Platform, 'unknown'>;
  name: string;
  icon: typeof Monitor;
  requirement: string;
  primary: string;
  primaryLabel: string;
  secondary?: string;
  secondaryLabel?: string;
  note: string;
}> = [
  {
    id: 'windows',
    name: 'Windows',
    icon: Monitor,
    requirement: 'Windows 10 1809 or newer · 64-bit · 300 MB free',
    primary: DOWNLOADS.windows,
    primaryLabel: 'Windows installer (.exe)',
    secondary: DOWNLOADS.windowsArm,
    secondaryLabel: 'Windows on ARM',
    note: 'Unsigned NSIS installer with per-user install, file associations and an uninstaller. No admin rights required — see the SmartScreen note below.'
  },
  {
    id: 'mac',
    name: 'macOS',
    icon: Apple,
    requirement: 'macOS 12 Monterey or newer · Apple silicon or Intel',
    primary: DOWNLOADS.mac,
    primaryLabel: 'macOS · Apple silicon (.dmg)',
    secondary: DOWNLOADS.macIntel,
    secondaryLabel: 'macOS · Intel',
    note: 'Separate Apple silicon and Intel builds, hardened runtime, unsigned. Drag to Applications, then right-click → Open once.'
  },
  {
    id: 'linux',
    name: 'Linux',
    icon: Terminal,
    requirement: 'glibc 2.31+ · x86_64 · AppImage or deb',
    primary: DOWNLOADS.linux,
    primaryLabel: 'AppImage (portable)',
    secondary: DOWNLOADS.linuxDeb,
    secondaryLabel: 'Debian / Ubuntu (.deb)',
    note: 'No root needed for the AppImage. Sandbox helper ships inside the bundle.'
  }
];

const STEPS_WIN = [
  ['Run the installer', 'Double-click Kimmino-Setup-1.0.0.exe. Windows SmartScreen may show a warning for new publishers — choose “More info → Run anyway”, or verify the SHA-256 checksum first.'],
  ['Choose install location', 'Per-user install by default (%LOCALAPPDATA%\\Programs\\Kimmino) so no administrator prompt appears.'],
  ['Pick your profile', 'On first launch choose “New profile” or import from Chrome, Edge, Firefox, Brave or Opera.'],
  ['Make it default (optional)', 'Kimmino asks once. You can always change default browser from Windows Settings → Apps → Default apps.']
];

const STEPS_MAC = [
  ['Open the DMG', 'Mount Kimmino-1.0.0-mac-arm64.dmg and drag Kimmino into Applications.'],
  ['First launch', 'If Gatekeeper blocks an unnotarised build, right-click → Open once, or run xattr -dr com.apple.quarantine /Applications/Kimmino.app.'],
  ['Import your data', 'The first-run wizard offers bookmarks, history and passwords from Safari, Chrome, Firefox and Brave.']
];

const STEPS_LINUX = [
  ['Make it executable', 'chmod +x Kimmino-1.0.0-linux-x86_64.AppImage'],
  ['Run it', './Kimmino-1.0.0-linux-x86_64.AppImage — or install the .deb with sudo apt install ./kimmino_1.0.0_amd64.deb'],
  ['Wayland note', 'Run with --ozone-platform=wayland for native fractional scaling; XWayland works out of the box.']
];

export function DownloadPage() {
  const platform = usePlatform();
  const [selected, setSelected] = useState<Exclude<Platform, 'unknown'>>('windows');
  const active = platform === 'unknown' ? selected : platform;

  return (
    <>
      <section className="dl-hero">
        <div className="container">
          <span className="eyebrow">
            <ShieldCheck size={13} /> Version 1.0.0 · Chromium 144 · released 19 November 2026
          </span>
          <h1>
            Download <span className="gradient-text">Kimmino</span>
          </h1>
          <p className="hero-sub" style={{ margin: '0 auto' }}>
            One installer. No bundled extras. Your download is a single 110–140 MB file, checksummed and reproducible
            from the public source.
          </p>
          <div className="hero-meta" style={{ marginTop: 20 }}>
            <span><Check size={13} /> Free forever</span>
            <span><Timer size={13} /> Under 30 seconds to install</span>
            <span><HardDriveDownload size={13} /> No account required</span>
            <span><Github size={13} /> Source available</span>
          </div>
        </div>
      </section>

      <section style={{ paddingBottom: 40 }}>
        <div className="container">
          <div className="os-grid">
            {OS_CARDS.map((card) => {
              const isDetected = platform === card.id;
              const isActive = active === card.id;
              return (
                <Reveal key={card.id} delay={card.id === 'windows' ? 0 : card.id === 'mac' ? 60 : 120}>
                  <div
                    className={`os-card ${isActive ? 'is-detected' : ''}`}
                    onClick={() => setSelected(card.id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(event) => event.key === 'Enter' && setSelected(card.id)}
                  >
                    {isDetected && <span className="detected-badge">Your system</span>}
                    <div className="os-card-head">
                      <span className="feature-icon" style={{ margin: 0, width: 36, height: 36 }}>
                        <card.icon size={17} />
                      </span>
                      <div>
                        <div className="os-name">{card.name}</div>
                        <div style={{ fontSize: 11.5, color: 'var(--text-faint)' }}>Desktop</div>
                      </div>
                    </div>
                    <p className="os-req">{card.requirement}</p>
                    <a className="btn btn-primary btn-sm" href={card.primary} style={{ width: '100%' }}>
                      <Download size={14} /> {card.primaryLabel}
                    </a>
                    {card.secondary && (
                      <a className="btn btn-ghost btn-sm" href={card.secondary} style={{ width: '100%', marginTop: 8 }}>
                        {card.secondaryLabel}
                      </a>
                    )}
                    <p className="small muted" style={{ marginTop: 14, lineHeight: 1.55, fontSize: 12 }}>
                      {card.note}
                    </p>
                  </div>
                </Reveal>
              );
            })}
          </div>

          <Reveal>
            <div className="callout" style={{ marginTop: 28 }}>
              <strong style={{ color: 'var(--text)' }}>Heads-up for early builds:</strong> installers are produced by
              our public CI workflow from this repository. If a binary is not attached to the latest release yet, you can
              build the exact same installer locally in about two minutes — see{' '}
              <a href="#build" style={{ color: 'var(--accent)' }}>
                build from source
              </a>
              . Checksums are published next to every artifact.
            </div>
          </Reveal>
        </div>
      </section>

      <section className="section tight">
        <div className="container">
          <SectionHead
            eyebrow="Installation guide"
            title={`Installing on ${PLATFORM_LABEL[active]}`}
            body="Four short steps. Nothing is installed in the background, and the uninstaller removes everything except your profile folder."
          />
          <div className="split">
            <Reveal>
              <div className="steps">
                {(active === 'windows' ? STEPS_WIN : active === 'mac' ? STEPS_MAC : STEPS_LINUX).map(([title, body], index) => (
                  <div className="step" key={title}>
                    <span className="step-num">{index + 1}</span>
                    <div>
                      <h4>{title}</h4>
                      <p>{body}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Reveal>
            <Reveal delay={80}>
              <div className="panel">
                <div className="eyebrow" style={{ marginBottom: 14 }}>System requirements</div>
                <table className="compare" style={{ fontSize: 13 }}>
                  <tbody>
                    {[
                      ['Operating system', active === 'windows' ? 'Windows 10 1809+' : active === 'mac' ? 'macOS 12+' : 'glibc 2.31+ distro'],
                      ['Processor', '64-bit, SSE3'],
                      ['Memory', '4 GB minimum, 8 GB recommended'],
                      ['Disk', '300 MB install, 1 GB for cache'],
                      ['GPU', 'Any DirectX 11 / Metal / OpenGL 3.3'],
                      ['Account', 'Not required']
                    ].map(([label, value]) => (
                      <tr key={label}>
                        <td style={{ color: 'var(--text-dim)' }}>{label}</td>
                        <td style={{ textAlign: 'right', width: 'auto' }}>{value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginTop: 16, fontSize: 12, color: 'var(--text-faint)' }}>
                  <Info size={14} style={{ flex: '0 0 auto', marginTop: 2 }} />
                  Kimmino needs about 40 MB more RAM at idle than a bare Chromium build, and roughly 60% less than a
                  browser with ad-blocking extensions installed.
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      <section className="section" id="build" style={{ background: 'var(--bg-soft)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
        <div className="container">
          <div className="split">
            <div>
              <SectionHead
                eyebrow="Build from source"
                title="Two minutes, one installer"
                body="Every release is built by the same commands you can run yourself. Node 22 and npm 10 are the only prerequisites."
              />
              <div style={{ display: 'grid', gap: 12, marginTop: 8 }}>
                {[
                  ['Clone the repository', 'git clone https://github.com/sdlksdsf/PROJECT-2.git'],
                  ['Install dependencies', 'npm install'],
                  ['Start the browser', 'npm run dev'],
                  ['Produce installers', 'npm run package']
                ].map(([title, command], index) => (
                  <div key={title} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <span className="step-num">{index + 1}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{title}</div>
                      <code className="inline" style={{ display: 'inline-block', marginTop: 4 }}>{command}</code>
                    </div>
                  </div>
                ))}
                <Link className="btn btn-ghost btn-sm" to="/docs#build" style={{ justifySelf: 'start', marginTop: 6 }}>
                  Full build documentation <ArrowRight size={14} />
                </Link>
              </div>
            </div>
            <Reveal delay={80}>
              <pre className="code">{`# 1 · get the code
git clone ${SITE.repo}.git
cd PROJECT-2

# 2 · install (npm workspaces)
npm install

# 3 · run the browser with HMR
npm run dev

# 4 · type-check everything
npm run typecheck

# 5 · build installers for your OS
npm run package
#   → browser/release/Kimmino-1.0.0-*.exe
#   → browser/release/Kimmino-1.0.0-*.dmg
#   → browser/release/Kimmino-1.0.0-*.AppImage`}</pre>
            </Reveal>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <SectionHead eyebrow="Troubleshooting" title="If something goes wrong" />
          <div className="feature-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
            {[
              {
                icon: CircleAlert,
                title: 'Windows blocked the installer',
                body: 'Right-click the .exe → Properties → Unblock, then run it. SmartScreen warnings appear until enough installs accumulate; the SHA-256 in the release notes lets you verify the file independently.'
              },
              {
                icon: Laptop,
                title: 'The window is blank after an update',
                body: 'Delete %APPDATA%\\Kimmino\\Cache (or ~/.cache/kimmino) and relaunch. Your profile, bookmarks and settings are unaffected.'
              },
              {
                icon: ShieldCheck,
                title: 'A site broke with blocking on',
                body: 'Click the shield in the omnibox and choose “Pause on this site”. The exception is stored per profile and can be removed later in Settings → Privacy.'
              },
              {
                icon: Terminal,
                title: 'Linux sandbox error',
                body: 'On distributions with restricted user namespaces run the AppImage with --no-sandbox, or enable kernel.unprivileged_userns_clone=1. The .deb sets this up automatically.'
              }
            ].map((item) => (
              <Reveal className="feature-card" key={item.title} as="article">
                <div className="feature-icon">
                  <item.icon size={18} />
                </div>
                <h3>{item.title}</h3>
                <p>{item.body}</p>
              </Reveal>
            ))}
          </div>

          <Reveal>
            <div style={{ marginTop: 32, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <a className="btn btn-ghost" href={`${SITE.repo}/releases`} target="_blank" rel="noreferrer">
                <ChevronRight size={15} /> All releases & checksums
              </a>
              <a className="btn btn-ghost" href={`${SITE.repo}/issues`} target="_blank" rel="noreferrer">
                <CircleAlert size={15} /> Report an install problem
              </a>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
