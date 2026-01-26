# CLAUDE.md - Project Guide for Claude Code

This file provides context for Claude Code when working with the Know-Flow codebase.

## Project Overview

Know-Flow is an interactive, editable context graph (decision flow chart) application for tracking processes and decisions across multiple projects. It includes Graph RAG capabilities for LLM/IDE integration.

## Architecture

```
Know-Flow/
├── api/           # Express + TypeScript backend (port 3001)
├── client/        # React + TypeScript + Vite frontend (port 5173)
├── mcp-server/    # Model Context Protocol server for LLM integration
└── database/      # SQLite schema and seed files
```

### Tech Stack
- **Frontend**: React 18, TypeScript, React Flow, Vite
- **Backend**: Node.js, Express, TypeScript
- **Database**: SQLite (better-sqlite3)
- **Containerization**: Docker + Docker Compose

## Key Files

### Backend (api/)
- `src/index.ts` - Express app entry point, route registration
- `src/utils/db.ts` - SQLite database connection, PostgreSQL-to-SQLite query adapter
- `src/routes/processes.ts` - Process CRUD operations
- `src/routes/nodes.ts` - Node CRUD operations
- `src/routes/edges.ts` - Edge CRUD operations with waypoint support
- `src/routes/projects.ts` - Project tracking with node status initialization
- `src/routes/graphRag.ts` - Graph RAG API (search, paths, subgraphs, export)

### Frontend (client/)
- `src/components/ProcessCanvas.tsx` - Main React Flow canvas for graph editing
- `src/components/EditableEdge.tsx` - Custom orthogonal edge with draggable waypoints
- `src/components/TaskNode.tsx`, `DecisionNode.tsx`, etc. - Custom node components
- `src/services/api.ts` - API client functions
- `src/pages/GraphExplorer.tsx` - Graph RAG UI

### Database
- `database/schema.sql` - SQLite schema (processes, nodes, edges, projects, statuses)
- `database/seed.sqlite.sql` - Sample data

## Development Commands

```bash
# Backend
cd api && npm install && npm run dev

# Frontend
cd client && npm install && npm run dev

# Docker (full stack)
docker-compose up --build
```

## Database Notes

**IMPORTANT**: The database uses SQLite but queries are written in PostgreSQL style with `$1, $2` parameters. The `db.ts` utility converts these to SQLite `?` placeholders.

### SQLite-specific considerations:
1. **Parameter reuse**: PostgreSQL allows `$1` to appear multiple times. SQLite requires each `?` to have its own value. Use `$1, $2, $3` with `[val, val, val]` instead.
2. **JSON storage**: JSON fields (metadata, form_schema, waypoints) are stored as TEXT. Always use `JSON.stringify()` when inserting objects.
3. **UPDATE...FROM**: SQLite doesn't support PostgreSQL's `UPDATE table t SET ... FROM other_table`. Use subqueries instead.
4. **Table aliases in UPDATE**: SQLite doesn't support `UPDATE table alias SET`. Remove aliases.
5. **RETURNING clause**: Handled by `db.ts` using `lastInsertRowid` for INSERT, separate SELECT for UPDATE/DELETE.

## Key Concepts

### Process vs Project
- **Process**: A reusable template/workflow graph (nodes + edges)
- **Project**: An instance of a process being tracked (has status per node)

### Node Types
- `start` - Entry point
- `task` - Work item
- `decision` - Branch point with multiple outgoing edges
- `end` - Terminal point

### Edge Waypoints
Edges support orthogonal routing with draggable waypoints. Waypoints are stored as JSON array: `[{x, y}, {x, y}, ...]`

The `EditableEdge` component:
- Auto-generates waypoints for orthogonal routing when none exist
- Adjusts first/last waypoints to maintain orthogonality when nodes move
- Supports double-click to add waypoints, drag to move segments

## API Patterns

All API endpoints follow REST conventions:
- `GET /api/{resource}` - List
- `GET /api/{resource}/:id` - Get one
- `POST /api/{resource}` - Create
- `PUT /api/{resource}/:id` - Update
- `DELETE /api/{resource}/:id` - Delete

Graph RAG endpoints are under `/api/graph/*`.

## Common Tasks

### Adding a new node type
1. Add to `type` CHECK constraint in `database/schema.sql`
2. Create component in `client/src/components/`
3. Register in `nodeTypes` object in `ProcessCanvas.tsx`

### Adding a new API endpoint
1. Create/modify route file in `api/src/routes/`
2. Register in `api/src/index.ts`
3. Add client function in `client/src/services/api.ts`

### Modifying edge behavior
- Edge rendering: `client/src/components/EditableEdge.tsx`
- Edge persistence: `api/src/routes/edges.ts`

## Testing

Currently no automated tests. Manual testing via:
- Frontend: http://localhost:5173
- API: http://localhost:3001/api
- Database viewer: http://localhost:5173/database

## MCP Server

The MCP server (`mcp-server/`) provides LLM integration via Model Context Protocol:
- Reads directly from SQLite database
- Provides tools: search_graph, get_process_context, get_node_neighborhood, find_paths, get_subgraph, list_processes, get_project_history, list_projects
- Configure in Claude Desktop via `~/.claude/claude_desktop_config.json`
