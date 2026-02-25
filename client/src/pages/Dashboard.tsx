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

const HEALTH_CONFIG = {
  'complete':    { label: 'Complete',    color: '#22c55e', bg: '#dcfce7', dot: '#16a34a' },
  'on-track':   { label: 'On Track',    color: '#3b82f6', bg: '#dbeafe', dot: '#1d4ed8' },
  'at-risk':    { label: 'At Risk',     color: '#f59e0b', bg: '#fef9c3', dot: '#d97706' },
  'overdue':    { label: 'Overdue',     color: '#ef4444', bg: '#fee2e2', dot: '#dc2626' },
  'not-started':{ label: 'Not Started', color: '#6b7280', bg: '#f3f4f6', dot: '#4b5563' },
};

const TYPE_ICONS: Record<string, string> = {
  task: '📋', decision: '⬡', milestone: '🏁', start: '▶', end: '⏹',
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

  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const timeAgo = (d: string) => {
    const diff = Date.now() - new Date(d).getTime();
    const h = Math.floor(diff / 3600000);
    if (h < 1) return 'just now';
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  };

  if (loading) return <div className="dash-loading">Loading dashboard…</div>;
  if (error) return <div className="dash-error">{error}</div>;

  return (
    <div className="dash-page">
      {/* Summary strip */}
      {summary && (
        <div className="dash-summary">
          <div className="stat-card">
            <span className="stat-num">{summary.total}</span>
            <span className="stat-label">Projects</span>
          </div>
          <div className="stat-card">
            <span className="stat-num">{summary.active}</span>
            <span className="stat-label">Active</span>
          </div>
          <div className="stat-card accent-green">
            <span className="stat-num">{summary.overallPct}%</span>
            <span className="stat-label">Overall Complete</span>
          </div>
          <div className={`stat-card ${summary.overdue > 0 ? 'accent-red' : ''}`}>
            <span className="stat-num">{summary.overdue}</span>
            <span className="stat-label">Overdue</span>
          </div>
          <div className={`stat-card ${summary.atRisk > 0 ? 'accent-amber' : ''}`}>
            <span className="stat-num">{summary.atRisk}</span>
            <span className="stat-label">At Risk</span>
          </div>
          <div className="stat-card accent-green">
            <span className="stat-num">{summary.completed}</span>
            <span className="stat-label">Completed</span>
          </div>
        </div>
      )}

      {/* Filter bar */}
      <div className="dash-filters">
        {['all','on-track','at-risk','overdue','complete','not-started'].map(f => (
          <button
            key={f}
            className={`filter-btn ${filter === f ? 'active' : ''}`}
            onClick={() => setFilter(f)}
          >
            {f === 'all' ? `All (${projects.length})` : f.replace('-', ' ')}
          </button>
        ))}
        <button className="dash-refresh" onClick={load} title="Refresh">↻</button>
      </div>

      {/* Project grid */}
      <div className="dash-grid">
        {filtered.length === 0 && (
          <div className="dash-empty">No projects match this filter.</div>
        )}
        {filtered.map(p => {
          const hc = HEALTH_CONFIG[p.health];
          return (
            <div key={p.id} className="proj-card">
              {/* Card header */}
              <div className="proj-card-head">
                <div className="proj-meta">
                  <span className="proj-process">{p.process_name}</span>
                  <span className="health-badge" style={{ color: hc.color, background: hc.bg }}>
                    <span className="health-dot" style={{ background: hc.dot }} />
                    {hc.label}
                  </span>
                </div>
                <h3 className="proj-name">{p.name}</h3>
              </div>

              {/* Progress bar */}
              <div className="prog-wrap">
                <div className="prog-bar">
                  <div
                    className="prog-fill"
                    style={{ width: `${p.completion_pct}%`, background: hc.color }}
                  />
                </div>
                <span className="prog-pct">{p.completion_pct}%</span>
              </div>

              {/* Node stats */}
              <div className="node-stats">
                <span className="ns-item ns-done">✓ {p.completed_nodes} done</span>
                <span className="ns-item ns-wip">● {p.in_progress_nodes} in progress</span>
                <span className="ns-item ns-todo">○ {p.not_started_nodes} remaining</span>
                {p.overdue_nodes > 0 && (
                  <span className="ns-item ns-overdue">⚠ {p.overdue_nodes} overdue</span>
                )}
              </div>

              {/* Next due */}
              {p.next_due && (
                <div className="proj-next">
                  <span className="next-label">Next up</span>
                  <span className="next-task">
                    {TYPE_ICONS[p.next_due.type]} {p.next_due.title}
                  </span>
                  <span className={`next-date ${p.days_until_next_due !== null && p.days_until_next_due <= 2 ? 'urgent' : ''}`}>
                    {p.days_until_next_due === 0 ? 'Today'
                      : p.days_until_next_due === 1 ? 'Tomorrow'
                      : p.days_until_next_due !== null && p.days_until_next_due < 0 ? `${Math.abs(p.days_until_next_due)}d overdue`
                      : formatDate(p.next_due.due_date)}
                  </span>
                </div>
              )}

              {/* Last activity */}
              {p.last_activity && (
                <div className="proj-activity">
                  <span className="activity-label">Last activity</span>
                  <span className="activity-text">{p.last_activity.title}</span>
                  <span className="activity-time">{timeAgo(p.last_activity.updated_at)}</span>
                </div>
              )}

              {/* Actions */}
              <div className="proj-actions">
                <Link to={`/project/${p.id}`} className="btn-track">Track →</Link>
                <Link to={`/project/${p.id}/calendar`} className="btn-cal">📅 Calendar</Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
