-- Know-Flow Database Schema
-- Editable Decision/Process Context Graph

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Processes table: represents a master process graph template
CREATE TABLE processes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    version INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Nodes table: individual nodes in a process graph
CREATE TABLE nodes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    process_id UUID NOT NULL REFERENCES processes(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL CHECK (type IN ('start', 'task', 'decision', 'end')),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    form_schema JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    position_x DOUBLE PRECISION DEFAULT 0,
    position_y DOUBLE PRECISION DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Edges table: connections between nodes
CREATE TABLE edges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    process_id UUID NOT NULL REFERENCES processes(id) ON DELETE CASCADE,
    source_node_id UUID NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
    target_node_id UUID NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
    label VARCHAR(255),
    condition JSONB DEFAULT '{}',
    waypoints JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Trigger function to validate edges belong to the same process
CREATE OR REPLACE FUNCTION validate_edge_same_process()
RETURNS TRIGGER AS $$
DECLARE
    source_process_id UUID;
    target_process_id UUID;
BEGIN
    SELECT process_id INTO source_process_id FROM nodes WHERE id = NEW.source_node_id;
    SELECT process_id INTO target_process_id FROM nodes WHERE id = NEW.target_node_id;

    IF source_process_id != NEW.process_id OR target_process_id != NEW.process_id THEN
        RAISE EXCEPTION 'Edge nodes must belong to the same process as the edge';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_edge_process
    BEFORE INSERT OR UPDATE ON edges
    FOR EACH ROW EXECUTE FUNCTION validate_edge_same_process();

-- Projects table: instances of a process for tracking
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    process_id UUID NOT NULL REFERENCES processes(id) ON DELETE RESTRICT,
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived')),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Project Node Statuses: tracks the status of each node for a project
CREATE TABLE project_node_statuses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    node_id UUID NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'complete', 'skipped')),
    decision_result VARCHAR(255),
    form_data JSONB DEFAULT '{}',
    assigned_to VARCHAR(255),
    notes TEXT,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(project_id, node_id)
);

-- Project Edge Traversals: audit trail of edge traversals
CREATE TABLE project_edge_traversals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    edge_id UUID NOT NULL REFERENCES edges(id) ON DELETE CASCADE,
    executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_nodes_process_id ON nodes(process_id);
CREATE INDEX idx_edges_process_id ON edges(process_id);
CREATE INDEX idx_edges_source_node ON edges(source_node_id);
CREATE INDEX idx_edges_target_node ON edges(target_node_id);
CREATE INDEX idx_projects_process_id ON projects(process_id);
CREATE INDEX idx_project_node_statuses_project ON project_node_statuses(project_id);
CREATE INDEX idx_project_node_statuses_node ON project_node_statuses(node_id);
CREATE INDEX idx_project_edge_traversals_project ON project_edge_traversals(project_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_processes_updated_at BEFORE UPDATE ON processes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_nodes_updated_at BEFORE UPDATE ON nodes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_project_node_statuses_updated_at BEFORE UPDATE ON project_node_statuses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Recursive CTE function to get all downstream nodes from a given node
CREATE OR REPLACE FUNCTION get_downstream_nodes(start_node_id UUID)
RETURNS TABLE (
    node_id UUID,
    depth INTEGER,
    path UUID[]
) AS $$
BEGIN
    RETURN QUERY
    WITH RECURSIVE downstream AS (
        -- Base case: start with edges from the given node
        SELECT
            e.target_node_id AS node_id,
            1 AS depth,
            ARRAY[e.source_node_id, e.target_node_id] AS path
        FROM edges e
        WHERE e.source_node_id = start_node_id

        UNION ALL

        -- Recursive case: follow edges from already found nodes
        SELECT
            e.target_node_id,
            d.depth + 1,
            d.path || e.target_node_id
        FROM edges e
        INNER JOIN downstream d ON e.source_node_id = d.node_id
        WHERE NOT e.target_node_id = ANY(d.path) -- Prevent cycles
    )
    SELECT DISTINCT ON (downstream.node_id)
        downstream.node_id,
        downstream.depth,
        downstream.path
    FROM downstream
    ORDER BY downstream.node_id, downstream.depth;
END;
$$ LANGUAGE plpgsql;

-- Function to get the current active nodes for a project
CREATE OR REPLACE FUNCTION get_project_current_nodes(p_project_id UUID)
RETURNS TABLE (
    node_id UUID,
    node_title VARCHAR(255),
    node_type VARCHAR(50),
    status VARCHAR(50)
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        n.id AS node_id,
        n.title AS node_title,
        n.type AS node_type,
        COALESCE(pns.status, 'not_started') AS status
    FROM nodes n
    INNER JOIN projects p ON n.process_id = p.process_id
    LEFT JOIN project_node_statuses pns ON pns.node_id = n.id AND pns.project_id = p_project_id
    WHERE p.id = p_project_id
    AND (
        -- Start nodes with no incomplete predecessors
        (n.type = 'start' AND pns.status IS NULL)
        OR
        -- Nodes that are in progress
        pns.status = 'in_progress'
        OR
        -- Nodes where all predecessors are complete and node is not complete
        (
            COALESCE(pns.status, 'not_started') NOT IN ('complete', 'skipped')
            AND NOT EXISTS (
                SELECT 1 FROM edges e
                INNER JOIN project_node_statuses pred_status
                    ON pred_status.node_id = e.source_node_id
                    AND pred_status.project_id = p_project_id
                WHERE e.target_node_id = n.id
                AND pred_status.status NOT IN ('complete', 'skipped')
            )
            AND EXISTS (
                SELECT 1 FROM edges e WHERE e.target_node_id = n.id
            )
        )
    );
END;
$$ LANGUAGE plpgsql;
