import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { ArrowUpRight, Download, Github, Menu, Moon, Sun, X } from 'lucide-react';
import { PLATFORM_LABEL, SITE, downloadFor, usePlatform, useReveal, useTheme } from '../lib/site';

export function Logo({ size = 30 }: { size?: number }) {
  return (
    <img src="/logo.svg" alt="" width={size} height={size} style={{ borderRadius: size * 0.28 }} />
  );
}

const LINKS = [
  { to: '/features', label: 'Features' },
  { to: '/download', label: 'Download' },
  { to: '/docs', label: 'Docs' },
  { to: '/privacy', label: 'Privacy' },
  { to: '/about', label: 'About' }
];

export function Nav() {
  const { theme, toggle } = useTheme();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const platform = usePlatform();
  const location = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => setOpen(false), [location.pathname]);

  return (
    <header className={`nav ${scrolled ? 'is-scrolled' : ''}`}>
      <div className="container">
        <div className="nav-inner">
          <Link to="/" className="brand" aria-label="Kimmino home">
            <Logo size={30} />
            Kimmino
          </Link>
          <nav className="nav-links">
            {LINKS.map((link) => (
              <NavLink key={link.to} to={link.to} className={({ isActive }) => `nav-link ${isActive ? 'is-active' : ''}`}>
                {link.label}
              </NavLink>
            ))}
          </nav>
          <div className="nav-right">
            <a className="nav-icon-btn" href={SITE.repo} target="_blank" rel="noreferrer" aria-label="Source on GitHub">
              <Github size={17} />
            </a>
            <button className="nav-icon-btn" onClick={toggle} aria-label="Toggle colour theme">
              {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
            </button>
            <a className="btn btn-primary btn-sm" href={downloadFor(platform)}>
              <Download size={15} /> Download
            </a>
            <button className="nav-icon-btn menu-toggle" onClick={() => setOpen(!open)} aria-label="Menu">
              {open ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>
        <div className={`mobile-menu ${open ? 'is-open' : ''}`}>
          {LINKS.map((link) => (
            <Link key={link.to} to={link.to}>
              {link.label}
            </Link>
          ))}
          <a href={downloadFor(platform)} style={{ color: 'var(--accent)' }}>
            Download for {PLATFORM_LABEL[platform]}
          </a>
        </div>
      </div>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          <div className="footer-col">
            <Link to="/" className="brand" style={{ marginBottom: 12 }}>
              <Logo size={28} />
              Kimmino
            </Link>
            <p className="small muted" style={{ maxWidth: 300, lineHeight: 1.65 }}>
              A browser that minds its own business. Free, open source, and built so that the default is the private option.
            </p>
            <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
              <a className="btn btn-ghost btn-sm" href={SITE.repo} target="_blank" rel="noreferrer">
                <Github size={14} /> Star on GitHub
              </a>
            </div>
          </div>
          <div className="footer-col">
            <h4>Product</h4>
            <Link to="/features">Features</Link>
            <Link to="/download">Download</Link>
            <Link to="/docs">Documentation</Link>
            <Link to="/docs#build">Build from source</Link>
          </div>
          <div className="footer-col">
            <h4>Privacy</h4>
            <Link to="/privacy">Privacy policy</Link>
            <Link to="/privacy#promise">Our promise</Link>
            <Link to="/privacy#telemetry">Telemetry</Link>
            <Link to="/licenses">Licences</Link>
          </div>
          <div className="footer-col">
            <h4>Project</h4>
            <Link to="/about">About</Link>
            <a href={`${SITE.repo}/blob/main/CONTRIBUTING.md`} target="_blank" rel="noreferrer">
              Contribute
            </a>
            <a href={`${SITE.repo}/issues`} target="_blank" rel="noreferrer">
              Report a bug
            </a>
            <a href={`${SITE.repo}/security/policy`} target="_blank" rel="noreferrer">
              Security
            </a>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} Kimmino Contributors · MPL-2.0 · Not affiliated with Google, Opera or Mozilla.</span>
          <span style={{ display: 'flex', gap: 16 }}>
            <a href={SITE.repo} target="_blank" rel="noreferrer">
              GitHub
            </a>
            <Link to="/privacy">No cookies here either</Link>
          </span>
        </div>
      </div>
    </footer>
  );
}

export function Reveal({
  children,
  delay = 0,
  className = '',
  as: Tag = 'div'
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  as?: 'div' | 'section' | 'li' | 'article';
}) {
  const ref = useReveal<HTMLDivElement>();
  return (
    <Tag ref={ref as never} className={`reveal ${className}`} style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </Tag>
  );
}

export function SectionHead({
  eyebrow,
  title,
  body,
  center = false
}: {
  eyebrow?: string;
  title: React.ReactNode;
  body?: React.ReactNode;
  center?: boolean;
}) {
  return (
    <Reveal className={`section-head ${center ? 'center' : ''}`}>
      {eyebrow && <span className="eyebrow">{eyebrow}</span>}
      <h2>{title}</h2>
      {body && <p>{body}</p>}
    </Reveal>
  );
}

export function GithubLink({ label = 'View source' }: { label?: string }) {
  return (
    <a className="btn btn-ghost" href={SITE.repo} target="_blank" rel="noreferrer">
      <Github size={16} /> {label} <ArrowUpRight size={14} />
    </a>
  );
}
