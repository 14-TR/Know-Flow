import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ReactFlow,
  Controls,
  Background,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  BackgroundVariant,
  Panel,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { getProject, updateProjectNodeStatus } from '../services/api';
import type { Project, ProjectNodeWithStatus, ProjectEdgeWithStatus } from '../types';
import ProjectNode from '../components/ProjectNode';
import NodeStatusPanel from '../components/NodeStatusPanel';

const nodeTypes = {
  project: ProjectNode,
};

export default function ProjectTracker() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState<ProjectNodeWithStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) loadProject(id);
  }, [id]);

  const loadProject = async (projectId: string) => {
    try {
      const data = await getProject(projectId);
      setProject(data);

      // Convert to React Flow format with project status
      const flowNodes: Node[] = (data.nodes || []).map((n) => ({
        id: n.id,
        type: 'project',
        position: { x: n.position_x, y: n.position_y },
        data: { ...n },
        draggable: false,
      }));

      const flowEdges: Edge[] = (data.edges || []).map((e: ProjectEdgeWithStatus) => ({
        id: e.id,
        source: e.source_node_id,
        target: e.target_node_id,
        label: e.label || undefined,
        type: 'smoothstep',
        animated: !e.traversed && e.label !== null,
        style: e.traversed
          ? { stroke: '#4caf50', strokeWidth: 2 }
          : undefined,
        data: { ...e },
      }));

      setNodes(flowNodes);
      setEdges(flowEdges);
    } catch (error) {
      console.error('Failed to load project:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      setSelectedNode(node.data as ProjectNodeWithStatus);
    },
    []
  );

  const handlePaneClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  const handleUpdateStatus = async (
    statusId: string,
    updates: {
      status?: string;
      decision_result?: string;
      form_data?: Record<string, unknown>;
      notes?: string;
    }
  ) => {
    if (!selectedNode || !id) return;

    try {
      await updateProjectNodeStatus(statusId, updates);

      // Reload project to get updated data
      await loadProject(id);

      // Keep the same node selected but with updated data
      if (project?.nodes) {
        const updatedNode = project.nodes.find((n) => n.id === selectedNode.id);
        if (updatedNode) setSelectedNode(updatedNode);
      }
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  const getProgress = () => {
    if (!project?.nodes) return 0;
    const completed = project.nodes.filter(
      (n) => n.project_status === 'complete' || n.project_status === 'skipped'
    ).length;
    return Math.round((completed / project.nodes.length) * 100);
  };

  if (loading) {
    return (
      <div className="main-content">
        <div className="empty-state">Loading...</div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="main-content">
        <div className="empty-state">
          <h3>Project not found</h3>
          <button className="btn btn-primary" onClick={() => navigate('/projects')}>
            Back to Projects
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
          onNodesChange={onNodesChange}
          onNodeClick={handleNodeClick}
          onPaneClick={handlePaneClick}
          nodeTypes={nodeTypes}
          fitView
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={true}
        >
          <Controls showInteractive={false} />
          <MiniMap />
          <Background variant={BackgroundVariant.Dots} gap={20} />

          <Panel position="top-left">
            <div className="panel toolbar" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '0.5rem' }}>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => navigate('/projects')}
                >
                  &larr; Back
                </button>
                <span style={{ fontWeight: 500 }}>{project.name}</span>
                <span className={`status-badge ${project.status}`}>
                  {project.status}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.75rem', color: '#666' }}>Progress:</span>
                <div className="progress-bar" style={{ flex: 1, width: 150 }}>
                  <div
                    className="progress-bar-fill"
                    style={{ width: `${getProgress()}%` }}
                  />
                </div>
                <span style={{ fontSize: '0.75rem', color: '#666' }}>
                  {getProgress()}%
                </span>
              </div>
            </div>
          </Panel>
        </ReactFlow>

        {selectedNode && (
          <NodeStatusPanel
            node={selectedNode}
            onUpdate={handleUpdateStatus}
            onClose={() => setSelectedNode(null)}
          />
        )}
      </div>
    </div>
  );
}
