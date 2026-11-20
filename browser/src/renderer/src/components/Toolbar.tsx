import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Blocks,
  Camera,
  Check,
  ChevronRight,
  Download,
  Globe,
  Home,
  Image as ImageIcon,
  Loader2,
  Lock,
  Moon,
  Plus,
  RotateCw,
  Settings,
  Shield,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserRound,
  X,
  Zap
} from 'lucide-react';
import { useStore } from '../store';
import { useT } from '../lib/i18n';
import { api, isNative } from '../bridge';
import { useFreeze } from '../hooks';
import { Omnibox } from './Omnibox';
import { formatBytes, hostOf, relativeTime } from '../lib/url';

export function Toolbar() {
  const { windowState, prefs, downloads, privacy, profile, profiles, sync } = useStore();
  const setUI = useStore((state) => state.setUI);
  const openInternal = useStore((state) => state.openInternal);
  const toast = useStore((state) => state.toast);
  const [rating, setRating] = useState<{ score: number; level: string; reasons: string[] } | null>(null);
  const t = useT();

  const activeTab = windowState.tabs.find((tab) => tab.id === windowState.activeId) ?? null;
  const isInternalPage = activeTab?.url.startsWith('kimmino://') ?? true;

  useEffect(() => {
    if (!activeTab || isInternalPage) {
      setRating(null);
      return;
    }
    let cancelled = false;
    void api.privacy.rateSite(activeTab.url).then((result) => {
      if (!cancelled) setRating(result);
    });
    return () => {
      cancelled = true;
    };
  }, [activeTab?.url, isInternalPage]);

  const downloading = downloads.filter((item) => item.state === 'progressing').length;

  return (
    <div className="toolbar">
      <button className="icon-btn" aria-label={t('toolbar.back')} title={`${t('toolbar.back')} (Alt+←)`} disabled={!activeTab?.canGoBack} onClick={() => api.tabs.back()}>
        <ArrowLeft size={17} />
      </button>
      <button
        className="icon-btn"
        aria-label={t('toolbar.forward')}
        title={`${t('toolbar.forward')} (Alt+→)`}
        disabled={!activeTab?.canGoForward}
        onClick={() => api.tabs.forward()}
      >
        <ArrowRight size={17} />
      </button>
      <button
        className="icon-btn"
        aria-label={activeTab?.loading ? t('toolbar.stop') : t('toolbar.reload')}
        title={activeTab?.loading ? t('toolbar.stop') : `${t('toolbar.reload')} (Ctrl+R)`}
        onClick={() => (activeTab?.loading ? api.tabs.stop() : api.tabs.reload())}
      >
        {activeTab?.loading ? <X size={16} /> : <RotateCw size={15} />}
      </button>
      <button className="icon-btn" aria-label={t('toolbar.newtab')} title={`${t('toolbar.newtab')} (Alt+Home)`} onClick={() => void api.tabs.create('kimmino://newtab')}>
        <Home size={16} />
      </button>

      <Omnibox />

      <button
        className={`icon-btn ${prefs.productivity.forceDarkMode ? 'is-active' : ''}`}
        title={`Force dark mode ${prefs.productivity.forceDarkMode ? 'on' : 'off'}`}
        aria-label="Toggle force dark mode"
        onClick={() => {
          void useStore.getState().setPrefs({ productivity: { forceDarkMode: !prefs.productivity.forceDarkMode } });
          toast(`Force dark mode ${prefs.productivity.forceDarkMode ? 'off' : 'on'} — reload to apply`, 'success');
        }}
      >
        <Moon size={15} />
      </button>

      <button
        className={`icon-btn ${useStore((state) => state.aiOpen) ? 'is-active' : ''}`}
        title="Kimmino AI (Ctrl+Shift+A)"
        aria-label="Kimmino AI"
        onClick={() => setUI({ aiOpen: !useStore.getState().aiOpen })}
      >
        <Sparkles size={16} />
      </button>

      <Popover
        id="downloads"
        label="Downloads"
        button={
          <span style={{ position: 'relative', display: 'grid', placeItems: 'center' }}>
            <Download size={16} />
            {downloading > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: -3,
                  right: -4,
                  minWidth: 13,
                  height: 13,
                  borderRadius: 7,
                  background: 'var(--accent)',
                  color: '#08111a',
                  fontSize: 9,
                  fontWeight: 800,
                  display: 'grid',
                  placeItems: 'center'
                }}
              >
                {downloading}
              </span>
            )}
          </span>
        }
        title="Downloads (Ctrl+J)"
        width={330}
      >
        <DownloadsList />
      </Popover>

      <button
        className="icon-btn"
        title="Extensions"
        aria-label="Extensions"
        onClick={() => void openInternal('extensions')}
      >
        <Blocks size={16} />
      </button>

      <Popover
        id="profile"
        label="Profile"
        title="Profiles & sync"
        width={300}
        button={
          <span
            className="rail-avatar"
            style={{ width: 26, height: 26, borderRadius: 9, background: `linear-gradient(135deg, ${profile?.color ?? '#6d8cff'}, #33d6a6)`, fontSize: 11 }}
          >
            {(profile?.name ?? 'P').slice(0, 1).toUpperCase()}
          </span>
        }
      >
        <div className="popover-head">Signed in as</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 10px 10px' }}>
          <span
            className="rail-avatar"
            style={{ width: 32, height: 32, borderRadius: 10, background: `linear-gradient(135deg, ${profile?.color ?? '#6d8cff'}, #33d6a6)`, fontSize: 13 }}
          >
            {(profile?.name ?? 'P').slice(0, 1).toUpperCase()}
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12.8, fontWeight: 600 }}>{profile?.name ?? 'Personal'}</div>
            <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>
              {sync.email ?? (sync.state === 'signed-out' ? 'Local only — nothing synced' : sync.state)}
            </div>
          </div>
        </div>
        <div className="menu-sep" />
        <div className="popover-head">Switch profile</div>
        {profiles.map((item) => (
          <button
            key={item.id}
            className="menu-item"
            onClick={async () => {
              await api.profiles.switch(item.id);
              setUI({ profileMenuOpen: false });
            }}
          >
            <span
              className="rail-avatar"
              style={{ width: 20, height: 20, borderRadius: 7, background: `linear-gradient(135deg, ${item.color}, #33d6a6)`, fontSize: 10 }}
            >
              {item.name.slice(0, 1).toUpperCase()}
            </span>
            <span style={{ flex: 1 }}>{item.name}</span>
            {item.id === profile?.id && <Check size={14} style={{ color: 'var(--accent)' }} />}
          </button>
        ))}
        <button className="menu-item" onClick={() => void openInternal('settings')}>
          <Plus size={14} /> Add another profile
        </button>
        <div className="menu-sep" />
        <button
          className="menu-item"
          onClick={() => {
            if (isNative) api.window.newIncognitoWindow();
            else toast('Private windows open in the desktop app', 'info');
          }}
        >
          <UserRound size={14} /> New private window
          <span className="shortcut">Ctrl+Shift+N</span>
        </button>
        <button className="menu-item" onClick={() => void openInternal('settings')}>
          <Settings size={14} /> Settings
          <span className="shortcut">Ctrl+,</span>
        </button>
        <button
          className="menu-item"
          onClick={async () => {
            if (sync.state === 'signed-out') {
              await openInternal('settings');
              toast('Connect an account in Settings → Sync', 'info');
            } else {
              await api.sync.syncNow();
              toast('Sync complete', 'success');
            }
          }}
        >
          <Zap size={14} /> {sync.state === 'signed-out' ? 'Set up sync' : 'Sync now'}
        </button>
        <div className="menu-sep" />
        <div className="stat-grid">
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
            <div className="stat-label">Cookies</div>
          </div>
        </div>
      </Popover>

      <button className="icon-btn" title="Screenshot (Ctrl+Shift+S)" aria-label="Screenshot" onClick={() => void captureScreenshot('visible', toast)}>
        <Camera size={16} />
      </button>

      <ShieldPopover rating={rating} />
    </div>
  );
}

