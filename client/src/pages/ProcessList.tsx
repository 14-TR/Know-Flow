import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getProcesses, createProcess, deleteProcess } from '../services/api';
import type { Process } from '../types';
import Modal from '../components/Modal';

export default function ProcessList() {
  const [processes, setProcesses] = useState<Process[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newProcessName, setNewProcessName] = useState('');
  const [newProcessDesc, setNewProcessDesc] = useState('');
  const navigate = useNavigate();

  useEffect(() => { loadProcesses(); }, []);

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
      const process = await createProcess({ name: newProcessName, description: newProcessDesc });
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
    if (!confirm('Delete this process template?')) return;
    try {
      await deleteProcess(id);
      setProcesses(processes.filter(p => p.id !== id));
    } catch (error) {
      alert((error as Error).message);
    }
  };

  if (loading) return <div className="main-content loading">Loading…</div>;

  return (
    <div className="main-content">
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        {/* Header */}
        <div className="section-header" style={{ marginBottom: '1.5rem' }}>
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.03em' }}>
              Process Templates
            </h2>
            <p style={{ fontSize: '0.8125rem', color: 'var(--muted)', marginTop: '0.125rem' }}>
              Reusable workflow blueprints
            </p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            + New Process
          </button>
        </div>

        {processes.length === 0 ? (
          <div className="empty-state">
            <h3>No processes yet</h3>
            <p>Create your first process template to get started.</p>
            <button className="btn btn-primary" style={{ marginTop: '1rem' }} onClick={() => setShowModal(true)}>
              Create Process
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {processes.map((process) => (
              <div
                key={process.id}
                className="card"
                onClick={() => navigate(`/process/${process.id}`)}
                style={{ cursor: 'pointer' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.25rem' }}>
                      <span style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--fg)' }}>
                        {process.name}
                      </span>
                      <span className="badge badge-primary">v{process.version}</span>
                    </div>
                    <p style={{ fontSize: '0.8125rem', color: 'var(--muted)', marginBottom: '0.5rem' }}>
                      {process.description || 'No description'}
                    </p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--muted-fg)' }}>
                      Created {new Date(process.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={(e) => { e.stopPropagation(); navigate(`/process/${process.id}`); }}
                    >
                      Edit →
                    </button>
                    <button className="btn btn-danger btn-sm" onClick={(e) => handleDelete(process.id, e)}>
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <Modal title="Create New Process" onClose={() => setShowModal(false)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label>Name</label>
              <input
                type="text"
                value={newProcessName}
                onChange={(e) => setNewProcessName(e.target.value)}
                placeholder="e.g. Cheyenne Development Permit"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              />
            </div>
            <div>
              <label>Description</label>
              <textarea
                value={newProcessDesc}
                onChange={(e) => setNewProcessDesc(e.target.value)}
                placeholder="What is this process for? (optional)"
                style={{ minHeight: 80, resize: 'vertical' }}
              />
            </div>
          </div>
          <div className="modal-footer">
            <button className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleCreate} disabled={!newProcessName.trim()}>
              Create Process
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
