import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getProcesses, createProcess, deleteProcess } from '../services/api';
import type { Process } from '../types';
import Modal from '../components/Modal';
import OnboardingBanner, { useOnboardingDismissed } from '../components/OnboardingBanner';

export default function ProcessList() {
  const [processes, setProcesses] = useState<Process[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newProcessName, setNewProcessName] = useState('');
  const [newProcessDesc, setNewProcessDesc] = useState('');
  const [onboardingDismissed, dismissOnboarding] = useOnboardingDismissed();
  const navigate = useNavigate();

  useEffect(() => {
    loadProcesses();
  }, []);

  const loadProcesses = async () => {
    try {
      const data = await getProcesses();
      setProcesses(data);
    } catch (error) {
      console.error('Failed to load processes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newProcessName.trim()) return;

    try {
      const process = await createProcess({
        name: newProcessName,
        description: newProcessDesc,
      });
      setProcesses([process, ...processes]);
      setShowModal(false);
      setNewProcessName('');
      setNewProcessDesc('');
      navigate(`/process/${process.id}`);
    } catch (error) {
      console.error('Failed to create process:', error);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this process?')) return;

    try {
      await deleteProcess(id);
      setProcesses(processes.filter((p) => p.id !== id));
    } catch (error) {
      alert((error as Error).message);
    }
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
        {!onboardingDismissed && <OnboardingBanner onDismiss={dismissOnboarding} />}
        <div className="list-page-header">
          <div>
            <h1 className="list-page-title">Process Templates</h1>
            <p className="list-page-subtitle">Define reusable workflows as node graphs</p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            + New Process
          </button>
        </div>

        {processes.length === 0 ? (
          <div className="empty-state">
            <h3>No processes yet</h3>
            <p>Create your first process template to get started.</p>
            <button className="btn btn-primary" onClick={() => setShowModal(true)}>
              Create Process
            </button>
          </div>
        ) : (
          <div className="list-grid">
            {processes.map((process) => (
              <div
                key={process.id}
                className="list-card"
                onClick={() => navigate(`/process/${process.id}`)}
              >
                <div className="list-card-body">
                  <div className="list-card-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="3" />
                      <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83" />
                    </svg>
                  </div>
                  <div className="list-card-content">
                    <h3 className="list-card-title">{process.name}</h3>
                    <p className="list-card-desc">{process.description || 'No description'}</p>
                    <span className="list-card-meta">
                      v{process.version} · Created {new Date(process.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <div className="list-card-actions">
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={(e) => { e.stopPropagation(); navigate(`/process/${process.id}`); }}
                  >
                    Open →
                  </button>
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={(e) => handleDelete(process.id, e)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <Modal title="Create New Process" onClose={() => setShowModal(false)}>
          <div className="form-group">
            <label>Name</label>
            <input
              type="text"
              value={newProcessName}
              onChange={(e) => setNewProcessName(e.target.value)}
              placeholder="Process name"
              autoFocus
            />
          </div>
          <div className="form-group">
            <label>Description</label>
            <textarea
              value={newProcessDesc}
              onChange={(e) => setNewProcessDesc(e.target.value)}
              placeholder="Process description (optional)"
            />
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