async function captureScreenshot(mode: 'visible' | 'fullpage' | 'selection', toast: (message: string, kind?: 'info' | 'success' | 'warn') => void) {
  const result = await api.screenshot.capture(mode);
  if (result.ok && result.dataUrl) {
    useStore.getState().setUI({ screenshot: { dataUrl: result.dataUrl, path: result.path } });
    toast('Screenshot saved to Pictures/Kimmino Screenshots', 'success');
  } else {
    toast(result.error ?? 'Could not capture this page', 'warn');
  }
}

/* ------------------------------------------------------------------ */

function Popover({
  id,
  button,
  title,
  children,
  width = 300
}: {
  id: 'downloads' | 'profile' | 'shield';
  button: React.ReactNode;
  title: string;
  label?: string;
  children: React.ReactNode;
  width?: number;
}) {
  const open =
    id === 'downloads'
      ? useStore((state) => state.downloadsOpen)
      : id === 'profile'
        ? useStore((state) => state.profileMenuOpen)
        : useStore((state) => state.shieldOpen);
  const setUI = useStore((state) => state.setUI);
  useFreeze(open);

  const toggle = () => {
    setUI({ downloadsOpen: false, profileMenuOpen: false, shieldOpen: false, [id === 'downloads' ? 'downloadsOpen' : id === 'profile' ? 'profileMenuOpen' : 'shieldOpen']: !open });
  };

  return (
    <div style={{ position: 'relative', display: 'grid', placeItems: 'center' }}>
      <button className={`icon-btn ${open ? 'is-active' : ''}`} title={title} aria-label={title} onClick={toggle}>
        {button}
      </button>
      {open && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 55 }} onClick={() => setUI({ downloadsOpen: false, profileMenuOpen: false, shieldOpen: false })} />
          <div className="popover" style={{ width }} onClick={(event) => event.stopPropagation()}>
            {children}
          </div>
        </>
      )}
    </div>
  );
}

