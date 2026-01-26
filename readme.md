# Know-Flow

An interactive, editable context graph (decision flow chart) for tracking processes and decisions across multiple projects. Includes Graph RAG capabilities for LLM/IDE integration.

## Features

### Core Features
- **Process Authoring**: Create and modify master process graphs with nodes (tasks, decisions, start/end points) and edges
- **Visual Graph Editor**: Drag-and-drop interface using React Flow with zoom, pan, and grid snapping
- **Editable Edges**: Draggable orthogonal edges with smooth rounded corners - click and drag any segment to reshape the path
- **Project Tracking**: Instantiate projects from process templates and track progress through the workflow
- **Decision Capture**: Record decision outcomes that determine the path through the process
- **Form-based Data Entry**: Configure custom forms for each node to capture structured data
- **Progress Visualization**: Color-coded nodes show status (not started, in progress, complete)
- **Database Viewer**: Built-in page to inspect database records with auto-refresh
- **Audit Trail**: Track edge traversals and decision history

### Graph RAG Features
- **Graph Search**: Search nodes across all processes by title, description, or content
- **Neighborhood Exploration**: Explore nodes and their connections up to N hops away
- **Path Finding**: Find all paths between two nodes in a process
- **Subgraph Extraction**: Extract downstream/upstream subgraphs from starting nodes
- **Context Builder**: Build custom context from selected nodes for RAG pipelines
- **Multiple Export Formats**: Export graphs as JSON, Markdown, Graphviz DOT, Mermaid, or LLM-optimized context

### MCP Server (IDE Integration)
- **Model Context Protocol**: Full MCP server for Claude/LLM integration
- **8 Tools Available**: search_graph, get_process_context, get_node_neighborhood, find_paths, get_subgraph, list_processes, get_project_history, list_projects
- **Resource Browsing**: Access processes and projects as MCP resources

## Tech Stack

- **Frontend**: React 18 + TypeScript + React Flow + Vite
- **Backend**: Node.js + Express + TypeScript
- **Database**: SQLite (via better-sqlite3)
- **Containerization**: Docker + Docker Compose

## Quick Start

### Prerequisites

- Docker and Docker Compose installed

