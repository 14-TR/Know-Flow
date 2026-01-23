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
    <div className="main-content" style={{ padding: '2rem' }}>
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
          <h2>Process Templates</h2>
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
          <div style={{ display: 'grid', gap: '1rem' }}>
            {processes.map((process) => (
              <div
                key={process.id}
                className="sidebar-item"
                onClick={() => navigate(`/process/${process.id}`)}
                style={{ background: 'white', cursor: 'pointer' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h3>{process.name}</h3>
                    <p>{process.description || 'No description'}</p>
                    <p style={{ marginTop: '0.5rem', fontSize: '0.7rem', color: '#999' }}>
                      Version {process.version} - Created {new Date(process.created_at).toLocaleDateString()}
                    </p>
                  </div>
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
