# Know-Flow

An interactive, editable context graph (decision flow chart) for tracking processes and decisions across multiple projects.

## Features

- **Process Authoring**: Create and modify master process graphs with nodes (tasks, decisions, start/end points) and edges
- **Visual Graph Editor**: Drag-and-drop interface using React Flow with zoom, pan, and grid snapping
- **Project Tracking**: Instantiate projects from process templates and track progress through the workflow
- **Decision Capture**: Record decision outcomes that determine the path through the process
- **Form-based Data Entry**: Configure custom forms for each node to capture structured data
- **Progress Visualization**: Color-coded nodes show status (not started, in progress, complete)
- **Audit Trail**: Track edge traversals and decision history

## Tech Stack

- **Frontend**: React 18 + TypeScript + React Flow + Vite
- **Backend**: Node.js + Express + TypeScript
- **Database**: PostgreSQL 16
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
   - **Database**: localhost:5432

### Default Credentials

- Database: `knowflow` / `knowflow_secret`

## Project Structure

```
Know-Flow/
├── api/                    # Backend API
│   ├── src/
│   │   ├── routes/         # Express route handlers
│   │   ├── utils/          # Database connection
│   │   └── index.ts        # Entry point
│   ├── Dockerfile
│   ├── package.json
│   └── tsconfig.json
├── client/                 # Frontend application
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── pages/          # Page components
│   │   ├── services/       # API client
│   │   ├── styles/         # CSS styles
│   │   └── types/          # TypeScript types
│   ├── Dockerfile
│   ├── package.json
│   └── vite.config.ts
├── database/               # Database initialization
│   ├── init.sql            # Schema creation
│   └── seed.sql            # Sample data
└── docker-compose.yml      # Container orchestration
```

## Database Schema

### Core Tables

- **processes**: Master process templates (id, name, description, version)
- **nodes**: Graph nodes (id, process_id, type, title, description, form_schema, position)
- **edges**: Connections between nodes (id, process_id, source_node_id, target_node_id, label, condition)
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

**Database:**
Start PostgreSQL and run the initialization scripts:
```bash
psql -U postgres -c "CREATE DATABASE knowflow"
psql -U knowflow -d knowflow -f database/init.sql
psql -U knowflow -d knowflow -f database/seed.sql
```

## Sample Data

The seed data includes a "Property Development Process" with:
- 16 nodes representing steps from project initiation to certificate of occupancy
- Decision points for annexation, zoning, site plan approval, permits, and inspections
- A sample project "Oak Street Development" with initial progress

## License

MIT