### Running the Application

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd Know-Flow
   ```

2. Start all services with Docker Compose:
   ```bash
   docker-compose up --build
   ```

3. Access the application:
   - **Frontend**: http://localhost:5173
   - **API**: http://localhost:3001/api
   - **Database Viewer**: http://localhost:5173/database

The SQLite database is automatically created and seeded with sample data on first run. Data is persisted in the `api/data/` directory.

## Project Structure

```
Know-Flow/
├── api/                    # Backend API
│   ├── src/
│   │   ├── routes/         # Express route handlers
│   │   │   └── graphRag.ts # Graph RAG API endpoints
│   │   ├── utils/          # Database connection
│   │   └── index.ts        # Entry point
│   ├── Dockerfile
│   ├── package.json
│   └── tsconfig.json
├── client/                 # Frontend application
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── pages/          # Page components
│   │   │   └── GraphExplorer.tsx  # Graph RAG UI
│   │   ├── services/       # API client
│   │   ├── styles/         # CSS styles
│   │   └── types/          # TypeScript types
│   ├── Dockerfile
│   ├── package.json
│   └── vite.config.ts
├── mcp-server/             # MCP Server for LLM integration
│   ├── src/
│   │   └── index.ts        # MCP server implementation
│   ├── package.json
│   └── tsconfig.json
├── database/               # Database schema and seeds
│   ├── schema.sql          # SQLite schema
│   └── seed.sqlite.sql     # Sample data
└── docker-compose.yml      # Container orchestration
```

## Database Schema

### Core Tables

- **processes**: Master process templates (id, name, description, version)
- **nodes**: Graph nodes (id, process_id, type, title, description, form_schema, position)
- **edges**: Connections between nodes (id, process_id, source_node_id, target_node_id, label, condition, waypoints)
- **projects**: Project instances (id, name, process_id, status)
- **project_node_statuses**: Per-project node status tracking (status, decision_result, form_data)
- **project_edge_traversals**: Audit trail of traversed edges

### Node Types

- `start`: Entry point of a process
- `task`: Work item or action
- `decision`: Decision point with multiple outgoing edges
- `end`: Terminal point of a process

## API Endpoints

### Processes
- `GET /api/processes` - List all processes
- `GET /api/processes/:id` - Get process with nodes and edges
- `POST /api/processes` - Create new process
- `PUT /api/processes/:id` - Update process
- `DELETE /api/processes/:id` - Delete process

### Nodes
- `GET /api/nodes` - List nodes (filter by process_id)
- `POST /api/nodes` - Create node
- `PUT /api/nodes/:id` - Update node
- `PATCH /api/nodes/:id/position` - Update node position
- `DELETE /api/nodes/:id` - Delete node

### Edges
- `GET /api/edges` - List edges (filter by process_id)
- `POST /api/edges` - Create edge
- `PUT /api/edges/:id` - Update edge
- `PATCH /api/edges/:id/waypoints` - Update edge waypoints (for dragging)
- `DELETE /api/edges/:id` - Delete edge

### Projects
- `GET /api/projects` - List all projects
- `GET /api/projects/:id` - Get project with full status
- `POST /api/projects` - Create project from process
- `PUT /api/projects/:id` - Update project
- `DELETE /api/projects/:id` - Delete project

### Project Node Statuses
- `GET /api/project-node-statuses` - List statuses for a project
- `PUT /api/project-node-statuses/:id` - Update node status

### Debug
- `GET /api/debug/tables` - Get all table names with row counts
- `GET /api/debug/tables/:table` - Get contents of a specific table

### Graph RAG
- `GET /api/graph/search?q=query` - Search nodes by title/description
- `GET /api/graph/process/:id/context` - Get full process context
- `GET /api/graph/node/:id/neighborhood?depth=2` - Get node and neighbors
- `GET /api/graph/node/:id/paths-to/:targetId` - Find paths between nodes
- `GET /api/graph/process/:id/subgraph?start_nodes=id1,id2&direction=downstream` - Extract subgraph
- `POST /api/graph/context/build` - Build custom context from node IDs
- `GET /api/graph/processes/summary` - Get summary of all processes
- `GET /api/graph/project/:id/history` - Get project execution history
- `GET /api/graph/export/process/:id?format=markdown` - Export process (json, markdown, dot, mermaid, llm-context)
- `GET /api/graph/export/project/:id?format=markdown` - Export project (json, markdown, llm-context)

## Development

### Running Without Docker

**Backend:**
```bash
cd api
npm install
npm run dev
```

**Frontend:**
```bash
cd client
npm install
npm run dev
```

The SQLite database will be automatically created in `api/data/knowflow.db` when the API starts.

## Sample Data

The seed data includes a "Property Development Process" with:
- 16 nodes representing steps from project initiation to certificate of occupancy
- Decision points for annexation, zoning, site plan approval, permits, and inspections
- A sample project "Oak Street Development" with initial progress

## MCP Server Setup

The Know-Flow MCP server enables LLMs like Claude to interact directly with your knowledge graphs.

### Installation

```bash
cd mcp-server
npm install
npm run build
```

### Configuration for Claude Desktop

Add to your Claude Desktop config (`~/.claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "knowflow": {
      "command": "node",
      "args": ["/path/to/Know-Flow/mcp-server/dist/index.js"],
      "env": {
        "KNOWFLOW_DB_PATH": "/path/to/Know-Flow/api/data/knowflow.db"
      }
    }
  }
}
```

### Available MCP Tools

| Tool | Description |
|------|-------------|
| `search_graph` | Search nodes by title, description, or content |
| `get_process_context` | Get full context of a process graph |
| `get_node_neighborhood` | Explore connected nodes up to N hops |
| `find_paths` | Find all paths between two nodes |
| `get_subgraph` | Extract subgraph from starting nodes |
| `list_processes` | List all available processes |
| `get_project_history` | Get project execution history and decisions |
| `list_projects` | List all project instances |

### Example Usage in Claude

Once configured, you can ask Claude things like:
- "Search for nodes related to 'approval' in the knowledge graph"
- "Show me the full context of the Property Development process"
- "Find all paths from the Start node to the Certificate of Occupancy"
- "What decisions were made in the Oak Street Development project?"

## Graph Explorer UI

Access the Graph Explorer at http://localhost:5173/explorer to:
- Search across all process nodes
- Explore node neighborhoods visually
- Find paths between nodes
- Build custom contexts for RAG
- Export graphs in multiple formats

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for release notes and version history.

## License

MIT