function DownloadsList() {
  const downloads = useStore((state) => state.downloads);
  const openInternal = useStore((state) => state.openInternal);

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', padding: '4px 8px 8px' }}>
        <span className="popover-head" style={{ padding: 0, flex: 1 }}>
          Downloads
        </span>
        <button className="pill-btn ghost" style={{ height: 24, fontSize: 11 }} onClick={() => void openInternal('downloads')}>
          See all
        </button>
      </div>
      {downloads.length === 0 && <div style={{ padding: '18px 10px', fontSize: 12, color: 'var(--text-dim)' }}>Nothing downloaded yet.</div>}
      {downloads.slice(0, 5).map((item) => {
        const progress = item.totalBytes ? Math.min(100, Math.round((item.receivedBytes / item.totalBytes) * 100)) : 0;
        return (
          <div key={item.id} style={{ padding: '8px 10px', display: 'flex', gap: 10, alignItems: 'center' }}>
            <div className="tile-icon" style={{ width: 30, height: 30, borderRadius: 9 }}>
              {item.state === 'progressing' ? <Loader2 size={14} className="spinner" /> : <Download size={14} />}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="list-title" style={{ fontSize: 12 }}>
                {item.filename}
              </div>
              <div className="list-sub" style={{ fontSize: 10.5 }}>
                {item.state === 'progressing'
                  ? `${formatBytes(item.receivedBytes)} of ${formatBytes(item.totalBytes)} · ${progress}%`
                  : item.state === 'completed'
                    ? formatBytes(item.receivedBytes)
                    : item.state}
              </div>
              {item.state === 'progressing' && (
                <div style={{ height: 3, borderRadius: 3, background: 'var(--surface-3)', marginTop: 5 }}>
                  <div style={{ height: 3, width: `${progress}%`, borderRadius: 3, background: 'var(--accent)', transition: 'width .3s linear' }} />
                </div>
              )}
            </div>
            <button className="icon-btn" style={{ width: 24, height: 24 }} onClick={() => api.downloads.showInFolder(item.id)} title="Show in folder">
              <ChevronRight size={13} />
            </button>
          </div>
        );
      })}
      <div className="menu-sep" />
      <button className="menu-item" onClick={() => void openInternal('downloads')}>
        <Trash2 size={14} /> Clear download list
      </button>
    </>
  );
}

