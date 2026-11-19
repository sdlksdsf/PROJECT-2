import { Blocks, Camera, Clock, Download, Focus, History, Palette, Settings, ShieldOff, Sparkles, Star, X } from 'lucide-react';
import { useStore } from '../store';
import { api, isNative } from '../bridge';
import { TabIcon } from './TabIcon';
import type { InternalPage } from '@shared/types';

const RAIL_ITEMS: Array<{ page: InternalPage; icon: React.ReactNode; label: string }> = [
  { page: 'bookmarks', icon: <Star size={17} />, label: 'Bookmarks' },
  { page: 'history', icon: <History size={17} />, label: 'History' },
  { page: 'downloads', icon: <Download size={17} />, label: 'Downloads' },
  { page: 'extensions', icon: <Blocks size={17} />, label: 'Extensions' },
  { page: 'themes', icon: <Palette size={17} />, label: 'Themes' },
  { page: 'passwords', icon: <ShieldOff size={17} />, label: 'Passwords' }
];

export function Sidebar() {
  const { windowState, prefs, internalPage, profile, privacy } = useStore();
  const openInternal = useStore((state) => state.openInternal);
  const setUI = useStore((state) => state.setUI);
  const toast = useStore((state) => state.toast);
  const aiOpen = useStore((state) => state.aiOpen);
  const focusSession = useStore((state) => state.focusSession);
  const startFocus = useStore((state) => state.startFocus);

  return (
    <div className="rail">
      <button
        className="rail-btn"
        title={`${profile?.name ?? 'Profile'} — profiles & sync`}
        aria-label="Profile"
        onClick={() => setUI({ profileMenuOpen: true })}
        style={{ marginBottom: 4 }}
      >
        <span
          className="rail-avatar"
          style={{ background: `linear-gradient(135deg, ${profile?.color ?? '#6d8cff'}, #33d6a6)` }}
        >
          {(profile?.name ?? 'P').slice(0, 1).toUpperCase()}
        </span>
      </button>

      {RAIL_ITEMS.map((item) => (
        <button
          key={item.page}
          className={`rail-btn ${internalPage === item.page ? 'is-active' : ''}`}
          title={item.label}
          aria-label={item.label}
          onClick={() => void openInternal(item.page)}
        >
          {item.icon}
        </button>
      ))}

      <div className="rail-spacer" />

      <button
        className={`rail-btn ${aiOpen ? 'is-active' : ''}`}
        title="Kimmino AI (Ctrl+Shift+A)"
        aria-label="Kimmino AI"
        onClick={() => setUI({ aiOpen: !aiOpen })}
      >
        <Sparkles size={17} />
      </button>

      <button
        className={`rail-btn ${focusSession ? 'is-active' : ''}`}
        title={focusSession ? 'Focus session running' : 'Start a focus session'}
        aria-label="Focus mode"
        onClick={() => {
          if (focusSession) {
            setUI({ focusSession: null });
            toast('Focus session ended', 'info');
          } else {
            startFocus(prefs.productivity.focusMode.minutes || 25);
            toast(`Focus mode on for ${prefs.productivity.focusMode.minutes || 25} minutes`, 'success');
          }
        }}
      >
        <Focus size={17} />
      </button>

      <button
        className="rail-btn"
        title="Screenshot (Ctrl+Shift+S)"
        aria-label="Screenshot"
        onClick={async () => {
          const result = await api.screenshot.capture('visible');
          if (result.ok && result.dataUrl) {
            setUI({ screenshot: { dataUrl: result.dataUrl, path: result.path } });
            toast('Screenshot saved', 'success');
          } else {
            toast(result.error ?? 'Screenshot failed', 'warn');
          }
        }}
      >
        <Camera size={17} />
      </button>

      {isNative && (
        <button className="rail-btn" title="New private window (Ctrl+Shift+N)" aria-label="New private window" onClick={() => api.window.newIncognitoWindow()}>
          <ShieldOff size={17} />
        </button>
      )}

      <button
        className={`rail-btn ${internalPage === 'settings' ? 'is-active' : ''}`}
        title="Settings (Ctrl+,)"
        aria-label="Settings"
        onClick={() => void openInternal('settings')}
      >
        <Settings size={17} />
      </button>

      <span style={{ display: 'none' }}>{privacy.session}</span>
      <span style={{ display: 'none' }}>{windowState.tabs.length}</span>
      <span style={{ display: 'none' }}>{internals.clock}</span>
    </div>
  );
}

const internals = { clock: <Clock size={0} /> };

/** Vertical tab list — Opera/Firefox style, toggled in Settings → Appearance. */
export function VerticalTabs() {
  const { windowState } = useStore();
  return (
    <div className="vertical-tabs">
      {windowState.tabs.map((tab) => (
        <button
          key={tab.id}
          className={`vtab ${tab.id === windowState.activeId ? 'is-active' : ''}`}
          onClick={() => void api.tabs.activate(tab.id)}
          title={tab.title}
        >
          <TabIcon url={tab.url} title={tab.title} favicon={tab.favicon} size={14} />
          <span className="tab-title">{tab.title || 'New tab'}</span>
          <span
            role="button"
            tabIndex={-1}
            className="tab-close"
            style={{ opacity: 0.6 }}
            onClick={(event) => {
              event.stopPropagation();
              void api.tabs.close(tab.id);
            }}
          >
            <X size={11} />
          </span>
        </button>
      ))}
    </div>
  );
}

export const railPages = RAIL_ITEMS.map((item) => item.page);
