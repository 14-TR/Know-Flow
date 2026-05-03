import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getProjects, getProcesses, createProject, deleteProject, exportProject, importProject } from '../services/api';
import type { Project, Process } from '../types';
import Modal from '../components/Modal';
import ConfirmModal from '../components/ConfirmModal';
import { useToast } from '../components/Toast';
import { ListSkeleton } from '../components/LoadingSkeleton';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';

export default function ProjectList() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [processes, setProcesses] = useState<Process[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [selectedProcessId, setSelectedProcessId] = useState('');
  const navigate = useNavigate();
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null);
  const { toast } = useToast();

  // Keyboard shortcut: 'n' → new project (only when processes exist)
  useKeyboardShortcuts([
    {
      key: 'n',
      description: 'New project',
      group: 'Actions',
      handler: () => {
        if (processes.length > 0) setShowModal(true);
      },
    },
  ]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [projectsData, processesData] = await Promise.all([
        getProjects(),
        getProcesses(),
      ]);
      setProjects(projectsData);
      setProcesses(processesData);
      setLoadError(null);
      if (processesData.length > 0) {
        setSelectedProcessId(processesData[0].id);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
      setLoadError('Failed to load projects. Please refresh and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newProjectName.trim() || !selectedProcessId) return;

    try {
      const project = await createProject({
        name: newProjectName,
        process_id: selectedProcessId,
      });
      setProjects([project, ...projects]);
      setShowModal(false);
      setNewProjectName('');
      navigate(`/project/${project.id}`);
    } catch (error) {
      console.error('Failed to create project:', error);
    }
  };

  const handleDeleteRequest = (id: string, name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirmDelete({ id, name });
  };

  const handleDeleteConfirm = async () => {
    if (!confirmDelete) return;
    const { id } = confirmDelete;
    setConfirmDelete(null);
    try {
      await deleteProject(id);
      setProjects(projects.filter((p) => p.id !== id));
      toast('Project deleted', 'success');
    } catch (error) {
      toast((error as Error).message || 'Failed to delete project', 'error');
    }
  };

  const handleExport = async (id: string, name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const blob = await exportProject(id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${name.replace(/[^a-zA-Z0-9]/g, '_')}_backup.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      toast('Export failed: ' + (error as Error).message, 'error');
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setImportError(null);
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      await importProject(data);
      await loadData();
      navigate(`/projects`);
    } catch (error) {
      setImportError('Import failed: ' + (error as Error).message);
    } finally {
      setImporting(false);
      e.target.value = '';
    }
  };

  const getProgress = (project: Project) => {
    const completed = project.completed_nodes || 0;
    const total = project.total_nodes || 1;
    return Math.round((completed / total) * 100);
  };

  if (loading) {
    return (
      <div className="list-page">
        <div className="list-page-inner">
          <ListSkeleton count={4} />
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="list-page">
        <div className="list-page-inner">
          <div className="load-error">
            <div className="load-error-icon">⚠️</div>
            <h3>Something went wrong</h3>
            <p>{loadError}</p>
            <button className="btn btn-primary" onClick={loadData}>Retry</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="list-page">
      <div className="list-page-inner">
        <div className="list-page-header">
          <div>
            <h1 className="list-page-title">Projects</h1>
            <p className="list-page-subtitle">Track active work against process templates</p>
          </div>
          <div className="list-page-actions">
            <label className="btn btn-secondary" style={{ cursor: 'pointer', margin: 0 }} title="Import a project backup">
              {importing ? 'Importing…' : '↑ Import'}
              <input type="file" accept=".json" style={{ display: 'none' }} onChange={handleImport} />
            </label>
            <button
              className="btn btn-primary"
              onClick={() => setShowModal(true)}
              disabled={processes.length === 0}
              title={processes.length === 0 ? 'Create a process template first' : undefined}
            >
              + New Project
            </button>
          </div>
        </div>

        {importError && (
          <div className="error-banner" style={{ marginBottom: '1rem' }}>
            {importError}
            <button onClick={() => setImportError(null)} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: '1.1rem' }}>×</button>
          </div>
        )}

        {projects.length === 0 ? (
          <div className="empty-state empty-state--guided">
            <div className="empty-state-eyebrow">Quick start</div>
            <h3>{processes.length === 0 ? 'Start with a process template' : 'Spin up your first project'}</h3>
            <p>
              {processes.length === 0
                ? 'Projects are live runs of a process. Create or import a process template first, then come back here to track real work.'
                : `You have ${processes.length} process template${processes.length === 1 ? '' : 's'} ready. Pick one and ProjectIQ will create a live tracker with progress, decisions, and calendar context.`}
            </p>

            <div className="empty-state-actions">
              {processes.length > 0 ? (
                <>
                  <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                    + Create Project
                  </button>
                  <Link className="btn btn-secondary" to="/">
                    Browse Process Templates
                  </Link>
                </>
              ) : (
                <>
                  <Link className="btn btn-primary" to="/">
                    Create a Process
                  </Link>
                  <p className="empty-state-hint">Need an example? Use the import button above on Processes to load a template backup.</p>
                </>
              )}
            </div>

            <div className="quick-start-grid">
              <div className="quick-start-card">
                <span className="quick-start-step">1</span>
                <div>
                  <strong>{processes.length === 0 ? 'Define the workflow' : 'Choose a template'}</strong>
                  <p>{processes.length === 0 ? 'Map the steps, decisions, and handoffs in a reusable process.' : 'Select the process that best matches the work you want to track.'}</p>
                </div>
              </div>
              <div className="quick-start-card">
                <span className="quick-start-step">2</span>
                <div>
                  <strong>{processes.length === 0 ? 'Return here' : 'Name the project'}</strong>
                  <p>{processes.length === 0 ? 'Once a process exists, this Projects page becomes your execution dashboard.' : 'Create a live project run for a client deliverable, feature, or internal initiative.'}</p>
                </div>
              </div>
              <div className="quick-start-card">
                <span className="quick-start-step">3</span>
                <div>
                  <strong>Track progress</strong>
                  <p>Open the project to mark nodes complete, capture notes, and keep momentum visible.</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="list-grid">
            {projects.map((project) => {
              const pct = getProgress(project);
              return (
                <div
                  key={project.id}
                  className="list-card"
                  onClick={() => navigate(`/project/${project.id}`)}
                >
                  <div className="list-card-body">
                    <div className="list-card-icon list-card-icon--project">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="18" height="18" rx="2" />
                        <path d="M3 9h18M9 21V9" />
                      </svg>
                    </div>
                    <div className="list-card-content">
                      <div className="list-card-title-row">
                        <h3 className="list-card-title">{project.name}</h3>
                        <span className={`status-badge ${project.status}`}>{project.status}</span>
                      </div>
                      <p className="list-card-desc">Process: {project.process_name}</p>
                      <div className="list-card-progress">
                        <div className="progress-bar">
                          <div className="progress-bar-fill" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="list-card-progress-label">
                          {pct}% &middot; {project.completed_nodes}/{project.total_nodes} nodes
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="list-card-actions">
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={(e) => { e.stopPropagation(); navigate(`/project/${project.id}`); }}
                    >
                      Open →
                    </button>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={(e) => { e.stopPropagation(); navigate(`/project/${project.id}/calendar`); }}
                      title="Open project calendar"
                    >
                      📅 Calendar
                    </button>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={(e) => handleExport(project.id, project.name, e)}
                      title="Export project backup"
                    >
                      ↓ Export
                    </button>
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={(e) => handleDeleteRequest(project.id, project.name, e)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showModal && (
        <Modal title="Create New Project" onClose={() => setShowModal(false)}>
          <div className="form-group">
            <label>Name</label>
            <input
              type="text"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              placeholder="Project name"
              autoFocus
            />
          </div>
          <div className="form-group">
            <label>Process Template</label>
            <select
              value={selectedProcessId}
              onChange={(e) => setSelectedProcessId(e.target.value)}
            >
              {processes.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div className="form-actions">
            <button className="btn btn-secondary" onClick={() => setShowModal(false)}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={handleCreate}>
              Create
            </button>
          </div>
        </Modal>
      )}

      {confirmDelete && (
        <ConfirmModal
          title="Delete Project"
          message={`Are you sure you want to delete "${confirmDelete.name}"? All tracked progress will be lost.`}
          confirmLabel="Delete"
          variant="danger"
          onConfirm={handleDeleteConfirm}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
}
