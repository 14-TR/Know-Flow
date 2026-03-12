import { useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import ProcessEditor from './pages/ProcessEditor';
import ProjectTracker from './pages/ProjectTracker';
import ProcessList from './pages/ProcessList';
import { ToastProvider } from './components/Toast';
import ProjectList from './pages/ProjectList';
import DatabaseViewer from './pages/DatabaseViewer';
import { GraphExplorer } from './pages/GraphExplorer';

export default function App() {
  const location = useLocation();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Close mobile nav on route change
  useEffect(() => {
    setMobileNavOpen(false);
  }, [location.pathname]);

  // Close mobile nav on Escape key
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileNavOpen(false);
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, []);

  const navLinks = [
    { to: '/', label: 'Processes', match: (p: string) => p === '/' },
    { to: '/projects', label: 'Projects', match: (p: string) => p.startsWith('/projects') || p.startsWith('/project/') },
    { to: '/database', label: 'Database', match: (p: string) => p === '/database' },
    { to: '/explorer', label: 'Explorer', match: (p: string) => p === '/explorer' },
  ];

  return (
    <ToastProvider>
    <div className="app-container">
      <header className="header">
        <h1>ProjectIQ</h1>

        {/* Desktop nav */}
        <nav className="header-nav-desktop">
          {navLinks.map(({ to, label, match }) => (
            <Link key={to} to={to} className={match(location.pathname) ? 'active' : ''}>
              {label}
            </Link>
          ))}
        </nav>

        {/* Mobile hamburger */}
        <button
          className={`hamburger${mobileNavOpen ? ' open' : ''}`}
          onClick={() => setMobileNavOpen(!mobileNavOpen)}
          aria-label="Toggle navigation"
          aria-expanded={mobileNavOpen}
        >
          <span />
          <span />
          <span />
        </button>
      </header>

      {/* Mobile nav overlay */}
      {mobileNavOpen && (
        <div
          className="mobile-nav-backdrop"
          onClick={() => setMobileNavOpen(false)}
          aria-hidden="true"
        />
      )}
      <nav className={`mobile-nav${mobileNavOpen ? ' open' : ''}`} aria-hidden={!mobileNavOpen}>
        {navLinks.map(({ to, label, match }) => (
          <Link key={to} to={to} className={match(location.pathname) ? 'active' : ''}>
            {label}
          </Link>
        ))}
      </nav>

      <Routes>
        <Route path="/" element={<ProcessList />} />
        <Route path="/process/:id" element={<ProcessEditor />} />
        <Route path="/projects" element={<ProjectList />} />
        <Route path="/project/:id" element={<ProjectTracker />} />
        <Route path="/database" element={<DatabaseViewer />} />
        <Route path="/explorer" element={<GraphExplorer />} />
      </Routes>
    </div>
    </ToastProvider>
  );
}
