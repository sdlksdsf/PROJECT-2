import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, Clock, Globe, Lock, Search, ShieldAlert, ShieldCheck, Star } from 'lucide-react';
import { useStore } from '../store';
import { api } from '../bridge';
import { useKeySound } from '../hooks';
import { engineName, prettyUrl, toUrl } from '../lib/url';
import type { SearchSuggestion } from '@shared/types';

/**
 * The address bar. While it is not focused it renders a "security chip" view of
 * the current URL (protocol, domain, path) instead of an editable string, which
 * makes lookalike domains far easier to spot.
 */
export function Omnibox() {
  const { windowState, prefs, history, bookmarks, omniboxFocusToken } = useStore();
  const navigate = useStore((state) => state.navigate);
  const toast = useStore((state) => state.toast);
  const playSound = useKeySound();

  const activeTab = windowState.tabs.find((tab) => tab.id === windowState.activeId) ?? null;
  const inputRef = useRef<HTMLInputElement>(null);
  const [focused, setFocused] = useState(false);
  const [value, setValue] = useState('');
  const [selected, setSelected] = useState(-1);

  useEffect(() => {
    if (omniboxFocusToken > 0) inputRef.current?.focus();
  }, [omniboxFocusToken]);

  useEffect(() => {
    if (!focused && activeTab) setValue(activeTab.url === 'kimmino://newtab' ? '' : activeTab.url);
  }, [activeTab?.url, focused]);

  const suggestions = useMemo<SearchSuggestion[]>(() => {
    const query = value.trim();
    if (!query) return [];
    const lower = query.toLowerCase();
    const out: SearchSuggestion[] = [];

    const looksLikeUrl = /^(https?:\/\/|kimmino:\/\/)/.test(query) || /^[\w-]+(\.[\w-]+)+/.test(query);
    if (!prefs.search.suggestions) return out;
    out.push({
      type: looksLikeUrl ? 'url' : 'search',
      title: looksLikeUrl ? query : `Search ${engineName(prefs.search.engine)} for “${query}”`,
      url: toUrl(query, prefs.search.engine, prefs.search.customEngineUrl)
    });

    if (prefs.search.autocompleteHistory) {
      for (const entry of history) {
        if (out.length >= 6) break;
        if (`${entry.title} ${entry.url}`.toLowerCase().includes(lower)) {
          out.push({ type: 'history', title: entry.title, url: entry.url });
        }
      }
      for (const bookmark of bookmarks) {
        if (out.length >= 8) break;
        if (`${bookmark.title} ${bookmark.url}`.toLowerCase().includes(lower)) {
          out.push({ type: 'bookmark', title: bookmark.title, url: bookmark.url });
        }
      }
    }
    return out;
  }, [value, history, bookmarks, prefs.search]);

  const commit = async (raw?: string) => {
    const target = raw ?? value;
    if (!target.trim()) return;
    setFocused(false);
    inputRef.current?.blur();
    await navigate(target);
  };

  const url = activeTab?.url ?? '';
  const pretty = prettyUrl(url);
  const isInternal = url.startsWith('kimmino://');
  const trust = activeTab?.trust ?? 100;

  const securityState = isInternal
    ? 'internal'
    : url.startsWith('https://')
      ? trust < 45
        ? 'risky'
        : 'secure'
      : url.startsWith('http://')
        ? 'insecure'
        : 'internal';

  const focusInput = () => {
    inputRef.current?.focus();
    inputRef.current?.select();
  };

  return (
    <div className={`omnibox ${focused ? 'is-focused' : ''}`} onMouseDown={(event) => {
      if (event.target === event.currentTarget) focusInput();
    }}>
      <span
        className={`omnibox-lock ${securityState === 'secure' ? 'secure' : securityState === 'insecure' || securityState === 'risky' ? 'insecure' : ''}`}
        title={
          securityState === 'secure'
            ? 'Encrypted connection'
            : securityState === 'insecure'
              ? 'Not encrypted'
              : securityState === 'risky'
                ? 'Kimmino is not confident about this site'
                : 'Kimmino page'
        }
      >
        {securityState === 'secure' ? (
          <Lock size={13} />
        ) : securityState === 'risky' ? (
          <ShieldAlert size={14} />
        ) : securityState === 'insecure' ? (
          <ShieldAlert size={14} />
        ) : (
          <Search size={13} />
        )}
      </span>

      {!focused && !isInternal && pretty.host ? (
        <div
          style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 0, fontSize: 13, cursor: 'text', overflow: 'hidden' }}
          onClick={focusInput}
        >
          <span className="omnibox-domain" style={{ whiteSpace: 'nowrap' }}>{pretty.host}</span>
          <span className="omnibox-path" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pretty.path}</span>
        </div>
      ) : (
        <input
          ref={inputRef}
          value={value}
          spellCheck={false}
          autoComplete="off"
          placeholder={isInternal ? 'Search Kimmino or type a URL' : 'Search or enter address'}
          aria-label="Address and search bar"
          onChange={(event) => {
            setValue(event.target.value);
            setSelected(-1);
            playSound('key');
          }}
          onFocus={(event) => {
            setFocused(true);
            event.currentTarget.select();
          }}
          onBlur={() => setTimeout(() => setFocused(false), 120)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              playSound('enter');
              const pick = selected >= 0 ? suggestions[selected]?.url : undefined;
              void commit(pick);
            } else if (event.key === 'Escape') {
              setFocused(false);
              inputRef.current?.blur();
            } else if (event.key === 'ArrowDown') {
              event.preventDefault();
              setSelected((current) => Math.min(suggestions.length - 1, current + 1));
            } else if (event.key === 'ArrowUp') {
              event.preventDefault();
              setSelected((current) => Math.max(-1, current - 1));
            } else if (event.key === 'Backspace') {
              playSound('back');
            }
          }}
        />
      )}

      <div className="omnibox-actions">
        <button
          className="icon-btn"
          title="Bookmark this page (Ctrl+D)"
          aria-label="Bookmark this page"
          onClick={async () => {
            if (!activeTab || isInternal) return;
            await api.bookmarks.add({ title: activeTab.title, url: activeTab.url });
            await useStore.getState().reloadData();
            toast('Bookmark added', 'success');
          }}
        >
          <Star size={14} />
        </button>
        <ShieldChip />
      </div>

      {focused && suggestions.length > 0 && (
        <div className="suggestions" onMouseDown={(event) => event.preventDefault()}>
          {suggestions.map((suggestion, index) => (
            <button
              key={`${suggestion.url}-${index}`}
              className={`suggestion ${index === selected ? 'is-selected' : ''}`}
              onClick={() => void commit(suggestion.url)}
              onMouseEnter={() => setSelected(index)}
            >
              <span className="s-icon">
                {suggestion.type === 'search' ? (
                  <Search size={14} />
                ) : suggestion.type === 'history' ? (
                  <Clock size={14} />
                ) : suggestion.type === 'bookmark' ? (
                  <Star size={14} />
                ) : (
                  <Globe size={14} />
                )}
              </span>
              <span className="s-main">
                <span className="s-title">{suggestion.title}</span>
                {suggestion.type !== 'search' && <span className="s-url" style={{ display: 'block' }}>{prettyUrl(suggestion.url).host}</span>}
              </span>
              <ArrowRight size={13} style={{ opacity: 0.4 }} />
            </button>
          ))}
          <div style={{ padding: '6px 10px', fontSize: 10.5, color: 'var(--text-faint)', display: 'flex', gap: 10 }}>
            <span>Enter to open</span>
            <span>Esc to dismiss</span>
            <span>Suggestions stay on this device</span>
          </div>
        </div>
      )}
    </div>
  );
}

function ShieldChip() {
  const { privacy, windowState } = useStore();
  const shieldOpen = useStore((state) => state.shieldOpen);
  const setUI = useStore((state) => state.setUI);
  const activeTab = windowState.tabs.find((tab) => tab.id === windowState.activeId);
  const blocked = activeTab ? activeTab.blocked.ads + activeTab.blocked.trackers : 0;

  return (
    <button
      className={`shield ${blocked > 0 ? '' : 'warn'}`}
      title="Privacy shield — what Kimmino blocked on this page"
      aria-label="Privacy shield"
      onClick={() => setUI({ shieldOpen: !shieldOpen })}
    >
      <ShieldCheck size={13} />
      <span>{privacy.session + blocked}</span>
    </button>
  );
}
