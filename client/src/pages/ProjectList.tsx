import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getProjects, getProcesses, createProject, deleteProject } from '../services/api';
import type { Project, Process } from '../types';
import Modal from '../components/Modal';

export default function ProjectList() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [processes, setProcesses] = useState<Process[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [selectedProcessId, setSelectedProcessId] = useState('');
  const navigate = useNavigate();

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
      if (processesData.length > 0) {
        setSelectedProcessId(processesData[0].id);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
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

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this project?')) return;

    try {
      await deleteProject(id);
      setProjects(projects.filter((p) => p.id !== id));
    } catch (error) {
      alert((error as Error).message);
    }
  };

  const getProgress = (project: Project) => {
    const completed = project.completed_nodes || 0;
    const total = project.total_nodes || 1;
    return Math.round((completed / total) * 100);
  };

  if (loading) {
    return (
      <div className="main-content">
        <div className="empty-state">Loading...</div>
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
          <button
            className="btn btn-primary"
            onClick={() => setShowModal(true)}
            disabled={processes.length === 0}
            title={processes.length === 0 ? 'Create a process template first' : undefined}
          >
            + New Project
          </button>
        </div>

        {projects.length === 0 ? (
          <div className="empty-state">
            <h3>No projects yet</h3>
            <p>
              {processes.length === 0
                ? 'Create a process template first before creating projects.'
                : 'Create your first project to start tracking progress.'}
            </p>
            {processes.length > 0 && (
              <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                Create Project
              </button>
            )}
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
                      className="btn btn-danger btn-sm"
                      onClick={(e) => handleDelete(project.id, e)}
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
    </div>
  );
}
