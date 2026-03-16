import { useState, useEffect } from 'react';
import type { ProcessNode, FormField } from '../types';

interface Props {
  node: ProcessNode;
  onUpdate: (data: Partial<ProcessNode>) => void;
  onDelete: () => void;
  onClose: () => void;
}

export default function NodeEditorPanel({ node, onUpdate, onDelete, onClose }: Props) {
  const [title, setTitle] = useState(node.title);
  const [description, setDescription] = useState(node.description || '');
  const [type, setType] = useState(node.type);
  const [formFields, setFormFields] = useState<FormField[]>(
    node.form_schema?.fields || []
  );

  useEffect(() => {
    setTitle(node.title);
    setDescription(node.description || '');
    setType(node.type);
    setFormFields(node.form_schema?.fields || []);
  }, [node]);

  const handleSave = () => {
    onUpdate({
      title,
      description: description || null,
      type,
      form_schema: { fields: formFields },
    });
  };

  const addFormField = () => {
    setFormFields([
      ...formFields,
      { name: '', type: 'text', label: '', required: false },
    ]);
  };

  const updateFormField = (index: number, field: Partial<FormField>) => {
    const updated = [...formFields];
    updated[index] = { ...updated[index], ...field };
    setFormFields(updated);
  };

  const removeFormField = (index: number) => {
    setFormFields(formFields.filter((_, i) => i !== index));
  };

  return (
    <div className="panel node-editor">
      <div className="panel-header">
        <h3>Edit Node</h3>
        <button className="btn btn-icon btn-secondary btn-sm" onClick={onClose}>
          ✕
        </button>
      </div>
      <div className="panel-content">
        <div className="form-group">
          <label>Type</label>
          <select value={type} onChange={(e) => setType(e.target.value as ProcessNode['type'])}>
            <option value="start">Start</option>
            <option value="task">Task</option>
            <option value="decision">Decision</option>
            <option value="end">End</option>
          </select>
        </div>

        <div className="form-group">
          <label>Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Node title"
          />
        </div>

        <div className="form-group">
          <label>Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Node description (optional)"
          />
        </div>

        <div className="form-group">
          <div className="nep-fields-header">
            <span className="nep-fields-label">Form Fields</span>
            <button className="btn btn-sm btn-secondary" onClick={addFormField}>
              + Add Field
            </button>
          </div>
          {formFields.map((field, index) => (
            <div key={index} className="nep-field-card">
              <div className="nep-field-row">
                <input
                  type="text"
                  placeholder="Field name"
                  value={field.name}
                  onChange={(e) => updateFormField(index, { name: e.target.value })}
                />
                <button
                  className="btn btn-danger btn-sm btn-icon"
                  onClick={() => removeFormField(index)}
                >
                  ✕
                </button>
              </div>
              <div className="nep-field-meta">
                <input
                  type="text"
                  placeholder="Label"
                  value={field.label}
                  onChange={(e) => updateFormField(index, { label: e.target.value })}
                />
                <select
                  className="nep-type-select"
                  value={field.type}
                  onChange={(e) =>
                    updateFormField(index, { type: e.target.value as FormField['type'] })
                  }
                >
                  <option value="text">Text</option>
                  <option value="number">Number</option>
                  <option value="date">Date</option>
                  <option value="select">Select</option>
                  <option value="textarea">Textarea</option>
                </select>
              </div>
              {field.type === 'select' && (
                <input
                  type="text"
                  className="nep-options-input"
                  placeholder="Options (comma-separated)"
                  value={field.options?.join(', ') || ''}
                  onChange={(e) =>
                    updateFormField(index, {
                      options: e.target.value.split(',').map((s) => s.trim()),
                    })
                  }
                />
              )}
            </div>
          ))}
        </div>

        <div className="panel-form-actions">
          <button className="btn btn-danger btn-sm" onClick={onDelete}>
            Delete Node
          </button>
          <button className="btn btn-primary" onClick={handleSave}>
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
