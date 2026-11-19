import { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Blocks,
  Camera,
  Download,
  Focus,
  Globe,
  Home,
  Lock,
  RotateCw,
  Search,
  Settings,
  Shield,
  ShieldCheck,
  Sparkles,
  Star,
  Sun,
  Blocks as Puzzle
} from 'lucide-react';

type View = 'start' | 'settings' | 'split';

const DIALS = [
  { label: 'YouTube', letter: 'Y', color: '#ff2d55' },
  { label: 'GitHub', letter: 'G', color: '#111827' },
  { label: 'Reddit', letter: 'R', color: '#ff4500' },
  { label: 'Gmail', letter: 'M', color: '#ea4335' },
  { label: 'Figma', letter: 'F', color: '#a259ff' },
  { label: 'Wikipedia', letter: 'W', color: '#3b6ef6' }
];

const SETTINGS_ITEMS = ['Appearance', 'Start page', 'Privacy & security', 'Cookies', 'Site permissions', 'Performance', 'Search', 'Focus mode', 'Sync', 'About'];

const SETTINGS_ROWS: Array<{ title: string; desc: string; on: boolean }> = [
  { title: 'Block ads', desc: 'EasyList + uBlock Origin · 47,000 domains', on: true },
  { title: 'Block trackers', desc: 'Analytics beacons and ad pixels', on: true },
  { title: 'Refuse third-party cookies', desc: 'Dropped at the network layer', on: true },
  { title: 'Fingerprint protection', desc: 'Canvas, WebGL and audio randomised', on: true },
  { title: 'Block location requests', desc: 'Geolocation API disabled', on: true },
  { title: 'Force dark mode on websites', desc: 'Inverts pages that ignore dark mode', on: false }
];

/**
 * A faithful, CSS-only render of the Kimmino interface used in the hero and
 * feature sections. It is interactive: click a tab to switch the demo view.
 */
