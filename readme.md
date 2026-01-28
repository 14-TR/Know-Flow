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

### Option 1: Docker (Recommended)

The fastest way to get started. Requires only Docker and Docker Compose.

```bash
# Clone the repository
git clone https://github.com/14-TR/Know-Flow.git
cd Know-Flow

# Start all services
docker-compose up --build

# Open in browser
# Frontend: http://localhost:5173
# API: http://localhost:3001/api
```

That's it! The database is automatically created and seeded with sample data.

### Option 2: Local Development

For development without Docker. Requires Node.js 18+ and npm.

**1. Start the Backend**
```bash
cd api
npm install
npm run dev
# API running at http://localhost:3001
```

**2. Start the Frontend** (in a new terminal)
```bash
cd client
npm install
npm run dev
# Frontend running at http://localhost:5173
```

### Verify Installation

Once running, you should be able to:

1. **View the Process List**: Open http://localhost:5173 - you'll see the sample "Property Development Process"
2. **Open the Graph Editor**: Click on the process to view and edit the interactive flowchart
3. **Explore the Graph RAG UI**: Navigate to http://localhost:5173/explorer to search and explore nodes
4. **Check the API**: Visit http://localhost:3001/api/processes to see the JSON response
5. **Inspect the Database**: Go to http://localhost:5173/database to view all tables

### First Steps

After installation, try these to get familiar with Know-Flow:

1. **Edit a Process**: Click on "Property Development Process", then drag nodes around or double-click to edit
2. **Create a Project**: Use the "New Project" button to create a tracking instance from the process template
3. **Track Progress**: In a project, click nodes to update their status (Not Started → In Progress → Complete)
4. **Search with Graph RAG**: Go to `/explorer` and search for "approval" to find related nodes
5. **Export a Graph**: In the Graph Explorer, export your process as Markdown or Mermaid diagrams

### Prerequisites

| Requirement | Docker Setup | Local Setup |
|-------------|--------------|-------------|
| Docker | Required | Not needed |
| Docker Compose | Required | Not needed |
| Node.js | Not needed | 18+ required |
| npm | Not needed | Required |

### Ports Used

| Service | Port | URL |
|---------|------|-----|
| Frontend | 5173 | http://localhost:5173 |
| Backend API | 3001 | http://localhost:3001/api |

### Data Persistence

- **Docker**: Data is stored in a Docker volume (`api_data`)
- **Local**: Database is created at `api/data/knowflow.db`

The SQLite database is automatically initialized with schema and sample data on first run.

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

### Available Scripts

**Backend (api/)**
```bash
npm run dev      # Start development server with hot reload
npm run build    # Compile TypeScript to dist/
npm run start    # Run compiled production build
npm run typecheck # Run TypeScript type checking
```

**Frontend (client/)**
```bash
npm run dev      # Start Vite dev server with HMR
npm run build    # Build for production
npm run preview  # Preview production build
npm run typecheck # Run TypeScript type checking
```

**MCP Server (mcp-server/)**
```bash
npm run dev      # Run with tsx for development
npm run build    # Compile TypeScript
npm run start    # Run compiled server
```

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 3001 | Backend API port |
| `DATA_DIR` | `./data` | Root directory for SQLite databases |
| `KNOWFLOW_USER` | `admin` | User folder name (enables multi-user mode) |
| `NODE_ENV` | development | Environment mode |
| `VITE_API_URL` | `http://localhost:3001/api` | API URL for frontend |

## Team Deployment (Shared Network Drive)

Share Know-Flow across your organization using a network drive. Admin creates process templates, users create their own projects from those templates.

### Folder Structure

```
/shared/network/knowflow/
├── admin/
│   └── knowflow.db      # Process templates (shared, read-only for users)
├── alice/
│   └── knowflow.db      # Alice's projects
├── bob/
│   └── knowflow.db      # Bob's projects
└── ...
```

### Setup

**1. Admin creates templates:**
```bash
DATA_DIR=/mnt/shared/knowflow KNOWFLOW_USER=admin npm run dev
# or with Docker:
DATA_DIR=/mnt/shared/knowflow KNOWFLOW_USER=admin docker-compose up
```

**2. Users run their own instances:**
```bash
DATA_DIR=/mnt/shared/knowflow KNOWFLOW_USER=alice npm run dev
DATA_DIR=/mnt/shared/knowflow KNOWFLOW_USER=bob npm run dev
```

### Permissions

| User | Process Templates | Projects |
|------|------------------|----------|
| `admin` | Read + Write | Read + Write |
| Others | Read-only | Read + Write (own DB) |

### How It Works

- Users automatically see admin's process templates via SQLite ATTACH
- Each user's projects are stored in their own database file
- The `/api/whoami` endpoint shows current user and permissions
- Non-admin users get a 403 error if they try to modify templates

### Resetting the Database

To reset the database to initial seed data:

```bash
# Docker
docker-compose down -v
docker-compose up --build

# Local
rm api/data/knowflow.db
npm run dev  # in api/
```

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
