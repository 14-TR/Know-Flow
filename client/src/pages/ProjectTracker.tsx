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

import {
  getProject,
  getProjectBrief,
  updateProject,
  updateProjectNodeStatus,
  type ProjectBrief,
} from '../services/api';
import type { Project, ProjectNodeWithStatus, ProjectEdgeWithStatus, ProjectNodeStatus } from '../types';
import ProjectNode from '../components/ProjectNode';
import NodeStatusPanel from '../components/NodeStatusPanel';
import Modal from '../components/Modal';
import { useToast } from '../components/Toast';
import './ProjectTracker.css';
import { PageSpinner } from '../components/LoadingSkeleton';

const nodeTypes = {
  project: ProjectNode,
};

const PROJECT_STATUSES = ['active', 'completed', 'archived'] as const;
type ProjectStatus = typeof PROJECT_STATUSES[number];

export default function ProjectTracker() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [project, setProject] = useState<Project | null>(null);
  const [projectBrief, setProjectBrief] = useState<ProjectBrief | null>(null);
  const [briefLoading, setBriefLoading] = useState(false);
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges] = useEdgesState<Edge>([]);
  const [selectedNode, setSelectedNode] = useState<ProjectNodeWithStatus | null>(null);
  const [loading, setLoading] = useState(true);

  // Edit project modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState('');
  const [editStatus, setEditStatus] = useState<ProjectStatus>('active');
  const [editSaving, setEditSaving] = useState(false);

  useEffect(() => {
    if (id) {
      void loadProject(id);
      void loadProjectBrief(id);
    }
  }, [id]);

  const loadProjectBrief = async (projectId: string) => {
    setBriefLoading(true);
    try {
      const data = await getProjectBrief(projectId);
      setProjectBrief(data);
    } catch (error) {
      console.error('Failed to load project brief:', error);
      setProjectBrief(null);
    } finally {
      setBriefLoading(false);
    }
  };

  const loadProject = async (projectId: string) => {
    try {
      const data = await getProject(projectId);
      setProject(data);

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
          ? { stroke: '#34d399', strokeWidth: 2 }
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
      setSelectedNode(node.data as unknown as ProjectNodeWithStatus);
    },
    []
  );

  const handlePaneClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  const handleUpdateStatus = async (
    statusId: string,
    updates: {
      status?: ProjectNodeStatus['status'];
      decision_result?: string;
      form_data?: Record<string, unknown>;
      notes?: string;
    }
  ) => {
    if (!selectedNode || !id) return;

    try {
      await updateProjectNodeStatus(statusId, updates);
      await Promise.all([loadProject(id), loadProjectBrief(id)]);

      if (project?.nodes) {
        const updatedNode = project.nodes.find((n) => n.id === selectedNode.id);
        if (updatedNode) setSelectedNode(updatedNode);
      }
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  const openEditModal = () => {
    if (!project) return;
    setEditName(project.name);
    setEditStatus((project.status as ProjectStatus) || 'active');
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!project || !id || !editName.trim()) return;
    setEditSaving(true);
    try {
      const updated = await updateProject(id, {
        name: editName.trim(),
        status: editStatus,
      });
      setProject({ ...project, ...updated });
      await loadProjectBrief(id);
      setShowEditModal(false);
      toast('Project updated', 'success');
    } catch (err) {
      toast('Failed to save: ' + (err as Error).message, 'error');
    } finally {
      setEditSaving(false);
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
    return <PageSpinner />;
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

  const progress = getProgress();

  return (
    <>
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
              <div className="panel toolbar tracker-toolbar">
                <div className="tracker-toolbar-row">
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => navigate('/projects')}
                  >
                    ← Back
                  </button>
                  <span className="tracker-project-name">{project.name}</span>
                  <span className={`status-badge ${project.status}`}>
                    {project.status}
                  </span>
                </div>
                <div className="tracker-progress-row">
                  <span className="tracker-progress-label">Progress</span>
                  <div className="tracker-progress-bar">
                    <div
                      className="tracker-progress-bar-fill"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <span className="tracker-progress-pct">{progress}%</span>
                </div>
                <div className="tracker-brief-card">
                  <div className="tracker-brief-header">
                    <span className="tracker-brief-kicker">Project brief</span>
                    {briefLoading && <span className="tracker-brief-loading">Refreshing…</span>}
                  </div>
                  <p className="tracker-brief-summary">
                    {projectBrief?.summary || 'No brief yet.'}
                  </p>
                  {projectBrief?.suggested_next_action && (
                    <div className="tracker-brief-next">
                      <span className="tracker-brief-section-label">Next best action</span>
                      <strong>{projectBrief.suggested_next_action.title}</strong>
                      <span>{projectBrief.suggested_next_action.rationale}</span>
                    </div>
                  )}
                  {!!projectBrief?.blockers.length && (
                    <div className="tracker-brief-list-block">
                      <span className="tracker-brief-section-label">Watch-outs</span>
                      <ul>
                        {projectBrief.blockers.map((blocker) => (
                          <li key={blocker}>{blocker}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {!!projectBrief?.upcoming.length && (
                    <div className="tracker-brief-list-block">
                      <span className="tracker-brief-section-label">Upcoming</span>
                      <ul>
                        {projectBrief.upcoming.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                <div className="tracker-toolbar-row tracker-action-row">
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={openEditModal}
                    title="Edit project name and status"
                  >
                    ✏️ Edit
                  </button>
                  <button
                    className="btn btn-secondary btn-sm tracker-calendar-btn"
                    onClick={() => navigate(`/project/${id}/calendar`)}
                    title="Open project calendar"
                  >
                    📅 Calendar
                  </button>
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

      {showEditModal && (
        <Modal title="Edit Project" onClose={() => setShowEditModal(false)}>
          <div className="form-group">
            <label>Project Name</label>
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="Project name"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit()}
            />
          </div>
          <div className="form-group">
            <label>Status</label>
            <select
              value={editStatus}
              onChange={(e) => setEditStatus(e.target.value as ProjectStatus)}
            >
              {PROJECT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </option>
              ))}
            </select>
          </div>
          <div className="form-actions">
            <button
              className="btn btn-secondary"
              onClick={() => setShowEditModal(false)}
              disabled={editSaving}
            >
              Cancel
            </button>
            <button
              className="btn btn-primary"
              onClick={handleSaveEdit}
              disabled={editSaving || !editName.trim()}
            >
              {editSaving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
