import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getProcesses, createProcess, deleteProcess, exportProcess, importProcess } from '../services/api';
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
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

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

  const handleExport = async (id: string, name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const blob = await exportProcess(id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${name.replace(/[^a-zA-Z0-9]/g, '_')}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      alert('Export failed: ' + (error as Error).message);
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
      const result = await importProcess(data);
      setProcesses(prev => [result.process as any, ...prev]);
      await loadProcesses(); // Reload to get full data
    } catch (error) {
      setImportError('Import failed: ' + (error as Error).message);
    } finally {
      setImporting(false);
      e.target.value = '';
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
        {importError && (
          <div style={{
            background: 'var(--danger-dim)',
            color: 'var(--danger)',
            border: '1px solid rgba(248,113,113,0.2)',
            borderRadius: 'var(--radius)',
            padding: '0.75rem 1rem',
            marginBottom: '1rem',
            fontSize: '0.875rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            {importError}
            <button onClick={() => setImportError(null)} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: '1.1rem' }}>×</button>
          </div>
        )}
        <div className="list-page-header">
          <div>
            <h1 className="list-page-title">Process Templates</h1>
            <p className="list-page-subtitle">Define reusable workflows as node graphs</p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <label className="btn btn-secondary" style={{ cursor: 'pointer', margin: 0 }}>
              {importing ? 'Importing…' : '↑ Import'}
              <input type="file" accept=".json" style={{ display: 'none' }} onChange={handleImport} />
            </label>
            <button className="btn btn-primary" onClick={() => setShowModal(true)}>
              + New Process
            </button>
          </div>
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
                    className="btn btn-secondary btn-sm"
                    onClick={(e) => handleExport(process.id, process.name, e)}
                    title="Export as JSON"
                  >
                    ↓ Export
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
