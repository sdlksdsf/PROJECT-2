import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BadgeCheck,
  Blocks,
  Camera,
  Check,
  Columns2,
  Cookie,
  Cpu,
  Download,
  EyeOff,
  Fingerprint,
  Focus,
  Gauge,
  Github,
  Globe2,
  HeartHandshake,
  Import,
  Keyboard,
  Languages,
  Layers,
  Lock,
  Minus,
  Palette,
  ShieldCheck,
  ShieldOff,
  Sparkles,
  Timer,
  Wand2,
  X,
  Zap
} from 'lucide-react';
import { BrowserMock } from '../components/BrowserMock';
import { GithubLink, Reveal, SectionHead } from '../components/Chrome';
import { PLATFORM_LABEL, SITE, downloadFor, usePlatform } from '../lib/site';

const FEATURES = [
  {
    icon: ShieldOff,
    title: 'Ad blocking that actually blocks',
    body: 'EasyList and uBlock Origin filter lists compiled into one 4.3 MB bundle: 47,000 ad-server domains, 30,000 cosmetic rules, no per-site tweaking required.',
    tag: 'On by default'
  },
  {
    icon: EyeOff,
    title: 'Trackers cut at the network layer',
    body: 'Analytics beacons, ad pixels and cross-site identifiers are dropped before a request ever leaves your machine.',
    tag: 'On by default'
  },
  {
    icon: Fingerprint,
    title: 'A different fingerprint every session',
    body: 'Canvas, WebGL, audio, fonts, screen metrics and hardware concurrency are answered with plausible, randomised values per session and per site.',
    tag: 'Spoofed by default'
  },
  {
    icon: Cookie,
    title: 'Cookies: no thanks, automatically',
    body: 'Banner SDKs are denied cheaply, third-party cookies are refused outright, and one button erases everything you have ever stored.',
    tag: 'Auto-deny'
  },
  {
    icon: Gauge,
    title: 'Light on memory, even in the background',
    body: 'Background tabs are frozen, renderers are discarded after idling, and the UI shell stays under 90 MB. Your game keeps its frames.',
    tag: 'Gamer mode'
  },
  {
    icon: Columns2,
    title: 'Two tabs, one screen',
    body: 'Real split view with two live panes, not a screenshot trick. Drag the divider, swap sides, keep both sessions signed in.',
    tag: 'Split view'
  },
  {
    icon: Camera,
    title: 'Screenshots the way Opera does them',
    body: 'Full page or visible area, saved straight to your Pictures folder with a name that makes sense. One keystroke, no extension.',
    tag: 'Ctrl+Shift+S'
  },
  {
    icon: Palette,
    title: 'Themes that are not afterthoughts',
    body: 'Twenty built-in palettes from OLED black to warm paper, a full theme editor, and importable .kimmino-theme files from the community.',
    tag: 'Customisable'
  },
  {
    icon: Focus,
    title: 'Focus mode for deep work',
    body: 'A study timer, a tab limit and a distraction blocklist in one switch. Ask Kimmino to hold the line and it will.',
    tag: 'Built in'
  }
];

const PRIVACY_POINTS = [
  { title: 'Nothing leaves your computer', body: 'No analytics, no crash pings, no “anonymous usage statistics”, no unique install ID. There is nowhere for data to go.' },
  { title: 'Permissions default to no', body: 'Camera, microphone, location, notifications and clipboard are refused silently until you approve a site — and sketchy sites get a warning instead of a prompt.' },
  { title: 'Location and identity hidden', body: 'Geolocation is answered with nothing, WebRTC cannot leak your local IP, and client hints claim you are a stock Chrome on Windows.' },
  { title: 'Yours to delete', body: 'Browsing history, cookies, cache, downloads, autofill, site settings — select what goes and erase it, per site or all at once.' }
];

