import { ExternalLink, Globe, Lock, ShieldCheck } from 'lucide-react';
import { useStore } from '../store';
import { api } from '../bridge';
import { domainLabel, gradientFor, letterOf } from '../lib/url';

/**
 * Shown only in the browser preview build, where there is no native engine to
 * render a real page. It is deliberately presented as a preview surface rather
 * than a fake website.
 */
export function MockPage({ url, title, blocked }: { url: string; title: string; blocked: number }) {
  const prefs = useStore((state) => state.prefs);
  const toast = useStore((state) => state.toast);
  const domain = domainLabel(url);

  return (
    <div
      className="page"
      style={{
        display: 'grid',
        placeItems: 'center',
        background:
          'radial-gradient(80% 60% at 50% 0%, color-mix(in srgb, var(--accent) 10%, var(--bg)) 0%, var(--bg) 60%)'
      }}
    >
      <div style={{ maxWidth: 560, padding: 32, textAlign: 'center' }}>
        <span
          style={{
            width: 62,
            height: 62,
            borderRadius: 20,
            background: gradientFor(domain),
            display: 'grid',
            placeItems: 'center',
            margin: '0 auto 20px',
            fontSize: 26,
            fontWeight: 700,
            color: '#fff',
            boxShadow: '0 18px 44px rgba(0,0,0,.35)'
          }}
        >
          {letterOf(domain)}
        </span>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, letterSpacing: '-0.02em', margin: '0 0 8px' }}>{title}</h1>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 12, color: 'var(--text-dim)', marginBottom: 22 }}>
          <Lock size={12} style={{ color: 'var(--ok)' }} />
          {domain}
        </div>
        <p style={{ fontSize: 13.5, lineHeight: 1.7, color: 'var(--text-dim)', margin: '0 0 8px' }}>
          This tab is live in the desktop app. You are looking at the Kimmino interface preview, so the page itself is not rendered here —
          but every tab, setting and animation around it is the real thing.
        </p>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '9px 14px',
            borderRadius: 999,
            background: 'color-mix(in srgb, var(--ok) 12%, transparent)',
            color: 'var(--ok)',
            fontSize: 12,
            fontWeight: 600,
            marginBottom: 24
          }}
        >
          <ShieldCheck size={14} />
          {blocked} requests blocked on this page
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button className="pill-btn primary" onClick={() => api.system.openExternal('https://kimmino.vercel.app')}>
            <ExternalLink size={14} /> Download Kimmino
          </button>
          <button
            className="pill-btn"
            onClick={async () => {
              const result = await api.screenshot.capture('visible');
              toast(result.ok ? 'Screenshot saved' : (result.error ?? 'Not available in preview'), result.ok ? 'success' : 'info');
            }}
          >
            <Globe size={14} /> Try a capture
          </button>
        </div>
        <div style={{ marginTop: 26, fontSize: 11.5, color: 'var(--text-faint)' }}>Theme: {prefs.themeMode} · Search: {prefs.search.engine}</div>
      </div>
    </div>
  );
}
