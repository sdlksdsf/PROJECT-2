import {
  ArrowRight,
  Code2,
  Compass,
  Github,
  HeartHandshake,
  Layers,
  Lock,
  Scale,
  Sparkles,
  Users,
  Zap
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Reveal, SectionHead } from '../components/Chrome';
import { SITE } from '../lib/site';

const PRINCIPLES = [
  {
    icon: Lock,
    title: 'Privacy is not a setting',
    body: 'A protection you have to switch on is a protection most people never get. Every defensive default is on at install time, and turning it off is the deliberate action.'
  },
  {
    icon: Zap,
    title: 'Light software is respectful software',
    body: 'Memory and CPU are borrowed from whatever else you wanted to do with your computer. Kimmino gives them back the moment you look away.'
  },
  {
    icon: Scale,
    title: 'No business model to explain away',
    body: 'No ads, no affiliate deals, no data sales, no paid “privacy tier”. If funding ever becomes necessary it will be donations and grants, stated openly.'
  },
  {
    icon: Code2,
    title: 'Open by default',
    body: 'MPL-2.0, public commits, public issue tracker, reproducible builds. You should be able to check every claim on this website against the source.'
  }
];

const STACK = [
  ['Shell', 'Electron 45 + Chromium 144, one BaseWindow with a WebContentsView per tab'],
  ['Interface', 'React 19, TypeScript in strict mode, Zustand, hand-written CSS token system'],
  ['Privacy engine', 'TypeScript in the main process: 4.3 MB compiled filter bundle, webRequest blocking, fingerprint shims'],
  ['Build', 'electron-vite, electron-builder, npm workspaces, GitHub Actions'],
  ['Storage', 'Atomic JSON stores per profile with schema migration; no database server required'],
  ['Sync', 'Optional Supabase auth (email OTP) + PostgREST, configurable to your own instance']
];

const ROADMAP = [
  ['Now', 'Kimmino 1.0 — privacy engine, split view, themes, focus mode, import, profiles'],
  ['Next', 'Manifest V3 extension support, tab groups, per-site zoom memory, mobile companion'],
  ['Later', 'Native tab hibernation scheduler, container tabs, self-hostable sync server image'],
  ['Always', 'Filter list updates, accessibility fixes, performance regressions']
];

