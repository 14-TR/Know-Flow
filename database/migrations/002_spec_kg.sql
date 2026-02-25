-- Migration 002: Spec Knowledge Graph tables
-- Spec nodes = regulatory requirements, code sections, permit steps
CREATE TABLE IF NOT EXISTS spec_nodes (
    id TEXT PRIMARY KEY,
    source TEXT NOT NULL,         -- e.g. 'cheyenne-permits', 'ibc-2021'
    type TEXT NOT NULL,           -- 'step', 'requirement', 'decision', 'agency'
    name TEXT NOT NULL,
    description TEXT,
    phase INTEGER,
    agency TEXT,
    typical_days INTEGER,
    metadata TEXT DEFAULT '{}',   -- JSON blob for extra fields
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Edges between spec nodes (dependency/reference relationships)
CREATE TABLE IF NOT EXISTS spec_edges (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(6)))),
    source_id TEXT NOT NULL REFERENCES spec_nodes(id) ON DELETE CASCADE,
    target_id TEXT NOT NULL REFERENCES spec_nodes(id) ON DELETE CASCADE,
    relationship TEXT DEFAULT 'requires',  -- 'requires', 'references', 'parallel'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Links between project task nodes and spec requirement nodes
CREATE TABLE IF NOT EXISTS spec_links (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(6)))),
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    node_id TEXT NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
    spec_node_id TEXT NOT NULL REFERENCES spec_nodes(id) ON DELETE CASCADE,
    coverage_type TEXT DEFAULT 'satisfies',  -- 'satisfies', 'partially', 'references'
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(project_id, node_id, spec_node_id)
);

CREATE INDEX IF NOT EXISTS idx_spec_edges_source ON spec_edges(source_id);
CREATE INDEX IF NOT EXISTS idx_spec_edges_target ON spec_edges(target_id);
CREATE INDEX IF NOT EXISTS idx_spec_links_project ON spec_links(project_id);
CREATE INDEX IF NOT EXISTS idx_spec_links_node ON spec_links(node_id);
CREATE INDEX IF NOT EXISTS idx_spec_links_spec ON spec_links(spec_node_id);
