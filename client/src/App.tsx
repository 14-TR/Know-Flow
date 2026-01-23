import { useState, useEffect, useCallback } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import ProcessEditor from './pages/ProcessEditor';
import ProjectTracker from './pages/ProjectTracker';
import ProcessList from './pages/ProcessList';
import ProjectList from './pages/ProjectList';

export default function App() {
  const location = useLocation();

  return (
    <div className="app-container">
      <header className="header">
        <h1>Know-Flow</h1>
        <nav>
          <Link
            to="/"
            className={location.pathname === '/' ? 'active' : ''}
          >
            Processes
          </Link>
          <Link
            to="/projects"
            className={location.pathname.startsWith('/projects') ? 'active' : ''}
          >
            Projects
          </Link>
        </nav>
      </header>
      <Routes>
        <Route path="/" element={<ProcessList />} />
        <Route path="/process/:id" element={<ProcessEditor />} />
        <Route path="/projects" element={<ProjectList />} />
        <Route path="/project/:id" element={<ProjectTracker />} />
      </Routes>
    </div>
  );
}
