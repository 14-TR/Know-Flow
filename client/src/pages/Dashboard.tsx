import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDashboard, type DashboardData } from '../services/api';
import './Dashboard.css';

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    getDashboard()
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="dashboard">
        <div className="dash-loading">
          <div className="dash-spinner" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="dashboard">
        <div className="dash-error">
          <div className="dash-error-icon">⚠️</div>
          <h3>Failed to load dashboard</h3>
          <p>{error || 'Unknown error'}</p>
          <button className="btn btn-primary" onClick={() => window.location.reload()}>Retry</button>
        </div>
      </div>
    );
  }

  const { stats, recentProjects, recentProcesses } = data;

  return (
    <div className="dashboard">
      <div className="dash-inner">

        {/* Header */}
        <div className="dash-header">
          <div>
            <h1 className="dash-title">Dashboard</h1>
            <p className="dash-subtitle">Your project intelligence at a glance</p>
          </div>
          <div className="dash-header-actions">
            <button className="btn btn-secondary btn-sm" onClick={() => navigate('/projects')}>
              View Projects →
            </button>
            <button className="btn btn-primary btn-sm" onClick={() => navigate('/projects')}>
              + New Project
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="dash-stats-grid">
          <div className="dash-stat-card">
            <div className="dash-stat-icon dash-stat-icon--accent">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <path d="M3 9h18M9 21V9" />
              </svg>
            </div>
            <div className="dash-stat-body">
              <div className="dash-stat-value">{stats.projectTotal}</div>
              <div className="dash-stat-label">Total Projects</div>
            </div>
            <div className="dash-stat-breakdown">
              <span className="dash-stat-chip dash-stat-chip--success">{stats.projectActive} active</span>
              <span className="dash-stat-chip dash-stat-chip--muted">{stats.projectCompleted} done</span>
            </div>
          </div>

          <div className="dash-stat-card">
            <div className="dash-stat-icon dash-stat-icon--success">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <div className="dash-stat-body">
              <div className="dash-stat-value">{stats.avgCompletion}%</div>
              <div className="dash-stat-label">Avg Completion</div>
            </div>
            <div className="dash-stat-progress">
              <div className="dash-stat-progress-bar">
                <div className="dash-stat-progress-fill" style={{ width: `${stats.avgCompletion}%` }} />
              </div>
            </div>
          </div>

          <div className="dash-stat-card">
            <div className="dash-stat-icon dash-stat-icon--warning">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </div>
            <div className="dash-stat-body">
              <div className="dash-stat-value">{stats.inProgressNodes}</div>
              <div className="dash-stat-label">In Progress</div>
            </div>
            <div className="dash-stat-breakdown">
              <span className="dash-stat-chip dash-stat-chip--success">{stats.todayCompleted} done today</span>
            </div>
          </div>

          <div className="dash-stat-card">
            <div className="dash-stat-icon dash-stat-icon--muted">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" />
                <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83" />
              </svg>
            </div>
            <div className="dash-stat-body">
              <div className="dash-stat-value">{stats.processCount}</div>
              <div className="dash-stat-label">Process Templates</div>
            </div>
            <div className="dash-stat-breakdown">
              <span className="dash-stat-chip dash-stat-chip--muted">{stats.nodeCount} nodes total</span>
            </div>
          </div>
        </div>

        {/* Main grid: recent projects + processes */}
        <div className="dash-main-grid">

          <div className="dash-section">
            <div className="dash-section-header">
              <h2 className="dash-section-title">Recent Projects</h2>
              <button className="dash-section-link" onClick={() => navigate('/projects')}>View all →</button>
            </div>
            {recentProjects.length === 0 ? (
              <div className="dash-empty">
                <p>No projects yet.</p>
                <button className="btn btn-primary btn-sm" onClick={() => navigate('/projects')}>Create your first project</button>
              </div>
            ) : (
              <div className="dash-project-list">
                {recentProjects.map((p) => {
                  const pct = p.total_nodes > 0 ? Math.round((p.completed_nodes / p.total_nodes) * 100) : 0;
                  return (
                    <div key={p.id} className="dash-project-row" onClick={() => navigate(`/project/${p.id}`)}>
                      <div className="dash-project-info">
                        <div className="dash-project-name">{p.name}</div>
                        <div className="dash-project-meta">{p.process_name}</div>
                      </div>
                      <div className="dash-project-right">
                        <div className="dash-project-pct">{pct}%</div>
                        <div className="dash-project-bar">
                          <div className="dash-project-bar-fill" style={{ width: `${pct}%` }} />
                        </div>
                        <span className={`status-badge ${p.status}`}>{p.status}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="dash-section">
            <div className="dash-section-header">
              <h2 className="dash-section-title">Process Templates</h2>
              <button className="dash-section-link" onClick={() => navigate('/')}>View all →</button>
            </div>
            {recentProcesses.length === 0 ? (
              <div className="dash-empty">
                <p>No processes yet.</p>
                <button className="btn btn-primary btn-sm" onClick={() => navigate('/')}>Create a process</button>
              </div>
            ) : (
              <div className="dash-process-list">
                {recentProcesses.map((p) => (
                  <div key={p.id} className="dash-process-row" onClick={() => navigate(`/process/${p.id}`)}>
                    <div className="dash-process-icon">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="3" />
                        <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83" />
                      </svg>
                    </div>
                    <div className="dash-process-info">
                      <div className="dash-process-name">{p.name}</div>
                      <div className="dash-process-meta">{p.node_count} nodes · {p.edge_count} edges</div>
                    </div>
                    <div className="dash-process-arrow">→</div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Quick Actions */}
        <div className="dash-quick-actions">
          <h2 className="dash-section-title" style={{ marginBottom: '1rem' }}>Quick Actions</h2>
          <div className="dash-actions-grid">
            <button className="dash-action-btn" onClick={() => navigate('/projects')}>
              <div className="dash-action-icon dash-action-icon--accent">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <path d="M3 9h18M9 21V9" />
                </svg>
              </div>
              <span className="dash-action-label">New Project</span>
            </button>
            <button className="dash-action-btn" onClick={() => navigate('/')}>
              <div className="dash-action-icon dash-action-icon--purple">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83" />
                </svg>
              </div>
              <span className="dash-action-label">New Process</span>
            </button>
            <button className="dash-action-btn" onClick={() => navigate('/explorer')}>
              <div className="dash-action-icon dash-action-icon--teal">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              </div>
              <span className="dash-action-label">Graph Explorer</span>
            </button>
            <button className="dash-action-btn" onClick={() => navigate('/database')}>
              <div className="dash-action-icon dash-action-icon--muted">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <ellipse cx="12" cy="5" rx="9" ry="3" />
                  <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
                  <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
                </svg>
              </div>
              <span className="dash-action-label">Database Viewer</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
