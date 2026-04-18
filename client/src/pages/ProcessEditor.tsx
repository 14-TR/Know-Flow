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
  useReactFlow,
  ReactFlowProvider,
  type Node,
  type Edge,
  type Connection,
  type NodeChange,
  type EdgeChange,
  BackgroundVariant,
  Panel,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import './ProcessEditor.css';

import {
  getProcess,
  createNode,
  updateNode,
  updateNodePosition,
  deleteNode,
  createEdge,
  updateEdge,
  updateEdgeWaypoints,
  deleteEdge,
} from '../services/api';
import type { Process, ProcessNode, ProcessEdge, Waypoint } from '../types';
import CustomNode from '../components/CustomNode';
import EditableEdge from '../components/EditableEdge';
import NodeEditorPanel from '../components/NodeEditorPanel';
import EdgeEditorPanel from '../components/EdgeEditorPanel';
import { PageSpinner } from '../components/LoadingSkeleton';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';

const nodeTypes = {
  custom: CustomNode,
};

const edgeTypes = {
  editable: EditableEdge,
};

// Layout algorithm types
type LayoutDirection = 'vertical' | 'horizontal';

// Simple layout algorithm - arranges nodes by depth from start nodes
function calculateLayout(
  nodes: Node[],
  edges: Edge[],
  direction: LayoutDirection
): Node[] {
  if (nodes.length === 0) return nodes;

  // Build adjacency map
  const outgoing = new Map<string, string[]>();
  const incoming = new Map<string, string[]>();

  nodes.forEach((n) => {
    outgoing.set(n.id, []);
    incoming.set(n.id, []);
  });

  edges.forEach((e) => {
    outgoing.get(e.source)?.push(e.target);
    incoming.get(e.target)?.push(e.source);
  });

  // Find start nodes (no incoming edges or type='start')
  const startNodes = nodes.filter(
    (n) => incoming.get(n.id)?.length === 0 || n.data?.type === 'start'
  );

  // BFS to calculate depth (handles cycles by tracking visited nodes)
  const depths = new Map<string, number>();
  const visited = new Set<string>();
  const queue: { id: string; depth: number }[] = [];

  startNodes.forEach((n) => {
    queue.push({ id: n.id, depth: 0 });
    depths.set(n.id, 0);
  });

  while (queue.length > 0) {
    const { id, depth } = queue.shift()!;

    // Skip if already fully processed (prevents infinite loops from cycles)
    if (visited.has(id)) continue;
    visited.add(id);

    const children = outgoing.get(id) || [];

    children.forEach((childId) => {
      const existingDepth = depths.get(childId);
      if (existingDepth === undefined) {
        depths.set(childId, depth + 1);
        queue.push({ id: childId, depth: depth + 1 });
      }
    });
  }

  // Handle disconnected nodes
  nodes.forEach((n) => {
    if (!depths.has(n.id)) {
      depths.set(n.id, 0);
    }
  });

  // Group nodes by depth
  const nodesByDepth = new Map<number, Node[]>();
  nodes.forEach((n) => {
    const d = depths.get(n.id) || 0;
    if (!nodesByDepth.has(d)) nodesByDepth.set(d, []);
    nodesByDepth.get(d)!.push(n);
  });

  // Position nodes
  const spacing = { x: 250, y: 150 };
  const startOffset = { x: 100, y: 100 };

  return nodes.map((n) => {
    const depth = depths.get(n.id) || 0;
    const nodesAtDepth = nodesByDepth.get(depth) || [];
    const indexAtDepth = nodesAtDepth.indexOf(n);
    const countAtDepth = nodesAtDepth.length;

    // Center nodes at each depth
    const offset = ((countAtDepth - 1) / 2) * spacing[direction === 'vertical' ? 'x' : 'y'];

    let x: number, y: number;
    if (direction === 'vertical') {
      x = startOffset.x + indexAtDepth * spacing.x - offset + (countAtDepth - 1) * spacing.x / 2;
      y = startOffset.y + depth * spacing.y;
    } else {
      x = startOffset.x + depth * spacing.x;
      y = startOffset.y + indexAtDepth * spacing.y - offset + (countAtDepth - 1) * spacing.y / 2;
    }

    return {
      ...n,
      position: { x, y },
    };
  });
}

