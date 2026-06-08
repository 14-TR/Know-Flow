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
type HighlightTone = 'success' | 'accent' | 'warning' | 'muted';

const statusCopy: Record<ProjectStatus, { label: string; detail: string }> = {
  active: {
    label: 'Live project',
    detail: 'Actively moving through the current working set.',
  },
  completed: {
    label: 'Wrapped',
    detail: 'Execution is complete and the graph is ready for review.',
  },
  archived: {
    label: 'Archived',
    detail: 'Reference state preserved for future lookups.',
  },
};

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

  const loadProject = async (projectId: string): Promise<Project | null> => {
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
        style: e.traversed ? { stroke: '#34d399', strokeWidth: 2 } : undefined,
        data: { ...e },
      }));

      setNodes(flowNodes);
      setEdges(flowEdges);
      return data;
    } catch (error) {
      console.error('Failed to load project:', error);
      toast('Failed to load project. Please refresh and try again.', 'error');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const handleNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNode(node.data as unknown as ProjectNodeWithStatus);
  }, []);

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
      const [freshProject] = await Promise.all([loadProject(id), loadProjectBrief(id)]);

      if (freshProject?.nodes) {
        const updatedNode = freshProject.nodes.find((n) => n.id === selectedNode.id);
        if (updatedNode) setSelectedNode(updatedNode);
      }

      const statusLabel = updates.status ? updates.status.replace('_', ' ') : 'saved';
      toast(`Node ${statusLabel}`, 'success');
    } catch (error) {
      console.error('Failed to update status:', error);
      toast('Failed to save changes. Please try again.', 'error');
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
    if (!project?.nodes?.length) return 0;
    const completed = project.nodes.filter(
      (n) => n.project_status === 'complete' || n.project_status === 'skipped'
    ).length;
    return Math.round((completed / project.nodes.length) * 100);
  };

  const getStatusLabel = (status: string) =>
    status
      .split('_')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');

  const getExecutionPulse = (brief: ProjectBrief | null, progress: number) => {
    if (!brief?.stats) {
      return {
        label: 'Needs context',
        tone: 'muted' as HighlightTone,
        detail: 'Load a brief to understand risk, pace, and next steps.',
      };
    }

    if (brief.stats.blocked > 0) {
      return {
        label: 'Attention needed',
        tone: 'warning' as HighlightTone,
        detail: `${brief.stats.blocked} blocker${brief.stats.blocked === 1 ? '' : 's'} called out in the brief.`,
      };
    }

    if (progress >= 100) {
      return {
        label: 'Ready to wrap',
        tone: 'success' as HighlightTone,
        detail: 'All tracked nodes are complete or intentionally skipped.',
      };
    }

    if (brief.stats.in_progress > 0) {
      return {
        label: 'Momentum',
        tone: 'accent' as HighlightTone,
        detail: `${brief.stats.in_progress} node${brief.stats.in_progress === 1 ? '' : 's'} actively moving.`,
      };
    }

    return {
      label: 'Queued up',
      tone: 'muted' as HighlightTone,
      detail: 'Nothing is actively moving yet — good time to kick off the next node.',
    };
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
  const briefStats = projectBrief?.stats;
  const currentNodes = project?.currentNodes || [];
  const workingSetParam = currentNodes.map((node) => node.node_id).join(',');
  const explorerTarget = workingSetParam
    ? `/explorer?pid=${project.process_id}&ws=${workingSetParam}&view=context&source=project-tracker`
    : `/explorer?pid=${project.process_id}&view=search&source=project-tracker`;
  const totalNodes = briefStats?.total ?? project.total_nodes ?? project.nodes?.length ?? 0;
  const completedNodes = briefStats?.completed ?? project.completed_nodes ?? 0;
  const blockedNodes = briefStats?.blocked ?? 0;
  const statusTone = project.status as ProjectStatus;
  const pulse = getExecutionPulse(projectBrief, progress);
  const completionLabel = totalNodes ? `${completedNodes} of ${totalNodes}` : 'Waiting for graph data';
  const trackerHighlights = [
    {
      label: 'Completed',
      value: completionLabel,
      tone: 'success' as HighlightTone,
      detail: totalNodes ? `${progress}% of the path is done.` : 'No nodes loaded yet.',
    },
    {
      label: 'Current Focus',
      value: currentNodes.length ? `${currentNodes.length} live` : 'Queue clear',
      tone: currentNodes.length ? ('accent' as HighlightTone) : ('muted' as HighlightTone),
      detail: currentNodes.length
        ? 'These nodes are the active working set.'
        : 'No active nodes selected right now.',
    },
    {
      label: 'Watch-outs',
      value: blockedNodes ? `${blockedNodes} flagged` : 'All clear',
      tone: blockedNodes ? ('warning' as HighlightTone) : ('muted' as HighlightTone),
      detail: blockedNodes
        ? 'The brief found blockers that could slow execution.'
        : 'No blockers called out in the current brief.',
    },
    {
      label: 'Pulse',
      value: pulse.label,
      tone: pulse.tone,
      detail: pulse.detail,
    },
  ];
  const nodeLegend = [
    { label: 'Complete', tone: 'success' },
    { label: 'In Progress', tone: 'warning' },
    { label: 'Not Started', tone: 'muted' },
    { label: 'Selected Node', tone: 'accent' },
  ] as const;

  return (
    <>
      <div className="main-content">
        <div className="graph-container tracker-shell">
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
                <div className="tracker-toolbar-row tracker-toolbar-topline">
                  <button className="btn btn-secondary btn-sm" onClick={() => navigate('/projects')}>
                    ← Back
                  </button>
                  <span className="tracker-process-chip">{project.process_name || 'Process graph'}</span>
                  <span className={`status-badge ${project.status}`}>{project.status}</span>
                </div>

                <div className="tracker-command-card">
                  <div className="tracker-command-header">
                    <div>
                      <span className="tracker-brief-kicker">Project tracker</span>
                      <h1 className="tracker-command-title">{project.name}</h1>
                    </div>
                    {briefLoading && <span className="tracker-brief-loading">Refreshing…</span>}
                  </div>

                  <p className="tracker-command-summary">
                    {projectBrief?.summary || 'This graph is ready for planning, execution, and status updates.'}
                  </p>

                  <div className="tracker-progress-block">
                    <div className="tracker-progress-row">
                      <span className="tracker-progress-label">Completion</span>
                      <span className="tracker-progress-caption">{completionLabel}</span>
                      <span className="tracker-progress-pct">{progress}%</span>
                    </div>
                    <div className="tracker-progress-bar tracker-progress-bar-lg">
                      <div className="tracker-progress-bar-fill" style={{ width: `${progress}%` }} />
                    </div>
                    <div className="tracker-status-line">
                      <span className={`tracker-status-pill tracker-status-pill-${statusTone}`}>{statusCopy[statusTone].label}</span>
                      <span>{statusCopy[statusTone].detail}</span>
                    </div>
                  </div>
                </div>

                <div className="tracker-highlight-grid">
                  {trackerHighlights.map((highlight) => (
                    <div
                      key={highlight.label}
                      className={`tracker-highlight-card tracker-highlight-${highlight.tone}`}
                    >
                      <span>{highlight.label}</span>
                      <strong>{highlight.value}</strong>
                      <p>{highlight.detail}</p>
                    </div>
                  ))}
                </div>

                {projectBrief?.suggested_next_action && (
                  <div className="tracker-brief-next tracker-glass-section tracker-next-action-card">
                    <div className="tracker-brief-section-heading">
                      <span className="tracker-brief-section-label">Next best action</span>
                      <span className="tracker-next-action-type">
                        {getStatusLabel(projectBrief.suggested_next_action.type)}
                      </span>
                    </div>
                    <strong>{projectBrief.suggested_next_action.title}</strong>
                    <span>{projectBrief.suggested_next_action.rationale}</span>
                  </div>
                )}

                <div className="tracker-split-grid">
                  <div className="tracker-brief-list-block tracker-glass-section">
                    <div className="tracker-brief-section-heading">
                      <span className="tracker-brief-section-label">Current focus</span>
                      <span className="tracker-section-meta">
                        {currentNodes.length ? `${currentNodes.length} node${currentNodes.length === 1 ? '' : 's'}` : 'No active nodes'}
                      </span>
                    </div>
                    {currentNodes.length ? (
                      <ul className="tracker-chip-list">
                        {currentNodes.map((node) => (
                          <li key={node.node_id} className="tracker-focus-chip">
                            <strong>{node.node_title}</strong>
                            <span>{getStatusLabel(node.status)}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="tracker-empty-copy">
                        Start a node from the side panel to build a fresh working set.
                      </p>
                    )}
                  </div>

                  <div className="tracker-brief-list-block tracker-glass-section">
                    <div className="tracker-brief-section-heading">
                      <span className="tracker-brief-section-label">Graph guide</span>
                      <span className="tracker-section-meta">How to read this map</span>
                    </div>
                    <div className="tracker-legend-grid">
                      {nodeLegend.map((item) => (
                        <div key={item.label} className="tracker-legend-item">
                          <span className={`tracker-legend-dot tracker-legend-dot-${item.tone}`} />
                          <span>{item.label}</span>
                        </div>
                      ))}
                    </div>
                    <p className="tracker-empty-copy">
                      Tap any node to update status, capture notes, or record a decision path.
                    </p>
                  </div>
                </div>

                <div className="tracker-split-grid">
                  <div className="tracker-brief-list-block tracker-glass-section">
                    <div className="tracker-brief-section-heading">
                      <span className="tracker-brief-section-label">Watch-outs</span>
                      <span className="tracker-section-meta">
                        {projectBrief?.blockers.length ? 'Needs eyes' : 'Clear for now'}
                      </span>
                    </div>
                    {projectBrief?.blockers.length ? (
                      <ul>
                        {projectBrief.blockers.map((blocker) => (
                          <li key={blocker}>{blocker}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="tracker-empty-copy">No blockers called out in the latest project brief.</p>
                    )}
                  </div>

                  <div className="tracker-brief-list-block tracker-glass-section">
                    <div className="tracker-brief-section-heading">
                      <span className="tracker-brief-section-label">Upcoming</span>
                      <span className="tracker-section-meta">
                        {projectBrief?.upcoming.length ? 'Keep moving' : 'No queued notes'}
                      </span>
                    </div>
                    {projectBrief?.upcoming.length ? (
                      <ul>
                        {projectBrief.upcoming.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="tracker-empty-copy">The brief has not suggested follow-up steps yet.</p>
                    )}
                  </div>
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
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => navigate(explorerTarget)}
                    title="Open current focus in Graph Explorer"
                  >
                    ↗ Explorer
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
            <select value={editStatus} onChange={(e) => setEditStatus(e.target.value as ProjectStatus)}>
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
