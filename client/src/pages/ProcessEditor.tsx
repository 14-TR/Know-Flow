import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ReactFlow,
  Controls,
  Background,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type Connection,
  type NodeChange,
  type EdgeChange,
  BackgroundVariant,
  Panel,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import {
  getProcess,
  createNode,
  updateNode,
  updateNodePosition,
  deleteNode,
  createEdge,
  updateEdge,
  deleteEdge,
} from '../services/api';
import type { Process, ProcessNode, ProcessEdge } from '../types';
import CustomNode from '../components/CustomNode';
import NodeEditorPanel from '../components/NodeEditorPanel';
import EdgeEditorPanel from '../components/EdgeEditorPanel';

const nodeTypes = {
  custom: CustomNode,
};

export default function ProcessEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [process, setProcess] = useState<Process | null>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState<ProcessNode | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<ProcessEdge | null>(null);
  const [loading, setLoading] = useState(true);
  const saveTimeout = useRef<number | null>(null);

  useEffect(() => {
    if (id) loadProcess(id);
  }, [id]);

  const loadProcess = async (processId: string) => {
    try {
      const data = await getProcess(processId);
      setProcess(data);

      // Convert to React Flow format
      const flowNodes: Node[] = (data.nodes || []).map((n) => ({
        id: n.id,
        type: 'custom',
        position: { x: n.position_x, y: n.position_y },
        data: { ...n },
      }));

      const flowEdges: Edge[] = (data.edges || []).map((e) => ({
        id: e.id,
        source: e.source_node_id,
        target: e.target_node_id,
        label: e.label || undefined,
        type: 'smoothstep',
        animated: false,
        data: { ...e },
      }));

      setNodes(flowNodes);
      setEdges(flowEdges);
    } catch (error) {
      console.error('Failed to load process:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNodesChange = useCallback(
    (changes: NodeChange<Node>[]) => {
      onNodesChange(changes);

      // Handle position changes
      changes.forEach((change) => {
        if (change.type === 'position' && change.position && change.dragging === false) {
          // Debounce position saves
          if (saveTimeout.current) clearTimeout(saveTimeout.current);
          saveTimeout.current = window.setTimeout(() => {
            updateNodePosition(change.id, change.position!.x, change.position!.y);
          }, 300);
        }
      });
    },
    [onNodesChange]
  );

  const handleEdgesChange = useCallback(
    (changes: EdgeChange<Edge>[]) => {
      onEdgesChange(changes);
    },
    [onEdgesChange]
  );

  const handleConnect = useCallback(
    async (connection: Connection) => {
      if (!id || !connection.source || !connection.target) return;

      try {
        const newEdge = await createEdge({
          process_id: id,
          source_node_id: connection.source,
          target_node_id: connection.target,
        });

        setEdges((eds) =>
          addEdge(
            {
              ...connection,
              id: newEdge.id,
              type: 'smoothstep',
              data: { ...newEdge },
            },
            eds
          )
        );
      } catch (error) {
        console.error('Failed to create edge:', error);
      }
    },
    [id, setEdges]
  );

  const handleNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      setSelectedNode(node.data as ProcessNode);
      setSelectedEdge(null);
    },
    []
  );

  const handleEdgeClick = useCallback(
    (_event: React.MouseEvent, edge: Edge) => {
      setSelectedEdge(edge.data as ProcessEdge);
      setSelectedNode(null);
    },
    []
  );

  const handlePaneClick = useCallback(() => {
    setSelectedNode(null);
    setSelectedEdge(null);
  }, []);

  const handleAddNode = async (type: ProcessNode['type']) => {
    if (!id) return;

    try {
      const newNode = await createNode({
        process_id: id,
        type,
        title: `New ${type.charAt(0).toUpperCase() + type.slice(1)}`,
        position_x: 250,
        position_y: 100 + nodes.length * 100,
      });

      setNodes((nds) => [
        ...nds,
        {
          id: newNode.id,
          type: 'custom',
          position: { x: newNode.position_x, y: newNode.position_y },
          data: { ...newNode },
        },
      ]);

      setSelectedNode(newNode);
    } catch (error) {
      console.error('Failed to create node:', error);
    }
  };

  const handleUpdateNode = async (nodeData: Partial<ProcessNode>) => {
    if (!selectedNode) return;

    try {
      const updated = await updateNode(selectedNode.id, nodeData);

      setNodes((nds) =>
        nds.map((n) =>
          n.id === updated.id
            ? { ...n, data: { ...updated } }
            : n
        )
      );

      setSelectedNode(updated);
    } catch (error) {
      console.error('Failed to update node:', error);
    }
  };

  const handleDeleteNode = async () => {
    if (!selectedNode) return;

    try {
      await deleteNode(selectedNode.id);
      setNodes((nds) => nds.filter((n) => n.id !== selectedNode.id));
      setEdges((eds) =>
        eds.filter(
          (e) => e.source !== selectedNode.id && e.target !== selectedNode.id
        )
      );
      setSelectedNode(null);
    } catch (error) {
      console.error('Failed to delete node:', error);
    }
  };

  const handleUpdateEdge = async (edgeData: Partial<ProcessEdge>) => {
    if (!selectedEdge) return;

    try {
      const updated = await updateEdge(selectedEdge.id, edgeData);

      setEdges((eds) =>
        eds.map((e) =>
          e.id === updated.id
            ? { ...e, label: updated.label || undefined, data: { ...updated } }
            : e
        )
      );

      setSelectedEdge(updated);
    } catch (error) {
      console.error('Failed to update edge:', error);
    }
  };

  const handleDeleteEdge = async () => {
    if (!selectedEdge) return;

    try {
      await deleteEdge(selectedEdge.id);
      setEdges((eds) => eds.filter((e) => e.id !== selectedEdge.id));
      setSelectedEdge(null);
    } catch (error) {
      console.error('Failed to delete edge:', error);
    }
  };

  if (loading) {
    return (
      <div className="main-content">
        <div className="empty-state">Loading...</div>
      </div>
    );
  }

  if (!process) {
    return (
      <div className="main-content">
        <div className="empty-state">
          <h3>Process not found</h3>
          <button className="btn btn-primary" onClick={() => navigate('/')}>
            Back to Processes
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="main-content">
      <div className="graph-container">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={handleNodesChange}
          onEdgesChange={handleEdgesChange}
          onConnect={handleConnect}
          onNodeClick={handleNodeClick}
          onEdgeClick={handleEdgeClick}
          onPaneClick={handlePaneClick}
          nodeTypes={nodeTypes}
          fitView
          snapToGrid
          snapGrid={[10, 10]}
        >
          <Controls />
          <MiniMap />
          <Background variant={BackgroundVariant.Dots} gap={20} />

          <Panel position="top-left">
            <div className="panel toolbar">
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => navigate('/')}
              >
                &larr; Back
              </button>
              <span style={{ padding: '0.25rem 0.5rem', fontWeight: 500 }}>
                {process.name}
              </span>
              <div style={{ borderLeft: '1px solid #ddd', height: 24, margin: '0 0.5rem' }} />
              <button
                className="btn btn-success btn-sm"
                onClick={() => handleAddNode('start')}
              >
                + Start
              </button>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => handleAddNode('task')}
              >
                + Task
              </button>
              <button
                className="btn btn-sm"
                style={{ background: '#ff9800', color: 'white' }}
                onClick={() => handleAddNode('decision')}
              >
                + Decision
              </button>
              <button
                className="btn btn-danger btn-sm"
                onClick={() => handleAddNode('end')}
              >
                + End
              </button>
            </div>
          </Panel>
        </ReactFlow>

        {selectedNode && (
          <NodeEditorPanel
            node={selectedNode}
            onUpdate={handleUpdateNode}
            onDelete={handleDeleteNode}
            onClose={() => setSelectedNode(null)}
          />
        )}

        {selectedEdge && (
          <EdgeEditorPanel
            edge={selectedEdge}
            onUpdate={handleUpdateEdge}
            onDelete={handleDeleteEdge}
            onClose={() => setSelectedEdge(null)}
          />
        )}
      </div>
    </div>
  );
}
