import type { Process, ProcessNode, ProcessEdge, Project, ProjectNodeStatus } from '../types';

const API_URL = import.meta.env.VITE_API_URL || '/api';

async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || 'Request failed');
  }

  return response.json();
}

// Processes
export const getProcesses = () => fetchApi<Process[]>('/processes');

export const getProcess = (id: string) => fetchApi<Process>(`/processes/${id}`);

export const createProcess = (data: { name: string; description?: string }) =>
  fetchApi<Process>('/processes', {
    method: 'POST',
    body: JSON.stringify(data),
  });

export const updateProcess = (id: string, data: Partial<Process>) =>
  fetchApi<Process>(`/processes/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });

export const deleteProcess = (id: string) =>
  fetchApi<{ message: string }>(`/processes/${id}`, { method: 'DELETE' });

// Nodes
export const createNode = (data: Partial<ProcessNode>) =>
  fetchApi<ProcessNode>('/nodes', {
    method: 'POST',
    body: JSON.stringify(data),
  });

export const updateNode = (id: string, data: Partial<ProcessNode>) =>
  fetchApi<ProcessNode>(`/nodes/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });

export const updateNodePosition = (id: string, position_x: number, position_y: number) =>
  fetchApi<ProcessNode>(`/nodes/${id}/position`, {
    method: 'PATCH',
    body: JSON.stringify({ position_x, position_y }),
  });

export const deleteNode = (id: string) =>
  fetchApi<{ message: string }>(`/nodes/${id}`, { method: 'DELETE' });

// Edges
export const createEdge = (data: Partial<ProcessEdge>) =>
  fetchApi<ProcessEdge>('/edges', {
    method: 'POST',
    body: JSON.stringify(data),
  });

export const updateEdge = (id: string, data: Partial<ProcessEdge>) =>
  fetchApi<ProcessEdge>(`/edges/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });

export const updateEdgeWaypoints = (id: string, waypoints: { x: number; y: number }[]) =>
  fetchApi<ProcessEdge>(`/edges/${id}/waypoints`, {
    method: 'PATCH',
    body: JSON.stringify({ waypoints }),
  });

export const deleteEdge = (id: string) =>
  fetchApi<{ message: string }>(`/edges/${id}`, { method: 'DELETE' });

// Projects
export const getProjects = (processId?: string) =>
  fetchApi<Project[]>(`/projects${processId ? `?process_id=${processId}` : ''}`);

export const getProject = (id: string) => fetchApi<Project>(`/projects/${id}`);

export interface ProjectBrief {
  summary: string;
  blockers: string[];
  upcoming: string[];
  suggested_next_action: {
    node_id: string;
    title: string;
    type: string;
    rationale: string;
  } | null;
  stats: {
    total: number;
    completed: number;
    in_progress: number;
    not_started: number;
    skipped: number;
    progress_percent: number;
    blocked: number;
  };
}

export const getProjectBrief = (id: string) =>
  fetchApi<ProjectBrief>(`/projects/${id}/brief`);

export const createProject = (data: { name: string; process_id: string }) =>
  fetchApi<Project>('/projects', {
    method: 'POST',
    body: JSON.stringify(data),
  });

export const updateProject = (id: string, data: Partial<Project>) =>
  fetchApi<Project>(`/projects/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });

export const deleteProject = (id: string) =>
  fetchApi<{ message: string }>(`/projects/${id}`, { method: 'DELETE' });