function ProcessEditorInner() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { fitView } = useReactFlow();
  const [process, setProcess] = useState<Process | null>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [selectedNode, setSelectedNode] = useState<ProcessNode | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<ProcessEdge | null>(null);
  const [loading, setLoading] = useState(true);
  const saveTimeout = useRef<number | null>(null);
  const waypointsSaveTimeout = useRef<number | null>(null);

  // Handler for waypoint changes from EditableEdge
  const handleWaypointsChange = useCallback(
    (edgeId: string, waypoints: Waypoint[]) => {
      // Debounce save to backend
      if (waypointsSaveTimeout.current) clearTimeout(waypointsSaveTimeout.current);
      waypointsSaveTimeout.current = window.setTimeout(() => {
        updateEdgeWaypoints(edgeId, waypoints).catch((error) => {
          console.error('Failed to save waypoints:', error);
        });
      }, 300);
    },
    []
  );

  const loadProcess = useCallback(async (processId: string) => {
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
        type: 'editable',
        animated: false,
        data: { ...e, onWaypointsChange: handleWaypointsChange },
      }));

      setNodes(flowNodes);
      setEdges(flowEdges);

      // Fit view after loading
      setTimeout(() => {
        fitView({ padding: 0.2, duration: 200 });
      }, 100);
    } catch (error) {
      console.error('Failed to load process:', error);
    } finally {
      setLoading(false);
    }
  }, [setNodes, setEdges, handleWaypointsChange, fitView]);

  // Layout functions
  const handleAutoLayout = useCallback(
    async (direction: LayoutDirection) => {
      const layoutedNodes = calculateLayout(nodes, edges, direction);
      setNodes(layoutedNodes);

      // Clear all waypoints from edges since node positions changed
      setEdges((eds) =>
        eds.map((edge) => ({
          ...edge,
          data: { ...edge.data, waypoints: [] },
        }))
      );

      // Save all positions to backend in parallel
      try {
        await Promise.all([
          ...layoutedNodes.map((node) =>
            updateNodePosition(node.id, node.position.x, node.position.y)
          ),
          // Clear waypoints in the database
          ...edges.map((edge) => updateEdgeWaypoints(edge.id, [])),
        ]);
      } catch (error) {
        console.error('Failed to save node positions:', error);
      }

      // Fit view after layout
      setTimeout(() => fitView({ padding: 0.2 }), 50);
    },
    [nodes, edges, setNodes, setEdges, fitView]
  );

  const handleFitView = useCallback(() => {
    // Small delay to ensure DOM is ready
    requestAnimationFrame(() => {
      fitView({ padding: 0.2, duration: 300 });
    });
  }, [fitView]);

  const handleReset = useCallback(async () => {
    if (id) {
      setLoading(true);
      setSelectedNode(null);
      setSelectedEdge(null);

      // Load the process
      await loadProcess(id);

      // Clear all waypoints from edges
      setEdges((eds) =>
        eds.map((edge) => ({
          ...edge,
          data: { ...edge.data, waypoints: [] },
        }))
      );

      // Clear waypoints in the database
      try {
        await Promise.all(
          edges.map((edge) => updateEdgeWaypoints(edge.id, []))
        );
      } catch (error) {
        console.error('Failed to clear waypoints:', error);
      }
    }
  }, [id, loadProcess, edges, setEdges]);

  useEffect(() => {
    if (id) loadProcess(id);
  }, [id, loadProcess]);

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
              type: 'editable',
              data: { ...newEdge, onWaypointsChange: handleWaypointsChange },
            },
            eds
          )
        );
      } catch (error) {
        console.error('Failed to create edge:', error);
      }
    },
    [id, setEdges, handleWaypointsChange]
  );

  const handleNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      setSelectedNode(node.data as unknown as ProcessNode);
      setSelectedEdge(null);
    },
    []
  );

  const handleEdgeClick = useCallback(
    (_event: React.MouseEvent, edge: Edge) => {
      setSelectedEdge(edge.data as unknown as ProcessEdge);
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

  // Keyboard shortcuts for editor power users
  useKeyboardShortcuts(
    [
      {
        key: 'Delete',
        description: 'Delete selected node or edge',
        group: 'Editor',
        handler: () => {
          if (selectedNode) handleDeleteNode();
          else if (selectedEdge) handleDeleteEdge();
        },
      },
      {
        key: 'Backspace',
        description: 'Delete selected node or edge',
        group: 'Editor',
        handler: () => {
          if (selectedNode) handleDeleteNode();
          else if (selectedEdge) handleDeleteEdge();
        },
      },
      {
        key: 'Escape',
        description: 'Deselect / close panel',
        group: 'Editor',
        handler: () => {
          setSelectedNode(null);
          setSelectedEdge(null);
        },
      },
      {
        key: 'f',
        description: 'Fit view',
        group: 'Editor',
        handler: handleFitView,
      },
      {
        key: 'l',
        meta: true,
        description: 'Auto-layout (vertical)',
        group: 'Editor',
        handler: () => handleAutoLayout('vertical'),
      },
      {
        key: 'l',
        meta: true,
        shift: true,
        description: 'Auto-layout (horizontal)',
        group: 'Editor',
        handler: () => handleAutoLayout('horizontal'),
      },
    ],
    false,
  );

  if (loading) {
    return <PageSpinner />;
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

  const selectionSummary = selectedNode
    ? `${selectedNode.type} node selected`
    : selectedEdge
      ? 'Connection selected'
      : 'Canvas ready';
  const explorerTarget = selectedNode
    ? `/explorer?pid=${process.id}&ws=${selectedNode.id}&view=neighborhood&source=process-editor`
    : `/explorer?pid=${process.id}&view=search&source=process-editor`;

  return (
    <div className="main-content">
      <div className="graph-container process-editor-shell">
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
          edgeTypes={edgeTypes}
          edgesFocusable
          edgesReconnectable
          snapToGrid
          snapGrid={[10, 10]}
          defaultEdgeOptions={{ type: 'editable' }}
          deleteKeyCode={null}
        >
          <Controls />
          <MiniMap />
          <Background variant={BackgroundVariant.Dots} gap={20} />

          <Panel position="top-left">
            <div className="panel toolbar process-command-bar">
              <div className="process-command-bar__header">
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => navigate('/')}
                >
                  &larr; Back
                </button>
                <div className="process-command-bar__title-group">
                  <span className="toolbar-eyebrow">Process editor</span>
                  <span className="toolbar-process-name">{process.name}</span>
                </div>
                <div className="toolbar-status-cluster">
                  <span className="toolbar-status-pill">{nodes.length} nodes</span>
                  <span className="toolbar-status-pill">{edges.length} connections</span>
                </div>
              </div>

              <div className="process-command-bar__row">
                <div className="toolbar-section">
                  <span className="toolbar-label">Build</span>
                  <div className="toolbar-node-actions">
                    <button
                      className="btn btn-sm btn-node-start"
                      onClick={() => handleAddNode('start')}
                    >
                      + Start
                    </button>
                    <button
                      className="btn btn-sm btn-node-task"
                      onClick={() => handleAddNode('task')}
                    >
                      + Task
                    </button>
                    <button
                      className="btn btn-sm btn-node-decision"
                      onClick={() => handleAddNode('decision')}
                    >
                      + Decision
                    </button>
                    <button
                      className="btn btn-sm btn-node-end"
                      onClick={() => handleAddNode('end')}
                    >
                      + End
                    </button>
                  </div>
                </div>

                <div className="toolbar-divider" />

                <div className="toolbar-section toolbar-section--status">
                  <span className="toolbar-label">Selection</span>
                  <span className="toolbar-selection-summary">{selectionSummary}</span>
                </div>
              </div>
            </div>
          </Panel>

          <Panel position="top-right">
            <div className="panel toolbar layout-toolbar command-actions-panel">
              <div className="toolbar-section">
                <span className="toolbar-label">Layout</span>
                <div className="command-action-grid">
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleAutoLayout('vertical')}
                    title="Arrange nodes top to bottom"
                  >
                    ↓ Vertical
                  </button>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleAutoLayout('horizontal')}
                    title="Arrange nodes left to right"
                  >
                    → Horizontal
                  </button>
                </div>
              </div>
              <div className="toolbar-divider toolbar-divider--horizontal" />
              <div className="toolbar-section">
                <span className="toolbar-label">View</span>
                <div className="command-action-grid">
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={handleFitView}
                    title="Fit all nodes in view"
                  >
                    ⊡ Fit
                  </button>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={handleReset}
                    title="Reload graph from server"
                  >
                    ↺ Reset
                  </button>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => navigate(explorerTarget)}
                    title="Open this process in Graph Explorer"
                  >
                    ↗ Explorer
                  </button>
                </div>
              </div>
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

// Wrapper component with ReactFlowProvider
export default function ProcessEditor() {
  return (
    <ReactFlowProvider>
      <ProcessEditorInner />
    </ReactFlowProvider>
  );
}
