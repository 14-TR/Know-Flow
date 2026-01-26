# Changelog

All notable changes to Know-Flow are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

---

## [1.1.0] - 2025-01-25

### Added
- MIT License file
- CLAUDE.md project guide for Claude Code integration
- This changelog

### Fixed
- SQLite compatibility for project creation (JSON.stringify metadata)
- SQLite parameter placeholder handling (each `?` needs its own value)
- PostgreSQL UPDATE...FROM syntax converted to SQLite-compatible subqueries
- Orthogonal edge routing maintains alignment when nodes are dragged

---

## [1.0.1] - 2025-01-25

### Added

#### Graph RAG API
- `GET /api/graph/search` - Full-text search across all nodes
- `GET /api/graph/process/:id/context` - Complete process context extraction
- `GET /api/graph/node/:id/neighborhood` - Explore nodes up to N hops away
- `GET /api/graph/node/:id/paths-to/:targetId` - Find all paths between nodes
- `GET /api/graph/process/:id/subgraph` - Extract upstream/downstream subgraphs
- `POST /api/graph/context/build` - Build custom context from selected nodes
- `GET /api/graph/processes/summary` - Summary statistics for all processes
- `GET /api/graph/project/:id/history` - Project execution history and decisions
- `GET /api/graph/export/process/:id` - Export process in multiple formats
- `GET /api/graph/export/project/:id` - Export project state

#### Export Formats
- JSON - Structured data export
- Markdown - Human-readable documentation
- Graphviz DOT - Graph visualization format
- Mermaid - Diagram-as-code format
- LLM Context - Optimized format for language models

#### MCP Server
- Full Model Context Protocol server implementation
- 8 tools for LLM integration:
  - `search_graph` - Search nodes by content
  - `get_process_context` - Get full process context
  - `get_node_neighborhood` - Explore connected nodes
  - `find_paths` - Find paths between nodes
  - `get_subgraph` - Extract subgraphs
  - `list_processes` - List all processes
  - `get_project_history` - Get project history
  - `list_projects` - List all projects
- Resource browsing for processes and projects
- Claude Desktop integration support

#### Graph Explorer UI
- New `/explorer` page for interactive graph exploration
- Search interface with filters
- Neighborhood visualization
- Path finding between nodes
- Context builder for RAG pipelines
- Multi-format export UI

### Changed
- Updated README with Graph RAG and MCP documentation

---

## [1.0.0] - 2025-01-24

### Added
- Editable orthogonal edges with draggable waypoints
- Edge waypoints stored in database for persistence
- Smooth rounded corners on edge bends
- Double-click to add waypoints to edges
- Drag edge segments to reshape paths
- `PATCH /api/edges/:id/waypoints` endpoint

### Fixed
- Edge creation issues with decision nodes (removed clip-path)

### Changed
- Migrated from PostgreSQL to SQLite for simpler deployment
- Database schema updated for SQLite compatibility
- Added package-lock.json files for reproducible builds

---

## [0.1.0] - 2025-01-23 (Beta)

### Added

#### Core Features
- Process authoring with visual graph editor
- Four node types: Start, Task, Decision, End
- Drag-and-drop interface using React Flow
- Zoom, pan, and grid snapping
- Project tracking from process templates
- Decision capture and outcome recording
- Form-based data entry with custom schemas
- Progress visualization with color-coded nodes

#### Database
- SQLite database with automatic initialization
- Processes, nodes, edges tables
- Projects and project_node_statuses tables
- Project edge traversals for audit trail

#### API
- RESTful API with Express
- CRUD operations for processes, nodes, edges
- Project management endpoints
- Debug routes for database inspection

#### Frontend
- React 18 + TypeScript + Vite
- React Flow for graph visualization
- Process list and canvas pages
- Project tracker with status updates
- Database viewer page

#### Infrastructure
- Docker and Docker Compose support
- Hot reload development setup
- Sample seed data (Property Development Process)

---

## Version History

| Version | Date | Highlights |
|---------|------|------------|
| 1.1.0 | 2025-01-25 | Bug fixes, documentation, license |
| 1.0.1 | 2025-01-25 | Graph RAG API, MCP Server, Graph Explorer UI |
| 1.0.0 | 2025-01-24 | Editable edges, SQLite migration |
| 0.1.0 | 2025-01-23 | Initial MVP (beta) |
