import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { getProjects, getProcesses, createProject, deleteProject } from '../services/api';
import type { Project, Process } from '../types';
import Modal from '../components/Modal';

function getProgress(project: Project) {
  const completed = project.completed_nodes || 0;
  const total = project.total_nodes || 1;
  return Math.round((completed / total) * 100);
}

export default function ProjectList() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [processes, setProcesses] = useState<Process[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [selectedProcessId, setSelectedProcessId] = useState('');
  const navigate = useNavigate();

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [projectsData, processesData] = await Promise.all([getProjects(), getProcesses()]);
      setProjects(projectsData);
      setProcesses(processesData);
      if (processesData.length > 0) setSelectedProcessId(processesData[0].id);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newProjectName.trim() || !selectedProcessId) return;
    try {
      const project = await createProject({ name: newProjectName, process_id: selectedProcessId });
      setProjects([project, ...projects]);
      setShowModal(false);
      setNewProjectName('');
      navigate(`/project/${project.id}`);
    } catch (error) {
      console.error('Failed to create project:', error);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Delete this project? This cannot be undone.')) return;
    try {
      await deleteProject(id);
      setProjects(projects.filter(p => p.id !== id));
    } catch (error) {
      alert((error as Error).message);
    }
  };

  if (loading) return <div className="main-content loading">Loading…</div>;

  return (
    <div className="main-content">
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        {/* Header */}
        <div className="section-header" style={{ marginBottom: '1.5rem' }}>
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.03em' }}>Projects</h2>
            <p style={{ fontSize: '0.8125rem', color: 'var(--muted)', marginTop: '0.125rem' }}>
              {projects.length} project{projects.length !== 1 ? 's' : ''} tracked
            </p>
          </div>
          <button
            className="btn btn-primary"
            onClick={() => setShowModal(true)}
            disabled={processes.length === 0}
            title={processes.length === 0 ? 'Create a process template first' : undefined}
          >
            + New Project
          </button>
        </div>

        {processes.length === 0 && (
          <div className="card" style={{ marginBottom: '1rem', borderColor: 'var(--warning)', background: 'var(--warning-muted)' }}>
            <p style={{ fontSize: '0.875rem', color: 'var(--warning)' }}>
              No process templates found. <Link to="/processes" style={{ color: 'var(--warning)', fontWeight: 600 }}>Create one first →</Link>
            </p>
          </div>
        )}

        {projects.length === 0 ? (
          <div className="empty-state">
            <h3>No projects yet</h3>
            <p>
              {processes.length === 0
                ? 'Create a process template before starting a project.'
                : 'Stamp out a process template to create your first project.'}
            </p>
            {processes.length > 0 && (
              <button className="btn btn-primary" style={{ marginTop: '1rem' }} onClick={() => setShowModal(true)}>
                Create Project
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {projects.map((project) => {
              const pct = getProgress(project);
              return (
                <div
                  key={project.id}
                  className="card"
                  onClick={() => navigate(`/project/${project.id}`)}
                  style={{ cursor: 'pointer' }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', justifyContent: 'space-between' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {/* Name + status */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.25rem' }}>
                        <span style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--fg)' }}>
                          {project.name}
                        </span>
                        <span className={`badge badge-${project.status === 'active' ? 'success' : project.status === 'completed' ? 'primary' : 'muted'}`}>
                          {project.status}
                        </span>
                      </div>
                      <p style={{ fontSize: '0.8125rem', color: 'var(--muted)', marginBottom: '0.75rem' }}>
                        {project.process_name}
                      </p>

                      {/* Progress */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div className="progress-bar" style={{ flex: 1, maxWidth: 240 }}>
                          <div className="progress-bar-fill" style={{ width: `${pct}%` }} />
                        </div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--muted)', whiteSpace: 'nowrap' }}>
                          {pct}% &nbsp;·&nbsp; {project.completed_nodes ?? 0}/{project.total_nodes ?? 0} nodes
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => navigate(`/project/${project.id}/calendar`)}
                        title="Calendar"
                      >
                        📅
                      </button>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => navigate(`/project/${project.id}/coverage`)}
                        title="Spec Coverage"
                      >
                        📋
                      </button>
                      <button className="btn btn-danger btn-sm" onClick={(e) => handleDelete(project.id, e)}>
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showModal && (
        <Modal title="Create New Project" onClose={() => setShowModal(false)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label>Project Name</label>
              <input
                type="text"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                placeholder="e.g. 123 Main St — Development Permit"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              />
            </div>
            <div>
              <label>Process Template</label>
              <select value={selectedProcessId} onChange={(e) => setSelectedProcessId(e.target.value)}>
                {processes.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="modal-footer">
            <button className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
            <button
              className="btn btn-primary"
              onClick={handleCreate}
              disabled={!newProjectName.trim() || !selectedProcessId}
            >
              Create Project
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
