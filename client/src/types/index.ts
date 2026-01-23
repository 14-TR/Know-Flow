export interface Process {
  id: string;
  name: string;
  description: string | null;
  version: number;
  created_at: string;
  updated_at: string;
  nodes?: ProcessNode[];
  edges?: ProcessEdge[];
}

export interface ProcessNode {
  id: string;
  process_id: string;
  type: 'start' | 'task' | 'decision' | 'end';
  title: string;
  description: string | null;
  form_schema: FormSchema;
  metadata: Record<string, unknown>;
  position_x: number;
  position_y: number;
  created_at: string;
  updated_at: string;
}

export interface Waypoint {
  x: number;
  y: number;
}

export interface ProcessEdge {
  id: string;
  process_id: string;
  source_node_id: string;
  target_node_id: string;
  label: string | null;
  condition: Record<string, unknown>;
  waypoints: Waypoint[];
  created_at: string;
}

export interface Project {
  id: string;
  name: string;
  process_id: string;
  process_name?: string;
  status: 'active' | 'completed' | 'archived';
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  nodes?: ProjectNodeWithStatus[];
  edges?: ProjectEdgeWithStatus[];
  currentNodes?: CurrentNode[];
  completed_nodes?: number;
  total_nodes?: number;
}

export interface ProjectNodeStatus {
  id: string;
  project_id: string;
  node_id: string;
  status: 'not_started' | 'in_progress' | 'complete' | 'skipped';
  decision_result: string | null;
  form_data: Record<string, unknown>;
  assigned_to: string | null;
  notes: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectNodeWithStatus extends ProcessNode {
  project_status: 'not_started' | 'in_progress' | 'complete' | 'skipped' | null;
  decision_result: string | null;
  form_data: Record<string, unknown> | null;
  assigned_to: string | null;
  notes: string | null;
  started_at: string | null;
  completed_at: string | null;
  status_id: string | null;
}

export interface ProjectEdgeWithStatus extends ProcessEdge {
  traversed: boolean;
}

export interface CurrentNode {
  node_id: string;
  node_title: string;
  node_type: string;
  status: string;
}

export interface FormSchema {
  fields?: FormField[];
}

export interface FormField {
  name: string;
  type: 'text' | 'number' | 'date' | 'select' | 'textarea';
  label: string;
  required?: boolean;
  options?: string[];
}
