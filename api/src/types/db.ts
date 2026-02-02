// Database entity types for type-safe query results

export interface ProcessRow {
  id: string;
  name: string;
  description: string | null;
  version: string;
  created_at: string;
  updated_at: string;
}

export interface NodeRow {
  id: string;
  process_id: string;
  type: string;
  title: string;
  description: string | null;
  form_schema: string; // JSON string
  metadata: string; // JSON string
  position_x: number;
  position_y: number;
  created_at: string;
  updated_at: string;
}

export interface EdgeRow {
  id: string;
  process_id: string;
  source_node_id: string;
  target_node_id: string;
  label: string | null;
  condition: string; // JSON string
  waypoints: string; // JSON string
  created_at: string;
  updated_at: string;
}

export interface ProjectRow {
  id: string;
  name: string;
  process_id: string;
  status: string;
  metadata: string; // JSON string
  created_at: string;
  updated_at: string;
  // Joined fields (optional)
  process_name?: string;
  process_description?: string;
  completed_nodes?: number;
  total_nodes?: number;
}

export interface ProjectNodeStatusRow {
  id: string;
  project_id: string;
  node_id: string;
  status: string;
  decision_result: string | null;
  form_data: string; // JSON string
  assigned_to: string | null;
  notes: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields (optional)
  node_title?: string;
  node_type?: string;
  node_description?: string;
  form_schema?: string;
}

export interface ProjectEdgeTraversalRow {
  id: string;
  project_id: string;
  edge_id: string;
  executed_at: string;
  // Joined fields (optional)
  edge_label?: string;
  source_title?: string;
  target_title?: string;
}

// Helper type for query results with unknown row shape
export type QueryRow = Record<string, unknown>;
