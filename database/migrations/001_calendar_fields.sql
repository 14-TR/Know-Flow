-- Migration 001: Add calendar/scheduling fields to project_node_statuses
ALTER TABLE project_node_statuses ADD COLUMN due_date TEXT;
ALTER TABLE project_node_statuses ADD COLUMN estimated_days INTEGER;
ALTER TABLE project_node_statuses ADD COLUMN date_pinned INTEGER DEFAULT 0;