function ShieldPopover({ rating }: { rating: { score: number; level: string; reasons: string[] } | null }) {
  const { windowState, prefs, privacy } = useStore();
  const setPrefs = useStore((state) => state.setPrefs);
  const toast = useStore((state) => state.toast);
  const activeTab = windowState.tabs.find((tab) => tab.id === windowState.activeId);
  const host = activeTab ? hostOf(activeTab.url) : '';

  return (
    <Popover
      id="shield"
      title="Privacy shield"
      width={330}
      button={<ShieldCheck size={16} />}
    >
      <div style={{ padding: '8px 10px 6px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span
            className={`badge ${rating?.level === 'risky' ? 'danger' : rating?.level === 'caution' ? 'warn' : 'ok'}`}
            style={{ height: 22 }}
          >
            <Shield size={11} />
            {rating ? `${rating.score}/100` : 'Kimmino page'}
          </span>
          <span style={{ fontSize: 12.5, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis' }}>{host || 'New tab'}</span>
        </div>
        {rating && (
          <ul style={{ margin: '8px 0 0', padding: 0, listStyle: 'none', display: 'grid', gap: 5 }}>
            {rating.reasons.slice(0, 4).map((reason) => (
              <li key={reason} style={{ fontSize: 11.5, color: 'var(--text-dim)', display: 'flex', gap: 6 }}>
                <span style={{ color: rating.level === 'risky' ? 'var(--danger)' : 'var(--ok)' }}>•</span>
                {reason}
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="stat-grid" style={{ padding: '0 10px' }}>
        <div className="stat">
          <div className="stat-value">{activeTab?.blocked.ads ?? 0}</div>
          <div className="stat-label">Ads</div>
        </div>
        <div className="stat">
          <div className="stat-value">{activeTab?.blocked.trackers ?? 0}</div>
          <div className="stat-label">Trackers</div>
        </div>
        <div className="stat">
          <div className="stat-value">{activeTab?.blocked.cookies ?? 0}</div>
          <div className="stat-label">Cookies</div>
        </div>
      </div>
      <div className="menu-sep" />
      <ToggleRow
        icon={<ShieldCheck size={14} />}
        label="Block ads & trackers"
        checked={prefs.privacy.adBlocking}
        onChange={(value) => void setPrefs({ privacy: { adBlocking: value, blockTrackers: value } })}
      />
      <ToggleRow
        icon={<Lock size={14} />}
        label="Refuse third-party cookies"
        checked={prefs.privacy.blockThirdPartyCookies}
        onChange={(value) => void setPrefs({ privacy: { blockThirdPartyCookies: value } })}
      />
      <ToggleRow
        icon={<UserRound size={14} />}
        label="Fingerprint protection"
        checked={prefs.privacy.fingerprintProtection}
        onChange={(value) => void setPrefs({ privacy: { fingerprintProtection: value } })}
      />
      <ToggleRow
        icon={<Globe size={14} />}
        label="Block location requests"
        checked={prefs.privacy.blockLocation}
        onChange={(value) => void setPrefs({ privacy: { blockLocation: value } })}
      />
      <div className="menu-sep" />
      <button
        className="menu-item"
        onClick={() => {
          if (!host) return;
          void api.privacy.allowForSite(host, true);
          toast(`Shield off for ${host}`, 'warn');
          api.tabs.reload();
        }}
      >
        <Shield size={14} /> Turn shield off for this site
      </button>
      <div style={{ padding: '4px 10px 8px', fontSize: 10.5, color: 'var(--text-faint)', lineHeight: 1.5 }}>
        Filters: EasyList + uBlock Origin lists, compiled locally. {privacy.session.toLocaleString()} requests blocked this session.
      </div>
      <span style={{ display: 'none' }}>{relativeTime(Date.now())}</span>
      <span style={{ display: 'none' }}>
        <ImageIcon size={0} />
      </span>
    </Popover>
  );
}

function ToggleRow({ icon, label, checked, onChange }: { icon: React.ReactNode; label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '7px 10px' }}>
      <span style={{ color: 'var(--text-dim)' }}>{icon}</span>
      <span style={{ flex: 1, fontSize: 12.5 }}>{label}</span>
      <button className="switch" role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)} />
    </div>
  );
}

export { captureScreenshot };
