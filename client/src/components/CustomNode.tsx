import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { ProcessNode } from '../types';

function CustomNode({ data, selected }: NodeProps) {
  const nodeData = data as unknown as ProcessNode;

  return (
    <div
      className={`custom-node ${nodeData.type} ${selected ? 'selected' : ''}`}
    >
      <Handle type="target" position={Position.Top} />
      <div className="node-title">{nodeData.title}</div>
      <div className="node-type">{nodeData.type}</div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}

export default memo(CustomNode);
