import { FileCode2 } from 'lucide-react';
import { SITE } from '../lib/site';

const ENTRIES: Array<[string, string, string]> = [
  ['Kimmino', 'MPL-2.0', 'Source code for the browser, website and build tooling.'],
  ['Chromium', 'BSD-3-Clause + third-party licences', 'The engine Kimmino is built on.'],
  ['Electron & Electron Builder', 'MIT', 'Desktop runtime and packaging.'],
  ['React, React DOM, React Router', 'MIT', 'User interface and routing.'],
  ['Zustand', 'MIT', 'Renderer state management.'],
  ['lucide-react', 'ISC', 'Icon set used throughout the interface.'],
  ['Space Grotesk & Inter', 'SIL Open Font License 1.1', 'Bundled typography, subset and self-hosted.'],
  ['Inter Variable', 'SIL Open Font License 1.1', 'Body typeface, self-hosted as WOFF2.'],
  ['EasyList', 'GPLv3 / CC BY-SA 3.0', 'Advertising filter rules.'],
  ['EasyPrivacy', 'GPLv3 / CC BY-SA 3.0', 'Tracking protection rules.'],
  ['uBlock Origin uAssets', 'GPLv3', 'Additional filter, privacy and annoyance lists.'],
  ['adm-zip', 'MIT', 'Extension archive handling.'],
  ['vite, electron-vite', 'MIT', 'Development and build tooling.']
];

export function Licenses() {
  return (
    <div className="doc">
      <span className="eyebrow">
        <FileCode2 size={13} /> Legal
      </span>
      <h1>Licences & credits</h1>
      <p className="doc-meta">Kimmino is free software. This page lists what it contains and under which terms.</p>

      <div className="callout">
        The Kimmino application code is released under the Mozilla Public License 2.0. You may use, study, modify and
        redistribute it, including commercially, provided modifications to MPL-covered files remain under the MPL.
      </div>

      <div style={{ border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden', marginTop: 24 }}>
        {ENTRIES.map(([name, licence, note], index) => (
          <div
            key={name}
            style={{
              display: 'grid',
              gridTemplateColumns: '190px 220px 1fr',
              gap: 16,
              padding: '13px 16px',
              fontSize: 13,
              borderBottom: index === ENTRIES.length - 1 ? 0 : '1px solid var(--border)',
              background: index % 2 ? 'var(--surface)' : 'transparent'
            }}
          >
            <span style={{ fontWeight: 600 }}>{name}</span>
            <span className="mono" style={{ fontSize: 11.5, color: 'var(--accent)' }}>{licence}</span>
            <span className="muted">{note}</span>
          </div>
        ))}
      </div>

      <h2>Trademarks</h2>
      <p>
        “Kimmino” and the Kimmino mark are project trademarks. The MPL covers the code, not the name or logo — forks are
        welcome but should use a different name so users are not confused about who maintains them. Chrome, Google,
        Opera, Firefox and Chromium are trademarks of their respective owners; Kimmino is not affiliated with, endorsed
        by, or sponsored by any of them.
      </p>

      <h2>Source code</h2>
      <p>
        The complete corresponding source for every release is available at{' '}
        <a href={SITE.repo}>{SITE.repo.replace('https://', '')}</a>. Build instructions are in the{' '}
        <a href="/docs#build">documentation</a>.
      </p>
    </div>
  );
}
