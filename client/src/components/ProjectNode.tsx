import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { ProjectNodeWithStatus } from '../types';

function ProjectNode({ data, selected }: NodeProps) {
  const nodeData = data as unknown as ProjectNodeWithStatus;
  const status = nodeData.project_status || 'not_started';

  // Status → design token colors
  const statusColor: Record<string, string> = {
    complete:    'var(--success)',
    in_progress: 'var(--warning)',
    skipped:     'var(--text-tertiary)',
    not_started: 'var(--text-tertiary)',
  };

  const statusBg: Record<string, string> = {
    complete:    'var(--success-dim)',
    in_progress: 'var(--warning-dim)',
    skipped:     'rgba(82,82,91,0.2)',
    not_started: 'rgba(82,82,91,0.12)',
  };

  // Node type → accent color
  const typeColor: Record<string, string> = {
    start:    'var(--success)',
    end:      'var(--danger)',
    decision: 'var(--warning)',
    task:     'var(--accent)',
  };

  const borderColor = typeColor[nodeData.type] ?? 'var(--border-strong)';

  const containerStyle: React.CSSProperties = {
    position: 'relative',
    padding: nodeData.type === 'decision' ? '14px 22px' : '10px 16px',
    border: `1.5px solid ${borderColor}`,
    borderRadius: nodeData.type === 'start' || nodeData.type === 'end' ? '24px' : 'var(--radius-md)',
    minWidth: 150,
    textAlign: 'center',
    background: 'var(--bg-elevated)',
    backdropFilter: 'blur(8px)',
    boxShadow: selected
      ? `0 0 0 2px var(--accent), var(--shadow-md)`
      : status === 'in_progress'
      ? `0 0 0 2px var(--warning), var(--shadow-sm)`
      : 'var(--shadow-sm)',
    opacity: status === 'not_started' ? 0.65 : status === 'skipped' ? 0.45 : 1,
    transition: 'var(--transition)',
  };

  return (
    <div style={containerStyle}>
      <Handle
        type="target"
        position={Position.Top}
        style={{ background: borderColor, border: 'none', width: 8, height: 8 }}
      />

      {/* Completion badge */}
      {status === 'complete' && (
        <div style={{
          position: 'absolute',
          top: -8,
          right: -8,
          background: 'var(--success)',
          color: '#000',
          width: 20,
          height: 20,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 11,
          fontWeight: 700,
          boxShadow: '0 0 8px var(--success)',
        }}>
          ✓
        </div>
      )}

      <div style={{
        fontWeight: 600,
        fontSize: 12,
        color: 'var(--text-primary)',
        lineHeight: 1.3,
      }}>
        {nodeData.title}
      </div>

      <div style={{
        fontSize: 9,
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
        color: borderColor,
        marginTop: 3,
        fontWeight: 600,
      }}>
        {nodeData.type}
      </div>

      {nodeData.decision_result && (
        <div style={{
          marginTop: 4,
          fontSize: 9,
          color: 'var(--warning)',
          fontWeight: 500,
        }}>
          → {nodeData.decision_result}
        </div>
      )}

      <div style={{
        fontSize: 9,
        marginTop: 6,
        padding: '2px 8px',
        borderRadius: 'var(--radius-sm)',
        background: statusBg[status] ?? 'rgba(82,82,91,0.12)',
        color: statusColor[status] ?? 'var(--text-tertiary)',
        fontWeight: 600,
        textTransform: 'capitalize',
        letterSpacing: '0.04em',
        display: 'inline-block',
      }}>
        {status.replace('_', ' ')}
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        style={{ background: borderColor, border: 'none', width: 8, height: 8 }}
      />
    </div>
  );
}

export default memo(ProjectNode);
