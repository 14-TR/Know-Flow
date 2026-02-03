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
  const [formData, setFormData] = useState<Record<string, unknown>>(
    node.form_data || {}
  );
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

    onUpdate(node.status_id, {
      status,
      decision_result: decisionResult || undefined,
      form_data: formData,
      notes: notes || undefined,
    });
  };

  const handleStartTask = () => {
    if (!node.status_id) return;
    onUpdate(node.status_id, { status: 'in_progress' });
  };

  const handleCompleteTask = () => {
    if (!node.status_id) return;

    // For decision nodes, require a decision result
    if (node.type === 'decision' && !decisionResult) {
      alert('Please select a decision result before completing this node.');
      return;
    }

    onUpdate(node.status_id, {
      status: 'complete',
      decision_result: decisionResult || undefined,
      form_data: formData,
      notes: notes || undefined,
    });
  };

  const renderFormField = (field: FormField) => {
    const value = formData[field.name] || '';

    switch (field.type) {
      case 'select':
        return (
          <select
            value={value as string}
            onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
          >
            <option value="">Select...</option>
            {field.options?.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        );
      case 'textarea':
        return (
          <textarea
            value={value as string}
            onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
          />
        );
      case 'number':
        return (
          <input
            type="number"
            value={value as string}
            onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
          />
        );
      case 'date':
        return (
          <input
            type="date"
            value={value as string}
            onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
          />
        );
      default:
        return (
          <input
            type="text"
            value={value as string}
            onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
          />
        );
    }
  };

  // Find decision options from form schema
  const decisionOptions =
    node.type === 'decision'
      ? formFields.find((f) => f.type === 'select')?.options || ['Yes', 'No']
      : [];

  return (
    <div className="panel node-editor">
      <div className="panel-header">
        <h3>{node.title}</h3>
        <button className="btn btn-icon btn-secondary btn-sm" onClick={onClose}>
          ✕
        </button>
      </div>
      <div className="panel-content">
        <div style={{ marginBottom: '1rem' }}>
          <span
            className="status-badge"
            style={{
              background:
                status === 'complete'
                  ? '#4caf50'
                  : status === 'in_progress'
                  ? '#ff9800'
                  : '#e0e0e0',
              color: status === 'not_started' ? '#666' : 'white',
            }}
          >
            {status.replace('_', ' ')}
          </span>
          <span
            style={{
              marginLeft: '0.5rem',
              fontSize: '0.75rem',
              color: '#666',
              textTransform: 'uppercase',
            }}
          >
            {node.type}
          </span>
        </div>

        {node.description && (
          <p style={{ fontSize: '0.875rem', color: '#666', marginBottom: '1rem' }}>
            {node.description}
          </p>
        )}

        {node.type === 'decision' && (
          <div className="form-group">
            <label>Decision Result</label>
            <select
              value={decisionResult}
              onChange={(e) => setDecisionResult(e.target.value)}
            >
              <option value="">Select decision...</option>
              {decisionOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        )}

        {formFields.length > 0 && (
          <div style={{ marginBottom: '1rem' }}>
            <h4 style={{ fontSize: '0.75rem', color: '#666', marginBottom: '0.5rem' }}>
              Form Data
            </h4>
            {formFields.map((field) => (
              <div className="form-group" key={field.name}>
                <label>
                  {field.label}
                  {field.required && <span style={{ color: '#f44336' }}> *</span>}
                </label>
                {renderFormField(field)}
              </div>
            ))}
          </div>
        )}

        <div className="form-group">
          <label>Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add notes about this step..."
          />
        </div>

        <div className="form-actions" style={{ flexDirection: 'column', gap: '0.5rem' }}>
          {status === 'not_started' && (
            <button className="btn btn-primary" onClick={handleStartTask} style={{ width: '100%' }}>
              Start Task
            </button>
          )}
          {status === 'in_progress' && (
            <>
              <button className="btn btn-success" onClick={handleCompleteTask} style={{ width: '100%' }}>
                Complete Task
              </button>
              <button className="btn btn-secondary" onClick={handleSave} style={{ width: '100%' }}>
                Save Progress
              </button>
            </>
          )}
          {status === 'complete' && (
            <p style={{ textAlign: 'center', color: '#4caf50', fontWeight: 500 }}>
              ✓ Task Completed
              {node.completed_at && (
                <span style={{ display: 'block', fontSize: '0.75rem', color: '#666', fontWeight: 'normal' }}>
                  {new Date(node.completed_at).toLocaleString()}
                </span>
              )}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