// Project Node Statuses
export const updateProjectNodeStatus = (
  id: string,
  data: Partial<ProjectNodeStatus>
) =>
  fetchApi<ProjectNodeStatus>(`/project-node-statuses/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });

// Graph RAG API

export interface GraphSearchResult {
  query: string;
  count: number;
  results: Array<ProcessNode & { process_name: string; process_description: string | null }>;
}

export interface GraphContext {
  process: { id: string; name: string; description: string | null };
  nodes: Array<{
    id: string;
    type: string;
    title: string;
    description: string | null;
    form_schema: Record<string, unknown>;
    metadata: Record<string, unknown>;
  }>;
  edges: Array<{
    id: string;
    source_node_id: string;
    target_node_id: string;
    label: string | null;
    condition: Record<string, unknown>;
  }>;
  paths?: string[][];
  context_text?: string;
}

export interface NodeNeighborhood {
  center: ProcessNode & { depth: number };
  neighbors: Array<ProcessNode & { depth: number }>;
  edges: Array<{
    id: string;
    source_node_id: string;
    target_node_id: string;
    label: string | null;
  }>;
  total_nodes: number;
}

export interface PathResult {
  source: { id: string; title: string };
  target: { id: string; title: string };
  paths: Array<{
    nodes: string[];
    labels: (string | null)[];
    node_titles: string[];
    length: number;
  }>;
  total_paths: number;
}

export interface SubgraphResult {
  process: { id: string; name: string };
  start_nodes: string[];
  direction: string;
  depth: number;
  nodes: Array<{
    id: string;
    type: string;
    title: string;
    description: string | null;
  }>;
  edges: Array<{
    id: string;
    source_node_id: string;
    target_node_id: string;
    label: string | null;
  }>;
  total_nodes: number;
  total_edges: number;
}

export interface ProcessSummary {
  id: string;
  name: string;
  description: string | null;
  version: number;
  node_count: number;
  edge_count: number;
  decision_count: number;
  project_count: number;
}

export interface ProjectHistory {
  project: Project;
  node_statuses: Array<ProjectNodeStatus & {
    node_title: string;
    node_type: string;
    node_description: string | null;
  }>;
  edge_traversals: Array<{
    edge_id: string;
    edge_label: string | null;
    source_title: string;
    target_title: string;
    executed_at: string;
  }>;
  timeline: Array<{
    type: 'node_started' | 'node_completed' | 'edge_traversed' | 'decision_made';
    timestamp: string;
    details: Record<string, unknown>;
  }>;
  stats: {
    total_nodes: number;
    completed: number;
    in_progress: number;
    skipped: number;
    decisions_made: number;
    edges_traversed: number;
  };
}

export interface ContextBuildResult {
  nodes: ProcessNode[];
  edges: Array<{
    id: string;
    source_node_id: string;
    target_node_id: string;
    label: string | null;
  }>;
  context_text: string;
  node_count: number;
  edge_count: number;
}

// Graph RAG API functions

export const searchGraph = (params: {
  q: string;
  type?: string;
  process_id?: string;
  limit?: number;
}) => {
  const searchParams = new URLSearchParams();
  searchParams.set('q', params.q);
  if (params.type) searchParams.set('type', params.type);
  if (params.process_id) searchParams.set('process_id', params.process_id);
  if (params.limit) searchParams.set('limit', params.limit.toString());
  return fetchApi<GraphSearchResult>(`/graph/search?${searchParams.toString()}`);
};

export const getProcessContext = (
  processId: string,
  options?: { format?: 'json' | 'markdown' | 'text'; include_paths?: boolean }
) => {
  const params = new URLSearchParams();
  if (options?.format) params.set('format', options.format);
  if (options?.include_paths) params.set('include_paths', 'true');
  const query = params.toString() ? `?${params.toString()}` : '';
  return fetchApi<GraphContext>(`/graph/process/${processId}/context${query}`);
};

export const getNodeNeighborhood = (nodeId: string, depth?: number) => {
  const query = depth ? `?depth=${depth}` : '';
  return fetchApi<NodeNeighborhood>(`/graph/node/${nodeId}/neighborhood${query}`);
};

export const findPaths = (
  sourceNodeId: string,
  targetNodeId: string,
  options?: { max_paths?: number; max_length?: number }
) => {
  const params = new URLSearchParams();
  if (options?.max_paths) params.set('max_paths', options.max_paths.toString());
  if (options?.max_length) params.set('max_length', options.max_length.toString());
  const query = params.toString() ? `?${params.toString()}` : '';
  return fetchApi<PathResult>(`/graph/node/${sourceNodeId}/paths-to/${targetNodeId}${query}`);
};

export const getSubgraph = (
  processId: string,
  startNodes: string[],
  options?: { direction?: 'downstream' | 'upstream' | 'both'; depth?: number }
) => {
  const params = new URLSearchParams();
  params.set('start_nodes', startNodes.join(','));
  if (options?.direction) params.set('direction', options.direction);
  if (options?.depth) params.set('depth', options.depth.toString());
  return fetchApi<SubgraphResult>(`/graph/process/${processId}/subgraph?${params.toString()}`);
};

export const buildContext = (
  nodeIds: string[],
  options?: { include_neighbors?: boolean; format?: 'markdown' | 'text' }
) =>
  fetchApi<ContextBuildResult>('/graph/context/build', {
    method: 'POST',
    body: JSON.stringify({
      node_ids: nodeIds,
      include_neighbors: options?.include_neighbors ?? true,
      format: options?.format ?? 'markdown',
    }),
  });

export const getProcessesSummary = () =>
  fetchApi<{ count: number; processes: ProcessSummary[] }>('/graph/processes/summary');

export const getProjectHistory = (projectId: string) =>
  fetchApi<ProjectHistory>(`/graph/project/${projectId}/history`);

// Export types
export type ExportFormat = 'json' | 'markdown' | 'dot' | 'mermaid' | 'llm-context';
export type ProjectExportFormat = 'json' | 'markdown' | 'llm-context';

// Graph RAG export functions (rich format with full context)
export const exportProcessGraph = async (
  processId: string,
  format: ExportFormat = 'json'
): Promise<string> => {
  const response = await fetch(
    `${API_URL}/graph/export/process/${processId}?format=${format}`
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Export failed' }));
    throw new Error(error.error || 'Export failed');
  }

  if (format === 'json') {
    const data = await response.json();
    return JSON.stringify(data, null, 2);
  }

  return response.text();
};

export const exportProjectGraph = async (
  projectId: string,
  format: ProjectExportFormat = 'json'
): Promise<string> => {
  const response = await fetch(
    `${API_URL}/graph/export/project/${projectId}?format=${format}`
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Export failed' }));
    throw new Error(error.error || 'Export failed');
  }

  if (format === 'json') {
    const data = await response.json();
    return JSON.stringify(data, null, 2);
  }

  return response.text();
};

// Helper to download exported content as a file
export const downloadExport = (content: string, filename: string, mimeType: string) => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

// Process export/import (backup format via /api/processes)
export const exportProcess = async (id: string): Promise<Blob> => {
  const res = await fetch(`${API_URL}/processes/${id}/export`);
  if (!res.ok) throw new Error('Export failed');
  return res.blob();
};

export interface ImportResult {
  message: string;
  process: { id: string; name: string };
  stats: { nodes: number; edges: number };
}

export const importProcess = (data: unknown): Promise<ImportResult> =>
  fetchApi<ImportResult>('/processes/import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

// Project export/import (backup format via /api/projects)
export const exportProject = async (id: string): Promise<Blob> => {
  const res = await fetch(`${API_URL}/projects/${id}/export`);
  if (!res.ok) throw new Error('Export failed');
  return res.blob();
};

export interface ImportProjectResult {
  message: string;
  project: { id: string; name: string };
  stats: { node_statuses: number };
}

export const importProject = (data: unknown): Promise<ImportProjectResult> =>
  fetchApi<ImportProjectResult>('/projects/import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

// Dashboard
export interface DashboardStats {
  processCount: number;
  nodeCount: number;
  projectTotal: number;
  projectActive: number;
  projectCompleted: number;
  projectArchived: number;
  avgCompletion: number;
  todayCompleted: number;
  inProgressNodes: number;
  readyNodes: number;
  blockedNodes: number;
}

export interface DashboardProject {
  id: string;
  name: string;
  status: string;
  process_name: string;
  total_nodes: number;
  completed_nodes: number;
  created_at: string;
}

export interface DashboardProcess {
  id: string;
  name: string;
  description: string | null;
  node_count: number;
  edge_count: number;
  created_at: string;
}

export interface DashboardAttentionItem {
  project_id: string;
  project_name: string;
  node_id: string;
  title: string;
  type: string;
  attention_type: 'blocked' | 'ready';
  blocker_count: number;
  blocker_titles: string;
  reason: string;
}

export interface DashboardData {
  stats: DashboardStats;
  recentProjects: DashboardProject[];
  recentProcesses: DashboardProcess[];
  attentionItems: DashboardAttentionItem[];
}

export const getDashboard = () => fetchApi<DashboardData>('/dashboard');

export const seedDemoData = () =>
  fetchApi<{ message: string; processId?: string; projectId?: string }>('/demo/seed', {
    method: 'POST',
  });
