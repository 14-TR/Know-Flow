import { useState, useEffect } from 'react';
import type { ProjectNodeWithStatus, FormField, ProjectNodeStatus } from '../types';

interface Props {
  node: ProjectNodeWithStatus;
  onUpdate: (
    statusId: string,
    data: {
      status?: ProjectNodeStatus['status'];
      decision_result?: string;
      form_data?: Record<string, unknown>;
      notes?: string;
    }
  ) => void;
  onClose: () => void;
}

export default function NodeStatusPanel({ node, onUpdate, onClose }: Props) {
  const [status, setStatus] = useState(node.project_status || 'not_started');
  const [decisionResult, setDecisionResult] = useState(node.decision_result || '');
  const [formData, setFormData] = useState<Record<string, unknown>>(node.form_data || {});
  const [notes, setNotes] = useState(node.notes || '');

  useEffect(() => {
    setStatus(node.project_status || 'not_started');
    setDecisionResult(node.decision_result || '');
    setFormData(node.form_data || {});
    setNotes(node.notes || '');
  }, [node]);

  const formFields: FormField[] = node.form_schema?.fields || [];

  const handleSave = () => {
    if (!node.status_id) return;
    onUpdate(node.status_id, { status, decision_result: decisionResult || undefined, form_data: formData, notes: notes || undefined });
  };

  const handleStartTask = () => {
    if (!node.status_id) return;
    onUpdate(node.status_id, { status: 'in_progress' });
  };

  const handleCompleteTask = () => {
    if (!node.status_id) return;
    if (node.type === 'decision' && !decisionResult) {
      alert('Please select a decision result before completing this node.');
      return;
    }
    onUpdate(node.status_id, { status: 'complete', decision_result: decisionResult || undefined, form_data: formData, notes: notes || undefined });
  };

  const renderFormField = (field: FormField) => {
    const value = formData[field.name] || '';
    switch (field.type) {
      case 'select':
        return (
          <select value={value as string} onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}>
            <option value="">Select...</option>
            {field.options?.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
          </select>
        );
      case 'textarea':
        return <textarea value={value as string} onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })} />;
      case 'number':
        return <input type="number" value={value as string} onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })} />;
      case 'date':
        return <input type="date" value={value as string} onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })} />;
      default:
        return <input type="text" value={value as string} onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })} />;
    }
  };

  const decisionOptions =
    node.type === 'decision'
      ? formFields.find((f) => f.type === 'select')?.options || ['Yes', 'No']
      : [];

  // Status badge styles
  const statusStyles: Record<string, React.CSSProperties> = {
    complete:    { background: 'var(--success-dim)',  color: 'var(--success)',  border: '1px solid var(--success)' },
    in_progress: { background: 'var(--warning-dim)',  color: 'var(--warning)',  border: '1px solid var(--warning)' },
    not_started: { background: 'rgba(82,82,91,0.15)', color: 'var(--text-secondary)', border: '1px solid var(--border)' },
    skipped:     { background: 'rgba(82,82,91,0.15)', color: 'var(--text-tertiary)',   border: '1px solid var(--border)' },
  };

  // Node type accent
  const typeColor: Record<string, string> = {
    start: 'var(--success)', end: 'var(--danger)', decision: 'var(--warning)', task: 'var(--accent)',
  };

  return (
    <div className="panel node-editor">
      <div className="panel-header">
        <h3 style={{ color: 'var(--text-primary)' }}>{node.title}</h3>
        <button className="btn btn-icon btn-secondary btn-sm" onClick={onClose}>✕</button>
      </div>
      <div className="panel-content">
        {/* Status + type row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <span style={{
            fontSize: '0.7rem',
            fontWeight: 600,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            padding: '3px 10px',
            borderRadius: 'var(--radius-sm)',
            ...statusStyles[status],
          }}>
            {status.replace('_', ' ')}
          </span>
          <span style={{
            fontSize: '0.7rem',
            fontWeight: 600,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            color: typeColor[node.type] ?? 'var(--text-secondary)',
          }}>
            {node.type}
          </span>
        </div>

        {node.description && (
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1rem', lineHeight: 1.5 }}>
            {node.description}
          </p>
        )}

        {node.type === 'decision' && (
          <div className="form-group">
            <label>Decision Result</label>
            <select value={decisionResult} onChange={(e) => setDecisionResult(e.target.value)}>
              <option value="">Select decision...</option>
              {decisionOptions.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          </div>
        )}

        {formFields.length > 0 && (
          <div style={{ marginBottom: '1rem' }}>
            <h4 style={{ fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-tertiary)', marginBottom: '0.75rem' }}>
              Form Data
            </h4>
            {formFields.map((field) => (
              <div className="form-group" key={field.name}>
                <label>
                  {field.label}
                  {field.required && <span style={{ color: 'var(--danger)' }}> *</span>}
                </label>
                {renderFormField(field)}
              </div>
            ))}
          </div>
        )}

        <div className="form-group">
          <label>Notes</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Add notes about this step..." />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
          {status === 'not_started' && (
            <button className="btn btn-primary" onClick={handleStartTask} style={{ width: '100%' }}>
              Start Task
            </button>
          )}
          {status === 'in_progress' && (
            <>
              <button className="btn btn-success" onClick={handleCompleteTask} style={{ width: '100%' }}>
                ✓ Complete Task
              </button>
              <button className="btn btn-secondary" onClick={handleSave} style={{ width: '100%' }}>
                Save Progress
              </button>
            </>
          )}
          {status === 'complete' && (
            <div style={{
              textAlign: 'center',
              padding: '0.75rem',
              background: 'var(--success-dim)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--success)',
            }}>
              <div style={{ color: 'var(--success)', fontWeight: 600, fontSize: '0.875rem' }}>✓ Task Completed</div>
              {node.completed_at && (
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 4 }}>
                  {new Date(node.completed_at).toLocaleString()}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
