import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { ProjectNodeWithStatus } from '../types';

function ProjectNode({ data, selected }: NodeProps) {
  const nodeData = data as unknown as ProjectNodeWithStatus;
  const status = nodeData.project_status || 'not_started';

  const getNodeStyle = () => {
    const baseStyle: Record<string, string | number> = {};

    switch (nodeData.type) {
      case 'start':
        baseStyle.background = '#e8f5e9';
        baseStyle.borderColor = '#4caf50';
        baseStyle.borderRadius = '20px';
        break;
      case 'end':
        baseStyle.background = '#ffebee';
        baseStyle.borderColor = '#f44336';
        baseStyle.borderRadius = '20px';
        break;
      case 'decision':
        baseStyle.background = '#fff8e1';
        baseStyle.borderColor = '#ff9800';
        break;
      case 'task':
      default:
        baseStyle.background = '#e3f2fd';
        baseStyle.borderColor = '#2196f3';
        break;
    }

    // Apply status-based styles
    if (status === 'not_started') {
      baseStyle.opacity = 0.6;
    } else if (status === 'in_progress') {
      baseStyle.boxShadow = '0 0 0 3px rgba(255, 152, 0, 0.5)';
    } else if (status === 'complete') {
      baseStyle.opacity = 1;
    } else if (status === 'skipped') {
      baseStyle.opacity = 0.4;
      baseStyle.textDecoration = 'line-through';
    }

    return baseStyle;
  };

  return (
    <div
      style={{
        position: 'relative',
        padding: nodeData.type === 'decision' ? '15px 25px' : '10px 15px',
        border: '2px solid',
        borderRadius: '8px',
        minWidth: 150,
        textAlign: 'center',
        ...getNodeStyle(),
        boxShadow: selected
          ? '0 0 0 3px rgba(33, 150, 243, 0.5)'
          : (getNodeStyle().boxShadow as string | undefined),
      }}
    >
      <Handle
        type="target"
        position={Position.Top}
        style={{ background: '#555' }}
      />
      <div style={{ fontWeight: 600, fontSize: 12 }}>
        {nodeData.title}
      </div>
      <div
        style={{ fontSize: 10, textTransform: 'uppercase', color: '#666', marginTop: 2 }}
      >
        {nodeData.type}
      </div>
      {nodeData.decision_result && (
        <div className="decision-label" style={{ marginTop: 4 }}>
          {nodeData.decision_result}
        </div>
      )}
      <div
        style={{
          fontSize: 9,
          marginTop: 4,
          padding: '2px 6px',
          borderRadius: 3,
          background:
            status === 'complete'
              ? '#4caf50'
              : status === 'in_progress'
              ? '#ff9800'
              : status === 'skipped'
              ? '#9e9e9e'
              : '#e0e0e0',
          color: status === 'not_started' ? '#666' : 'white',
        }}
      >
        {status.replace('_', ' ')}
      </div>
      {status === 'complete' && (
        <div
          style={{
            position: 'absolute',
            top: -8,
            right: -8,
            background: '#4caf50',
            color: 'white',
            width: 20,
            height: 20,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 12,
          }}
        >
          ✓
        </div>
      )}
      <Handle
        type="source"
        position={Position.Bottom}
        style={{ background: '#555' }}
      />
    </div>
  );
}

export default memo(ProjectNode);
