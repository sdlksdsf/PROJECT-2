import {
  Accessibility,
  ArrowRight,
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
  Globe2,
  History,
  Import,
  Keyboard,
  Languages,
  Layers,
  Lock,
  MousePointerClick,
  Palette,
  PictureInPicture2,
  ShieldCheck,
  ShieldOff,
  Sparkles,
  Timer,
  UserRound,
  Wand2,
  X,
  Zap
} from 'lucide-react';
import { Reveal, SectionHead } from '../components/Chrome';
import { Link } from 'react-router-dom';

type FeatureItem = {
  icon: React.ComponentType<{ size?: number }>;
  title: string;
  body: string;
  tag?: string;
};

const GROUPS: Array<{ id: string; eyebrow: string; title: string; body: string; items: FeatureItem[] }> = [
  {
    id: 'privacy',
    eyebrow: 'Privacy',
    title: 'Built so the default is the safe answer',
    body: 'The privacy engine sits in the Electron main process, not in a page script. Nothing can be disabled by a website, and nothing is sent anywhere.',
    items: [
      { icon: ShieldOff, title: 'Ad blocking', body: 'Compiled EasyList + uAssets bundle: 46,999 ad-server domains, 1,240 URL patterns and 29,877 cosmetic rules. Toggleable per site, with a live counter.', tag: 'Default on' },
      { icon: EyeOff, title: 'Tracker blocking', body: '483 tracker domains, 508 patterns and removeparam rules that strip utm_*, fbclid, gclid and friends from every outbound request.', tag: 'Default on' },
      { icon: Cookie, title: 'Cookie denial', body: 'Third-party cookies refused at the session layer; consent-manager widgets are auto-rejected; cookie banners get a cosmetic rule so they stop covering the page.', tag: 'Default on' },
      { icon: Fingerprint, title: 'Fingerprint randomisation', body: 'Canvas, WebGL vendor/renderer, audio context, fonts, timezone, screen size, device memory, plugins and navigator.hardwareConcurrency are answered per-session, per-site.', tag: 'Default on' },
      { icon: Globe2, title: 'Location & WebRTC lock', body: 'Geolocation resolves to denied unless you explicitly trust a site. WebRTC is restricted to the default public interface so your LAN IP cannot leak.', tag: 'Default on' },
      { icon: ShieldCheck, title: 'Permission firewall', body: 'Unknown origins get a silent refusal plus a warning chip. Trusted origins get normal prompts. Decisions are stored per profile, not globally.', tag: 'Per site' },
      { icon: Lock, title: 'Transport hardening', body: 'HTTPS-first upgrades, HSTS preload list, no Referer cross-origin, no client hints beyond a stock Chrome string, DNT and Sec-GPC always sent.', tag: 'Always on' },
      { icon: History, title: 'Erase everything', body: 'History, cookies, cache, storage, downloads, autofill, site settings — pick a range and a category, erase in one transaction.', tag: 'You decide' }
    ]
  },
  {
    id: 'performance',
    eyebrow: 'Performance',
    title: 'Light by construction, not by marketing',
    body: 'A browser is a memory manager with a renderer attached. Kimmino treats memory as the scarce resource it is.',
    items: [
      { icon: Layers, title: 'Tab freezing', body: 'Tabs hidden for 30 seconds stop running timers, animations and intervals. Thawing is instant — state is kept in place.' },
      { icon: Cpu, title: 'Renderer discard', body: 'Under memory pressure idle renderers are discarded entirely; the tab reloads from its saved scroll position.' },
      { icon: Gauge, title: 'Startup budget', body: 'No updater daemon, no crash reporter, no background sync. Cold start under a second on an NVMe drive.' },
      { icon: Zap, title: 'GPU first', body: 'Hardware acceleration, smooth scrolling and zero-copy video are on by default; one switch disables them for troublesome drivers.' },
      { icon: Timer, title: 'Auto-suspend while gaming', body: 'Kimmino detects fullscreen exclusive apps and suspends non-audible tabs automatically instead of stealing frames.' },
      { icon: ShieldCheck, title: 'Fewer requests, less CPU', body: 'Blocking 47k ad domains is also a performance feature: no scripts, no pixels, no layout thrash from ads.' }
    ]
  },
  {
    id: 'productivity',
    eyebrow: 'Productivity',
    title: 'Tabs, panes and shortcuts that keep up',
    body: 'Everything a power user reaches for daily, without installing three extensions and a command palette.',
    items: [
      { icon: Columns2, title: 'Real split view', body: 'Two live WebContents side by side, resizable, with per-pane focus. Split a tab, split another, swap sides with a shortcut.' },
      { icon: Keyboard, title: '40+ shortcuts', body: 'Chrome-compatible core plus Kimmino extras: split view, screenshot, focus mode, AI panel, mute all, tab search.' },
      { icon: MousePointerClick, title: 'Command palette', body: 'Ctrl+K searches tabs, bookmarks, history and settings in one fuzzy-ranked list.' },
      { icon: Camera, title: 'Screenshots', body: 'Visible area or full page, PNG or JPEG, straight into Pictures/Kimmino with a timestamped name.' },
      { icon: History, title: 'Searchable history', body: 'Full-text history search with per-day grouping and a one-click “forget this site” action.' },
      { icon: PictureInPicture2, title: 'Picture-in-picture & mute-all', body: 'Native PiP, per-tab audio indicators and a single mute-everything shortcut when a call starts.' }
    ]
  },
  {
    id: 'customisation',
    eyebrow: 'Customisation',
    title: 'A start page you actually like looking at',
    body: 'Twelve wallpapers, twenty themes, a drag-anywhere layout and a full editor for people who want to go further.',
    items: [
      { icon: Palette, title: '20 built-in themes', body: 'From OLED black to warm paper. Each theme sets accent, surface, text and border tokens across the entire UI — no half-themed dialogs.' },
      { icon: Wand2, title: 'Theme editor & import', body: 'Design a palette in the developer panel, export a .kimmino-theme JSON, share it, import someone else’s.' },
      { icon: Sparkles, title: 'Live & custom wallpapers', body: 'Animated gradients ship in the box; drop in your own JPG, PNG or WebP and it is cropped, optimised and stored per profile.' },
      { icon: MousePointerClick, title: 'Drag-to-place layout', body: 'Move the search box, clock, dials and shortcuts anywhere on the grid. Layout is saved per profile.' },
      { icon: Accessibility, title: 'Text scaling & contrast', body: '90–150% UI scaling, four contrast levels and reduced-motion support that also tells sites to calm down.' },
      { icon: Languages, title: '12 languages', body: 'Interface localised into English, Urdu, Arabic, Spanish, French, German, Portuguese, Hindi, Japanese, Korean, Chinese and Russian.' }
    ]
  },
  {
    id: 'gamers',
    eyebrow: 'For gamers',
    title: 'Does not steal your frames',
    body: 'Kimmino was built by people who alt-tab. These are the features that came out of that.',
    items: [
      { icon: Focus, title: 'Focus mode', body: 'Study timer with Pomodoro presets, a hard tab limit, and a blocklist that refuses to open distractions until the timer ends.' },
      { icon: EyeOff, title: 'Force dark on any site', body: 'A smart inversion that respects images, video and logos — applied per site, remembered forever.' },
      { icon: Sparkles, title: 'Video enhancement', body: 'Sharpen and denoise YouTube playback, remember per-channel quality, and stop autoplay from ambushing you.' },
      { icon: Keyboard, title: 'Typing sounds', body: 'Optional mechanical-key clicks for the omnibox and search, with three sample packs and a volume slider.' },
      { icon: Zap, title: 'Game-aware suspension', body: 'Background tabs release CPU the moment a fullscreen game takes focus; audio tabs are exempt.' },
      { icon: Blocks, title: 'Audio & video popout', body: 'Pop a video into a borderless always-on-top window for a second monitor in one click.' }
    ]
  },
  {
    id: 'accounts',
    eyebrow: 'Profiles & sync',
    title: 'Accounts are optional. Profiles are not.',
    body: 'Use Kimmino forever without signing in. If you want sync, opt in — and only the things you tick ever leave the machine.',
    items: [
      { icon: UserRound, title: 'Multiple private profiles', body: 'Each profile has its own cookies, history, extensions, settings and theme. A profile chooser greets you at launch.' },
      { icon: Lock, title: 'Local-first sync', body: 'Bookmarks, preferences and dials sync as encrypted blobs to your own Supabase project — no Kimmino server exists.' },
      { icon: ShieldCheck, title: 'Email verification', body: 'Google-style sign-in with a six-digit code. No password to leak; sessions expire and can be revoked per device.' },
      { icon: Import, title: 'Import from any browser', body: 'Chrome, Edge, Firefox, Brave, Opera, Vivaldi, Safari (via export) — bookmarks, history, passwords and preferences.' },
      { icon: Blocks, title: 'Extensions', body: 'Load unpacked Chromium extensions with an honest compatibility report. MV3 support is in progress and stated plainly.' },
      { icon: Download, title: 'Backup & restore', body: 'One JSON file holds your profile: bookmarks, dials, themes, settings. Restore on a new machine in seconds.' }
    ]
  }
];

