import { useMemo, useState } from 'react';
import {
  Blocks,
  Check,
  Chrome,
  Clock,
  Download,
  ExternalLink,
  FileDown,
  Folder,
  History as HistoryIcon,
  KeyRound,
  Loader2,
  Palette,
  Plus,
  Search,
  ShieldCheck,
  Star,
  Trash2,
  Upload,
  X
} from 'lucide-react';
import { useStore } from '../store';
import { api, isNative } from '../bridge';
import { EmptyState, Row, Section, Toggle } from '../components/ui';
import { TabIcon } from '../components/TabIcon';
import { formatBytes, domainLabel, relativeTime } from '../lib/url';
import type { ThemeDefinition } from '@shared/types';

function LibraryHead({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="library-head">
      <div>
        <h1>{title}</h1>
        {subtitle && <div style={{ fontSize: 12.5, color: 'var(--text-dim)', marginTop: 4 }}>{subtitle}</div>}
      </div>
      {action}
    </div>
  );
}

/* --------------------------------- History ------------------------------- */

export function HistoryPage() {
  const history = useStore((state) => state.history);
  const navigate = useStore((state) => state.navigate);
  const reload = useStore((state) => state.reloadData);
  const toast = useStore((state) => state.toast);
  const [query, setQuery] = useState('');

  const grouped = useMemo(() => {
    const filtered = query ? history.filter((entry) => `${entry.title}${entry.url}`.toLowerCase().includes(query.toLowerCase())) : history;
    const buckets = new Map<string, typeof history>();
    for (const entry of filtered) {
      const date = new Date(entry.visitedAt);
      const key = date.toDateString() === new Date().toDateString() ? 'Today' : date.toDateString() === new Date(Date.now() - 86400000).toDateString() ? 'Yesterday' : date.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });
      const list = buckets.get(key) ?? [];
      list.push(entry);
      buckets.set(key, list);
    }
    return [...buckets.entries()];
  }, [history, query]);

  return (
    <div className="page">
      <div className="library">
        <LibraryHead
          title="History"
          subtitle="Stored only on this device, in plain JSON you can delete at any time."
          action={
            <div style={{ display: 'flex', gap: 8 }}>
              <div className="settings-search" style={{ margin: 0, width: 220 }}>
                <Search size={14} style={{ color: 'var(--text-faint)' }} />
                <input placeholder="Search history" value={query} onChange={(event) => setQuery(event.target.value)} />
              </div>
              <button
                className="pill-btn"
                onClick={async () => {
                  await api.history.clear('all');
                  await reload();
                  toast('History cleared', 'success');
                }}
              >
                <Trash2 size={13} /> Clear all
              </button>
            </div>
          }
        />
        {grouped.length === 0 ? (
          <div className="list">
            <EmptyState icon={<HistoryIcon size={22} />} title="Nothing here yet" hint="Pages you visit will appear here — unless you use a private window." />
          </div>
        ) : (
          grouped.map(([day, entries]) => (
            <div key={day} style={{ marginBottom: 20 }}>
              <div className="nav-group-label" style={{ margin: '0 0 8px' }}>{day}</div>
              <div className="list">
                {entries.map((entry) => (
                  <div key={entry.id} className="list-item">
                    <TabIcon url={entry.url} title={entry.title} size={16} />
                    <button className="list-main" style={{ background: 'none', textAlign: 'left' }} onClick={() => void navigate(entry.url)}>
                      <div className="list-title">{entry.title}</div>
                      <div className="list-sub">{domainLabel(entry.url)}</div>
                    </button>
                    <span className="list-meta">{new Date(entry.visitedAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}</span>
                    <button className="icon-btn" aria-label="Remove" onClick={async () => { await api.history.remove(entry.id); await reload(); }}>
                      <X size={13} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

/* -------------------------------- Downloads ------------------------------ */

export function DownloadsPage() {
  const downloads = useStore((state) => state.downloads);
  const reload = useStore((state) => state.reloadData);
  const toast = useStore((state) => state.toast);

  return (
    <div className="page">
      <div className="library">
        <LibraryHead title="Downloads" subtitle="Files are saved to your Downloads folder unless you choose otherwise." />
        {downloads.length === 0 ? (
          <div className="list">
            <EmptyState icon={<Download size={22} />} title="No downloads yet" hint="Anything you download shows up here with its progress." />
          </div>
        ) : (
          <div className="list">
            {downloads.map((item) => {
              const progress = item.totalBytes ? Math.min(100, Math.round((item.receivedBytes / item.totalBytes) * 100)) : 0;
              return (
                <div key={item.id} className="list-item">
                  <div className="tile-icon" style={{ width: 32, height: 32, borderRadius: 9 }}>
                    {item.state === 'progressing' ? <Loader2 size={15} className="spinner" /> : item.state === 'completed' ? <Check size={15} style={{ color: 'var(--ok)' }} /> : <X size={15} style={{ color: 'var(--danger)' }} />}
                  </div>
                  <div className="list-main">
                    <div className="list-title">{item.filename}</div>
                    <div className="list-sub">
                      {item.state === 'progressing'
                        ? `${formatBytes(item.receivedBytes)} of ${formatBytes(item.totalBytes)} · ${progress}%`
                        : `${item.state} · ${formatBytes(item.receivedBytes)} · ${relativeTime(item.startedAt)}`}
                    </div>
                    {item.state === 'progressing' && (
                      <div style={{ height: 4, borderRadius: 4, background: 'var(--surface-3)', marginTop: 6 }}>
                        <div style={{ height: 4, width: `${progress}%`, borderRadius: 4, background: 'linear-gradient(90deg,var(--accent),var(--accent-2))' }} />
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {item.state === 'completed' && (
                      <button className="icon-btn" title="Open" onClick={() => api.downloads.open(item.id)}>
                        <ExternalLink size={14} />
                      </button>
                    )}
                    {item.state === 'completed' && (
                      <button className="icon-btn" title="Show in folder" onClick={() => api.downloads.showInFolder(item.id)}>
                        <Folder size={14} />
                      </button>
                    )}
                    {item.state === 'progressing' && (
                      <button className="icon-btn" title="Cancel" onClick={() => api.downloads.cancel(item.id)}>
                        <X size={14} />
                      </button>
                    )}
                    <button className="icon-btn" title="Remove from list" onClick={async () => { await api.downloads.remove(item.id); await reload(); }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/* -------------------------------- Bookmarks ------------------------------ */

export function BookmarksPage() {
  const bookmarks = useStore((state) => state.bookmarks);
  const navigate = useStore((state) => state.navigate);
  const reload = useStore((state) => state.reloadData);
  const toast = useStore((state) => state.toast);
  const [query, setQuery] = useState('');
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [adding, setAdding] = useState(false);

  const filtered = bookmarks.filter((bookmark) => `${bookmark.title}${bookmark.url}`.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="page">
      <div className="library">
        <LibraryHead
          title="Bookmarks"
          subtitle={`${bookmarks.length} saved · sync them between devices in Settings → Sync`}
          action={
            <div style={{ display: 'flex', gap: 8 }}>
              <div className="settings-search" style={{ margin: 0, width: 200 }}>
                <Search size={14} style={{ color: 'var(--text-faint)' }} />
                <input placeholder="Search" value={query} onChange={(event) => setQuery(event.target.value)} />
              </div>
              <button className="pill-btn primary" onClick={() => setAdding(!adding)}>
                <Plus size={13} /> Add
              </button>
            </div>
          }
        />

        {adding && (
          <div className="card" style={{ padding: 14, marginBottom: 16, display: 'flex', gap: 8, alignItems: 'center' }}>
            <input className="text-input" placeholder="Title" value={title} onChange={(event) => setTitle(event.target.value)} />
            <input className="text-input" placeholder="https://…" value={url} onChange={(event) => setUrl(event.target.value)} style={{ flex: 1 }} />
            <button
              className="pill-btn primary"
              onClick={async () => {
                if (!url.trim()) return;
                await api.bookmarks.add({ title: title.trim() || domainLabel(url), url: url.startsWith('http') ? url : `https://${url.trim()}` });
                await reload();
                setAdding(false);
                setTitle('');
                setUrl('');
                toast('Bookmark added', 'success');
              }}
            >
              Save
            </button>
          </div>
        )}

        {filtered.length === 0 ? (
          <div className="list">
            <EmptyState icon={<Star size={22} />} title="No bookmarks" hint="Press Ctrl+D on any page to save it here." />
          </div>
        ) : (
          <div className="card-grid">
            {filtered.map((bookmark) => (
              <div key={bookmark.id} className="tile-card">
                <div className="tile-icon">
                  <TabIcon url={bookmark.url} title={bookmark.title} size={20} />
                </div>
                <div className="tile-body">
                  <button style={{ background: 'none', textAlign: 'left', width: '100%' }} onClick={() => void navigate(bookmark.url)}>
                    <div className="tile-title">{bookmark.title}</div>
                    <div className="tile-desc">{domainLabel(bookmark.url)}</div>
                  </button>
                </div>
                <button className="icon-btn" aria-label="Remove bookmark" onClick={async () => { await api.bookmarks.remove(bookmark.id); await reload(); }}>
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------- Extensions ------------------------------ */

export function ExtensionsPage() {
  const extensions = useStore((state) => state.extensions);
  const reload = useStore((state) => state.reloadData);
  const toast = useStore((state) => state.toast);

  return (
    <div className="page">
      <div className="library">
        <LibraryHead
          title="Extensions"
          subtitle="Chrome-compatible add-ons running inside Chromium's extension runtime."
          action={
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                className="pill-btn"
                onClick={async () => {
                  const result = await api.extensions.installFromFile();
                  if (result.message !== 'Cancelled.') toast(result.message, result.ok ? 'success' : 'warn');
                  await reload();
                }}
              >
                <Plus size={13} /> From a .zip
              </button>
              <button
                className="pill-btn primary"
                onClick={async () => {
                  const result = await api.extensions.installFromFolder();
                  if (result.message !== 'Cancelled.') toast(result.message, result.ok ? 'success' : 'warn');
                  await reload();
                }}
              >
                <Blocks size={13} /> Load unpacked
              </button>
            </div>
          }
        />
        {extensions.length === 0 ? (
          <div className="list">
            <EmptyState icon={<Blocks size={22} />} title="No extensions installed" hint="Kimmino works without any — that is the point." />
          </div>
        ) : (
          <div className="card-grid">
            {extensions.map((extension) => (
              <div key={extension.id} className="tile-card">
                <div className="tile-icon">
                  {extension.icon ? <img src={extension.icon} alt="" /> : <Chrome size={18} />}
                </div>
                <div className="tile-body">
                  <div className="tile-title">{extension.name}</div>
                  <div className="tile-desc">{extension.description || `Version ${extension.version}`}</div>
                  <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                    <span className="badge">v{extension.version}</span>
                    <span className="badge">MV{extension.manifestVersion}</span>
                    <span className={`badge ${extension.status === 'running' ? 'ok' : extension.status === 'error' ? 'warn' : ''}`}>
                      {extension.enabled ? (extension.status === 'running' ? 'running' : extension.status === 'error' ? 'failed to load' : 'starting') : 'off'}
                    </span>
                  </div>
                  {extension.status === 'error' && extension.error && (
                    <div className="tile-desc" style={{ color: 'var(--warn, #f0b45f)', marginTop: 6 }}>{extension.error}</div>
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
                  <Toggle
                    checked={extension.enabled}
                    onChange={async (value) => {
                      await api.extensions.setEnabled(extension.id, value);
                      await reload();
                    }}
                  />
                  <button
                    className="icon-btn"
                    aria-label="Remove"
                    onClick={async () => {
                      await api.extensions.remove(extension.id);
                      await reload();
                      toast('Extension removed', 'success');
                    }}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        <div style={{ marginTop: 18, fontSize: 11.5, color: 'var(--text-faint)', lineHeight: 1.6, maxWidth: 640 }}>
          Why “limited”? Chromium currently only exposes background service workers to full browser shells, so a Manifest V3 add-on that does all
          its work in the background can install and show its UI but parts of it may not run. Content-script and rules-based add-ons — ad blockers
          included — work normally. This is an upstream Chromium limitation, not a Kimmino choice.
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------- Themes ------------------------------- */

export function ThemesPage() {
  const themes = useStore((state) => state.themes);
  const prefs = useStore((state) => state.prefs);
  const reload = useStore((state) => state.reloadData);
  const toast = useStore((state) => state.toast);
  const [editing, setEditing] = useState<ThemeDefinition | null>(null);
  const [filter, setFilter] = useState<'all' | 'dark' | 'light' | 'cat' | 'anime' | 'custom'>('all');

  const categoryOf = (theme: ThemeDefinition): 'dark' | 'light' | 'cat' | 'anime' | 'custom' => {
    if (!theme.builtin) return 'custom';
    if (theme.id.startsWith('cat-')) return 'cat';
    if (theme.id.startsWith('anime-')) return 'anime';
    return theme.isDark ? 'dark' : 'light';
  };

  const visibleThemes = themes.filter((theme) => filter === 'all' || categoryOf(theme) === filter);
  const counts = {
    all: themes.length,
    dark: themes.filter((theme) => categoryOf(theme) === 'dark').length,
    light: themes.filter((theme) => categoryOf(theme) === 'light').length,
    cat: themes.filter((theme) => categoryOf(theme) === 'cat').length,
    anime: themes.filter((theme) => categoryOf(theme) === 'anime').length,
    custom: themes.filter((theme) => categoryOf(theme) === 'custom').length
  };

  const startNew = () => {
    setEditing({
      id: `custom_${Date.now().toString(36)}`,
      name: 'My theme',
      author: 'me',
      version: '1.0.0',
      isDark: true,
      builtin: false,
      colors: { bg: '#0a0f14', surface: '#111823', chrome: '#080d12', text: '#eef1f7', muted: '#94a3b8', border: '#1e2a3a', accent: '#6d8cff' }
    });
  };

  return (
    <div className="page">
      <div className="library">
        <LibraryHead
          title="Themes"
          subtitle={`${themes.length} themes included — dark, light, cat and anime palettes. A theme is a small JSON file of colours; import one or make your own.`}
          action={
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                className="pill-btn"
                onClick={async () => {
                  const theme = await api.themes.importFile();
                  if (theme) {
                    await reload();
                    toast(`Imported ${theme.name}`, 'success');
                  }
                }}
              >
                <Upload size={13} /> Import
              </button>
              <button
                className="pill-btn"
                onClick={async () => {
                  const path = await api.themes.exportCurrent();
                  toast(path ? 'Theme exported' : 'Export cancelled', path ? 'success' : 'info');
                }}
              >
                <FileDown size={13} /> Export
              </button>
              <button className="pill-btn primary" onClick={startNew}>
                <Plus size={13} /> New theme
              </button>
            </div>
          }
        />

        <div className="chip-row" style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
          {([
            ['all', 'All'],
            ['dark', 'Dark'],
            ['light', 'Light'],
            ['cat', 'Cat'],
            ['anime', 'Anime'],
            ['custom', 'Mine']
          ] as const).map(([key, label]) => (
            <button
              key={key}
              className={`start-chip ${filter === key ? 'is-on' : ''}`}
              onClick={() => setFilter(key)}
              disabled={counts[key] === 0 && key !== 'all'}
            >
              {label} <span style={{ opacity: 0.6, marginLeft: 4 }}>{counts[key]}</span>
            </button>
          ))}
        </div>

        <div className="card-grid">
          <ThemeCard
            id={null}
            name="Kimmino default"
            author="Kimmino"
            dark={prefs.themeMode !== 'light'}
            colors={{ bg: '#080a0f', surface: '#151a24', chrome: '#0d1017', accent: prefs.accent }}
            active={prefs.customThemeId === null}
            onApply={async () => {
              await api.themes.apply(null);
              await useStore.getState().setPrefs({ customThemeId: null });
            }}
          />
          {visibleThemes.map((theme) => (
            <ThemeCard
              key={theme.id}
              id={theme.id}
              name={theme.name}
              author={theme.author}
              dark={theme.isDark}
              colors={{ bg: theme.colors.bg, surface: theme.colors.surface, chrome: theme.colors.chrome, accent: theme.colors.accent }}
              active={prefs.customThemeId === theme.id}
              onApply={async () => {
                await api.themes.apply(theme.id);
                await useStore.getState().setPrefs({ customThemeId: theme.id, accent: theme.colors.accent });
                toast(`${theme.name} applied`, 'success');
              }}
              onEdit={theme.builtin ? undefined : () => setEditing(theme)}
              onDelete={
                theme.builtin
                  ? undefined
                  : async () => {
                      await api.themes.remove(theme.id);
                      if (prefs.customThemeId === theme.id) {
                        await useStore.getState().setPrefs({ customThemeId: null });
                      }
                      toast(`${theme.name} removed`, 'info');
                      await reload();
                    }
              }
            />
          ))}
        </div>

        {editing && (
          <>
            <div className="scrim" onClick={() => setEditing(null)} />
            <div className="palette" style={{ top: '12vh', maxWidth: 520 }}>
              <div className="palette-input">
                <Palette size={16} style={{ color: 'var(--accent)' }} />
                <input value={editing.name} onChange={(event) => setEditing({ ...editing, name: event.target.value })} placeholder="Theme name" />
              </div>
              <div style={{ padding: 16, display: 'grid', gap: 10 }}>
                {Object.entries(editing.colors).map(([key, value]) => (
                  <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ width: 90, fontSize: 12, color: 'var(--text-dim)', textTransform: 'capitalize' }}>{key}</span>
                    <input
                      type="color"
                      value={value}
                      onChange={(event) => setEditing({ ...editing, colors: { ...editing.colors, [key]: event.target.value } })}
                      style={{ width: 44, height: 28, borderRadius: 8, border: '1px solid var(--border)', background: 'none' }}
                    />
                    <input
                      className="text-input"
                      value={value}
                      onChange={(event) => setEditing({ ...editing, colors: { ...editing.colors, [key]: event.target.value } })}
                      style={{ flex: 1 }}
                    />
                  </div>
                ))}
                <div className="theme-preview" style={{ background: editing.colors.bg, marginTop: 6 }}>
                  <div className="theme-preview-bar" style={{ background: editing.colors.chrome }}>
                    <span className="theme-preview-dot" style={{ background: '#ff5f57' }} />
                    <span className="theme-preview-dot" style={{ background: '#febc2e' }} />
                    <span className="theme-preview-dot" style={{ background: '#28c840' }} />
                  </div>
                  <div className="theme-preview-body">
                    <div className="theme-preview-side" style={{ background: editing.colors.surface }} />
                    <div className="theme-preview-content" style={{ background: editing.colors.surface, display: 'grid', placeItems: 'center' }}>
                      <span style={{ width: 60, height: 8, borderRadius: 4, background: editing.colors.accent }} />
                    </div>
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', padding: '0 16px 16px' }}>
                <button className="pill-btn" onClick={() => setEditing(null)}>Cancel</button>
                <button
                  className="pill-btn primary"
                  onClick={async () => {
                    await api.themes.save(editing);
                    await api.themes.apply(editing.id);
                    await useStore.getState().setPrefs({ customThemeId: editing.id, accent: editing.colors.accent });
                    await reload();
                    setEditing(null);
                    toast('Theme saved and applied', 'success');
                  }}
                >
                  Save theme
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function ThemeCard({
  name,
  author,
  colors,
  active,
  onApply,
  onEdit,
  onDelete
}: {
  id: string | null;
  name: string;
  author: string;
  dark: boolean;
  colors: { bg: string; surface: string; chrome: string; accent: string };
  active: boolean;
  onApply: () => void | Promise<void>;
  onEdit?: () => void;
  onDelete?: () => void | Promise<void>;
}) {
  return (
    <div className="tile-card" style={{ flexDirection: 'column', alignItems: 'stretch', borderColor: active ? 'color-mix(in srgb, var(--accent) 55%, transparent)' : undefined }}>
      <div className="theme-preview" style={{ background: colors.bg }}>
        <div className="theme-preview-bar" style={{ background: colors.chrome }}>
          <span className="theme-preview-dot" style={{ background: '#ff5f57' }} />
          <span className="theme-preview-dot" style={{ background: '#febc2e' }} />
          <span className="theme-preview-dot" style={{ background: '#28c840' }} />
          <span style={{ marginLeft: 'auto', width: 40, height: 6, borderRadius: 3, background: colors.accent, opacity: 0.8 }} />
        </div>
        <div className="theme-preview-body">
          <div className="theme-preview-side" style={{ background: colors.surface }} />
          <div className="theme-preview-content" style={{ background: colors.surface, display: 'grid', placeItems: 'center' }}>
            <span style={{ width: 56, height: 8, borderRadius: 4, background: colors.accent }} />
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="tile-title">{name}</div>
          <div className="tile-desc">by {author}</div>
        </div>
        {active ? (
          <span className="badge ok"><Check size={11} /> Active</span>
        ) : (
          <button className="pill-btn" onClick={() => void onApply()}>Apply</button>
        )}
      </div>
      {(onEdit || onDelete) && (
        <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
          {onEdit && <button className="pill-btn ghost" onClick={onEdit}>Edit</button>}
          {onDelete && (
            <button className="pill-btn ghost" onClick={() => void onDelete()}>
              <Trash2 size={12} /> Remove
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/* -------------------------------- Passwords ------------------------------ */

export function PasswordsPage() {
  return (
    <div className="page">
      <div className="library">
        <LibraryHead title="Autofill & passwords" subtitle="Kimmino does not build its own password vault — and here is why." />
        <Section title="How it works">
          <Row
            title="No cloud vault"
            description="A password database is the single most valuable thing a browser can hold. Kimmino's answer is to not hold one: the small attack surface is the feature."
            control={<span className="badge"><KeyRound size={11} /> By design</span>}
          />
          <Row
            title="Use an audited manager"
            description="Bitwarden, 1Password, Proton Pass and KeePassXC all ship Chrome-compatible extensions that work in Kimmino's extension runtime."
            control={
              <button className="pill-btn" onClick={() => api.system.openExternal('https://bitwarden.com/download/')}>
                <ExternalLink size={13} /> Get Bitwarden
              </button>
            }
          />
          <Row
            title="Saved form entries"
            description="Kimmino never remembers what you type into a form. Autofill from extensions still works."
            control={<span className="badge ok"><ShieldCheck size={11} /> Never stores</span>}
          />
        </Section>
        <Section title="Accounts & profiles">
          <Row
            title="Multiple identity profiles"
            description="Each profile has its own cookie jar, so two Gmail accounts can stay signed in at the same time in separate profiles."
            control={
              <button className="pill-btn" onClick={() => void useStore.getState().openInternal('settings')}>
                <Plus size={13} /> Manage profiles
              </button>
            }
          />
        </Section>
      </div>
    </div>
  );
}

/* ---------------------------------- About -------------------------------- */

export function AboutPage() {
  const { privacy, bookmarks, history, extensions } = useStore();
  const setPrefs = useStore((state) => state.setPrefs);
  const prefs = useStore((state) => state.prefs);

  return (
    <div className="page">
      <div className="library" style={{ maxWidth: 860 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 26 }}>
          <div style={{ width: 64, height: 64, borderRadius: 20, background: 'linear-gradient(135deg,#7c97ff,#33d6a6)', display: 'grid', placeItems: 'center', fontSize: 26, fontWeight: 800, color: '#08111a' }}>
            K
          </div>
          <div>
            <h1 style={{ marginBottom: 4 }}>Kimmino {api.version}</h1>
            <div style={{ fontSize: 12.5, color: 'var(--text-dim)' }}>
              A private, fast, open-source browser · built on Chromium {isNative ? '140' : '(preview)'}
            </div>
          </div>
        </div>

        <div className="stat-grid" style={{ maxWidth: 520, marginBottom: 26 }}>
          <div className="stat">
            <div className="stat-value">{privacy.ads.toLocaleString()}</div>
            <div className="stat-label">Ads blocked</div>
          </div>
          <div className="stat">
            <div className="stat-value">{history.length}</div>
            <div className="stat-label">Pages visited</div>
          </div>
          <div className="stat">
            <div className="stat-value">{bookmarks.length + extensions.length}</div>
            <div className="stat-label">Bookmarks + add-ons</div>
          </div>
        </div>

        <Section title="The promise">
          <Row title="No telemetry, ever" description="No analytics, no crash reporter, no “anonymous usage statistics”. Verified by reading the source." control={<span className="badge ok">Always</span>} />
          <Row title="No account required" description="Profiles live on your disk. Sync is optional and points at a backend you control." control={<span className="badge ok">Always</span>} />
          <Row title="Open source" description="Mozilla Public License 2.0. Fork it, audit it, ship it." control={<button className="pill-btn" onClick={() => api.system.openExternal('https://github.com/sdlksdsf/PROJECT-2')}>GitHub</button>} />
        </Section>

        <Section title="Updates">
          <Row
            title="Early bird channel"
            description="Release candidates a few days early."
            control={<Toggle checked={prefs.productivity.earlyBird} onChange={(value) => void setPrefs({ productivity: { earlyBird: value } })} />}
          />
          <Row title="Website" description="Downloads, docs and the privacy policy." control={<button className="pill-btn" onClick={() => api.system.openExternal('https://kimmino.vercel.app')}><ExternalLink size={13} /> kimmino.app</button>} />
          <Row title="Privacy policy" control={<button className="pill-btn" onClick={() => api.system.openExternal('https://kimmino.vercel.app/privacy')}>Read</button>} />
        </Section>

        <Section title="Credits">
          <Row title="Chromium" description="The rendering engine, plus the extension runtime." control={<span className="badge">BSD</span>} />
          <Row title="EasyList & uBlock Origin filters" description="Volunteer-maintained blocklists that do the real work." control={<span className="badge">GPLv3</span>} />
          <Row title="Inter & Space Grotesk" description="The typefaces this interface is set in." control={<span className="badge">OFL</span>} />
        </Section>

        <div style={{ marginTop: 30, fontSize: 11.5, color: 'var(--text-faint)', display: 'flex', gap: 6, alignItems: 'center' }}>
          <Clock size={12} /> Built on {new Date().getFullYear()} · Kimmino Contributors
        </div>
      </div>
    </div>
  );
}