export function About() {
  return (
    <>
      <section className="dl-hero">
        <div className="container">
          <span className="eyebrow">
            <Compass size={13} /> About
          </span>
          <h1>
            We wanted a browser we could <span className="gradient-text">recommend to our parents</span>.
          </h1>
          <p className="hero-sub" style={{ margin: '0 auto' }}>
            One that blocks the junk, doesn’t phone home, doesn’t nag, and doesn’t assume everyone is a privacy
            researcher willing to configure forty toggles.
          </p>
        </div>
      </section>

      <section className="section tight">
        <div className="container">
          <div className="split">
            <div>
              <SectionHead
                eyebrow="The story"
                title="Built as a project, kept as a standard"
                body="Kimmino started as an answer to a simple question: what would Chrome look like if it were built by people who did not need to monetise you? The answer turned out to be a browser that is smaller, quieter and faster — because most of a modern browser’s background activity exists to serve the vendor, not the user."
              />
              <p className="muted" style={{ fontSize: 14.5, lineHeight: 1.75, marginTop: 16 }}>
                It is built on Chromium, deliberately: the web is too important to fork the engine, and a browser that
                breaks your banking site is not private, it is unusable. What we changed is everything around the engine —
                the permission model, the network layer, the defaults, the interface, and the amount of it that runs when
                you are not looking.
              </p>
            </div>
            <Reveal delay={80}>
              <div className="panel">
                <div className="eyebrow" style={{ marginBottom: 16 }}>By the numbers</div>
                {[
                  ['Lines of app code', '19,000+'],
                  ['Filter domains shipped', '47,000+'],
                  ['Telemetry endpoints', '0'],
                  ['Bundled third-party SDKs', '0'],
                  ['Average install size', '118 MB'],
                  ['Contributors', 'open — join us']
                ].map(([label, value]) => (
                  <div
                    key={label}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      padding: '10px 0',
                      borderBottom: '1px solid var(--border)',
                      fontSize: 13.5
                    }}
                  >
                    <span className="muted">{label}</span>
                    <span style={{ fontWeight: 600 }}>{value}</span>
                  </div>
                ))}
                <a className="btn btn-ghost btn-sm" href={SITE.repo} target="_blank" rel="noreferrer" style={{ marginTop: 18, width: '100%' }}>
                  <Github size={14} /> Read the code
                </a>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      <section className="section" style={{ background: 'var(--bg-soft)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
        <div className="container">
          <SectionHead center eyebrow="Principles" title="Four rules we do not trade away" />
          <div className="feature-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
            {PRINCIPLES.map((principle, index) => (
              <Reveal className="feature-card" key={principle.title} delay={index * 60} as="article">
                <div className="feature-icon">
                  <principle.icon size={19} />
                </div>
                <h3>{principle.title}</h3>
                <p>{principle.body}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <SectionHead eyebrow="Under the hood" title="How it is built" body="No secrets, no proprietary components — here is the whole stack." />
          <Reveal>
            <div className="panel" style={{ padding: 0, overflow: 'hidden' }}>
              {STACK.map(([label, body]) => (
                <div
                  key={label}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '170px 1fr',
                    gap: 18,
                    padding: '16px 22px',
                    borderBottom: '1px solid var(--border)',
                    fontSize: 13.5
                  }}
                >
                  <span style={{ color: 'var(--text-faint)', fontWeight: 600 }}>{label}</span>
                  <span className="muted">{body}</span>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      <section className="section tight">
        <div className="container">
          <div className="split">
            <div>
              <SectionHead eyebrow="Roadmap" title="What comes next" body="Published so you can hold us to it — and so you can help." />
              <div className="steps">
                {ROADMAP.map(([when, what]) => (
                  <div className="step" key={when}>
                    <span className="step-num" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{when}</span>
                    <div>
                      <p style={{ color: 'var(--text)', fontSize: 14 }}>{what}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <Reveal delay={80}>
              <div className="panel">
                <Users size={22} style={{ color: 'var(--accent)' }} />
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 21, margin: '14px 0 10px' }}>Get involved</h3>
                <p className="small muted" style={{ lineHeight: 1.7 }}>
                  Kimmino is maintained in the open. Good first issues are labelled, the architecture is documented, and
                  pull requests get reviewed by a human. Translators, filter-list maintainers and accessibility testers
                  are especially welcome.
                </p>
                <div style={{ display: 'grid', gap: 10, marginTop: 18 }}>
                  <a className="btn btn-ghost btn-sm" href={`${SITE.repo}/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22`} target="_blank" rel="noreferrer">
                    <Sparkles size={14} /> Good first issues
                  </a>
                  <a className="btn btn-ghost btn-sm" href={`${SITE.repo}/blob/main/CONTRIBUTING.md`} target="_blank" rel="noreferrer">
                    <Layers size={14} /> Contributing guide
                  </a>
                  <a className="btn btn-ghost btn-sm" href={SITE.discord} target="_blank" rel="noreferrer">
                    <HeartHandshake size={14} /> Discussions
                  </a>
                </div>
              </div>
            </Reveal>
          </div>

          <Reveal>
            <div className="cta" style={{ marginTop: 64 }}>
              <h2>Try it for a week</h2>
              <p>If it does not earn the default-browser slot on your machine, uninstalling takes ten seconds and leaves nothing behind.</p>
              <div className="hero-actions">
                <Link className="btn btn-primary" to="/download">
                  Download Kimmino <ArrowRight size={15} />
                </Link>
                <Link className="btn btn-ghost" to="/privacy">
                  Read the privacy policy
                </Link>
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
