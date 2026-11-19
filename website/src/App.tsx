import { useEffect } from 'react';
import { Link, Route, Routes, useLocation } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Footer, Nav } from './components/Chrome';
import { Home } from './pages/Home';
import { Features } from './pages/Features';
import { DownloadPage } from './pages/Download';
import { Privacy } from './pages/Privacy';
import { About } from './pages/About';
import { Docs } from './pages/Docs';
import { Licenses } from './pages/Licenses';

function ScrollBehaviour() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (hash) {
      const target = document.getElementById(hash.slice(1));
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }
    }
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, [pathname, hash]);

  return null;
}

function NotFound() {
  return (
    <div className="doc" style={{ textAlign: 'center', paddingTop: 120 }}>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 88, fontWeight: 700, lineHeight: 1 }} className="gradient-text">
        404
      </div>
      <h1 style={{ fontSize: 26, margin: '18px 0 10px' }}>This page wandered off</h1>
      <p className="muted" style={{ marginBottom: 26 }}>
        Unlike your browsing history, it is not being tracked. Let us get you back somewhere useful.
      </p>
      <Link className="btn btn-primary" to="/">
        <ArrowLeft size={15} /> Back home
      </Link>
    </div>
  );
}

export default function App() {
  const { pathname } = useLocation();

  return (
    <>
      <ScrollBehaviour />
      <Nav />
      <main key={pathname} style={{ animation: 'fade-in 0.35s var(--ease)', minHeight: '60vh' }}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/features" element={<Features />} />
          <Route path="/download" element={<DownloadPage />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/about" element={<About />} />
          <Route path="/docs" element={<Docs />} />
          <Route path="/licenses" element={<Licenses />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
    </>
  );
}
