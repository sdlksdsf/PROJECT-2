import { useMemo, useRef, useState } from 'react';
import { ArrowRight, Image as ImageIcon, LayoutGrid, Monitor, Plus, Search, ShieldCheck, Sparkles, Trash2, Wand2 } from 'lucide-react';
import { useStore, wallpapers } from '../store';
import { api, isNative } from '../bridge';
import { useClock, useKeySound } from '../hooks';
import { domainLabel, faviconFor, gradientFor, greeting, hostOf, letterOf } from '../lib/url';
import { SEARCH_ENGINES } from '@shared/defaults';

export function StartPage() {
  const { prefs, history, privacy, profile } = useStore();
  const navigate = useStore((state) => state.navigate);
  const setPrefs = useStore((state) => state.setPrefs);
  const playSound = useKeySound();
  const now = useClock();
  const [query, setQuery] = useState('');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [layoutEdit, setLayoutEdit] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const searchWrap = useRef<HTMLDivElement>(null);
  const startRef = useRef<HTMLDivElement>(null);

  const wallpaper = wallpapers.find((item) => item.id === prefs.startPage.wallpaper);
  const isCustom = !wallpaper;
  const wallpaperValue = wallpaper?.value ?? prefs.startPage.wallpaper;

  const topSites = useMemo(() => {
    const seen = new Map<string, { url: string; title: string; visits: number }>();
    for (const entry of history) {
      const host = hostOf(entry.url);
      if (!host) continue;
      const current = seen.get(host);
      if (current) current.visits += entry.visitCount;
      else seen.set(host, { url: entry.url, title: entry.title, visits: entry.visitCount });
    }
    return [...seen.values()].sort((a, b) => b.visits - a.visits).slice(0, 6);
  }, [history]);

  const engine = SEARCH_ENGINES[prefs.search.engine] ?? SEARCH_ENGINES.duckduckgo;

  const updateDials = async (dials: typeof prefs.startPage.dials) => {
    await setPrefs({ startPage: { dials } });
  };

  const submit = async () => {
    if (!query.trim()) return;
    playSound('enter');
    await navigate(query);
    setQuery('');
  };

  return (
    <div
      className="start"
      ref={startRef}
      style={{
        background: isCustom ? '#0b0f16' : wallpaper?.kind === 'gradient' ? wallpaper.value : '#0b0f16'
      }}
    >
      {!isCustom && wallpaper?.kind === 'image' && (
        <div
          className={`wallpaper ${prefs.startPage.liveWallpaper ? 'live' : ''}`}
          style={{
            backgroundImage: `url("${wallpaperValue}")`,
            filter: `blur(${prefs.startPage.wallpaperBlur}px) saturate(1.05)`
          }}
        />
      )}
      {isCustom && (
        <div
          className={`wallpaper ${prefs.startPage.liveWallpaper ? 'live' : ''}`}
          style={{ backgroundImage: `url("${wallpaperValue}")`, filter: `blur(${prefs.startPage.wallpaperBlur}px)` }}
        />
      )}
      {!isCustom && wallpaper?.kind === 'gradient' && prefs.startPage.liveWallpaper && (
        <div className="wallpaper-gradient live" style={{ background: wallpaper.value }} />
      )}
      <div className="wallpaper-dim" style={{ opacity: 0.4 + prefs.startPage.wallpaperDim / 100 }} />

      <div className="start-inner">
        <div className="start-top">
          {prefs.startPage.showClock ? (
            <div className="greeting">
              <div className="greeting-time">
                {now.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
              </div>
              <div className="greeting-text">
                {greeting(now)}, {profile?.name ?? 'friend'} — {now.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
              </div>
            </div>
          ) : (
            <span />
          )}
          <div className="start-wordmark">
            <span className="mark">K</span>
            Kimmino
          </div>
        </div>

        <div className="start-center">
          <div
            className={`start-search-wrap ${prefs.startPage.searchPosition ? 'detached' : ''}`}
            style={
              prefs.startPage.searchPosition
                ? { left: `${prefs.startPage.searchPosition.x}%`, top: `${prefs.startPage.searchPosition.y}%`, transform: 'translate(-50%,-50%)' }
                : undefined
            }
            ref={searchWrap}
          >
            <div className="start-search">
              <span className="engine-badge">{engine.name.slice(0, 1)}</span>
              <input
                value={query}
                placeholder={`Search ${engine.name} or type a URL`}
                aria-label="Search"
                spellCheck={false}
                onChange={(event) => {
                  setQuery(event.target.value);
                  playSound('key');
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') void submit();
                  if (event.key === 'Backspace') playSound('back');
                }}
              />
              <span className="divider-v" />
              <button className="search-lens" title="Search with Kimmino Lens" aria-label="Search" onClick={() => void submit()}>
                <Search size={17} />
              </button>
              <button className="search-go" title="Go" aria-label="Go" onClick={() => void submit()}>
                <ArrowRight size={17} />
              </button>
            </div>
          </div>

          <div className="dials">
            {prefs.startPage.dials.map((dial, index) => {
              const src = dial.icon || faviconFor(dial.url);
              return (
                <button
                  key={dial.id}
                  className="dial"
                  draggable={layoutEdit}
                  onDragStart={() => setDragIndex(index)}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={() => {
                    if (dragIndex === null || dragIndex === index) return;
                    const next = [...prefs.startPage.dials];
                    const [moved] = next.splice(dragIndex, 1);
                    next.splice(index, 0, moved);
                    setDragIndex(null);
                    void updateDials(next);
                  }}
                  onClick={() => {
                    if (layoutEdit) return;
                    void navigate(dial.url);
                  }}
                  style={{ animationDelay: `${index * 40}ms` }}
                  title={dial.url}
                >
                  <span className="dial-tile">
                    {src ? (
                      <img
                        src={src}
                        alt=""
                        onError={(event) => {
                          const target = event.currentTarget;
                          target.style.display = 'none';
                          target.parentElement?.insertAdjacentHTML('beforeend', `<span class="letter">${letterOf(dial.title)}</span>`);
                        }}
                      />
                    ) : (
                      <span className="letter">{letterOf(dial.title)}</span>
                    )}
                  </span>
                  <span className="dial-label">{dial.title}</span>
                  {layoutEdit && (
                    <span
                      role="button"
                      tabIndex={-1}
                      className="dial-remove"
                      onClick={(event) => {
                        event.stopPropagation();
                        void updateDials(prefs.startPage.dials.filter((item) => item.id !== dial.id));
                      }}
                    >
                      <Trash2 size={10} />
                    </span>
                  )}
                </button>
              );
            })}

            {adding ? (
              <div className="dial">
                <div className="dial-tile" style={{ background: 'rgba(255,255,255,.94)', flexDirection: 'column', gap: 4, padding: 6 }}>
                  <input
                    autoFocus
                    value={newTitle}
                    placeholder="Name"
                    onChange={(event) => setNewTitle(event.target.value)}
                    onKeyDown={(event) => event.stopPropagation()}
                    style={{ width: '100%', border: 0, outline: 'none', fontSize: 9.5, textAlign: 'center', background: 'none' }}
                  />
                  <input
                    value={newUrl}
                    placeholder="url"
                    onChange={(event) => setNewUrl(event.target.value)}
                    onKeyDown={(event) => event.stopPropagation()}
                    style={{ width: '100%', border: 0, outline: 'none', fontSize: 8.5, textAlign: 'center', background: 'none' }}
                  />
                </div>
                <button
                  className="start-chip"
                  style={{ height: 22, fontSize: 10 }}
                  onClick={async () => {
                    if (!newUrl.trim()) return;
                    const url = newUrl.startsWith('http') ? newUrl : `https://${newUrl.trim()}`;
                    await updateDials([
                      ...prefs.startPage.dials,
                      { id: `d_${Date.now().toString(36)}`, title: newTitle.trim() || domainLabel(url), url, icon: null }
                    ]);
                    setAdding(false);
                    setNewTitle('');
                    setNewUrl('');
                  }}
                >
                  Add
                </button>
              </div>
            ) : (
              <button className="dial dial-add" onClick={() => setAdding(true)}>
                <span className="dial-tile">
                  <Plus size={22} />
                </span>
                <span className="dial-label">Add a site</span>
              </button>
            )}
          </div>

          {prefs.startPage.showSuggestions && topSites.length > 0 && (
            <div className="suggestions-strip">
              <div className="suggestions-title">Jump back in</div>
              <div className="suggestions-row">
                {topSites.map((site) => (
                  <button key={site.url} className="suggestion-card" onClick={() => void navigate(site.url)} title={site.url}>
                    <span className="fav" style={{ background: gradientFor(hostOf(site.url)) }}>
                      {letterOf(hostOf(site.url))}
                    </span>
                    <span style={{ minWidth: 0 }}>
                      <span className="label" style={{ display: 'block' }}>
                        {site.title.slice(0, 26)}
                      </span>
                      <span style={{ fontSize: 10, color: 'rgba(255,255,255,.5)', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {domainLabel(site.url)}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="start-bottom">
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="start-chip" onClick={() => void useStore.getState().openInternal('settings')} title="Open privacy settings">
              <ShieldCheck size={13} />
              {privacy.ads.toLocaleString()} ads · {privacy.trackers.toLocaleString()} trackers blocked
            </button>
            <button className={`start-chip ${layoutEdit ? 'is-on' : ''}`} onClick={() => setLayoutEdit(!layoutEdit)}>
              <LayoutGrid size={13} />
              {layoutEdit ? 'Done editing' : 'Edit layout'}
            </button>
            <button className="start-chip" onClick={() => useStore.getState().setUI({ paletteOpen: true })}>
              <Sparkles size={13} />
              Ask Kimmino
            </button>
          </div>
          <button className={`start-chip ${sheetOpen ? 'is-on' : ''}`} onClick={() => setSheetOpen(!sheetOpen)}>
            <Wand2 size={13} />
            Customise
          </button>
        </div>
      </div>

      {sheetOpen && (
        <>
          <div style={{ position: 'absolute', inset: 0, zIndex: 10 }} onClick={() => setSheetOpen(false)} />
          <div className="wallpaper-sheet">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ flex: 1 }}>
                <div className="sheet-title" style={{ marginBottom: 2 }}>Wallpaper</div>
                <div style={{ fontSize: 11.5, color: 'var(--text-dim)' }}>Bundled art or something from your own computer.</div>
              </div>
              <button
                className="pill-btn"
                onClick={async () => {
                  const picked = await api.system.pickWallpaper();
                  if (picked) await setPrefs({ startPage: { wallpaper: picked } });
                }}
              >
                <Monitor size={13} /> From device
              </button>
            </div>
            <div className="wallpaper-grid">
              {wallpapers.map((item) => (
                <button
                  key={item.id}
                  className={`wallpaper-swatch ${prefs.startPage.wallpaper === item.id ? 'is-active' : ''}`}
                  title={item.name}
                  style={{
                    background: item.kind === 'gradient' ? item.value : `url("${item.value}") center/cover`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center'
                  }}
                  onClick={() => void setPrefs({ startPage: { wallpaper: item.id } })}
                />
              ))}
            </div>
            <div className="sheet-row">
              <span>Dim</span>
              <input
                type="range"
                min={0}
                max={70}
                value={prefs.startPage.wallpaperDim}
                onChange={(event) => void setPrefs({ startPage: { wallpaperDim: Number(event.target.value) } })}
              />
            </div>
            <div className="sheet-row">
              <span>Blur</span>
              <input
                type="range"
                min={0}
                max={16}
                value={prefs.startPage.wallpaperBlur}
                onChange={(event) => void setPrefs({ startPage: { wallpaperBlur: Number(event.target.value) } })}
              />
            </div>
            <div className="sheet-row">
              <span>Animate wallpaper</span>
              <button
                className="switch"
                role="switch"
                aria-checked={prefs.startPage.liveWallpaper}
                onClick={() => void setPrefs({ startPage: { liveWallpaper: !prefs.startPage.liveWallpaper } })}
              />
            </div>
            <div className="sheet-row">
              <span>Show clock & greeting</span>
              <button
                className="switch"
                role="switch"
                aria-checked={prefs.startPage.showClock}
                onClick={() => void setPrefs({ startPage: { showClock: !prefs.startPage.showClock } })}
              />
            </div>
            <div className="sheet-row">
              <span>Show recently visited</span>
              <button
                className="switch"
                role="switch"
                aria-checked={prefs.startPage.showSuggestions}
                onClick={() => void setPrefs({ startPage: { showSuggestions: !prefs.startPage.showSuggestions } })}
              />
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
              <button
                className="pill-btn"
                onClick={() => {
                  void setPrefs({ startPage: { searchPosition: { x: 50, y: 30 } } });
                  setSheetOpen(false);
                }}
              >
                <ImageIcon size={13} /> Move search up
              </button>
              <button className="pill-btn ghost" onClick={() => void setPrefs({ startPage: { searchPosition: null } })}>
                Reset search position
              </button>
              {!isNative && <span style={{ fontSize: 10.5, color: 'var(--text-faint)', alignSelf: 'center' }}>Preview mode</span>}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
