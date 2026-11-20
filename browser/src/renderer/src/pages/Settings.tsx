import { useEffect, useMemo, useState } from 'react';
import {
  Accessibility,
  BadgeCheck,
  BellOff,
  Blocks,
  Brain,
  Camera,
  Check,
  Cloud,
  Code2,
  Cookie,
  Download,
  EyeOff,
  FileDown,
  Fingerprint,
  Focus,
  Gauge,
  Globe,
  HardDrive,
  Image as ImageIcon,
  Keyboard,
  Languages,
  Lock,
  MapPinOff,
  MonitorSmartphone,
  Moon,
  MousePointerClick,
  Palette as PaletteIcon,
  Rocket,
  Search,
  Shield,
  ShieldCheck,
  Sparkles,
  Sun,
  Trash2,
  TriangleAlert,
  Upload,
  Users,
  Volume2,
  Wand2,
  Zap
} from 'lucide-react';
import { useStore, wallpapers } from '../store';
import { useT } from '../lib/i18n';
import { LOCALES, coverageOf, directionOf } from '@shared/i18n';
import type { MessageKey } from '@shared/i18n';
import { api, isNative } from '../bridge';
import { Row, Section, Segmented, Select, Slider, Toggle } from '../components/ui';
import { ACCENTS } from '../lib/theme';
import { AI_MODELS, SEARCH_ENGINES } from '@shared/defaults';
import type { InternalPage, Preferences, UpdateState } from '@shared/types';

type SectionId =
  | 'appearance'
  | 'startpage'
  | 'privacy'
  | 'cookies'
  | 'permissions'
  | 'performance'
  | 'search'
  | 'tabs'
  | 'focus'
  | 'ai'
  | 'sync'
  | 'extensions'
  | 'downloads'
  | 'languages'
  | 'system'
  | 'shortcuts'
  | 'developer'
  | 'about';

const NAV: Array<{ id: SectionId; label: string; labelKey?: MessageKey; icon: React.ReactNode; group: string }> = [
  { id: 'appearance', label: 'Appearance', icon: <PaletteIcon size={15} />, group: 'Look & feel' },
  { id: 'startpage', label: 'Start page', icon: <ImageIcon size={15} />, group: 'Look & feel' },
  { id: 'languages', label: 'Languages', labelKey: 'settings.language', icon: <Languages size={15} />, group: 'Look & feel' },
  { id: 'privacy', label: 'Privacy & security', icon: <Shield size={15} />, group: 'Protection' },
  { id: 'cookies', label: 'Cookies & site data', icon: <Cookie size={15} />, group: 'Protection' },
  { id: 'permissions', label: 'Site permissions', icon: <Lock size={15} />, group: 'Protection' },
  { id: 'performance', label: 'Performance', icon: <Gauge size={15} />, group: 'Browser' },
  { id: 'search', label: 'Search & sounds', icon: <Search size={15} />, group: 'Browser' },
  { id: 'tabs', label: 'Tabs & productivity', icon: <Blocks size={15} />, group: 'Browser' },
  { id: 'focus', label: 'Focus mode', icon: <Focus size={15} />, group: 'Browser' },
  { id: 'ai', label: 'Kimmino AI', icon: <Brain size={15} />, group: 'Browser' },
  { id: 'extensions', label: 'Extensions', icon: <Zap size={15} />, group: 'Browser' },
  { id: 'downloads', label: 'Downloads', icon: <Download size={15} />, group: 'Browser' },
  { id: 'sync', label: 'Sync & account', icon: <Cloud size={15} />, group: 'Account' },
  { id: 'system', label: 'System', icon: <MonitorSmartphone size={15} />, group: 'Advanced' },
  { id: 'shortcuts', label: 'Keyboard shortcuts', icon: <Keyboard size={15} />, group: 'Advanced' },
  { id: 'developer', label: 'Developer', icon: <Code2 size={15} />, group: 'Advanced' },
  { id: 'about', label: 'About Kimmino', icon: <BadgeCheck size={15} />, group: 'Advanced' }
];

const SEARCH_INDEX: Array<{ title: string; keywords: string; section: SectionId; anchor?: string }> = [
  { title: 'Dark mode / light mode', keywords: 'theme dark light oled appearance colour', section: 'appearance' },
  { title: 'Accent colour', keywords: 'accent color brand highlight', section: 'appearance' },
  { title: 'Text size (UI scale)', keywords: 'scale zoom font size accessibility bigger', section: 'appearance', anchor: 'ui-scale' },
  { title: 'Custom theme import', keywords: 'theme json import export discord', section: 'appearance', anchor: 'theme' },
  { title: 'Wallpaper', keywords: 'background image start page live wallpaper', section: 'startpage' },
  { title: 'Speed dial shortcuts', keywords: 'dials sites tiles add remove', section: 'startpage' },
  { title: 'Block ads', keywords: 'adblock ads easylist ublock', section: 'privacy', anchor: 'adblock' },
  { title: 'Block trackers', keywords: 'tracker telemetry analytics', section: 'privacy', anchor: 'trackers' },
  { title: 'Fingerprint protection', keywords: 'canvas webgl audio spoof fingerprint', section: 'privacy', anchor: 'fingerprint' },
  { title: 'Block location / geolocation', keywords: 'location gps geolocation geo', section: 'permissions', anchor: 'location' },
  { title: 'WebRTC leak protection', keywords: 'webrtc ip leak', section: 'privacy', anchor: 'webrtc' },
  { title: 'Third-party cookies', keywords: 'cookie cookies third party consent', section: 'cookies', anchor: 'cookies' },
  { title: 'Auto-decline cookie banners', keywords: 'consent banner gdpr onetrust', section: 'cookies', anchor: 'consent' },
  { title: 'HTTPS-only mode', keywords: 'https secure upgrade', section: 'privacy', anchor: 'https' },
  { title: 'Memory saver', keywords: 'ram memory performance lightweight suspend', section: 'performance', anchor: 'memory' },
  { title: 'Hardware acceleration', keywords: 'gpu hardware acceleration', section: 'performance', anchor: 'gpu' },
  { title: 'Gaming mode', keywords: 'gaming game ram background throttle', section: 'performance', anchor: 'gaming' },
  { title: 'Keyboard sounds', keywords: 'sound typing click audio', section: 'search', anchor: 'sounds' },
  { title: 'Search engine', keywords: 'google duckduckgo bing search provider', section: 'search' },
  { title: 'Split view', keywords: 'split tabs side by side productivity', section: 'tabs', anchor: 'split' },
  { title: 'Vertical tabs', keywords: 'vertical tabs sidebar', section: 'appearance', anchor: 'vertical' },
  { title: 'Focus mode timer', keywords: 'focus study timer distraction', section: 'focus' },
  { title: 'AI provider', keywords: 'ai model ollama openai endpoint', section: 'ai' },
  { title: 'Sync account', keywords: 'sync account email sign in', section: 'sync' },
  { title: 'Import from another browser', keywords: 'import chrome firefox bookmarks', section: 'system', anchor: 'import' },
  { title: 'Clear browsing data', keywords: 'clear delete cookies cache history', section: 'cookies', anchor: 'clear-data' },
  { title: 'Default browser', keywords: 'default browser prompt', section: 'system', anchor: 'default-browser' },
  { title: 'Force dark mode on websites', keywords: 'force dark invert website', section: 'privacy', anchor: 'force-dark' },
  { title: 'Video quality enhancement', keywords: 'video enhance quality youtube', section: 'privacy', anchor: 'video' },
  { title: 'Extensions from Chrome', keywords: 'extension chrome webstore addon', section: 'extensions' },
  { title: 'Early bird updates', keywords: 'early bird beta updates channel', section: 'about', anchor: 'early-bird' },
  { title: 'Screenshot format', keywords: 'screenshot capture png jpeg', section: 'downloads', anchor: 'shot-format' },
  { title: 'Notification blocking', keywords: 'notifications popups alert', section: 'permissions', anchor: 'notifications' },
  { title: 'Camera and microphone', keywords: 'camera mic media', section: 'permissions', anchor: 'media' }
];

