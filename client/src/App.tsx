import { lazy, Suspense, useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import { ToastProvider } from './components/Toast';
import { PageSpinner } from './components/LoadingSkeleton';

import { useKeyboardShortcuts, useSequenceShortcuts } from './hooks/useKeyboardShortcuts';
import KeyboardShortcutsModal from './components/KeyboardShortcutsModal';
import WelcomeModal, { useWelcomeSeen } from './components/WelcomeModal';

// Lazy-loaded page routes — each becomes its own chunk
const ProcessList = lazy(() => import('./pages/ProcessList'));
const ProcessEditor = lazy(() => import('./pages/ProcessEditor'));
const ProjectList = lazy(() => import('./pages/ProjectList'));
const ProjectTracker = lazy(() => import('./pages/ProjectTracker'));
const Calendar = lazy(() => import('./pages/Calendar'));
const DatabaseViewer = lazy(() => import('./pages/DatabaseViewer'));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const GraphExplorer = lazy(() => import('./pages/GraphExplorer').then((m) => ({ default: m.GraphExplorer })));

export default function App() {
  const location = useLocation();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [showShortcuts, setShowShortcutsModal] = useState(false);
  const [welcomeSeen, markWelcomeSeen] = useWelcomeSeen();

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

  // Global keyboard shortcuts
  useKeyboardShortcuts([
    {
      key: '?',
      description: 'Show keyboard shortcuts',
      group: 'General',
      handler: () => setShowShortcutsModal(true),
    },
  ]);

  const navigate = useNavigate();
  useSequenceShortcuts([
    { keys: ['g', 'p'], description: 'Go to Processes', group: 'Navigation', handler: () => navigate('/') },
    { keys: ['g', 'j'], description: 'Go to Projects', group: 'Navigation', handler: () => navigate('/projects') },
    { keys: ['g', 'e'], description: 'Go to Explorer', group: 'Navigation', handler: () => navigate('/explorer') },
    { keys: ['g', 'd'], description: 'Go to Dashboard', group: 'Navigation', handler: () => navigate('/dashboard') },
  ]);

  const navLinks = [
    { to: '/dashboard', label: 'Dashboard', match: (p: string) => p === '/dashboard' },
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

        {/* Shortcuts hint */}
        <button
          className="shortcuts-hint-btn"
          onClick={() => setShowShortcutsModal(true)}
          title="Keyboard shortcuts (?)"
          aria-label="Keyboard shortcuts"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="6" width="20" height="12" rx="2"/>
            <path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M8 14h8"/>
          </svg>
        </button>

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

      <Suspense fallback={<PageSpinner />}>
        <Routes>
          <Route path="/" element={<ProcessList />} />
          <Route path="/process/:id" element={<ProcessEditor />} />
          <Route path="/projects" element={<ProjectList />} />
          <Route path="/project/:id" element={<ProjectTracker />} />
          <Route path="/project/:id/calendar" element={<Calendar />} />
          <Route path="/database" element={<DatabaseViewer />} />
          <Route path="/explorer" element={<GraphExplorer />} />
          <Route path="/dashboard" element={<Dashboard />} />
        </Routes>
      </Suspense>
    </div>
      {showShortcuts && (
        <KeyboardShortcutsModal onClose={() => setShowShortcutsModal(false)} />
      )}
      {!welcomeSeen && (
        <WelcomeModal
          onClose={markWelcomeSeen}
          onGoToProcesses={() => navigate('/')}
          onGoToProjects={() => navigate('/projects')}
        />
      )}
    </ToastProvider>
  );
}
