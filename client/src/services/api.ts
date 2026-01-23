import type { Process, ProcessNode, ProcessEdge, Project, ProjectNodeStatus } from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

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

export const deleteEdge = (id: string) =>
  fetchApi<{ message: string }>(`/edges/${id}`, { method: 'DELETE' });

// Projects
export const getProjects = (processId?: string) =>
  fetchApi<Project[]>(`/projects${processId ? `?process_id=${processId}` : ''}`);

export const getProject = (id: string) => fetchApi<Project>(`/projects/${id}`);

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
