import { Minus, Plus, Square, X, Copy } from 'lucide-react';
import { useStore } from '../store';
import { api, isMac, isNative } from '../bridge';
import { BrandMark } from './Brand';
import { TabIcon } from './TabIcon';

/**
 * The title bar doubles as the tab strip — the same compact arrangement Chrome
 * and Edge use, so tabs get the full width of the window.
 */
export function TitleBar() {
  const { windowState, prefs } = useStore();
  const openInternal = useStore((state) => state.openInternal);

  const closeTab = async (id: string, event: React.MouseEvent) => {
    event.stopPropagation();
    await api.tabs.close(id);
  };

  // Double-clicking any empty part of the chrome maximises, the way every other
  // window manager behaves. Buttons and tabs keep their own double-click.
  const doubleClickChrome = (event: React.MouseEvent) => {
    const target = event.target as HTMLElement;
    if (target.closest('.tab, button, input, [role="tab"]')) return;
    api.window.toggleMaximize();
  };

  return (
    <div
      className={`titlebar ${isMac ? 'mac' : ''} ${prefs.compactTabs ? 'compact' : ''}`}
      onDoubleClick={doubleClickChrome}
    >
      <div className="brand">
        <BrandMark size={20} radius={6} />
      </div>

      <div className="tabstrip">
        {windowState.tabs.map((tab) => (
          <div
            key={tab.id}
            className={[
              'tab',
              tab.id === windowState.activeId ? 'is-active' : '',
              tab.isPinned ? 'is-pinned' : '',
              tab.splitWith ? 'is-split' : '',
              tab.audible && !tab.isMuted ? 'is-audible' : '',
              tab.discarded ? 'tab-discarded' : ''
            ]
              .filter(Boolean)
              .join(' ')}
            role="tab"
            aria-selected={tab.id === windowState.activeId}
            tabIndex={0}
            title={tab.title}
            onClick={() => void api.tabs.activate(tab.id)}
            onAuxClick={(event) => {
              if (event.button === 1) void api.tabs.close(tab.id);
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') void api.tabs.activate(tab.id);
            }}
          >
            {tab.loading ? <span className="tab-loading" /> : <TabIcon url={tab.url} title={tab.title} favicon={tab.favicon} />}
            {!tab.isPinned && <span className="tab-title">{tab.title || 'New tab'}</span>}
            {tab.isPinned && !tab.loading && <span className="tab-title" style={{ display: 'none' }}>{tab.title}</span>}
            <button className="tab-close" aria-label={`Close ${tab.title}`} onClick={(event) => closeTab(tab.id, event)}>
              <X size={11} strokeWidth={2.4} />
            </button>
          </div>
        ))}
        <button className="newtab-btn" aria-label="New tab" data-tip="New tab (Ctrl+T)" onClick={() => void api.tabs.create('kimmino://newtab')}>
          <Plus size={15} strokeWidth={2.2} />
        </button>
      </div>

      {!isMac && (
        <div className="window-controls">
          <button
            className="icon-btn"
            aria-label="Open settings"
            title="Settings"
            onClick={() => void openInternal('settings')}
            style={{ marginRight: 4 }}
          >
            <Copy size={0} />
          </button>
          <button className="win-btn" aria-label="Minimise" onClick={() => api.window.minimize()}>
            <Minus size={13} />
          </button>
          <button
            className="win-btn"
            aria-label="Maximise"
            onClick={() => api.window.toggleMaximize()}
            onDoubleClick={() => api.window.toggleMaximize()}
          >
            <Square size={11} />
          </button>
          <button className="win-btn close" aria-label="Close window" onClick={() => api.window.close()}>
            <X size={13} />
          </button>
        </div>
      )}

      {!isNative && (
        <span className="badge" style={{ marginLeft: 8, background: 'color-mix(in srgb, var(--accent) 18%, transparent)', color: 'var(--accent)' }}>
          Preview
        </span>
      )}
    </div>
  );
}