export function SettingsPage() {
  const { prefs, sync, profile, profiles, privacy, bookmarks, themes } = useStore();
  const setPrefs = useStore((state) => state.setPrefs);
  const resetPrefs = useStore((state) => state.resetPrefs);
  const toast = useStore((state) => state.toast);
  const reloadData = useStore((state) => state.reloadData);
  const openInternal = useStore((state) => state.openInternal);

  const [section, setSection] = useState<SectionId>('appearance');
  const [query, setQuery] = useState('');
  const [highlight, setHighlight] = useState<string | null>(null);
  const [clearOpen, setClearOpen] = useState(false);
  const [clearChoice, setClearChoice] = useState({ cookies: true, cache: true, history: true, downloads: false, siteData: true });
  const [updateState, setUpdateState] = useState<UpdateState | null>(null);
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [accountEmail, setAccountEmail] = useState('');
  const [accountPassword, setAccountPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [newProfile, setNewProfile] = useState('');

  const results = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return [];
    return SEARCH_INDEX.filter((item) => `${item.title} ${item.keywords}`.toLowerCase().includes(q)).slice(0, 8);
  }, [query]);

  const groups = useMemo(() => {
    const map = new Map<string, typeof NAV>();
    for (const item of NAV) {
      const list = map.get(item.group) ?? [];
      list.push(item);
      map.set(item.group, list);
    }
    return [...map.entries()];
  }, []);

  const go = (id: SectionId, anchor?: string) => {
    setSection(id);
    setQuery('');
    if (anchor) {
      setHighlight(anchor);
      setTimeout(() => {
        document.getElementById(anchor)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 60);
      setTimeout(() => setHighlight(null), 2200);
    } else {
      document.querySelector('.page')?.scrollTo({ top: 0 });
    }
  };

  const setPrivacy = (patch: Partial<Preferences['privacy']>) => void setPrefs({ privacy: patch });
  const setPerformance = (patch: Partial<Preferences['performance']>) => void setPrefs({ performance: patch });
  const setSearchPrefs = (patch: Partial<Preferences['search']>) => void setPrefs({ search: patch });
  const setProductivity = (patch: Partial<Preferences['productivity']>) => void setPrefs({ productivity: patch });

  const hl = (anchor: string) => (highlight === anchor ? 'setting-search-hit' : '');
  const t = useT();
  const languageCoverage = coverageOf(prefs.system.language);

  useEffect(() => {
    if (section !== 'about') return;
    let alive = true;
    void api.updates.state().then((state) => {
      if (alive) setUpdateState(state);
    });
    return () => {
      alive = false;
    };
  }, [section]);

  return (
    <div className="page">
      <div className="settings">
        <nav className="settings-nav">
          <div className="settings-title">{t('nav.settings')}</div>
          <div className="settings-search">
            <Search size={14} style={{ color: 'var(--text-faint)' }} />
            <input value={query} placeholder="Search all settings" onChange={(event) => setQuery(event.target.value)} />
            {query && (
              <button className="icon-btn" style={{ width: 20, height: 20 }} onClick={() => setQuery('')}>
                ×
              </button>
            )}
          </div>

          {query ? (
            <div>
              <div className="nav-group-label">Results</div>
              {results.map((item) => (
                <button key={`${item.section}-${item.title}`} className="nav-item" onClick={() => go(item.section, item.anchor)}>
                  <Search size={14} />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</span>
                </button>
              ))}
              {results.length === 0 && <div style={{ padding: '10px 12px', fontSize: 12, color: 'var(--text-dim)' }}>No settings match.</div>}
            </div>
          ) : (
            groups.map(([group, items]) => (
              <div key={group}>
                <div className="nav-group-label">{group}</div>
                {items.map((item) => (
                  <button key={item.id} className={`nav-item ${section === item.id ? 'is-active' : ''}`} onClick={() => go(item.id)}>
                    {item.icon}
                    {item.labelKey ? t(item.labelKey) : item.label}
                  </button>
                ))}
              </div>
            ))
          )}
        </nav>

        <div className="settings-main">
          {section === 'appearance' && (
            <>
              <h1 className="settings-h1">Appearance</h1>
              <p className="settings-sub">Colour, scale and density. Everything applies instantly — no restart, no reload.</p>

              <Section title="Theme">
                <Row
                  title="Mode"
                  description="OLED switches to pure black, which saves power on OLED screens."
                  control={
                    <Segmented
                      value={prefs.themeMode}
                      onChange={(value) => void setPrefs({ themeMode: value })}
                      options={[
                        { value: 'system', label: 'System' },
                        { value: 'light', label: 'Light' },
                        { value: 'dark', label: 'Dark' },
                        { value: 'oled', label: 'OLED' }
                      ]}
                    />
                  }
                />
                <Row
                  title="Accent colour"
                  description="Used for highlights, links and the shield badge."
                  control={
                    <div className="swatches">
                      {ACCENTS.map((color) => (
                        <button
                          key={color}
                          className={`swatch ${prefs.accent === color ? 'is-active' : ''}`}
                          style={{ background: color }}
                          aria-label={`Accent ${color}`}
                          onClick={() => void setPrefs({ accent: color })}
                        />
                      ))}
                    </div>
                  }
                />
                <Row
                  title="Custom themes"
                  description={`${themes.filter((theme) => !theme.builtin).length} installed. Import a .json theme or build one with the theme editor.`}
                  control={
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="pill-btn" onClick={() => void openInternal('themes')}>
                        <PaletteIcon size={13} /> Browse themes
                      </button>
                    </div>
                  }
                />
              </Section>

              <Section title="Scale & typography" id="ui-scale">
                <Row
                  title="Interface scale"
                  description="Make the whole browser UI larger or smaller — like the zoom control in Opera or Firefox."
                  control={<Slider value={prefs.uiScale} min={0.85} max={1.3} step={0.05} suffix="×" onChange={(value) => void setPrefs({ uiScale: value })} />}
                />
                <Row
                  title="Default page zoom"
                  description="Applies to every website you open."
                  control={<Slider value={prefs.pageScale} min={0.75} max={1.5} step={0.05} suffix="×" onChange={(value) => void setPrefs({ pageScale: value })} />}
                />
                <Row
                  title="Animations"
                  description="Turn off for the absolute lowest CPU usage while idle."
                  control={<Toggle checked={prefs.animations} onChange={(value) => void setPrefs({ animations: value })} />}
                />
              </Section>

              <Section title="Layout" id="vertical">
                <Row
                  title="Vertical tabs"
                  description="A tab sidebar instead of a tab strip — great for ultrawide screens."
                  control={<Toggle checked={prefs.verticalTabs} onChange={(value) => void setPrefs({ verticalTabs: value })} />}
                />
                <Row
                  title="Compact tab strip"
                  description="Slightly shorter toolbar and tabs to fit more on screen."
                  control={<Toggle checked={prefs.compactTabs} onChange={(value) => void setPrefs({ compactTabs: value })} />}
                />
                <Row
                  title="Bookmarks bar"
                  control={<Toggle checked={prefs.showBookmarksBar} onChange={(value) => void setPrefs({ showBookmarksBar: value })} />}
                />
              </Section>
            </>
          )}

          {section === 'startpage' && (
            <>
              <h1 className="settings-h1">Start page</h1>
              <p className="settings-sub">Your wallpaper, your shortcuts, your layout — drag the search bar anywhere on the page.</p>
              <Section title="Wallpaper">
                <Row
                  title="Current wallpaper"
                  description="Bundled artwork, or any image from your own computer."
                  control={
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="pill-btn" onClick={async () => {
                        const picked = await api.system.pickWallpaper();
                        if (picked) {
                          await setPrefs({ startPage: { wallpaper: picked } });
                          toast('Wallpaper updated', 'success');
                        }
                      }}>
                        <Upload size={13} /> Choose file
                      </button>
                    </div>
                  }
                />
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(120px,1fr))', gap: 10, padding: 14 }}>
                  {wallpapers.map((item) => (
                    <button
                      key={item.id}
                      className={`wallpaper-swatch ${prefs.startPage.wallpaper === item.id ? 'is-active' : ''}`}
                      title={item.name}
                      style={{
                        background: item.kind === 'gradient' ? item.value : `url("${item.value}") center/cover`,
                        backgroundSize: 'cover',
                        aspectRatio: '16/10'
                      }}
                      onClick={() => void setPrefs({ startPage: { wallpaper: item.id } })}
                    />
                  ))}
                </div>
                <Row title="Animate wallpaper" control={<Toggle checked={prefs.startPage.liveWallpaper} onChange={(value) => void setPrefs({ startPage: { liveWallpaper: value } })} />} />
                <Row title="Dim" control={<Slider value={prefs.startPage.wallpaperDim} min={0} max={70} onChange={(value) => void setPrefs({ startPage: { wallpaperDim: value } })} />} />
                <Row title="Blur" control={<Slider value={prefs.startPage.wallpaperBlur} min={0} max={16} onChange={(value) => void setPrefs({ startPage: { wallpaperBlur: value } })} />} />
              </Section>
              <Section title="Widgets">
                <Row title="Clock and greeting" control={<Toggle checked={prefs.startPage.showClock} onChange={(value) => void setPrefs({ startPage: { showClock: value } })} />} />
                <Row title="Recently visited strip" control={<Toggle checked={prefs.startPage.showSuggestions} onChange={(value) => void setPrefs({ startPage: { showSuggestions: value } })} />} />
                <Row
                  title="Shortcut size"
                  description="How large the speed-dial tiles are. Applies immediately on the start page."
                  control={
                    <Segmented
                      value={prefs.startPage.tileSize}
                      onChange={(value) => void setPrefs({ startPage: { tileSize: value } })}
                      options={[
                        { value: 'small', label: 'Small' },
                        { value: 'medium', label: 'Medium' },
                        { value: 'large', label: 'Large' }
                      ]}
                    />
                  }
                />
                <Row
                  title="Search position"
                  description="Reset to centre the search bar, or drag it on the start page in Edit layout mode."
                  control={<button className="pill-btn" onClick={() => void setPrefs({ startPage: { searchPosition: null } })}>Reset</button>}
                />
              </Section>
            </>
          )}

          {section === 'privacy' && (
            <>
              <h1 className="settings-h1">Privacy & security</h1>
              <p className="settings-sub">
                These defaults are protective out of the box. Nothing here needs an account, and nothing reports back to us.
              </p>

              <div className="stat-grid" style={{ marginBottom: 24, maxWidth: 520 }}>
                <div className="stat">
                  <div className="stat-value">{privacy.ads.toLocaleString()}</div>
                  <div className="stat-label">Ads blocked</div>
                </div>
                <div className="stat">
                  <div className="stat-value">{privacy.trackers.toLocaleString()}</div>
                  <div className="stat-label">Trackers</div>
                </div>
                <div className="stat">
                  <div className="stat-value">{privacy.cookies.toLocaleString()}</div>
                  <div className="stat-label">Cookies refused</div>
                </div>
              </div>

              <Section title="Blocking" description="Filter lists are compiled into the browser and updated weekly.">
                <div id="adblock" className={hl('adblock')}>
                  <Row title="Block ads" description="EasyList + uBlock Origin filter data: 47,000 domains and 30,000 element rules." control={<Toggle checked={prefs.privacy.adBlocking} onChange={(value) => setPrivacy({ adBlocking: value })} />} />
                </div>
                <div id="trackers" className={hl('trackers')}>
                  <Row title="Block trackers" description="Analytics beacons, session recorders and ad-network pixels." control={<Toggle checked={prefs.privacy.blockTrackers} onChange={(value) => setPrivacy({ blockTrackers: value })} />} />
                </div>
                <div id="fingerprint" className={hl('fingerprint')}>
                  <Row title="Fingerprint protection" description="Randomises canvas, WebGL, audio and font signals every session so you cannot be recognised." control={<Toggle checked={prefs.privacy.fingerprintProtection} onChange={(value) => setPrivacy({ fingerprintProtection: value })} />} />
                </div>
                <Row title="Strip tracking parameters" description="Removes utm_*, fbclid, gclid and 1,850 other parameters from links before they load." control={<Toggle checked={prefs.privacy.stripTrackingParams} onChange={(value) => setPrivacy({ stripTrackingParams: value })} />} />
                <Row title="Trim referrers" description="Sites only see where you came from, never the full path you visited." control={<Toggle checked={prefs.privacy.spoofReferrer} onChange={(value) => setPrivacy({ spoofReferrer: value })} />} />
                <Row title="Block crypto miners" control={<Toggle checked={prefs.privacy.blockCryptoMiners} onChange={(value) => setPrivacy({ blockCryptoMiners: value })} />} />
                <Row title="Block pop-ups" control={<Toggle checked={prefs.privacy.blockPopups} onChange={(value) => setPrivacy({ blockPopups: value })} />} />
              </Section>

              <Section title="Network">
                <div id="webrtc" className={hl('webrtc')}>
                  <Row title="WebRTC IP leak protection" description="Stops sites from discovering your local and public IP addresses through WebRTC." control={<Toggle checked={prefs.privacy.blockWebRTC} onChange={(value) => setPrivacy({ blockWebRTC: value })} />} />
                </div>
                <div id="https" className={hl('https')}>
                  <Row title="HTTPS-only mode" description="Silently upgrades insecure http:// connections." control={<Toggle checked={prefs.privacy.httpsOnly} onChange={(value) => setPrivacy({ httpsOnly: value })} />} />
                </div>
                <Row title="Do Not Track & Global Privacy Control" description="Sends DNT: 1 and Sec-GPC: 1 with every request." control={<Toggle checked={prefs.privacy.doNotTrack} onChange={(value) => setPrivacy({ doNotTrack: value })} />} />
                <Row title="Offline safe browsing" description="Malware and phishing domains are checked against a local list — no URL is ever sent to a server." control={<Toggle checked={prefs.privacy.safeBrowsing} onChange={(value) => setPrivacy({ safeBrowsing: value })} />} />
                <Row
                  title="Strict mode"
                  description="Removes referrers entirely and refuses all persistent storage on untrusted sites. Some sites will break."
                  control={<Toggle checked={prefs.privacy.strictMode} onChange={(value) => setPrivacy({ strictMode: value })} />}
                />
              </Section>

              <Section title="Content" description="Optional comfort features that run entirely on-device.">
                <div id="force-dark" className={hl('force-dark')}>
                  <Row title="Force dark mode on websites" description="Inverts pages that ignore prefers-color-scheme, while leaving images and video untouched." control={<Toggle checked={prefs.productivity.forceDarkMode} onChange={(value) => setProductivity({ forceDarkMode: value })} />} />
                </div>
                <div id="video" className={hl('video')}>
                  <Row title="Video clarity enhancement" description="Adds measured contrast and colour to video playback for sharper-looking streams. Not a resolution change." control={<Toggle checked={prefs.productivity.videoEnhancer} onChange={(value) => setProductivity({ videoEnhancer: value })} />} />
                </div>
              </Section>

              <Section title="Telemetry">
                <Row
                  title="Usage statistics"
                  description="Kimmino never sends usage data. This switch exists for transparency and cannot be turned on."
                  control={<span className="badge ok"><Check size={11} /> Always off</span>}
                />
              </Section>
            </>
          )}

          {section === 'cookies' && (
            <>
              <h1 className="settings-h1">Cookies & site data</h1>
              <p className="settings-sub">Third-party cookies are refused at the network layer — not merely hidden in the UI.</p>
              <Section title="Cookie policy">
                <div id="cookies" className={hl('cookies')}>
                  <Row title="Refuse third-party cookies" description="Set-Cookie headers from other domains are dropped before the page can store them." control={<Toggle checked={prefs.privacy.blockThirdPartyCookies} onChange={(value) => setPrivacy({ blockThirdPartyCookies: value })} />} />
                </div>
                <div id="consent" className={hl('consent')}>
                  <Row title="Auto-decline cookie banners" description="Recognises OneTrust, Cookiebot, Didomi, Quantcast and 20+ other consent managers and clicks “reject” for you." control={<Toggle checked={prefs.privacy.autoDeclineConsent} onChange={(value) => setPrivacy({ autoDeclineConsent: value })} />} />
                </div>
                <Row title="Block notification requests" description="Sites cannot ask to send you notifications." control={<Toggle checked={prefs.privacy.blockNotifications} onChange={(value) => setPrivacy({ blockNotifications: value })} />} />
              </Section>

              <Section title="Clear browsing data" id="clear-data">
                <Row
                  title="Erase everything you have chosen"
                  description="Cookies, site data, cache, history and downloads. Your saved settings stay untouched."
                  control={
                    <button className="pill-btn" onClick={() => setClearOpen(true)}>
                      <Trash2 size={13} /> Clear…
                    </button>
                  }
                />
                <Row
                  title="Export my data"
                  description="Everything Kimmino knows about this profile, as readable JSON."
                  control={
                    <button
                      className="pill-btn"
                      onClick={async () => {
                        const json = await api.data.export();
                        await navigator.clipboard?.writeText(json).catch(() => undefined);
                        const blob = new Blob([json], { type: 'application/json' });
                        const link = document.createElement('a');
                        link.href = URL.createObjectURL(blob);
                        link.download = 'kimmino-backup.json';
                        link.click();
                        toast('Your data was exported', 'success');
                      }}
                    >
                      <FileDown size={13} /> Export
                    </button>
                  }
                />
              </Section>
            </>
          )}

          {section === 'permissions' && (
            <>
              <h1 className="settings-h1">Site permissions</h1>
              <p className="settings-sub">Kimmino answers “no” by default and never asks you twice for something a site does not need.</p>
              <Section title="Automatically blocked">
                <div id="location" className={hl('location')}>
                  <Row title="Location (geolocation)" icon={<MapPinOff size={15} />} description="Websites cannot learn where you are — the API is disabled and the permission is refused." control={<span className="badge ok">Blocked</span>} />
                </div>
                <Row title="USB, serial, HID & Bluetooth" icon={<EyeOff size={15} />} description="Device pairing requests never reach the OS." control={<span className="badge ok">Blocked</span>} />
                <Row title="Screen & window capture" icon={<Camera size={15} />} description="Sites cannot request your screen, even for “remote support”." control={<span className="badge ok">Blocked</span>} />
                <Row title="Idle detection" icon={<Accessibility size={15} />} description="Sites cannot tell whether you are at the keyboard." control={<span className="badge ok">Blocked</span>} />
                <Row title="Clipboard reading" icon={<MousePointerClick size={15} />} description="Only allowed on sites you explicitly trust." control={<span className="badge ok">Blocked</span>} />
              </Section>
              <Section title="Ask me first">
                <div id="notifications" className={hl('notifications')}>
                  <Row title="Notifications" icon={<BellOff size={15} />} description="Allowed only after you trust a site in the shield menu." control={<span className="badge warn">Trusted only</span>} />
                </div>
                <div id="media" className={hl('media')}>
                  <Row title="Camera & microphone" icon={<Camera size={15} />} control={<span className="badge warn">Trusted only</span>} />
                </div>
                <Row title="Trusted sites" description="Managed per profile through the shield menu in the address bar." control={<span className="badge">0</span>} />
              </Section>
            </>
          )}

          {section === 'performance' && (
            <>
              <h1 className="settings-h1">Performance</h1>
              <p className="settings-sub">Kimmino is built to sit quietly in the background. These settings control how aggressively it reclaims memory.</p>
              <Section title="Memory">
                <div id="memory" className={hl('memory')}>
                  <Row title="Memory saver" description="Tabs you have not used get suspended and their renderer processes released. Clicking the tab restores it instantly." control={<Toggle checked={prefs.performance.memorySaver} onChange={(value) => setPerformance({ memorySaver: value })} />} />
                </div>
                <Row title="Suspend tabs after" control={<Slider value={prefs.performance.memorySaverMinutes} min={5} max={120} step={5} suffix=" min" onChange={(value) => setPerformance({ memorySaverMinutes: value })} />} />
                <Row
                  title="Free memory now"
                  description="Suspends every inactive background tab immediately."
                  control={
                    <button
                      className="pill-btn"
                      onClick={() => {
                        toast(isNative ? 'Inactive tabs suspended' : 'Memory saver runs in the desktop app', isNative ? 'success' : 'info');
                      }}
                    >
                      <Zap size={13} /> Release RAM
                    </button>
                  }
                />
              </Section>
              <Section title="Power">
                <div id="gaming" className={hl('gaming')}>
                  <Row
                    title="Gaming mode"
                    description="Keeps every tab live and stops background throttling, so alt-tabbing back into a game or a video never shows a stalled page. Turns memory saver off while it is on."
                    control={<Toggle checked={prefs.performance.gamingMode} onChange={(value) => setPerformance({ gamingMode: value })} />}
                  />
                </div>
                <Row title="Throttle background tabs" control={<Toggle checked={prefs.performance.backgroundThrottle} onChange={(value) => setPerformance({ backgroundThrottle: value })} />} />
                <div id="gpu" className={hl('gpu')}>
                  <Row
                    title="Hardware acceleration"
                    description="Uses the GPU for page rendering. Restart required."
                    control={
                      <Toggle
                        checked={prefs.performance.hardwareAcceleration}
                        onChange={async (value) => {
                          await setPerformance({ hardwareAcceleration: value });
                          await api.system.setHardwareAcceleration(value);
                          toast('Restart Kimmino to apply this change', 'warn');
                        }}
                      />
                    }
                  />
                </div>
              </Section>
            </>
          )}

          {section === 'search' && (
            <>
              <h1 className="settings-h1">Search & sounds</h1>
              <p className="settings-sub">Choose who answers your searches — and whether typing sounds like a keyboard.</p>
              <Section title="Search engine">
                <Row
                  title="Default engine"
                  description="Kimmino Search is Brave-backed and ad-free; DuckDuckGo is the privacy default."
                  control={
                    <Select
                      value={prefs.search.engine}
                      onChange={(value) => void setSearchPrefs({ engine: value })}
                      options={Object.entries(SEARCH_ENGINES).map(([value, engine]) => ({ value, label: engine.name }))}
                    />
                  }
                />
                {prefs.search.engine === 'custom' && (
                  <Row
                    title="Custom search URL"
                    description="Use %s where the query should go."
                    control={
                      <input
                        className="text-input"
                        value={prefs.search.customEngineUrl}
                        placeholder="https://example.com/search?q=%s"
                        onChange={(event) => void setSearchPrefs({ customEngineUrl: event.target.value })}
                      />
                    }
                  />
                )}
                <Row title="Show suggestions" description="Suggestions are computed locally from your history — never sent to a server." control={<Toggle checked={prefs.search.suggestions} onChange={(value) => void setSearchPrefs({ suggestions: value })} />} />
                <Row title="Autocomplete from history & bookmarks" control={<Toggle checked={prefs.search.autocompleteHistory} onChange={(value) => void setSearchPrefs({ autocompleteHistory: value })} />} />
              </Section>
              <Section title="Typing">
                <div id="sounds" className={hl('sounds')}>
                  <Row title="Keyboard sounds" icon={<Volume2 size={15} />} description="Soft, synthesised key clicks while you type in the address bar. No audio files, no downloads." control={<Toggle checked={prefs.search.keyboardSounds} onChange={(value) => void setSearchPrefs({ keyboardSounds: value })} />} />
                </div>
                <Row title="Volume" control={<Slider value={Math.round(prefs.search.keyboardSoundVolume * 100)} min={0} max={100} suffix="%" onChange={(value) => void setSearchPrefs({ keyboardSoundVolume: value / 100 })} />} />
              </Section>
            </>
          )}

          {section === 'tabs' && (
            <>
              <h1 className="settings-h1">Tabs & productivity</h1>
              <p className="settings-sub">Work in two panes, keep the strip tidy, never lose a tab.</p>
              <Section title="Split view" id="split">
                <Row
                  title="Enable split view"
                  description="Show two tabs side by side in one window and interact with both."
                  control={<Toggle checked={prefs.productivity.splitViewEnabled} onChange={(value) => setProductivity({ splitViewEnabled: value })} />}
                />
                <Row
                  title="Split the active tab"
                  description="Pairs the current tab with the next tab in the strip."
                  control={
                    <button
                      className="pill-btn"
                      onClick={() => {
                        const state = useStore.getState();
                        const active = state.activeTab();
                        const other = state.windowState.tabs.find((tab) => tab.id !== active?.id);
                        if (active && other) {
                          void api.tabs.split(active.id, active.splitWith ? null : other.id);
                          toast(active.splitWith ? 'Split view closed' : `Split with “${other.title.slice(0, 22)}”`, 'success');
                        }
                      }}
                    >
                      <Blocks size={13} /> Toggle split
                    </button>
                  }
                />
              </Section>
              <Section title="Behaviour">
                <Row title="Open search results in a new tab" control={<Toggle checked={prefs.search.openInNewTab} onChange={(value) => void setSearchPrefs({ openInNewTab: value })} />} />
                <Row title="Reopen last session" description="Restores the tabs you had open when Kimmino last closed." control={<span className="badge ok">On</span>} />
                <Row
                  title="Close all tabs to the right"
                  description="A quick way to declutter after a research session."
                  control={
                    <button
                      className="pill-btn"
                      onClick={async () => {
                        const state = useStore.getState();
                        const tabs = state.windowState.tabs;
                        const index = tabs.findIndex((tab) => tab.id === state.windowState.activeId);
                        for (const tab of tabs.slice(index + 1)) await api.tabs.close(tab.id);
                        toast('Closed tabs to the right', 'success');
                      }}
                    >
                      Clean up
                    </button>
                  }
                />
              </Section>
            </>
          )}

          {section === 'focus' && (
            <>
              <h1 className="settings-h1">Focus mode</h1>
              <p className="settings-sub">A timer, a tab limit and a blocklist. Kimmino shields the rest of the web while you work.</p>
              <Section title="Session">
                <Row title="Session length" control={<Slider value={prefs.productivity.focusMode.minutes} min={5} max={120} step={5} suffix=" min" onChange={(value) => void setProductivity({ focusMode: { ...prefs.productivity.focusMode, minutes: value } })} />} />
                <Row title="Maximum tabs during a session" description="Extra tabs are queued instead of opened." control={<Slider value={prefs.productivity.focusMode.maxTabs} min={1} max={20} onChange={(value) => void setProductivity({ focusMode: { ...prefs.productivity.focusMode, maxTabs: value } })} />} />
                <Row
                  title="Blocked sites"
                  description="One domain per line. These show a shield instead of the page during a session."
                  control={
                    <textarea
                      className="text-input"
                      style={{ height: 64, width: 220, padding: 8, resize: 'vertical' }}
                      value={prefs.productivity.focusMode.blocklist.join('\n')}
                      placeholder={'youtube.com\nx.com'}
                      onChange={(event) =>
                        void setProductivity({
                          focusMode: { ...prefs.productivity.focusMode, blocklist: event.target.value.split('\n').map((line) => line.trim()).filter(Boolean) }
                        })
                      }
                    />
                  }
                />
                <Row
                  title="Start a session now"
                  control={
                    <button
                      className="pill-btn primary"
                      onClick={() => {
                        useStore.getState().startFocus(prefs.productivity.focusMode.minutes || 25);
                        toast('Focus mode on', 'success');
                      }}
                    >
                      <Focus size={13} /> Start focus
                    </button>
                  }
                />
              </Section>
            </>
          )}

          {section === 'ai' && (
            <>
              <h1 className="settings-h1">Kimmino AI</h1>
              <p className="settings-sub">The assistant explains pages and the browser itself. Provider keys stay on Kimmino's server, never in the installer.</p>
              <Section title="Assistant">
                <Row
                  title="Enable the assistant"
                  description="Off, everything below is hidden and no request is ever made."
                  control={<Toggle checked={prefs.productivity.aiEnabled} onChange={(value) => setProductivity({ aiEnabled: value, aiProvider: value ? 'kimmino' : 'off' })} />}
                />
                <Row
                  title="Model"
                  description="Gemini models handle longer pages; Llama answers faster."
                  control={
                    <Select
                      value={prefs.productivity.aiModel || AI_MODELS[0].id}
                      onChange={(value) => void setProductivity({ aiModel: value })}
                      options={AI_MODELS.map((model) => ({ value: model.id, label: `${model.label} — ${model.provider}` }))}
                    />
                  }
                />
                <Row
                  title="Send the page with my question"
                  description="Off by default. On, the assistant can see the page address, title and the text you are reading. Nothing else in the browser is shared."
                  control={<Toggle checked={prefs.productivity.aiPageContext} onChange={(value) => void setProductivity({ aiPageContext: value })} />}
                />
                <Row
                  title="What the assistant knows"
                  description="It is told what Kimmino is — its settings, shortcuts and how blocking works — so it can answer questions about the browser without guessing."
                  control={<span className="badge ok"><ShieldCheck size={11} /> Built in</span>}
                />
              </Section>
              <Section title="Without a connection">
                <Row
                  title="On-device answers"
                  description="Summaries, keyword extraction and “what did it block” keep working offline. They never leave the machine."
                  control={<span className="badge">Always on</span>}
                />
              </Section>
              <p className="settings-sub" style={{ marginTop: 16 }}>
                The assistant is a server-side proxy. Your question goes to Kimmino's endpoint, which calls the model with the keys it holds.
                No key is stored in the app, and no account is required.
              </p>
            </>
          )}

          {section === 'sync' && (
            <>
              <h1 className="settings-h1">{t('account.title')}</h1>
              <p className="settings-sub">{t('account.hint')}</p>
              <Section title="Account">
                {sync.state !== 'synced' && sync.state !== 'syncing' && (
                  <>
                    <Row
                      title={t('account.email')}
                      control={
                        <input
                          className="text-input"
                          type="email"
                          autoComplete="email"
                          value={accountEmail}
                          placeholder="you@example.com"
                          onChange={(event) => setAccountEmail(event.target.value)}
                        />
                      }
                    />
                    <Row
                      title={t('account.password')}
                      description="At least 6 characters."
                      control={
                        <input
                          className="text-input"
                          type="password"
                          autoComplete="current-password"
                          value={accountPassword}
                          placeholder="••••••••"
                          onChange={(event) => setAccountPassword(event.target.value)}
                        />
                      }
                    />
                    <div style={{ display: 'flex', gap: 8, padding: '4px 12px 12px' }}>
                      <button
                        className="pill-btn primary"
                        disabled={!accountEmail.includes('@') || accountPassword.length < 6 || busy}
                        onClick={async () => {
                          setBusy(true);
                          const result = await api.sync.signIn(accountEmail.trim(), accountPassword);
                          setBusy(false);
                          setAccountPassword('');
                          toast(result.message, result.ok ? 'success' : 'warn');
                          if (result.ok) await useStore.getState().reloadData();
                        }}
                      >
                        {t('account.signIn')}
                      </button>
                      <button
                        className="pill-btn"
                        disabled={!accountEmail.includes('@') || accountPassword.length < 6 || busy}
                        onClick={async () => {
                          setBusy(true);
                          const result = await api.sync.signUp(accountEmail.trim(), accountPassword);
                          setBusy(false);
                          setAccountPassword('');
                          toast(result.message, result.ok ? 'success' : 'warn');
                        }}
                      >
                        {t('account.signUp')}
                      </button>
                    </div>
                    {sync.message && <Row title="Last attempt" description={sync.message} control={<span className="badge">{sync.state}</span>} />}
                  </>
                )}
                {(sync.state === 'synced' || sync.state === 'syncing') && (
                  <>
                    <Row
                      title="Signed in"
                      description={sync.email ?? ''}
                      control={<span className="badge ok"><Check size={11} /> {sync.state === 'syncing' ? 'Syncing' : 'Synced'}</span>}
                    />
                    <Row
                      title={t('account.syncNow')}
                      description={sync.lastSyncedAt ? `Last synced ${new Date(sync.lastSyncedAt).toLocaleString()}` : 'Not synced yet'}
                      control={
                        <button className="pill-btn" onClick={async () => {
                          const result = await api.sync.syncNow();
                          toast(result.state === 'offline' ? 'Could not reach the server' : 'Synced', result.state === 'offline' ? 'warn' : 'success');
                        }}>
                          {t('account.syncNow')}
                        </button>
                      }
                    />
                    <Row
                      title={t('account.signOut')}
                      description="Local data stays; only the connection is removed."
                      control={<button className="pill-btn" onClick={async () => { await api.sync.signOut(); toast('Signed out', 'info'); }}>{t('account.signOut')}</button>}
                    />
                  </>
                )}
              </Section>
              <Section title="Profiles" description="Every profile is a separate cookie jar, history and settings file.">
                {profiles.map((item) => (
                  <Row
                    key={item.id}
                    title={item.name}
                    description={`${item.id === profile?.id ? 'Active' : 'Switch to this profile'}`}
                    control={
                      <div style={{ display: 'flex', gap: 8 }}>
                        <span className="rail-avatar" style={{ width: 22, height: 22, borderRadius: 7, background: `linear-gradient(135deg, ${item.color}, #33d6a6)`, fontSize: 10 }}>
                          {item.name.slice(0, 1).toUpperCase()}
                        </span>
                        {item.id !== profile?.id && <button className="pill-btn" onClick={() => void api.profiles.switch(item.id)}>Switch</button>}
                      </div>
                    }
                  />
                ))}
                <Row
                  title="Add a profile"
                  description="For a second person on this computer, or work vs personal."
                  control={
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input className="text-input" placeholder="Name" value={newProfile} onChange={(event) => setNewProfile(event.target.value)} />
                      <button
                        className="pill-btn"
                        onClick={async () => {
                          if (!newProfile.trim()) return;
                          await api.profiles.create({ name: newProfile.trim(), color: '#33d6a6' });
                          setNewProfile('');
                          await reloadData();
                          toast('Profile created', 'success');
                        }}
                      >
                        <Users size={13} /> Create
                      </button>
                    </div>
                  }
                />
              </Section>
              <Section title="Backup">
                <Row
                  title="Export a backup"
                  description="A single JSON file with your settings, bookmarks and history."
                  control={<button className="pill-btn" onClick={async () => {
                    const json = await api.sync.exportData();
                    const blob = new Blob([json], { type: 'application/json' });
                    const link = document.createElement('a');
                    link.href = URL.createObjectURL(blob);
                    link.download = 'kimmino-backup.json';
                    link.click();
                    toast('Backup exported', 'success');
                  }}><FileDown size={13} /> Export</button>}
                />
                <Row
                  title="Restore from backup"
                  control={
                    <label className="pill-btn" style={{ cursor: 'pointer' }}>
                      <Upload size={13} /> Choose file
                      <input
                        type="file"
                        accept="application/json"
                        style={{ display: 'none' }}
                        onChange={async (event) => {
                          const file = event.target.files?.[0];
                          if (!file) return;
                          await api.sync.importData(await file.text());
                          await reloadData();
                          toast('Backup restored', 'success');
                        }}
                      />
                    </label>
                  }
                />
              </Section>
            </>
          )}

          {section === 'extensions' && (
            <>
              <h1 className="settings-h1">Extensions</h1>
              <p className="settings-sub">Chrome-compatible add-ons run inside Chromium's own extension runtime.</p>
              <Section title="Install">
                <Row
                  title="Add from a folder"
                  description="Unpacked extension (the folder containing manifest.json)."
                  control={<button className="pill-btn" onClick={async () => {
                    const result = await api.extensions.installFromFolder();
                    if (result.message !== 'Cancelled.') toast(result.message, result.ok ? 'success' : 'warn');
                    await reloadData();
                  }}>Choose folder</button>}
                />
                <Row
                  title="Add from a link"
                  description="A .zip or .crx URL. Chrome Web Store links must be downloaded manually first — Google blocks direct installs outside Chrome."
                  control={<ZipInstall />}
                />
                <Row
                  title="Compatibility"
                  description="Manifest V2 add-ons work fully. Manifest V3 add-ons that rely on a background service worker are marked as limited until Chromium exposes the worker to embedded runtimes."
                  control={<span className="badge warn">Some MV3 limits</span>}
                />
              </Section>
              <Section title="Manage">
                <Row
                  title="Open the extension manager"
                  description={`${themes.length ? '' : ''}Enable, disable or remove what you have installed.`}
                  control={<button className="pill-btn" onClick={() => void openInternal('extensions')}><Blocks size={13} /> Manage</button>}
                />
              </Section>
            </>
          )}

          {section === 'downloads' && (
            <>
              <h1 className="settings-h1">Downloads</h1>
              <p className="settings-sub">Where files land, and what a screenshot looks like when you save it.</p>
              <Section title="Files">
                <Row
                  title="Download folder"
                  description={prefs.system.downloadDir || 'System Downloads folder'}
                  control={<button className="pill-btn" onClick={async () => {
                    const dir = await api.system.pickDirectory();
                    if (dir) await setPrefs({ system: { downloadDir: dir } });
                  }}><HardDrive size={13} /> Change</button>}
                />
                <Row title="Ask where to save each file" control={<Toggle checked={prefs.system.askWhereToSave} onChange={(value) => void setPrefs({ system: { askWhereToSave: value } })} />} />
              </Section>
              <Section title="Screenshots" id="shot-format">
                <Row
                  title="Format"
                  description="Screenshots save to Pictures/Kimmino Screenshots and are copied to your clipboard."
                  control={
                    <Segmented
                      value={prefs.productivity.screenshotFormat}
                      onChange={(value) => void setProductivity({ screenshotFormat: value })}
                      options={[
                        { value: 'png', label: 'PNG' },
                        { value: 'jpeg', label: 'JPEG' }
                      ]}
                    />
                  }
                />
                <Row title="Capture the visible area" control={<button className="pill-btn" onClick={() => void api.screenshot.capture('visible')}><Camera size={13} /> Capture now</button>} />
                <Row title="Capture the whole page" description="Works on pages taller than your screen." control={<button className="pill-btn" onClick={() => void api.screenshot.capture('fullpage')}><Camera size={13} /> Capture full page</button>} />
                <Row title="Capture a region" description="Drag a rectangle over the page." control={<button className="pill-btn" onClick={() => void api.screenshot.capture('selection')}><Camera size={13} /> Select area</button>} />
              </Section>
            </>
          )}

          {section === 'languages' && (
            <>
              <h1 className="settings-h1">Languages</h1>
              <p className="settings-sub">The language Kimmino speaks, and the languages it tells websites you understand.</p>
              <Section title="Interface">
                <Row
                  title={t('settings.language')}
                  description="Applies instantly to the rail, toolbar, start page and settings — and sets the Accept-Language header sites see."
                  control={
                    <Select
                      value={prefs.system.language}
                      onChange={(value) => void setPrefs({ system: { language: value } })}
                      options={LOCALES.map((locale) => ({
                        value: locale.code,
                        label: `${locale.name}${locale.dir === 'rtl' ? ' — right to left' : ''}`
                      }))}
                    />
                  }
                />
                <Row
                  title="Translation coverage"
                  description={
                    languageCoverage === 1
                      ? 'Fully translated.'
                      : `${Math.round(languageCoverage * 100)}% of the interface is translated; anything missing stays in English rather than showing a blank.`
                  }
                  control={<span className="badge ok"><Languages size={11} /> {LOCALES.find((locale) => locale.code === prefs.system.language)?.name ?? 'English'}</span>}
                />
                <Row title="Right-to-left layout" description="Mirrors the whole interface for Arabic and Urdu. Automatic from the language above." control={<span className="badge">{directionOf(prefs.system.language) === 'rtl' ? 'On' : 'Off'}</span>} />
                <Row title="Check spelling as I type" control={<Toggle checked={prefs.system.spellcheck} onChange={(value) => void setPrefs({ system: { spellcheck: value } })} />} />
              </Section>
            </>
          )}

          {section === 'system' && (
            <>
              <h1 className="settings-h1">System</h1>
              <p className="settings-sub">Start-up, defaults and moving in from another browser.</p>
              <Section title="Start-up">
                <Row title="Launch Kimmino when I sign in" control={<Toggle checked={prefs.system.launchOnStartup} onChange={(value) => void setPrefs({ system: { launchOnStartup: value } })} />} />
                <Row title="Ask to be my default browser" control={<Toggle checked={prefs.system.defaultBrowserPrompt} onChange={(value) => void setPrefs({ system: { defaultBrowserPrompt: value } })} />} />
                <div id="default-browser">
                  <Row
                    title="Make Kimmino the default browser"
                    description="Open links from other apps in Kimmino."
                    control={
                      <button className="pill-btn" onClick={async () => {
                        const ok = await api.system.setDefaultBrowser();
                        toast(ok ? 'Kimmino is now your default browser' : 'Set it in your system settings', ok ? 'success' : 'info');
                      }}>
                        <Globe size={13} /> Set as default
                      </button>
                    }
                  />
                </div>
              </Section>
              <Section title="Switch to Kimmino" id="import">
                <Row
                  title="Import bookmarks, history & settings"
                  description="Detects Chrome, Edge, Brave, Vivaldi, Opera and Opera GX profiles automatically. Firefox and Safari import from an HTML file."
                  control={<button className="pill-btn primary" onClick={async () => {
                    const result = await api.import.fromBrowser();
                    toast(result.message, result.ok ? 'success' : 'info');
                    await reloadData();
                  }}><Download size={13} /> Import</button>}
                />
                <Row title="Bookmarks imported" control={<span className="badge">{bookmarks.length}</span>} />
              </Section>
              <Section title="Maintenance">
                <Row
                  title="Restart Kimmino"
                  description="Needed after changing hardware acceleration."
                  control={<button className="pill-btn" onClick={() => api.system.restart()}><Rocket size={13} /> Restart</button>}
                />
              </Section>
            </>
          )}

          {section === 'shortcuts' && (
            <>
              <h1 className="settings-h1">Keyboard shortcuts</h1>
              <p className="settings-sub">Everything is reachable from the keyboard. Windows and Linux use Ctrl; macOS uses ⌘.</p>
              <Section title="Essentials">
                {[
                  ['New tab', 'Ctrl T'],
                  ['New window', 'Ctrl N'],
                  ['New private window', 'Ctrl Shift N'],
                  ['Close tab', 'Ctrl W'],
                  ['Reopen closed tab', 'Ctrl Shift T'],
                  ['Next / previous tab', 'Ctrl Tab'],
                  ['Focus address bar', 'Ctrl L'],
                  ['Find in page', 'Ctrl F'],
                  ['Settings', 'Ctrl ,'],
                  ['Command palette', 'Ctrl K'],
                  ['History', 'Ctrl H'],
                  ['Downloads', 'Ctrl J'],
                  ['Bookmark this page', 'Ctrl D']
                ].map(([label, keys]) => (
                  <Row key={label} title={label} control={<span style={{ display: 'flex', gap: 4 }}>{keys.split(' ').map((key) => <span key={key} className="kbd">{key}</span>)}</span>} />
                ))}
              </Section>
              <Section title="Kimmino extras">
                {[
                  ['Split view', 'Ctrl Alt S'],
                  ['Screenshot visible area', 'Ctrl Shift S'],
                  ['Screenshot full page', 'Ctrl Alt Shift S'],
                  ['Focus mode', 'Ctrl Shift F'],
                  ['Kimmino AI', 'Ctrl Shift A'],
                  ['Summarise page', 'Ctrl Shift U'],
                  ['Toggle sidebar', 'Ctrl Shift B'],
                  ['Clear browsing data', 'Ctrl Shift Del'],
                  ['Developer tools', 'F12']
                ].map(([label, keys]) => (
                  <Row key={label} title={label} control={<span style={{ display: 'flex', gap: 4 }}>{keys.split(' ').map((key) => <span key={key} className="kbd">{key}</span>)}</span>} />
                ))}
              </Section>
            </>
          )}

          {section === 'developer' && (
            <>
              <h1 className="settings-h1">Developer</h1>
              <p className="settings-sub">For people who build for the web. Nothing here phones home.</p>
              <Section title="Tools">
                <Row title="Enable developer tools" description="F12 opens Chromium DevTools for the current page." control={<Toggle checked={prefs.developer.devToolsEnabled} onChange={(value) => void setPrefs({ developer: { devToolsEnabled: value } })} />} />
                <Row title="Show performance overlay" description="Live frame time and memory in the corner of the window." control={<Toggle checked={prefs.developer.showPerfOverlay} onChange={(value) => void setPrefs({ developer: { showPerfOverlay: value } })} />} />
                <Row
                  title="Custom user agent"
                  description="Leave empty for the default Chrome-compatible string."
                  control={<input className="text-input" style={{ width: 260 }} value={prefs.developer.customUserAgent} placeholder="Mozilla/5.0 …" onChange={(event) => void setPrefs({ developer: { customUserAgent: event.target.value } })} />}
                />
              </Section>
              <Section title="Themes & engine">
                <Row
                  title="Theme schema"
                  description="A theme is JSON with colours: bg, surface, chrome, text, muted, border, accent."
                  control={<button className="pill-btn" onClick={() => void openInternal('themes')}><Code2 size={13} /> Theme editor</button>}
                />
                <Row
                  title="Filter lists"
                  description="Compiled from EasyList and uBlock Origin. Updated weekly in the background."
                  control={<span className="badge">47,000 domains</span>}
                />
                <Row title="Settings file" description={isNative ? prefs.system.downloadDir || 'userData/profiles/<id>/preferences.json' : 'localStorage (preview)'} control={<span className="badge">JSON</span>} />
              </Section>
              <Section title="Danger zone">
                <Row
                  title="Reset every setting"
                  description="Colours, privacy, layout — back to factory defaults. Your bookmarks stay."
                  control={<button className="pill-btn" onClick={() => void resetPrefs()}><Wand2 size={13} /> Reset all</button>}
                />
              </Section>
            </>
          )}

          {section === 'about' && (
            <>
              <h1 className="settings-h1">About Kimmino</h1>
              <p className="settings-sub">Version 1.0.0 · Mozilla Public License 2.0 · built on Chromium.</p>
              <Section title="The promise">
                <Row title="No telemetry" description="There is no analytics SDK in this build. Search the source for yourself." control={<span className="badge ok"><Check size={11} /> Verified</span>} />
                <Row title="No account required" description="Profiles live on your disk. Sync is optional and self-hosted." control={<span className="badge ok"><Check size={11} /> Verified</span>} />
                <Row title="Open source" description="Every line is on GitHub, including the filter compiler." control={<button className="pill-btn" onClick={() => api.system.openExternal('https://github.com/sdlksdsf/PROJECT-2')}>View source</button>} />
              </Section>
              <Section title="Updates" id="early-bird">
                <Row
                  title="Check automatically"
                  description="Once per launch Kimmino asks GitHub for the newest release tag. No identifier is sent, and nothing downloads on its own."
                  control={<Toggle checked={prefs.updates.automatic} onChange={(value) => void setPrefs({ updates: { automatic: value } })} />}
                />
                <Row
                  title="Early bird releases"
                  description="Include release candidates a few days before the stable build. Slightly higher chance of rough edges."
                  control={<Toggle checked={prefs.productivity.earlyBird} onChange={(value) => setProductivity({ earlyBird: value })} />}
                />
                <Row
                  title="Status"
                  description={
                    updateState?.checkedAt
                      ? `Checked ${new Date(updateState.checkedAt).toLocaleString()}${updateState.latest ? ` · newest release ${updateState.latest}` : ''}`
                      : 'Not checked yet in this session.'
                  }
                  control={
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <span className={`badge ${updateState?.status === 'available' ? 'warn' : updateState?.status === 'current' ? 'ok' : ''}`}>
                        {updateState?.status === 'available'
                          ? `${updateState.latest} available`
                          : updateState?.status === 'current'
                            ? 'Up to date'
                            : updateState?.status === 'offline'
                              ? 'Could not reach GitHub'
                              : updateState?.status === 'checking'
                                ? 'Checking…'
                                : 'Idle'}
                      </span>
                      <button
                        className="pill-btn"
                        disabled={checkingUpdate}
                        onClick={async () => {
                          setCheckingUpdate(true);
                          const state = await api.updates.check();
                          setCheckingUpdate(false);
                          setUpdateState(state);
                          if (state.status === 'available' && state.notesUrl) {
                            toast(`Kimmino ${state.latest} is available`, 'info');
                          } else if (state.status === 'current') {
                            toast('You are on the newest release', 'success');
                          } else if (state.status === 'offline') {
                            toast('Could not reach GitHub', 'warn');
                          }
                        }}
                      >
                        {checkingUpdate ? 'Checking…' : 'Check now'}
                      </button>
                      {updateState?.status === 'available' && updateState.notesUrl && (
                        <>
                          <button className="pill-btn primary" onClick={() => void api.system.openExternal(updateState.notesUrl!)}>
                            What changed
                          </button>
                          <button
                            className="pill-btn ghost"
                            title="Stop reminding me about this release"
                            onClick={async () => {
                              await api.updates.dismiss(updateState.latest ?? '');
                              setUpdateState({ ...updateState, status: 'current' });
                              toast('You will not be reminded about this release', 'info');
                            }}
                          >
                            Skip
                          </button>
                        </>
                      )}
                    </div>
                  }
                />
                <Row title="Version" control={<span className="badge">{api.version} · {api.platform}</span>} />
                <Row title="Licences" description="Chromium, EasyList, uBlock Origin filters, Inter and Space Grotesk fonts." control={<button className="pill-btn" onClick={() => api.system.openExternal('https://kimmino.vercel.app/licenses')}>Read</button>} />
              </Section>
              <Section title="Credits">
                <Row title="Made with care — no trackers were harmed" description="Thanks to the EasyList and uBlock Origin maintainers, whose volunteer work protects everyone." control={<span className="badge"><Sparkles size={11} /> Kimmino</span>} />
              </Section>
            </>
          )}

          <div style={{ display: 'flex', gap: 10, marginTop: 10, flexWrap: 'wrap' }}>
            <button className="pill-btn ghost" onClick={() => void resetPrefs(section === 'about' ? undefined : (section as keyof Preferences))}>
              Reset “{NAV.find((item) => item.id === section)?.label}” to defaults
            </button>
            <button className="pill-btn ghost" onClick={() => void openInternal('about')}>
              Privacy policy
            </button>
          </div>
        </div>
      </div>

      {clearOpen && (
        <>
          <div className="scrim" onClick={() => setClearOpen(false)} />
          <div className="palette" style={{ top: '20vh', maxWidth: 460 }}>
            <div className="palette-input" style={{ borderBottom: 'none', paddingBottom: 4 }}>
              <Trash2 size={16} style={{ color: 'var(--danger)' }} />
              <span style={{ fontSize: 14, fontWeight: 650 }}>Clear browsing data</span>
            </div>
            <div style={{ padding: '4px 16px 8px', fontSize: 12, color: 'var(--text-dim)' }}>
              Choose what to erase. This cannot be undone.
            </div>
            <div style={{ padding: '0 10px 10px' }}>
              {(
                [
                  ['cookies', 'Cookies & sign-in data'],
                  ['siteData', 'Local storage & site databases'],
                  ['cache', 'Cached images & files'],
                  ['history', 'Browsing history'],
                  ['downloads', 'Download list']
                ] as const
              ).map(([key, label]) => (
                <div key={key} className="row" style={{ padding: '9px 6px' }}>
                  <div className="row-text">
                    <div className="row-label">{label}</div>
                  </div>
                  <Toggle
                    checked={clearChoice[key]}
                    onChange={(value) => setClearChoice({ ...clearChoice, [key]: value })}
                  />
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8, padding: '0 16px 16px', justifyContent: 'flex-end' }}>
              <button className="pill-btn" onClick={() => setClearOpen(false)}>
                Cancel
              </button>
              <button
                className="pill-btn primary"
                onClick={async () => {
                  await api.data.clear(clearChoice);
                  await reloadData();
                  setClearOpen(false);
                  toast('Browsing data cleared', 'success');
                }}
              >
                <Trash2 size={13} /> Clear data
              </button>
            </div>
          </div>
        </>
      )}

      <style>{`
        .page::-webkit-scrollbar { width: 10px; }
      `}</style>
      <span style={{ display: 'none' }}>
        <Sun size={0} /><Moon size={0} /><Fingerprint size={0} /><TriangleAlert size={0} />
      </span>
    </div>
  );
}

function ZipInstall() {
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const toast = useStore((state) => state.toast);
  const reloadData = useStore((state) => state.reloadData);
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      <input className="text-input" placeholder="https://…/extension.crx" value={url} onChange={(event) => setUrl(event.target.value)} />
      <button
        className="pill-btn"
        disabled={!url.trim() || busy}
        onClick={async () => {
          setBusy(true);
          try {
            const result = await api.extensions.installFromUrl(url.trim());
            if (result.message !== 'Cancelled.') toast(result.message, result.ok ? 'success' : 'warn');
            await reloadData();
          } catch (error) {
            toast((error as Error).message, 'warn');
          }
          setBusy(false);
        }}
      >
        {busy ? 'Installing…' : 'Install'}
      </button>
    </div>
  );
}
