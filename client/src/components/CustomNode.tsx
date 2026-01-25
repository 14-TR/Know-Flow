import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { ProcessNode } from '../types';

function CustomNode({ data, selected }: NodeProps) {
  const nodeData = data as ProcessNode;

  const getNodeStyle = () => {
    switch (nodeData.type) {
      case 'start':
        return {
          background: '#e8f5e9',
          borderColor: '#4caf50',
          borderRadius: '20px',
        };
      case 'end':
        return {
          background: '#ffebee',
          borderColor: '#f44336',
          borderRadius: '20px',
        };
      case 'decision':
        // Decision nodes use CSS ::before pseudo-element for diamond shape
        // to avoid clipping the handles with clip-path
        return {
          background: 'transparent',
          borderColor: 'transparent',
        };
      case 'task':
      default:
        return {
          background: '#e3f2fd',
          borderColor: '#2196f3',
        };
    }
  };

  return (
    <div
      className={`custom-node ${nodeData.type} ${selected ? 'selected' : ''}`}
      style={{
        ...getNodeStyle(),
        padding: nodeData.type === 'decision' ? '15px 25px' : '10px 15px',
        border: nodeData.type === 'decision' ? 'none' : `2px solid ${getNodeStyle().borderColor}`,
        borderRadius: getNodeStyle().borderRadius || '8px',
        minWidth: 150,
        textAlign: 'center',
        background: getNodeStyle().background,
      }}
    >
      <Handle
        type="target"
        position={Position.Top}
        style={{ background: '#555' }}
      />
      <div className="node-title" style={{ fontWeight: 600, fontSize: 12 }}>
        {nodeData.title}
      </div>
      <div
        className="node-type"
        style={{ fontSize: 10, textTransform: 'uppercase', color: '#666', marginTop: 2 }}
      >
        {nodeData.type}
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        style={{ background: '#555' }}
      />
    </div>
  );
}

export default memo(CustomNode);
