import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './Dashboard.css';

const API = import.meta.env.VITE_API_URL || '/api';

interface ProjectSummary {
  id: string;
  name: string;
  status: string;
  process_name: string;
  total_nodes: number;
  completed_nodes: number;
  in_progress_nodes: number;
  not_started_nodes: number;
  overdue_nodes: number;
  completion_pct: number;
  health: 'on-track' | 'at-risk' | 'overdue' | 'not-started' | 'complete';
  next_due: { title: string; type: string; due_date: string; status: string } | null;
  days_until_next_due: number | null;
  last_activity: { title: string; status: string; updated_at: string } | null;
}

interface DashSummary {
  total: number; active: number; completed: number;
  overdue: number; atRisk: number; overallPct: number;
}

function healthClass(h: string) {
  const map: Record<string,string> = {
    'complete': 'success', 'on-track': 'success',
    'at-risk': 'warning', 'overdue': 'danger',
    'not-started': 'muted',
  };
  return map[h] || 'muted';
}

function fillClass(h: string) {
  const map: Record<string,string> = {
    'complete': 'fill-success', 'on-track': 'fill-primary',
    'at-risk': 'fill-warning', 'overdue': 'fill-danger',
    'not-started': 'fill-muted',
  };
  return map[h] || 'fill-muted';
}

const HEALTH_LABELS: Record<string,string> = {
  'complete': 'Complete', 'on-track': 'On Track',
  'at-risk': 'At Risk', 'overdue': 'Overdue', 'not-started': 'Not Started',
};

export default function Dashboard() {
  const [summary, setSummary] = useState<DashSummary | null>(null);
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      setLoading(true);
      const r = await fetch(`${API}/dashboard`);
      const d = await r.json();
      setSummary(d.summary);
      setProjects(d.projects);
    } catch (e: any) { setError(e.message); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = projects.filter(p => {
    if (filter === 'all') return true;
    if (filter === 'overdue') return p.overdue_nodes > 0;
    if (filter === 'at-risk') return p.health === 'at-risk';
    return p.health === filter;
  });

  const timeAgo = (d: string) => {
    const diff = Date.now() - new Date(d).getTime();
    const h = Math.floor(diff / 3600000);
    if (h < 1) return 'just now';
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  };

  if (loading) return <div className="main-content loading">Loading dashboard…</div>;
  if (error) return <div className="main-content loading" style={{color:'var(--danger)'}}>{error}</div>;

  return (
    <div className="main-content">
      <div className="dashboard">
        {/* Page header */}
        <div className="dashboard-header">
          <div>
            <h1 className="dashboard-title">Dashboard</h1>
            <p className="dashboard-subtitle">{projects.length} project{projects.length !== 1 ? 's' : ''} tracked</p>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={load}>↻ Refresh</button>
        </div>

        {/* KPI strip */}
        {summary && (
          <div className="stat-strip">
            <div className="stat-card">
              <div className="stat-value">{summary.total}</div>
              <div className="stat-label">Projects</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{summary.active}</div>
              <div className="stat-label">Active</div>
            </div>
            <div className={`stat-card ${summary.overdue > 0 ? 'danger' : ''}`}>
              <div className="stat-value">{summary.overdue}</div>
              <div className="stat-label">Overdue</div>
            </div>
            <div className={`stat-card ${summary.atRisk > 0 ? 'warning' : ''}`}>
              <div className="stat-value">{summary.atRisk}</div>
              <div className="stat-label">At Risk</div>
            </div>
          </div>
        )}

        {/* Projects section */}
        <div className="projects-section">
          <div className="section-header">
            <span className="section-title">Projects</span>
            <Link to="/projects" className="btn btn-ghost btn-sm">View all →</Link>
          </div>

          {/* Filter bar */}
          <div className="filter-bar">
            {['all', 'on-track', 'at-risk', 'overdue', 'not-started'].map(f => (
              <button
                key={f}
                className={`filter-pill ${filter === f ? 'active' : ''}`}
                onClick={() => setFilter(f)}
              >
                {f === 'all' ? `All (${projects.length})` : f.replace('-', ' ')}
              </button>
            ))}
          </div>

          {filtered.length === 0 ? (
            <div className="empty-state">
              <h3>No projects match this filter</h3>
              <p>Try a different filter or create a new project.</p>
            </div>
          ) : (
            <div className="projects-grid">
              {filtered.map(p => (
                <Link to={`/project/${p.id}`} key={p.id} className="project-card">
                  <div className="project-card-header">
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="project-card-name">{p.name}</div>
                      <div className="project-card-process">{p.process_name}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                      <div className={`health-dot ${p.health}`} />
                      <span className={`badge badge-${healthClass(p.health)}`}>
                        {HEALTH_LABELS[p.health] || p.health}
                      </span>
                    </div>
                  </div>

                  <div className="project-progress-row">
                    <div className="project-progress-bar">
                      <div
                        className={`project-progress-fill ${fillClass(p.health)}`}
                        style={{ width: `${p.completion_pct}%` }}
                      />
                    </div>
                    <span className="project-progress-pct">{p.completion_pct}%</span>
                  </div>

                  <div className="project-card-footer">
                    <span className="project-card-meta">
                      {p.completed_nodes}/{p.total_nodes} tasks done
                      {p.overdue_nodes > 0 && (
                        <span style={{ color: 'var(--danger)', marginLeft: '0.5rem' }}>
                          · {p.overdue_nodes} overdue
                        </span>
                      )}
                    </span>
                    {p.last_activity && (
                      <span className="project-card-meta">{timeAgo(p.last_activity.updated_at)}</span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