export function Features() {
  return (
    <>
      <section className="dl-hero">
        <div className="container">
          <span className="eyebrow">Features</span>
          <h1>
            Everything, <span className="gradient-text">nothing extra</span>
          </h1>
          <p className="hero-sub" style={{ margin: '0 auto' }}>
            A complete tour of what ships in Kimmino 1.0 — including the parts other browsers bury in a settings page
            you will never open.
          </p>
          <div className="hero-actions">
            <Link className="btn btn-primary" to="/download">
              <Download size={16} /> Get Kimmino
            </Link>
            <Link className="btn btn-ghost" to="/docs#shortcuts">
              <Keyboard size={16} /> Shortcut reference
            </Link>
          </div>
        </div>
      </section>

      {GROUPS.map((group, groupIndex) => (
        <section
          key={group.id}
          id={group.id}
          className="section"
          style={
            groupIndex % 2 === 1
              ? { background: 'var(--bg-soft)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }
              : undefined
          }
        >
          <div className="container">
            <SectionHead eyebrow={group.eyebrow} title={group.title} body={group.body} />
            <div className="feature-grid">
              {group.items.map((item, index) => (
                <Reveal className="feature-card" key={item.title} delay={index * 35} as="article">
                  <div className="feature-icon">
                    <item.icon size={19} />
                  </div>
                  <h3>{item.title}</h3>
                  <p>{item.body}</p>
                  {item.tag && (
                    <span className="feature-tag">
                      <Check size={11} /> {item.tag}
                    </span>
                  )}
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      ))}

      <section className="section">
        <div className="container">
          <Reveal>
            <div className="cta">
              <h2>No bloatware. No bundled VPN upsell.</h2>
              <p>
                Kimmino installs one app and adds one shortcut. No driver, no service, no “companion” process, no
                crypto wallet, no affiliate shopping panel.
              </p>
              <div className="hero-actions">
                <Link className="btn btn-primary" to="/download">
                  <Download size={16} /> Download for free
                </Link>
                <Link className="btn btn-ghost" to="/privacy">
                  Read the privacy policy <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
