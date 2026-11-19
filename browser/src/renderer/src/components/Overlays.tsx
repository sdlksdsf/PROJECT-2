import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Check,
  ChevronRight,
  Command,
  CornerDownLeft,
  Download,
  ExternalLink,
  Focus,
  History,
  Image as ImageIcon,
  Search,
  Send,
  Settings,
  Shield,
  Sparkles,
  Star,
  X,
  Zap
} from 'lucide-react';
import { useStore } from '../store';
import { api, isNative } from '../bridge';
import { useFreeze, useInterval } from '../hooks';
import { BrandMark } from './Brand';
import { domainLabel } from '../lib/url';
import type { AiMessage, InternalPage } from '@shared/types';

/* ------------------------------- Toasts -------------------------------- */

export function Toasts() {
  const toasts = useStore((state) => state.toasts);
  const dismiss = useStore((state) => state.dismissToast);
  return (
    <div className="toasts">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast ${toast.kind}`} onClick={() => dismiss(toast.id)}>
          {toast.kind === 'success' ? <Check size={14} style={{ color: 'var(--ok)' }} /> : toast.kind === 'warn' ? <Shield size={14} style={{ color: 'var(--warn)' }} /> : <Sparkles size={14} style={{ color: 'var(--accent)' }} />}
          <span>{toast.message}</span>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------- Find bar ------------------------------- */

export function FindBar() {
  const open = useStore((state) => state.findOpen);
  const setUI = useStore((state) => state.setUI);
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<{ matches: number; active: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) inputRef.current?.focus();
    else {
      setQuery('');
      setResult(null);
      api.find.stop();
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const run = async () => {
      const value = await api.find.query(query, true, false);
      setResult(value);
    };
    const timer = setTimeout(run, 160);
    return () => clearTimeout(timer);
  }, [query, open]);

  if (!open) return null;

  return (
    <div className="findbar">
      <Search size={14} style={{ color: 'var(--text-faint)' }} />
      <input
        ref={inputRef}
        value={query}
        placeholder="Find in page"
        onChange={(event) => setQuery(event.target.value)}
        onKeyDown={async (event) => {
          if (event.key === 'Enter') {
            const next = await api.find.query(query, !event.shiftKey, true);
            setResult(next);
          }
          if (event.key === 'Escape') setUI({ findOpen: false });
        }}
      />
      <span className="find-count">{result ? `${result.active} of ${result.matches}` : '—'}</span>
      <button
        className="icon-btn"
        aria-label="Previous match"
        onClick={async () => setResult(await api.find.query(query, false, true))}
      >
        <ArrowUp size={14} />
      </button>
      <button className="icon-btn" aria-label="Next match" onClick={async () => setResult(await api.find.query(query, true, true))}>
        <ArrowDown size={14} />
      </button>
      <button className="icon-btn" aria-label="Close find" onClick={() => setUI({ findOpen: false })}>
        <X size={14} />
      </button>
    </div>
  );
}

/* ------------------------------- AI panel ------------------------------- */

export function AiPanel() {
  const open = useStore((state) => state.aiOpen);
  const setUI = useStore((state) => state.setUI);
  const prefs = useStore((state) => state.prefs);
  const activeTab = useStore((state) => state.windowState.tabs.find((tab) => tab.id === useStore.getState().windowState.activeId));
  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
  }, [messages, busy]);

  if (!open) return null;

  const send = async (text: string) => {
    if (!text.trim() || busy) return;
    setInput('');
    setMessages((current) => [...current, { role: 'user', content: text, at: Date.now() }]);
    setBusy(true);
    const reply = await api.ai.ask(text);
    setBusy(false);
    setMessages((current) => [...current, { role: 'assistant', content: reply.text, at: Date.now() }]);
  };

  const quick = [
    { label: 'Summarise this page', action: async () => {
      setBusy(true);
      setMessages((current) => [...current, { role: 'user', content: 'Summarise this page', at: Date.now() }]);
      const reply = await api.ai.summarizePage();
      setBusy(false);
      setMessages((current) => [...current, { role: 'assistant', content: reply.text, at: Date.now() }]);
    } },
    { label: 'What did Kimmino block?', action: () => send('What did Kimmino block on this page?') },
    { label: 'Where is the cookie setting?', action: () => send('Where do I change cookie settings?') }
  ];

  return (
    <aside className="ai-panel">
      <div className="ai-head">
        <Sparkles size={15} style={{ color: 'var(--accent)' }} />
        <span className="ai-title">Kimmino AI</span>
        <span className="badge">{prefs.productivity.aiProvider === 'off' ? 'On-device' : prefs.productivity.aiProvider}</span>
        <button className="icon-btn" aria-label="Close assistant" onClick={() => setUI({ aiOpen: false })}>
          <X size={14} />
        </button>
      </div>
      <div className="ai-body" ref={bodyRef}>
        {messages.length === 0 && (
          <div className="ai-msg assistant">
            {activeTab && !activeTab.url.startsWith('kimmino://')
              ? `I can read “${activeTab.title.slice(0, 60)}” without sending it anywhere. Ask for a summary, or about anything Kimmino blocked.`
              : 'Hey — I run on this device. Ask me to summarise the page you are on, explain a privacy setting, or tell you what was blocked.'}
          </div>
        )}
        {messages.map((message, index) => (
          <div key={`${message.at}-${index}`} className={`ai-msg ${message.role}`}>
            {message.content}
          </div>
        ))}
        {busy && (
          <div className="ai-msg assistant" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="spinner" /> thinking…
          </div>
        )}
      </div>
      <div className="ai-suggestions">
        {quick.map((item) => (
          <button key={item.label} className="ai-chip" onClick={() => void item.action()}>
            {item.label}
          </button>
        ))}
      </div>
      <div className="ai-input">
        <textarea
          value={input}
          placeholder="Ask about this page…"
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              void send(input);
            }
          }}
        />
        <button className="icon-btn" style={{ background: 'var(--accent)', color: '#08111a', width: 38, height: 38, borderRadius: 10 }} onClick={() => void send(input)}>
          <Send size={15} />
        </button>
      </div>
    </aside>
  );
}

/* --------------------------- Command palette ---------------------------- */

interface PaletteCommand {
  id: string;
  title: string;
  hint?: string;
  icon: React.ReactNode;
  run: () => void;
}

export function CommandPalette() {
  const open = useStore((state) => state.paletteOpen);
  const setUI = useStore((state) => state.setUI);
  const openInternal = useStore((state) => state.openInternal);
  const prefs = useStore((state) => state.prefs);
  const setPrefs = useStore((state) => state.setPrefs);
  const history = useStore((state) => state.history);
  const navigate = useStore((state) => state.navigate);
  const [query, setQuery] = useState('');
  const [index, setIndex] = useState(0);
  useFreeze(open);

  const commands = useMemo<PaletteCommand[]>(() => {
    const pages: Array<[InternalPage, string, React.ReactNode]> = [
      ['settings', 'Open settings', <Settings size={15} key="s" />],
      ['history', 'Open history', <History size={15} key="h" />],
      ['downloads', 'Open downloads', <Download size={15} key="d" />],
      ['bookmarks', 'Open bookmarks', <Star size={15} key="b" />],
      ['extensions', 'Manage extensions', <Zap size={15} key="e" />],
      ['themes', 'Change theme', <ImageIcon size={15} key="t" />],
      ['passwords', 'Password manager', <Shield size={15} key="p" />],
      ['about', 'About Kimmino', <Sparkles size={15} key="a" />]
    ];

    const base: PaletteCommand[] = [
      {
        id: 'new-tab',
        title: 'New tab',
        hint: 'Ctrl+T',
        icon: <ChevronRight size={15} />,
        run: () => void api.tabs.create('kimmino://newtab')
      },
      {
        id: 'new-private',
        title: 'New private window',
        hint: 'Ctrl+Shift+N',
        icon: <Shield size={15} />,
        run: () => (isNative ? api.window.newIncognitoWindow() : void api.tabs.create('kimmino://newtab'))
      },
      ...pages.map(([page, title, icon]) => ({
        id: `page-${page}`,
        title,
        icon,
        run: () => void openInternal(page)
      })),
      {
        id: 'toggle-adblock',
        title: `${prefs.privacy.adBlocking ? 'Pause' : 'Resume'} ad blocking`,
        icon: <Shield size={15} />,
        run: () => void setPrefs({ privacy: { adBlocking: !prefs.privacy.adBlocking } })
      },
      {
        id: 'toggle-dark',
        title: `Force dark mode ${prefs.productivity.forceDarkMode ? 'off' : 'on'}`,
        icon: <ImageIcon size={15} />,
        run: () => void setPrefs({ productivity: { forceDarkMode: !prefs.productivity.forceDarkMode } })
      },
      {
        id: 'clear-data',
        title: 'Clear browsing data',
        icon: <X size={15} />,
        run: () => void openInternal('settings')
      },
      {
        id: 'focus',
        title: 'Start focus session',
        icon: <Focus size={15} />,
        run: () => useStore.getState().startFocus(prefs.productivity.focusMode.minutes || 25)
      },
      {
        id: 'screenshot',
        title: 'Take a screenshot',
        hint: 'Ctrl+Shift+S',
        icon: <ImageIcon size={15} />,
        run: async () => {
          const result = await api.screenshot.capture('visible');
          if (result.ok && result.dataUrl) useStore.getState().setUI({ screenshot: { dataUrl: result.dataUrl, path: result.path } });
        }
      }
    ];

    const historyCommands: PaletteCommand[] = history.slice(0, 40).map((entry) => ({
      id: `hist-${entry.id}`,
      title: entry.title,
      hint: domainLabel(entry.url),
      icon: <History size={15} />,
      run: () => void navigate(entry.url)
    }));

    return [...base, ...historyCommands];
  }, [history, navigate, openInternal, prefs, setPrefs]);

  const filtered = useMemo(() => {
    const lower = query.toLowerCase().trim();
    if (!lower) return commands.slice(0, 9);
    return commands.filter((command) => `${command.title} ${command.hint ?? ''}`.toLowerCase().includes(lower)).slice(0, 10);
  }, [commands, query]);

  useEffect(() => setIndex(0), [query]);

  if (!open) return null;

  return (
    <>
      <div className="scrim" onClick={() => setUI({ paletteOpen: false })} />
      <div className="palette">
        <div className="palette-input">
          <Command size={16} style={{ color: 'var(--text-faint)' }} />
          <input
            autoFocus
            value={query}
            placeholder="Type a command, a setting or a page…"
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Escape') setUI({ paletteOpen: false });
              if (event.key === 'ArrowDown') {
                event.preventDefault();
                setIndex((current) => Math.min(filtered.length - 1, current + 1));
              }
              if (event.key === 'ArrowUp') {
                event.preventDefault();
                setIndex((current) => Math.max(0, current - 1));
              }
              if (event.key === 'Enter') {
                const command = filtered[index];
                if (command) {
                  command.run();
                  setUI({ paletteOpen: false });
                  setQuery('');
                }
              }
            }}
          />
          <span className="kbd">esc</span>
        </div>
        <div className="palette-list">
          {filtered.map((command, i) => (
            <button
              key={command.id}
              className={`palette-item ${i === index ? 'is-selected' : ''}`}
              onMouseEnter={() => setIndex(i)}
              onClick={() => {
                command.run();
                setUI({ paletteOpen: false });
                setQuery('');
              }}
            >
              <span style={{ color: 'var(--text-dim)' }}>{command.icon}</span>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{command.title}</span>
              {command.hint && <span className="hint">{command.hint}</span>}
              {i === index && <CornerDownLeft size={13} style={{ marginLeft: 6, opacity: 0.5 }} />}
            </button>
          ))}
          {filtered.length === 0 && <div style={{ padding: '18px 12px', fontSize: 12.5, color: 'var(--text-dim)' }}>Nothing matches “{query}”.</div>}
        </div>
      </div>
    </>
  );
}

/* ---------------------------- Focus overlay ----------------------------- */

export function FocusOverlay() {
  const session = useStore((state) => state.focusSession);
  const setUI = useStore((state) => state.setUI);
  const setPrefs = useStore((state) => state.setPrefs);
  const prefs = useStore((state) => state.prefs);
  const [remaining, setRemaining] = useState(0);

  useInterval(() => {
    if (!session) return;
    const left = Math.max(0, session.endsAt - Date.now());
    setRemaining(left);
    if (left === 0) {
      setUI({ focusSession: null });
      void setPrefs({ productivity: { focusMode: { enabled: false, minutes: prefs.productivity.focusMode.minutes, maxTabs: prefs.productivity.focusMode.maxTabs, blocklist: prefs.productivity.focusMode.blocklist } } });
    }
  }, session ? 1000 : null);

  useEffect(() => {
    if (session) setRemaining(Math.max(0, session.endsAt - Date.now()));
  }, [session]);

  if (!session) return null;

  const minutes = Math.floor(remaining / 60000);
  const seconds = Math.floor((remaining % 60000) / 1000);

  return (
    <div className="focus-overlay">
      <div className="focus-card">
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
          <BrandMark size={44} radius={14} />
        </div>
        <div style={{ fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#8b98ad', fontWeight: 700 }}>
          Focus session
        </div>
        <div className="focus-time">
          {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
        </div>
        <p style={{ color: '#9aa4b6', fontSize: 13.5, lineHeight: 1.6, margin: '6px 0 22px' }}>
          {prefs.productivity.focusMode.blocklist.length
            ? `${prefs.productivity.focusMode.blocklist.length} distracting sites are closed. Tab limit: ${prefs.productivity.focusMode.maxTabs}.`
            : `Kimmino is holding notifications and keeping your tab count under ${prefs.productivity.focusMode.maxTabs}.`}
        </p>
        <button
          className="pill-btn"
          style={{ height: 38, padding: '0 20px' }}
          onClick={() => {
            setUI({ focusSession: null });
            void setPrefs({ productivity: { focusMode: { enabled: false, minutes: prefs.productivity.focusMode.minutes, maxTabs: prefs.productivity.focusMode.maxTabs, blocklist: prefs.productivity.focusMode.blocklist } } });
          }}
        >
          End session
        </button>
      </div>
    </div>
  );
}

/* -------------------------- Screenshot preview -------------------------- */

export function ScreenshotPreview() {
  const screenshot = useStore((state) => state.screenshot);
  const setUI = useStore((state) => state.setUI);
  const toast = useStore((state) => state.toast);
  useFreeze(Boolean(screenshot));

  if (!screenshot) return null;

  return (
    <div className="screenshot-preview" onClick={() => setUI({ screenshot: null })}>
      <div className="screenshot-frame" onClick={(event) => event.stopPropagation()}>
        <img src={screenshot.dataUrl} alt="Screenshot preview" />
      </div>
      <div style={{ position: 'absolute', bottom: 26, display: 'flex', gap: 10 }}>
        <button
          className="pill-btn primary"
          onClick={() => {
            if (screenshot.path) {
              api.system.showItemInFolder(screenshot.path);
              toast('Revealed in your file manager', 'success');
            } else {
              const link = document.createElement('a');
              link.href = screenshot.dataUrl;
              link.download = 'kimmino-screenshot.png';
              link.click();
            }
            setUI({ screenshot: null });
          }}
        >
          <ExternalLink size={14} /> {screenshot.path ? 'Show in folder' : 'Download'}
        </button>
        <button className="pill-btn" onClick={() => setUI({ screenshot: null })}>
          Close
        </button>
      </div>
    </div>
  );
}

/* ------------------------------ Onboarding ------------------------------ */

export function Onboarding() {
  const prefs = useStore((state) => state.prefs);
  const setPrefs = useStore((state) => state.setPrefs);
  const toast = useStore((state) => state.toast);
  const [step, setStep] = useState(0);

  if (prefs.onboarded) return null;

  const steps = [
    {
      title: 'Welcome to Kimmino',
      body: 'A browser that blocks ads, trackers and fingerprinting by default — and sends nothing about you anywhere. No account required, ever.',
      cta: 'Continue'
    },
    {
      title: 'Bring your stuff',
      body: 'Import bookmarks, history and settings from Chrome, Edge, Brave, Opera or Firefox in one click. Nothing is uploaded.',
      cta: 'Import now'
    },
    {
      title: 'Make it yours',
      body: 'Pick a wallpaper, choose a theme, decide how much Kimmino should block. Every switch is yours to flip.',
      cta: 'Start browsing'
    }
  ];
  const current = steps[step];

  return (
    <div className="onboarding">
      <div className="onboarding-card">
        <BrandMark size={54} radius={17} />
        <h1>{current.title}</h1>
        <p>{current.body}</p>
        {step === 0 && (
          <div className="onboarding-points">
            <div className="onboarding-point">
              <strong>Ads & trackers</strong>47,000+ domains blocked from EasyList and uBlock lists
            </div>
            <div className="onboarding-point">
              <strong>Cookies</strong>Third-party cookies refused at the network layer
            </div>
            <div className="onboarding-point">
              <strong>Fingerprints</strong>Canvas, WebGL and audio randomised each session
            </div>
          </div>
        )}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <button
            className="pill-btn primary"
            style={{ height: 40, padding: '0 22px' }}
            onClick={async () => {
              if (step === 1) {
                const result = await api.import.fromBrowser();
                toast(result.message, result.ok ? 'success' : 'info');
              }
              if (step < steps.length - 1) setStep(step + 1);
              else {
                await setPrefs({ onboarded: true });
                toast('Kimmino is ready', 'success');
              }
            }}
          >
            {current.cta}
          </button>
          <button
            className="pill-btn ghost"
            style={{ height: 40 }}
            onClick={async () => {
              await setPrefs({ onboarded: true });
            }}
          >
            Skip
          </button>
        </div>
      </div>
    </div>
  );
}
