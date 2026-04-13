import { useState, useEffect } from 'react';
import type { ProcessEdge } from '../types';

interface Props {
  edge: ProcessEdge;
  onUpdate: (data: Partial<ProcessEdge>) => void;
  onDelete: () => void;
  onClose: () => void;
}

export default function EdgeEditorPanel({ edge, onUpdate, onDelete, onClose }: Props) {
  const [label, setLabel] = useState(edge.label || '');
  const [conditionField, setConditionField] = useState(
    (edge.condition as Record<string, string>)?.field || ''
  );
  const [conditionValue, setConditionValue] = useState(
    (edge.condition as Record<string, string>)?.value || ''
  );

  useEffect(() => {
    setLabel(edge.label || '');
    setConditionField((edge.condition as Record<string, string>)?.field || '');
    setConditionValue((edge.condition as Record<string, string>)?.value || '');
  }, [edge]);

  const handleSave = () => {
    onUpdate({
      label: label || null,
      condition:
        conditionField && conditionValue
          ? { field: conditionField, value: conditionValue }
          : {},
    });
  };

  return (
    <div className="panel node-editor command-center-panel">
      <div className="panel-header">
        <div>
          <span className="panel-kicker">Connection inspector</span>
          <h3>Edit Edge</h3>
        </div>
        <button className="btn btn-icon btn-secondary btn-sm" onClick={onClose}>
          ✕
        </button>
      </div>
      <div className="panel-content">
        <div className="panel-hero panel-hero--edge">
          <span className="panel-hero__badge">Route</span>
          <div>
            <strong>{label || 'Unlabeled connection'}</strong>
            <p>Define how this connection reads in the graph and when it should be taken.</p>
          </div>
        </div>

        <div className="form-group">
          <label>Label</label>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder='e.g., "Yes" or "No"'
          />
          <p className="eep-hint">This label appears on the edge and is used for decision routing.</p>
        </div>

        <div className="form-group">
          <label>Condition (Optional)</label>
          <input
            type="text"
            value={conditionField}
            onChange={(e) => setConditionField(e.target.value)}
            placeholder="Field name"
          />
          <input
            type="text"
            value={conditionValue}
            onChange={(e) => setConditionValue(e.target.value)}
            placeholder="Expected value"
          />
          <p className="eep-hint">When the source node's form field matches this value, this edge is traversed.</p>
        </div>

        <div className="panel-form-actions">
          <button className="btn btn-danger btn-sm" onClick={onDelete}>
            Delete Edge
          </button>
          <button className="btn btn-primary" onClick={handleSave}>
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
