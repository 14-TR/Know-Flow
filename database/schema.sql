-- Know-Flow Database Schema (SQLite)
-- Editable Decision/Process Context Graph

-- Processes table: represents a master process graph template
CREATE TABLE IF NOT EXISTS processes (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(hex(randomblob(2)),2) || '-' || hex(randomblob(6)))),
    name TEXT NOT NULL,
    description TEXT,
    version INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Nodes table: individual nodes in a process graph
CREATE TABLE IF NOT EXISTS nodes (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(hex(randomblob(2)),2) || '-' || hex(randomblob(6)))),
    process_id TEXT NOT NULL REFERENCES processes(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('start', 'task', 'decision', 'end', 'milestone')),
    title TEXT NOT NULL,
    description TEXT,
    form_schema TEXT DEFAULT '{}',
    metadata TEXT DEFAULT '{}',
    position_x REAL DEFAULT 0,
    position_y REAL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Edges table: connections between nodes
CREATE TABLE IF NOT EXISTS edges (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(hex(randomblob(2)),2) || '-' || hex(randomblob(6)))),
    process_id TEXT NOT NULL REFERENCES processes(id) ON DELETE CASCADE,
    source_node_id TEXT NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
    target_node_id TEXT NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
    label TEXT,
    condition TEXT DEFAULT '{}',
    waypoints TEXT DEFAULT '[]',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Trigger to validate edges belong to the same process
CREATE TRIGGER IF NOT EXISTS validate_edge_process
BEFORE INSERT ON edges
BEGIN
    SELECT CASE
        WHEN (SELECT process_id FROM nodes WHERE id = NEW.source_node_id) != NEW.process_id
             OR (SELECT process_id FROM nodes WHERE id = NEW.target_node_id) != NEW.process_id
        THEN RAISE(ABORT, 'Edge nodes must belong to the same process as the edge')
    END;
END;

-- Projects table: instances of a process for tracking
CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(hex(randomblob(2)),2) || '-' || hex(randomblob(6)))),
    name TEXT NOT NULL,
    process_id TEXT NOT NULL REFERENCES processes(id) ON DELETE RESTRICT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived')),
    metadata TEXT DEFAULT '{}',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Project Node Statuses: tracks the status of each node for a project
CREATE TABLE IF NOT EXISTS project_node_statuses (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(hex(randomblob(2)),2) || '-' || hex(randomblob(6)))),
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    node_id TEXT NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'complete', 'skipped')),
    decision_result TEXT,
    form_data TEXT DEFAULT '{}',
    assigned_to TEXT,
    notes TEXT,
    started_at DATETIME,
    completed_at DATETIME,
    due_date TEXT,
    estimated_days INTEGER,
    date_pinned INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(project_id, node_id)
);

-- Project Edge Traversals: audit trail of edge traversals
CREATE TABLE IF NOT EXISTS project_edge_traversals (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(hex(randomblob(2)),2) || '-' || hex(randomblob(6)))),
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    edge_id TEXT NOT NULL REFERENCES edges(id) ON DELETE CASCADE,
    executed_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_nodes_process_id ON nodes(process_id);
CREATE INDEX IF NOT EXISTS idx_edges_process_id ON edges(process_id);
CREATE INDEX IF NOT EXISTS idx_edges_source_node ON edges(source_node_id);
CREATE INDEX IF NOT EXISTS idx_edges_target_node ON edges(target_node_id);
CREATE INDEX IF NOT EXISTS idx_projects_process_id ON projects(process_id);
CREATE INDEX IF NOT EXISTS idx_project_node_statuses_project ON project_node_statuses(project_id);
CREATE INDEX IF NOT EXISTS idx_project_node_statuses_node ON project_node_statuses(node_id);
CREATE INDEX IF NOT EXISTS idx_project_edge_traversals_project ON project_edge_traversals(project_id);

-- Triggers for updated_at
CREATE TRIGGER IF NOT EXISTS update_processes_updated_at AFTER UPDATE ON processes
BEGIN
    UPDATE processes SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_nodes_updated_at AFTER UPDATE ON nodes
BEGIN
    UPDATE nodes SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_projects_updated_at AFTER UPDATE ON projects
BEGIN
    UPDATE projects SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_project_node_statuses_updated_at AFTER UPDATE ON project_node_statuses
BEGIN
    UPDATE project_node_statuses SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;
