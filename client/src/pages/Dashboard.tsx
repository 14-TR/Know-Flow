import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDashboard, type DashboardData } from '../services/api';
import OnboardingBanner, { useOnboardingDismissed } from '../components/OnboardingBanner';
import './Dashboard.css';

interface SetupStep {
  key: string;
  label: string;
  detail: string;
  complete: boolean;
  cta: string;
  onClick: () => void;
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [onboardingDismissed, dismissOnboarding] = useOnboardingDismissed();
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
  const isFirstRun = stats.projectTotal === 0 || stats.processCount === 0;
  const setupSteps: SetupStep[] = [
    {
      key: 'process',
      label: 'Create a process template',
      detail: stats.processCount > 0
        ? `${stats.processCount} template${stats.processCount === 1 ? '' : 's'} ready for reuse`
        : 'Define the reusable workflow you want to run again and again',
      complete: stats.processCount > 0,
      cta: stats.processCount > 0 ? 'Open processes' : 'Create process',
      onClick: () => navigate('/'),
    },
    {
      key: 'project',
      label: 'Start a live project',
      detail: stats.projectTotal > 0
        ? `${stats.projectActive} active · ${stats.projectCompleted} completed`
        : 'Instantiate a process so the work can move through the graph',
      complete: stats.projectTotal > 0,
      cta: stats.projectTotal > 0 ? 'View projects' : 'Create project',
      onClick: () => navigate('/projects'),
    },
    {
      key: 'track',
      label: 'Track execution',
      detail: stats.inProgressNodes > 0
        ? `${stats.inProgressNodes} node${stats.inProgressNodes === 1 ? '' : 's'} currently moving`
        : 'Use the tracker and graph explorer to follow progress and bottlenecks',
      complete: stats.projectTotal > 0 && stats.inProgressNodes > 0,
      cta: stats.projectTotal > 0 ? 'Open graph explorer' : 'See dashboard guide',
      onClick: () => navigate(stats.projectTotal > 0 ? '/explorer' : '/projects'),
    },
  ];
  const completedSetupSteps = setupSteps.filter((step) => step.complete).length;

  return (
    <div className="dashboard">
      <div className="dash-inner">
        {isFirstRun && !onboardingDismissed && (
          <OnboardingBanner
            onDismiss={dismissOnboarding}
            firstProcessId={recentProcesses[0]?.id}
          />
        )}

        <div className="dash-header">
          <div>
            <h1 className="dash-title">Dashboard</h1>
            <p className="dash-subtitle">
              {isFirstRun
                ? 'A guided launchpad for your first process, project, and tracked run'
                : 'Your project intelligence at a glance'}
            </p>
          </div>
          <div className="dash-header-actions">
            <button className="btn btn-secondary btn-sm" onClick={() => navigate('/projects')}>
              View Projects →
            </button>
            <button className="btn btn-primary btn-sm" onClick={() => navigate('/projects')}>
              {stats.projectTotal > 0 ? '+ New Project' : 'Start First Project'}
            </button>
          </div>
        </div>

        {isFirstRun && (
          <section className="dash-setup-panel" aria-label="First-run checklist">
            <div className="dash-setup-header">
              <div>
                <p className="dash-setup-eyebrow">First-run setup</p>
                <h2 className="dash-setup-title">Start here</h2>
                <p className="dash-setup-copy">
                  New users should be able to tell what ProjectIQ is for within a few seconds. This checklist makes the next step obvious.
                </p>
              </div>
              <div className="dash-setup-progress">
                <span className="dash-setup-progress-value">{completedSetupSteps}/3</span>
                <span className="dash-setup-progress-label">completed</span>
              </div>
            </div>

            <div className="dash-setup-grid">
              {setupSteps.map((step, index) => (
                <div key={step.key} className={`dash-setup-step${step.complete ? ' dash-setup-step--complete' : ''}`}>
                  <div className="dash-setup-step-topline">
                    <span className="dash-setup-step-index">0{index + 1}</span>
                    <span className={`dash-setup-step-status${step.complete ? ' is-complete' : ''}`}>
                      {step.complete ? 'Done' : 'Next up'}
                    </span>
                  </div>
                  <h3>{step.label}</h3>
                  <p>{step.detail}</p>
                  <button className={`btn btn-sm ${step.complete ? 'btn-secondary' : 'btn-primary'}`} onClick={step.onClick}>
                    {step.cta}
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

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
              <span className="dash-stat-chip dash-stat-chip--accent">{stats.readyNodes} ready next</span>
              <span className="dash-stat-chip dash-stat-chip--warning">{stats.blockedNodes} blocked</span>
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

        <div className="dash-main-grid">
          <div className="dash-section">
            <div className="dash-section-header">
              <h2 className="dash-section-title">Recent Projects</h2>
              <button className="dash-section-link" onClick={() => navigate('/projects')}>View all →</button>
            </div>
            {recentProjects.length === 0 ? (
              <div className="dash-empty">
                <p>{stats.processCount > 0 ? 'No projects yet. Start your first live run from a process template.' : 'No projects yet. Create a process first, then launch a project from it.'}</p>
                <button className="btn btn-primary btn-sm" onClick={() => navigate('/projects')}>{stats.processCount > 0 ? 'Create your first project' : 'Go to Projects'}</button>
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
                <p>No processes yet. Create one reusable workflow to unlock the rest of the product.</p>
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

        <div className="dash-quick-actions">
          <h2 className="dash-section-title" style={{ marginBottom: '1rem' }}>
            {isFirstRun ? 'Guided actions' : 'Quick Actions'}
          </h2>
          <div className="dash-actions-grid">
            <button className="dash-action-btn" onClick={() => navigate('/projects')}>
              <div className="dash-action-icon dash-action-icon--accent">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <path d="M3 9h18M9 21V9" />
                </svg>
              </div>
              <span className="dash-action-label">{stats.projectTotal > 0 ? 'New Project' : 'Start First Project'}</span>
            </button>
            <button className="dash-action-btn" onClick={() => navigate('/')}>
              <div className="dash-action-icon dash-action-icon--purple">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83" />
                </svg>
              </div>
              <span className="dash-action-label">{stats.processCount > 0 ? 'Open Processes' : 'Create First Process'}</span>
            </button>
            <button className="dash-action-btn" onClick={() => navigate('/explorer')}>
              <div className="dash-action-icon dash-action-icon--teal">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              </div>
              <span className="dash-action-label">{stats.projectTotal > 0 ? 'Graph Explorer' : 'Explore the model'}</span>
            </button>
            <button className="dash-action-btn" onClick={() => navigate('/database')}>
              <div className="dash-action-icon dash-action-icon--muted">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <ellipse cx="12" cy="5" rx="9" ry="3" />
                  <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
                  <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
                </svg>
              </div>
              <span className="dash-action-label">{isFirstRun ? 'Peek at sample data' : 'Database Viewer'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