export function BrowserMock({ initialView = 'start' }: { initialView?: View }) {
  const [view, setView] = useState<View>(initialView);

  return (
    <div className="mock">
      <div className="mock-titlebar">
        <div className="mock-lights">
          <span className="mock-light" style={{ background: '#ff5f57' }} />
          <span className="mock-light" style={{ background: '#febc2e' }} />
          <span className="mock-light" style={{ background: '#28c840' }} />
        </div>
        <div className="mock-tabs">
          <button className={`mock-tab ${view === 'start' ? 'is-active' : ''}`} onClick={() => setView('start')}>
            <span className="mock-tab-dot" style={{ background: 'linear-gradient(135deg,#7c97ff,#33d6a6)' }} />
            New tab
          </button>
          <button className={`mock-tab ${view === 'split' ? 'is-active' : ''}`} onClick={() => setView('split')}>
            <span className="mock-tab-dot" style={{ background: '#33d6a6' }} />
            Split view · 2 tabs
          </button>
          <button className={`mock-tab ${view === 'settings' ? 'is-active' : ''}`} onClick={() => setView('settings')}>
            <span className="mock-tab-dot" style={{ background: '#7c97ff' }} />
            Settings
          </button>
        </div>
      </div>

      <div className="mock-toolbar">
        <span className="mock-navbtn"><ArrowLeft size={14} /></span>
        <span className="mock-navbtn"><ArrowRight size={14} /></span>
        <span className="mock-navbtn"><RotateCw size={13} /></span>
        <span className="mock-navbtn"><Home size={13} /></span>
        <div className="mock-omnibox">
          <Lock size={11} style={{ color: '#4fe0b3' }} />
          {view === 'settings' ? (
            <span><b>kimmino</b>://settings/privacy</span>
          ) : (
            <span><b>Search Kimmino</b> or type a URL</span>
          )}
          <span className="mock-shield">
            <ShieldCheck size={10} /> 1,284
          </span>
        </div>
        <span className="mock-navbtn"><Sun size={13} /></span>
        <span className="mock-navbtn"><Sparkles size={13} /></span>
        <span className="mock-navbtn"><Download size={13} /></span>
      </div>

      <div className="mock-body">
        <div className="mock-rail">
          <span className="mock-rail-btn" style={{ background: 'linear-gradient(135deg,#7c97ff,#33d6a6)' }}>
            <span style={{ width: 14, height: 14, borderRadius: 5, background: '#0b1119' }} />
          </span>
          <span className="mock-rail-btn"><Star size={13} /></span>
          <span className="mock-rail-btn"><Globe size={13} /></span>
          <span className="mock-rail-btn"><Download size={13} /></span>
          <span className="mock-rail-btn"><Puzzle size={13} /></span>
          <span className="mock-rail-btn"><Shield size={13} /></span>
          <div style={{ flex: 1 }} />
          <span className="mock-rail-btn"><Sparkles size={13} /></span>
          <span className="mock-rail-btn"><Focus size={13} /></span>
          <span className="mock-rail-btn"><Camera size={13} /></span>
          <span className={`mock-rail-btn ${view === 'settings' ? 'is-active' : ''}`}><Settings size={13} /></span>
        </div>

        <div className="mock-content">
          {view === 'start' && (
            <>
              <div className="mock-wallpaper" style={{ backgroundImage: 'url("/wallpapers/fjord.jpg")' }} />
              <div className="mock-dim" />
              <div className="mock-clock">
                <div className="mock-clock-time">21:14</div>
                <div className="mock-clock-date">Good evening, Shayan — Friday, 19 November</div>
              </div>
              <div className="mock-start">
                <div className="mock-search">
                  <span
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: 999,
                      background: 'linear-gradient(135deg,#7c97ff,#33d6a6)',
                      display: 'grid',
                      placeItems: 'center',
                      color: '#06121a',
                      fontSize: 9,
                      fontWeight: 800
                    }}
                  >
                    K
                  </span>
                  Search Kimmino or type a URL
                  <Search size={13} style={{ marginLeft: 'auto' }} />
                </div>
                <div className="mock-dials">
                  {DIALS.map((dial) => (
                    <div className="mock-dial" key={dial.label}>
                      <span className="mock-dial-tile" style={{ color: dial.color }}>
                        {dial.letter}
                      </span>
                      <span className="mock-dial-label">{dial.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {view === 'settings' && (
            <div className="mock-settings">
              <div className="mock-settings-nav">
                <div style={{ fontSize: 11, fontWeight: 700, color: '#eef2f9', padding: '0 9px 10px' }}>Settings</div>
                {SETTINGS_ITEMS.map((item) => (
                  <span key={item} className={`mock-settings-item ${item === 'Privacy & security' ? 'is-active' : ''}`}>
                    {item}
                  </span>
                ))}
              </div>
              <div className="mock-settings-main">
                <div style={{ fontSize: 14, fontWeight: 600, color: '#eef2f9', marginBottom: 4 }}>Privacy & security</div>
                <div style={{ fontSize: 10, color: '#78828f', marginBottom: 12 }}>
                  Protective by default. Nothing here needs an account.
                </div>
                <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                  {[
                    ['1,284', 'Ads'],
                    ['412', 'Trackers'],
                    ['96', 'Cookies']
                  ].map(([value, label]) => (
                    <div key={label} style={{ flex: 1, background: '#121824', borderRadius: 8, padding: '8px 10px' }}>
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 600 }}>{value}</div>
                      <div style={{ fontSize: 9, color: '#78828f' }}>{label}</div>
                    </div>
                  ))}
                </div>
                {SETTINGS_ROWS.map((row) => (
                  <div className="mock-setting-row" key={row.title}>
                    <div className="mock-setting-text">
                      <div className="mock-setting-title">{row.title}</div>
                      <div className="mock-setting-desc">{row.desc}</div>
                    </div>
                    <span className={`mock-switch ${row.on ? '' : 'off'}`} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {view === 'split' && (
            <div className="mock-split">
              <div className="mock-pane">
                <div className="mock-pane-hero" />
                <div className="mock-pane-bar" style={{ width: '72%' }} />
                <div className="mock-pane-line" />
                <div className="mock-pane-line" style={{ width: '90%' }} />
                <div className="mock-pane-line" style={{ width: '84%' }} />
                <div className="mock-pane-line" style={{ width: '96%' }} />
                <div style={{ height: 12 }} />
                <div className="mock-pane-hero" style={{ opacity: 0.5 }} />
                <div className="mock-pane-line" style={{ width: '80%' }} />
                <div className="mock-pane-line" style={{ width: '88%' }} />
              </div>
              <div className="mock-pane" style={{ background: '#0d1219' }}>
                <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
                  <span style={{ height: 20, flex: 1, borderRadius: 6, background: 'rgba(124,151,255,.22)' }} />
                  <span style={{ height: 20, width: 20, borderRadius: 6, background: 'rgba(51,214,166,.2)' }} />
                </div>
                <div className="mock-pane-bar" style={{ width: '58%' }} />
                <div className="mock-pane-line" style={{ height: 46, borderRadius: 8, background: 'rgba(255,255,255,.045)' }} />
                <div className="mock-pane-line" />
                <div className="mock-pane-line" style={{ width: '86%' }} />
                <div className="mock-pane-line" style={{ width: '70%' }} />
                <div style={{ marginTop: 10, display: 'flex', gap: 6 }}>
                  {['#7c97ff', '#33d6a6', '#5b8dfb'].map((color) => (
                    <span key={color} style={{ flex: 1, height: 30, borderRadius: 7, background: `${color}22`, border: `1px solid ${color}44` }} />
                  ))}
                </div>
                <div className="mock-pane-line" style={{ width: '92%', marginTop: 12 }} />
                <div className="mock-pane-line" style={{ width: '74%' }} />
              </div>
            </div>
          )}
        </div>
      </div>
      <span style={{ display: 'none' }}>
        <Blocks size={0} />
      </span>
    </div>
  );
}