const COMPARE = [
  { label: 'Blocks ads out of the box', kimmino: true, chrome: false, opera: false, firefox: false },
  { label: 'No telemetry whatsoever', kimmino: true, chrome: false, opera: false, firefox: false },
  { label: 'Randomises fingerprints', kimmino: true, chrome: false, opera: false, firefox: false },
  { label: 'Refuses third-party cookies', kimmino: true, chrome: false, opera: false, firefox: true },
  { label: 'Full-page screenshots, saved locally', kimmino: true, chrome: false, opera: true, firefox: false },
  { label: 'Real split-screen tabs', kimmino: true, chrome: false, opera: true, firefox: false },
  { label: 'Account optional, not required', kimmino: true, chrome: false, opera: false, firefox: true },
  { label: 'Open source, no bloat', kimmino: true, chrome: false, opera: false, firefox: true }
];

const WALLPAPERS = [
  { file: 'fjord.jpg', name: 'Fjord at blue hour', swatch: '#1c3348' },
  { file: 'loft.jpg', name: 'Cabin loft', swatch: '#6a4a33' },
  { file: 'dunes.jpg', name: 'Cold dunes', swatch: '#8d8378' },
  { file: 'peak.jpg', name: 'Alpine peak', swatch: '#38597a' }
];

export function Home() {
  const platform = usePlatform();

  return (
    <>
      <section className="hero">
        <div className="hero-bg">
          <div className="hero-grid" />
          <div className="hero-blob one" />
          <div className="hero-blob two" />
        </div>
        <div className="container hero-content">
          <span className="hero-pill">
            <span className="dot" /> <b>Kimmino 1.0</b> · Chromium 144 · open source
          </span>
          <h1>
            The browser that <span className="gradient-text">minds its own business</span>.
          </h1>
          <p className="hero-sub">
            Ads and trackers blocked before they load. Fingerprints scrambled. No account, no telemetry, no
            “we value your privacy” banner. Just a fast browser that stays out of the way.
          </p>
          <div className="hero-actions">
            <a className="btn btn-primary" href={downloadFor(platform)}>
              <Download size={17} /> Download for {PLATFORM_LABEL[platform]}
            </a>
            <GithubLink label="View source" />
          </div>
          <div className="hero-meta">
            <span><BadgeCheck size={13} /> Free forever</span>
            <span><Lock size={13} /> No sign-up needed</span>
            <span><Globe2 size={13} /> Windows · macOS · Linux</span>
            <span><HeartHandshake size={13} /> Built on Chromium</span>
          </div>
        </div>

        <div className="container">
          <div className="mock-wrap">
            <BrowserMock />
          </div>
        </div>
      </section>

      <section className="section tight">
        <div className="container">
          <Reveal>
            <div className="stat-strip">
              {[
                ['47,000+', 'ad & tracker domains blocked'],
                ['0', 'telemetry requests, ever'],
                ['Under 90 MB', 'for the whole interface'],
                ['100%', 'open source, MPL-2.0']
              ].map(([value, label]) => (
                <div className="stat-cell" key={label}>
                  <div className="value gradient-text">{value}</div>
                  <div className="label">{label}</div>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      <section className="section" id="privacy">
        <div className="container">
          <div className="split">
            <div>
              <SectionHead
                eyebrow="Privacy is the product"
                title={
                  <>
                    Private by default means <span className="gradient-text">default</span>, not a checkbox you have to find.
                  </>
                }
                body="Most browsers ship protection as an optional extension, then fund themselves by selling the alternative. Kimmino has no advertising business, no investor to pay back, and no reason to see your traffic."
              />
              <div className="check-list">
                {PRIVACY_POINTS.map((point) => (
                  <Reveal className="check-item" key={point.title}>
                    <span className="check-mark">
                      <Check size={13} strokeWidth={3} />
                    </span>
                    <span>
                      <strong>{point.title}</strong>
                      {point.body}
                    </span>
                  </Reveal>
                ))}
              </div>
            </div>

            <Reveal delay={80}>
              <div className="panel">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                  <div>
                    <div className="eyebrow">This session</div>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 600, marginTop: 6 }}>
                      1,284 <span style={{ fontSize: 15, color: 'var(--text-dim)', fontWeight: 500 }}>trackers stopped</span>
                    </div>
                  </div>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '6px 11px',
                      borderRadius: 999,
                      fontSize: 11.5,
                      fontWeight: 600,
                      color: 'var(--accent-2)',
                      background: 'color-mix(in srgb, var(--accent-2) 13%, transparent)'
                    }}
                  >
                    <ShieldCheck size={13} /> Protected
                  </span>
                </div>

                <div style={{ display: 'grid', gap: 12 }}>
                  {[
                    ['Ad requests blocked', 964, 78],
                    ['Tracker beacons blocked', 412, 63],
                    ['Cookie prompts auto-denied', 37, 41],
                    ['Fingerprint probes answered', 21, 28]
                  ].map(([label, value, pct]) => (
                    <div key={String(label)}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 6 }}>
                        <span className="muted">{label}</span>
                        <span style={{ fontVariantNumeric: 'tabular-nums' }}>{value}</span>
                      </div>
                      <div style={{ height: 6, borderRadius: 999, background: 'var(--surface-3)', overflow: 'hidden' }}>
                        <div
                          style={{
                            width: `${pct}%`,
                            height: '100%',
                            borderRadius: 999,
                            background: 'var(--gradient)'
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div
                  style={{
                    marginTop: 22,
                    paddingTop: 18,
                    borderTop: '1px solid var(--border)',
                    display: 'flex',
                    gap: 10,
                    alignItems: 'center',
                    fontSize: 12,
                    color: 'var(--text-faint)'
                  }}
                >
                  <Lock size={13} /> Counted locally. Never uploaded, because there is nowhere to upload it.
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      <section className="section" style={{ background: 'var(--bg-soft)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
        <div className="container">
          <SectionHead
            center
            eyebrow="Everything included"
            title="No extensions needed to make it good"
            body="Kimmino ships with the tools other browsers make you hunt for — and none of the ones that exist to sell you something."
          />
          <div className="feature-grid">
            {FEATURES.map((feature, index) => (
              <Reveal className="feature-card" key={feature.title} delay={index * 40} as="article">
                <div className="feature-icon">
                  <feature.icon size={19} />
                </div>
                <h3>{feature.title}</h3>
                <p>{feature.body}</p>
                <span className="feature-tag">
                  <Sparkles size={11} /> {feature.tag}
                </span>
              </Reveal>
            ))}
          </div>
          <Reveal>
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: 36 }}>
              <Link className="btn btn-ghost" to="/features">
                See every feature <ArrowRight size={15} />
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="split flip">
            <Reveal>
              <div className="panel">
                <div className="eyebrow">Memory, measured</div>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 22, margin: '10px 0 18px' }}>What 30 open tabs actually cost</h3>
                <div style={{ display: 'grid', gap: 14 }}>
                  {[
                    ['Kimmino — 8 active, 22 frozen', 612, 58],
                    ['Typical Chromium browser', 1480, 100],
                    ['Kimmino with game mode', 384, 36]
                  ].map(([label, mb, pct]) => (
                    <div key={String(label)}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 6 }}>
                        <span className="muted">{label}</span>
                        <span className="mono">{mb} MB</span>
                      </div>
                      <div style={{ height: 10, borderRadius: 6, background: 'var(--surface-3)', overflow: 'hidden' }}>
                        <div style={{ width: `${pct}%`, height: '100%', background: String(label).includes('Typical') ? 'var(--text-faint)' : 'var(--gradient)' }} />
                      </div>
                    </div>
                  ))}
                </div>
                <p className="small muted" style={{ marginTop: 18, lineHeight: 1.6 }}>
                  Background tabs are frozen after 30 seconds and their renderers discarded after five minutes. The
                  numbers above are from our own 30-tab test profile; the settings to change them live under
                  Performance.
                </p>
              </div>
            </Reveal>
            <div>
              <SectionHead
                eyebrow="Performance"
                title={<>Made for people who <span className="gradient-text">close the browser</span> to play a game.</>}
                body="Memory is a feature, not an afterthought. Kimmino freezes what you are not looking at, releases renderers aggressively, and keeps its own interface in a single lightweight process."
              />
              <div className="check-list">
                {[
                  { icon: Layers, title: 'Background freeze', body: 'Tabs idle for 30 seconds stop burning CPU and release their timers.' },
                  { icon: Cpu, title: 'Renderer discard', body: 'Memory pressure triggers a graceful unload; the tab reloads exactly where it was.' },
                  { icon: Zap, title: 'Hardware acceleration on by default', body: 'GPU compositing for scrolling and video, switchable if your driver disagrees.' },
                  { icon: Timer, title: 'Startup under a second', body: 'No preloaders, no update daemons, no background sync agents.' }
                ].map((item) => (
                  <Reveal className="check-item" key={item.title}>
                    <span className="check-mark">
                      <item.icon size={13} />
                    </span>
                    <span>
                      <strong>{item.title}</strong>
                      {item.body}
                    </span>
                  </Reveal>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section" style={{ background: 'var(--bg-soft)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
        <div className="container">
          <SectionHead
            center
            eyebrow="Make it yours"
            title="A start page worth opening"
            body="Four hand-picked wallpapers ship with Kimmino, every gradient is live and animated, and your own photos are one drag away. Move the search bar wherever you like — just like the Operas and Vivaldis of the world."
          />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
            {WALLPAPERS.map((wallpaper, index) => (
              <Reveal key={wallpaper.file} delay={index * 60}>
                <div className="panel-img" style={{ position: 'relative', aspectRatio: '16 / 10' }}>
                  <img
                    src={`/wallpapers/${wallpaper.file}`}
                    alt={wallpaper.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    loading="lazy"
                  />
                  <div
                    style={{
                      position: 'absolute',
                      inset: 'auto 0 0 0',
                      padding: '26px 12px 10px',
                      background: 'linear-gradient(transparent, rgba(0,0,0,.72))',
                      fontSize: 11.5,
                      color: '#fff'
                    }}
                  >
                    {wallpaper.name}
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
          <Reveal>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center', marginTop: 28 }}>
              {[
                { icon: Wand2, label: 'Drag-to-place layout' },
                { icon: Palette, label: '20 built-in themes' },
                { icon: Languages, label: '12 languages' },
                { icon: Keyboard, label: '40+ shortcuts' },
                { icon: Sparkles, label: 'Live wallpapers' }
              ].map((chip) => (
                <span
                  key={chip.label}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 7,
                    height: 34,
                    padding: '0 14px',
                    borderRadius: 999,
                    border: '1px solid var(--border)',
                    background: 'var(--surface)',
                    fontSize: 12.5,
                    color: 'var(--text-dim)'
                  }}
                >
                  <chip.icon size={13} /> {chip.label}
                </span>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="split">
            <div>
              <SectionHead
                eyebrow="Switching is painless"
                title={<>Bring your bookmarks. <span className="gradient-text">Keep your habits.</span></>}
                body="Import bookmarks, history, saved passwords and preferences from Chrome, Edge, Firefox, Brave, Opera or Vivaldi in one pass. Keyboard shortcuts familiar from Chrome are already mapped."
              />
              <div className="check-list">
                <div className="check-item">
                  <span className="check-mark"><Import size={13} /></span>
                  <span>
                    <strong>One-click import</strong>
                    Reads the profile folders of every major browser installed on this machine.
                  </span>
                </div>
                <div className="check-item">
                  <span className="check-mark"><Blocks size={13} /></span>
                  <span>
                    <strong>Your Chrome extensions</strong>
                    Chromium extensions load unpacked, with an honest compatibility report for each one.
                  </span>
                </div>
                <div className="check-item">
                  <span className="check-mark"><Keyboard size={13} /></span>
                  <span>
                    <strong>Muscle memory intact</strong>
                    Ctrl+T, Ctrl+Shift+T, Ctrl+Shift+N, Ctrl+W — all where you left them.
                  </span>
                </div>
              </div>
            </div>
            <Reveal delay={80}>
              <div className="panel">
                <div className="eyebrow" style={{ marginBottom: 16 }}>Import found</div>
                {[
                  ['Google Chrome', '1,204 bookmarks · 3 extensions', true],
                  ['Mozilla Firefox', '412 bookmarks · 18 passwords', true],
                  ['Brave', '88 bookmarks', false],
                  ['Opera GX', 'Not installed', false]
                ].map(([name, detail, found]) => (
                  <div
                    key={String(name)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '13px 0',
                      borderBottom: '1px solid var(--border)'
                    }}
                  >
                    <span
                      style={{
                        width: 30,
                        height: 30,
                        borderRadius: 9,
                        display: 'grid',
                        placeItems: 'center',
                        background: found ? 'color-mix(in srgb, var(--accent) 16%, transparent)' : 'var(--surface-2)',
                        color: found ? 'var(--accent)' : 'var(--text-faint)'
                      }}
                    >
                      {found ? <Check size={14} /> : <Minus size={14} />}
                    </span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 500 }}>{name}</div>
                      <div style={{ fontSize: 11.5, color: 'var(--text-faint)' }}>{detail}</div>
                    </div>
                    {found && <span style={{ fontSize: 11, color: 'var(--accent-2)', fontWeight: 600 }}>READY</span>}
                  </div>
                ))}
                <button className="btn btn-primary btn-sm" style={{ width: '100%', marginTop: 18 }}>
                  Import selected
                </button>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <SectionHead
            center
            eyebrow="A closer look"
            title="Real screens, not renders of an idea"
            body="Every image below is generated from the interface's own design tokens, so what you see is what ships."
          />
          <Reveal>
            <div className="panel-img" style={{ marginBottom: 16 }}>
              <img src="/screenshots/03-split-view.png" alt="Kimmino split view: a documentation page beside a video site" style={{ width: '100%', display: 'block' }} loading="lazy" />
            </div>
          </Reveal>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Reveal delay={60}>
              <div className="panel-img">
                <img src="/screenshots/02-privacy-settings.png" alt="Privacy and security settings" style={{ width: '100%', display: 'block' }} loading="lazy" />
              </div>
              <p className="small muted" style={{ marginTop: 10 }}>
                Six enforced protections, each with its own switch and a live counter of what was stopped.
              </p>
            </Reveal>
            <Reveal delay={120}>
              <div className="panel-img">
                <img src="/screenshots/04-themes.png" alt="Themes gallery" style={{ width: '100%', display: 'block' }} loading="lazy" />
              </div>
              <p className="small muted" style={{ marginTop: 10 }}>
                Twenty palettes, a theme studio, and importable <code className="inline">.kimmino-theme</code> files.
              </p>
            </Reveal>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <SectionHead
            center
            eyebrow="Honest comparison"
            title="How it stacks up"
            body="You should not have to trust a marketing table — every claim below is checkable in the source code, which is public."
          />
          <Reveal>
            <div style={{ overflowX: 'auto' }}>
              <table className="compare">
                <thead>
                  <tr>
                    <th></th>
                    <th className="kimmino-col">Kimmino</th>
                    <th>Chrome</th>
                    <th>Opera</th>
                    <th>Firefox</th>
                  </tr>
                </thead>
                <tbody>
                  {COMPARE.map((row) => (
                    <tr key={row.label}>
                      <td>{row.label}</td>
                      <td className="kimmino-col yes">
                        {row.kimmino ? <Check size={16} style={{ margin: '0 auto' }} /> : <X size={16} style={{ margin: '0 auto' }} />}
                      </td>
                      <td className={row.chrome ? 'yes' : 'no'}>
                        {row.chrome ? <Check size={16} style={{ margin: '0 auto' }} /> : <X size={16} style={{ margin: '0 auto' }} />}
                      </td>
                      <td className={row.opera ? 'yes' : 'no'}>
                        {row.opera ? <Check size={16} style={{ margin: '0 auto' }} /> : <X size={16} style={{ margin: '0 auto' }} />}
                      </td>
                      <td className={row.firefox ? 'yes' : 'no'}>
                        {row.firefox ? <Check size={16} style={{ margin: '0 auto' }} /> : <X size={16} style={{ margin: '0 auto' }} />}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="section tight">
        <div className="container">
          <Reveal>
            <div className="cta">
              <span className="eyebrow" style={{ justifyContent: 'center', display: 'flex', marginBottom: 14 }}>
                <Github size={13} /> Open source
              </span>
              <h2>Audit it. Fork it. Ship it.</h2>
              <p>
                Every line of Kimmino is on GitHub under the MPL-2.0. Read the privacy engine, argue with the defaults,
                or build your own browser on top of it — no permission needed.
              </p>
              <div className="hero-actions">
                <a className="btn btn-primary" href={downloadFor(platform)}>
                  <Download size={16} /> Download Kimmino
                </a>
                <a className="btn btn-ghost" href={SITE.repo} target="_blank" rel="noreferrer">
                  <Github size={16} /> sdlksdsf/PROJECT-2
                </a>
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
