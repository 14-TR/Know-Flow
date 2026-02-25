import { Routes, Route, Link, useLocation } from 'react-router-dom';
import ProcessEditor from './pages/ProcessEditor';
import ProjectTracker from './pages/ProjectTracker';
import ProcessList from './pages/ProcessList';
import ProjectList from './pages/ProjectList';
import DatabaseViewer from './pages/DatabaseViewer';
import { GraphExplorer } from './pages/GraphExplorer';
import Calendar from './pages/Calendar';
import Dashboard from './pages/Dashboard';

export default function App() {
  const location = useLocation();

  return (
    <div className="app-container">
      <header className="header">
        <h1>ProjectIQ</h1>
        <nav>
          <Link to="/" className={location.pathname === '/' ? 'active' : ''}>
            Dashboard
          </Link>
          <Link to="/processes" className={location.pathname === '/processes' ? 'active' : ''}>
            Processes
          </Link>
          <Link to="/projects" className={location.pathname.startsWith('/projects') ? 'active' : ''}>
            Projects
          </Link>
          <Link to="/explorer" className={location.pathname === '/explorer' ? 'active' : ''}>
            Explorer
          </Link>
        </nav>
      </header>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/processes" element={<ProcessList />} />
        <Route path="/process/:id" element={<ProcessEditor />} />
        <Route path="/projects" element={<ProjectList />} />
        <Route path="/project/:id" element={<ProjectTracker />} />
        <Route path="/project/:id/calendar" element={<Calendar />} />
        <Route path="/database" element={<DatabaseViewer />} />
        <Route path="/explorer" element={<GraphExplorer />} />
      </Routes>
    </div>
  );
}
