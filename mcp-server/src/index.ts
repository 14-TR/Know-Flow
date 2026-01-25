#!/usr/bin/env node

/**
 * Know-Flow MCP Server
 *
 * This Model Context Protocol server exposes the Know-Flow knowledge graph
 * to LLMs like Claude, enabling them to:
 * - Search and explore process graphs
 * - Get context about nodes and their relationships
 * - Find paths between nodes
 * - Extract relevant subgraphs for RAG
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory of this file
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Database path - can be overridden with KNOWFLOW_DB_PATH env var
const DB_PATH = process.env.KNOWFLOW_DB_PATH || path.join(__dirname, '../../data/knowflow.db');

// Initialize database connection
let db: Database.Database;

function initDb() {
  try {
    db = new Database(DB_PATH, { readonly: true });
    db.pragma('journal_mode = WAL');
  } catch (error) {
    console.error(`Failed to connect to database at ${DB_PATH}:`, error);
    process.exit(1);
  }
}

// Helper function to safely parse JSON
function safeParseJson(str: string | null, fallback: unknown = {}): unknown {
  if (!str) return fallback;
  try {
    return JSON.parse(str);
  } catch {
    return fallback;
  }
}

// Create the MCP server
const server = new Server(
  {
    name: 'knowflow',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
      resources: {},
    },
  }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'search_graph',
        description:
          'Search for nodes in the knowledge graph by title, description, or content. Returns matching nodes with their process context.',
        inputSchema: {
          type: 'object' as const,
          properties: {
            query: {
              type: 'string',
              description: 'Search query to match against node titles, descriptions, and metadata',
            },
            type: {
              type: 'string',
              enum: ['start', 'task', 'decision', 'end'],
              description: 'Optional: filter by node type',
            },
            process_id: {
              type: 'string',
              description: 'Optional: filter to a specific process',
            },
            limit: {
              type: 'number',
              description: 'Maximum results to return (default: 20)',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'get_process_context',
        description:
          'Get the full context of a process graph including all nodes, edges, and their relationships. Useful for understanding a complete workflow.',
        inputSchema: {
          type: 'object' as const,
          properties: {
            process_id: {
              type: 'string',
              description: 'The ID of the process to get context for',
            },
            format: {
              type: 'string',
              enum: ['json', 'markdown'],
              description: 'Output format (default: markdown)',
            },
          },
          required: ['process_id'],
        },
      },
      {
        name: 'get_node_neighborhood',
        description:
          'Get a node and all its connected neighbors up to a specified depth. Useful for understanding local context around a specific node.',
        inputSchema: {
          type: 'object' as const,
          properties: {
            node_id: {
              type: 'string',
              description: 'The ID of the center node',
            },
            depth: {
              type: 'number',
              description: 'How many hops to traverse (default: 1, max: 5)',
            },
          },
          required: ['node_id'],
        },
      },
      {
        name: 'find_paths',
        description:
          'Find all paths between two nodes in a process graph. Useful for understanding how to get from one step to another.',
        inputSchema: {
          type: 'object' as const,
          properties: {
            source_node_id: {
              type: 'string',
              description: 'The starting node ID',
            },
            target_node_id: {
              type: 'string',
              description: 'The destination node ID',
            },
            max_paths: {
              type: 'number',
              description: 'Maximum number of paths to find (default: 10)',
            },
          },
          required: ['source_node_id', 'target_node_id'],
        },
      },
      {
        name: 'get_subgraph',
        description:
          'Extract a subgraph starting from specified nodes, traversing in a given direction. Useful for getting relevant portions of a larger graph.',
        inputSchema: {
          type: 'object' as const,
          properties: {
            process_id: {
              type: 'string',
              description: 'The process ID containing the nodes',
            },
            start_node_ids: {
              type: 'array',
              items: { type: 'string' },
              description: 'Node IDs to start traversal from',
            },
            direction: {
              type: 'string',
              enum: ['downstream', 'upstream', 'both'],
              description: 'Direction to traverse (default: downstream)',
            },
            depth: {
              type: 'number',
              description: 'Maximum traversal depth (default: 10)',
            },
          },
          required: ['process_id', 'start_node_ids'],
        },
      },
      {
        name: 'list_processes',
        description:
          'List all available processes with summary statistics. Use this to discover what workflows are available.',
        inputSchema: {
          type: 'object' as const,
          properties: {},
          required: [],
        },
      },
      {
        name: 'get_project_history',
        description:
          'Get the decision history and traversal path for a project instance. Useful for understanding how a workflow was executed.',
        inputSchema: {
          type: 'object' as const,
          properties: {
            project_id: {
              type: 'string',
              description: 'The project ID to get history for',
            },
          },
          required: ['project_id'],
        },
      },
      {
        name: 'list_projects',
        description:
          'List all project instances with their status and progress. Use this to find active or completed workflow executions.',
        inputSchema: {
          type: 'object' as const,
          properties: {
            status: {
              type: 'string',
              enum: ['active', 'completed', 'archived'],
              description: 'Optional: filter by project status',
            },
          },
          required: [],
        },
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'search_graph':
        return handleSearchGraph(args as {
          query: string;
          type?: string;
          process_id?: string;
          limit?: number;
        });

      case 'get_process_context':
        return handleGetProcessContext(args as {
          process_id: string;
          format?: string;
        });

      case 'get_node_neighborhood':
        return handleGetNodeNeighborhood(args as {
          node_id: string;
          depth?: number;
        });

      case 'find_paths':
        return handleFindPaths(args as {
          source_node_id: string;
          target_node_id: string;
          max_paths?: number;
        });

      case 'get_subgraph':
        return handleGetSubgraph(args as {
          process_id: string;
          start_node_ids: string[];
          direction?: string;
          depth?: number;
        });

      case 'list_processes':
        return handleListProcesses();

      case 'get_project_history':
        return handleGetProjectHistory(args as { project_id: string });

      case 'list_projects':
        return handleListProjects(args as { status?: string });

      default:
        return {
          content: [{ type: 'text' as const, text: `Unknown tool: ${name}` }],
          isError: true,
        };
    }
  } catch (error) {
    return {
      content: [
        {
          type: 'text' as const,
          text: `Error executing ${name}: ${(error as Error).message}`,
        },
      ],
      isError: true,
    };
  }
});

// Tool implementations

function handleSearchGraph(args: {
  query: string;
  type?: string;
  process_id?: string;
  limit?: number;
}) {
  const { query, type, process_id, limit = 20 } = args;
  const searchTerm = `%${query}%`;

  let sql = `
    SELECT
      n.id,
      n.process_id,
      n.type,
      n.title,
      n.description,
      n.form_schema,
      n.metadata,
      p.name as process_name
    FROM nodes n
    JOIN processes p ON n.process_id = p.id
    WHERE (n.title LIKE ? OR n.description LIKE ? OR n.metadata LIKE ?)
  `;

  const params: (string | number)[] = [searchTerm, searchTerm, searchTerm];

  if (type) {
    sql += ' AND n.type = ?';
    params.push(type);
  }

  if (process_id) {
    sql += ' AND n.process_id = ?';
    params.push(process_id);
  }

  sql += ' ORDER BY n.title LIMIT ?';
  params.push(Math.min(limit, 50));

  const results = db.prepare(sql).all(...params) as Array<{
    id: string;
    process_id: string;
    type: string;
    title: string;
    description: string | null;
    form_schema: string;
    metadata: string;
    process_name: string;
  }>;

  const nodes = results.map((row) => ({
    ...row,
    form_schema: safeParseJson(row.form_schema),
    metadata: safeParseJson(row.metadata),
  }));

  let text = `Found ${nodes.length} matching nodes:\n\n`;
  for (const node of nodes) {
    text += `## ${node.title} (${node.type})\n`;
    text += `- **Process:** ${node.process_name}\n`;
    text += `- **ID:** ${node.id}\n`;
    if (node.description) {
      text += `- **Description:** ${node.description}\n`;
    }
    text += '\n';
  }

  return {
    content: [{ type: 'text' as const, text }],
  };
}

function handleGetProcessContext(args: { process_id: string; format?: string }) {
  const { process_id, format = 'markdown' } = args;

  const process = db
    .prepare('SELECT id, name, description FROM processes WHERE id = ?')
    .get(process_id) as { id: string; name: string; description: string | null } | undefined;

  if (!process) {
    return {
      content: [{ type: 'text' as const, text: `Process not found: ${process_id}` }],
      isError: true,
    };
  }

  const nodes = db
    .prepare(
      'SELECT id, type, title, description, form_schema, metadata FROM nodes WHERE process_id = ? ORDER BY type, title'
    )
    .all(process_id) as Array<{
    id: string;
    type: string;
    title: string;
    description: string | null;
    form_schema: string;
    metadata: string;
  }>;

  const edges = db
    .prepare(
      'SELECT id, source_node_id, target_node_id, label, condition FROM edges WHERE process_id = ?'
    )
    .all(process_id) as Array<{
    id: string;
    source_node_id: string;
    target_node_id: string;
    label: string | null;
    condition: string;
  }>;

  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  if (format === 'json') {
    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({ process, nodes, edges }, null, 2),
        },
      ],
    };
  }

  // Markdown format
  let text = `# ${process.name}\n\n`;
  if (process.description) {
    text += `${process.description}\n\n`;
  }

  // Group by type
  const byType = new Map<string, typeof nodes>();
  for (const node of nodes) {
    if (!byType.has(node.type)) byType.set(node.type, []);
    byType.get(node.type)!.push(node);
  }

  for (const type of ['start', 'task', 'decision', 'end']) {
    const typeNodes = byType.get(type);
    if (!typeNodes || typeNodes.length === 0) continue;

    text += `## ${type.charAt(0).toUpperCase() + type.slice(1)} Nodes\n\n`;

    for (const node of typeNodes) {
      text += `### ${node.title}\n`;
      if (node.description) text += `${node.description}\n`;

      const outEdges = edges.filter((e) => e.source_node_id === node.id);
      if (outEdges.length > 0) {
        text += '\n**Leads to:**\n';
        for (const edge of outEdges) {
          const target = nodeMap.get(edge.target_node_id);
          const label = edge.label ? ` (${edge.label})` : '';
          text += `- ${target?.title || edge.target_node_id}${label}\n`;
        }
      }
      text += '\n';
    }
  }

  return {
    content: [{ type: 'text' as const, text }],
  };
}

function handleGetNodeNeighborhood(args: { node_id: string; depth?: number }) {
  const { node_id, depth = 1 } = args;
  const maxDepth = Math.min(depth, 5);

  const startNode = db
    .prepare(
      'SELECT n.*, p.name as process_name FROM nodes n JOIN processes p ON n.process_id = p.id WHERE n.id = ?'
    )
    .get(node_id) as
    | {
        id: string;
        process_id: string;
        type: string;
        title: string;
        description: string | null;
        process_name: string;
      }
    | undefined;

  if (!startNode) {
    return {
      content: [{ type: 'text' as const, text: `Node not found: ${node_id}` }],
      isError: true,
    };
  }

  const visited = new Set<string>([node_id]);
  const queue: Array<{ id: string; depth: number }> = [{ id: node_id, depth: 0 }];
  const neighborNodes: Array<{ id: string; title: string; type: string; depth: number }> = [];
  const foundEdges: Array<{
    source: string;
    target: string;
    label: string | null;
    sourceTitle: string;
    targetTitle: string;
  }> = [];

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current.depth >= maxDepth) continue;

    const edges = db
      .prepare(
        `
      SELECT e.*, sn.title as source_title, tn.title as target_title
      FROM edges e
      JOIN nodes sn ON e.source_node_id = sn.id
      JOIN nodes tn ON e.target_node_id = tn.id
      WHERE e.source_node_id = ? OR e.target_node_id = ?
    `
      )
      .all(current.id, current.id) as Array<{
      source_node_id: string;
      target_node_id: string;
      label: string | null;
      source_title: string;
      target_title: string;
    }>;

    for (const edge of edges) {
      foundEdges.push({
        source: edge.source_node_id,
        target: edge.target_node_id,
        label: edge.label,
        sourceTitle: edge.source_title,
        targetTitle: edge.target_title,
      });

      const neighborId =
        edge.source_node_id === current.id ? edge.target_node_id : edge.source_node_id;

      if (!visited.has(neighborId)) {
        visited.add(neighborId);

        const neighbor = db
          .prepare('SELECT id, title, type FROM nodes WHERE id = ?')
          .get(neighborId) as { id: string; title: string; type: string } | undefined;

        if (neighbor) {
          neighborNodes.push({
            ...neighbor,
            depth: current.depth + 1,
          });
          queue.push({ id: neighborId, depth: current.depth + 1 });
        }
      }
    }
  }

  let text = `# Neighborhood of "${startNode.title}"\n\n`;
  text += `**Type:** ${startNode.type}\n`;
  text += `**Process:** ${startNode.process_name}\n`;
  if (startNode.description) text += `**Description:** ${startNode.description}\n`;
  text += `\n## Connected Nodes (depth ${maxDepth})\n\n`;

  for (const node of neighborNodes) {
    text += `- **${node.title}** (${node.type}) - ${node.depth} hop${node.depth > 1 ? 's' : ''} away\n`;
  }

  text += '\n## Connections\n\n';
  const uniqueEdges = new Map<string, (typeof foundEdges)[0]>();
  for (const edge of foundEdges) {
    uniqueEdges.set(`${edge.source}-${edge.target}`, edge);
  }

  for (const edge of uniqueEdges.values()) {
    const label = edge.label ? ` (${edge.label})` : '';
    text += `- ${edge.sourceTitle} → ${edge.targetTitle}${label}\n`;
  }

  return {
    content: [{ type: 'text' as const, text }],
  };
}

function handleFindPaths(args: {
  source_node_id: string;
  target_node_id: string;
  max_paths?: number;
}) {
  const { source_node_id, target_node_id, max_paths = 10 } = args;

  const sourceNode = db
    .prepare('SELECT id, process_id, title FROM nodes WHERE id = ?')
    .get(source_node_id) as { id: string; process_id: string; title: string } | undefined;

  const targetNode = db
    .prepare('SELECT id, process_id, title FROM nodes WHERE id = ?')
    .get(target_node_id) as { id: string; process_id: string; title: string } | undefined;

  if (!sourceNode || !targetNode) {
    return {
      content: [{ type: 'text' as const, text: 'One or both nodes not found' }],
      isError: true,
    };
  }

  if (sourceNode.process_id !== targetNode.process_id) {
    return {
      content: [{ type: 'text' as const, text: 'Nodes must be in the same process' }],
      isError: true,
    };
  }

  const edges = db
    .prepare('SELECT source_node_id, target_node_id, label FROM edges WHERE process_id = ?')
    .all(sourceNode.process_id) as Array<{
    source_node_id: string;
    target_node_id: string;
    label: string | null;
  }>;

  // Build adjacency
  const adjacency = new Map<string, Array<{ target: string; label: string | null }>>();
  for (const edge of edges) {
    if (!adjacency.has(edge.source_node_id)) adjacency.set(edge.source_node_id, []);
    adjacency.get(edge.source_node_id)!.push({
      target: edge.target_node_id,
      label: edge.label,
    });
  }

  const paths: Array<{ nodes: string[]; labels: (string | null)[] }> = [];
  const maxPathsNum = Math.min(max_paths, 50);

  function dfs(
    current: string,
    target: string,
    path: string[],
    labels: (string | null)[],
    visited: Set<string>
  ) {
    if (paths.length >= maxPathsNum) return;
    if (path.length > 20) return;

    if (current === target) {
      paths.push({ nodes: [...path], labels: [...labels] });
      return;
    }

    const neighbors = adjacency.get(current) || [];
    for (const { target: next, label } of neighbors) {
      if (!visited.has(next)) {
        visited.add(next);
        path.push(next);
        labels.push(label);
        dfs(next, target, path, labels, visited);
        path.pop();
        labels.pop();
        visited.delete(next);
      }
    }
  }

  dfs(source_node_id, target_node_id, [source_node_id], [], new Set([source_node_id]));

  // Get node titles
  const nodeIds = new Set<string>();
  paths.forEach((p) => p.nodes.forEach((n) => nodeIds.add(n)));

  const nodeMap = new Map<string, string>();
  if (nodeIds.size > 0) {
    const placeholders = Array.from(nodeIds)
      .map(() => '?')
      .join(',');
    const nodesList = db
      .prepare(`SELECT id, title FROM nodes WHERE id IN (${placeholders})`)
      .all(...Array.from(nodeIds)) as Array<{ id: string; title: string }>;
    nodesList.forEach((n) => nodeMap.set(n.id, n.title));
  }

  let text = `# Paths from "${sourceNode.title}" to "${targetNode.title}"\n\n`;
  text += `Found ${paths.length} path${paths.length !== 1 ? 's' : ''}:\n\n`;

  for (let i = 0; i < paths.length; i++) {
    const path = paths[i];
    text += `## Path ${i + 1} (${path.nodes.length} steps)\n`;

    for (let j = 0; j < path.nodes.length; j++) {
      const nodeTitle = nodeMap.get(path.nodes[j]) || path.nodes[j];
      text += `${j + 1}. ${nodeTitle}`;
      if (j < path.labels.length && path.labels[j]) {
        text += ` → *${path.labels[j]}*`;
      }
      text += '\n';
    }
    text += '\n';
  }

  return {
    content: [{ type: 'text' as const, text }],
  };
}

function handleGetSubgraph(args: {
  process_id: string;
  start_node_ids: string[];
  direction?: string;
  depth?: number;
}) {
  const { process_id, start_node_ids, direction = 'downstream', depth = 10 } = args;
  const maxDepth = Math.min(depth, 20);

  const process = db.prepare('SELECT id, name FROM processes WHERE id = ?').get(process_id) as
    | { id: string; name: string }
    | undefined;

  if (!process) {
    return {
      content: [{ type: 'text' as const, text: `Process not found: ${process_id}` }],
      isError: true,
    };
  }

  const edges = db.prepare('SELECT * FROM edges WHERE process_id = ?').all(process_id) as Array<{
    source_node_id: string;
    target_node_id: string;
    label: string | null;
  }>;

  // Build adjacency
  const adjacency = new Map<string, string[]>();
  for (const edge of edges) {
    if (direction === 'downstream' || direction === 'both') {
      if (!adjacency.has(edge.source_node_id)) adjacency.set(edge.source_node_id, []);
      adjacency.get(edge.source_node_id)!.push(edge.target_node_id);
    }
    if (direction === 'upstream' || direction === 'both') {
      if (!adjacency.has(edge.target_node_id)) adjacency.set(edge.target_node_id, []);
      adjacency.get(edge.target_node_id)!.push(edge.source_node_id);
    }
  }

  // BFS
  const visited = new Set<string>(start_node_ids);
  const queue = start_node_ids.map((id) => ({ id, depth: 0 }));

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current.depth >= maxDepth) continue;

    const neighbors = adjacency.get(current.id) || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        queue.push({ id: neighbor, depth: current.depth + 1 });
      }
    }
  }

  // Get nodes
  const nodeIds = Array.from(visited);
  let nodes: Array<{ id: string; type: string; title: string; description: string | null }> = [];

  if (nodeIds.length > 0) {
    const placeholders = nodeIds.map(() => '?').join(',');
    nodes = db
      .prepare(
        `SELECT id, type, title, description FROM nodes WHERE id IN (${placeholders})`
      )
      .all(...nodeIds) as typeof nodes;
  }

  // Filter edges within subgraph
  const subgraphEdges = edges.filter(
    (e) => visited.has(e.source_node_id) && visited.has(e.target_node_id)
  );

  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  let text = `# Subgraph from "${process.name}"\n\n`;
  text += `**Direction:** ${direction}\n`;
  text += `**Depth:** ${maxDepth}\n`;
  text += `**Nodes:** ${nodes.length}\n`;
  text += `**Edges:** ${subgraphEdges.length}\n\n`;

  text += '## Nodes\n\n';
  for (const node of nodes) {
    text += `- **${node.title}** (${node.type})`;
    if (node.description) text += `: ${node.description}`;
    text += '\n';
  }

  text += '\n## Edges\n\n';
  for (const edge of subgraphEdges) {
    const source = nodeMap.get(edge.source_node_id);
    const target = nodeMap.get(edge.target_node_id);
    const label = edge.label ? ` (${edge.label})` : '';
    text += `- ${source?.title || edge.source_node_id} → ${target?.title || edge.target_node_id}${label}\n`;
  }

  return {
    content: [{ type: 'text' as const, text }],
  };
}

function handleListProcesses() {
  const processes = db
    .prepare(
      `
    SELECT
      p.id,
      p.name,
      p.description,
      p.version,
      COUNT(DISTINCT n.id) as node_count,
      COUNT(DISTINCT e.id) as edge_count,
      SUM(CASE WHEN n.type = 'decision' THEN 1 ELSE 0 END) as decision_count,
      COUNT(DISTINCT pr.id) as project_count
    FROM processes p
    LEFT JOIN nodes n ON n.process_id = p.id
    LEFT JOIN edges e ON e.process_id = p.id
    LEFT JOIN projects pr ON pr.process_id = p.id
    GROUP BY p.id
    ORDER BY p.name
  `
    )
    .all() as Array<{
    id: string;
    name: string;
    description: string | null;
    version: number;
    node_count: number;
    edge_count: number;
    decision_count: number;
    project_count: number;
  }>;

  let text = '# Available Processes\n\n';

  if (processes.length === 0) {
    text += 'No processes found.\n';
  } else {
    for (const p of processes) {
      text += `## ${p.name}\n`;
      if (p.description) text += `${p.description}\n`;
      text += `- **ID:** ${p.id}\n`;
      text += `- **Version:** ${p.version}\n`;
      text += `- **Nodes:** ${p.node_count} (${p.decision_count} decisions)\n`;
      text += `- **Edges:** ${p.edge_count}\n`;
      text += `- **Projects:** ${p.project_count}\n\n`;
    }
  }

  return {
    content: [{ type: 'text' as const, text }],
  };
}

function handleGetProjectHistory(args: { project_id: string }) {
  const { project_id } = args;

  const project = db
    .prepare(
      `
    SELECT p.*, pr.name as process_name
    FROM projects p
    JOIN processes pr ON p.process_id = pr.id
    WHERE p.id = ?
  `
    )
    .get(project_id) as
    | {
        id: string;
        name: string;
        status: string;
        process_name: string;
      }
    | undefined;

  if (!project) {
    return {
      content: [{ type: 'text' as const, text: `Project not found: ${project_id}` }],
      isError: true,
    };
  }

  const nodeStatuses = db
    .prepare(
      `
    SELECT
      pns.*,
      n.title as node_title,
      n.type as node_type
    FROM project_node_statuses pns
    JOIN nodes n ON pns.node_id = n.id
    WHERE pns.project_id = ?
    ORDER BY pns.completed_at ASC NULLS LAST
  `
    )
    .all(project_id) as Array<{
    status: string;
    decision_result: string | null;
    form_data: string;
    notes: string | null;
    started_at: string | null;
    completed_at: string | null;
    node_title: string;
    node_type: string;
  }>;

  const traversals = db
    .prepare(
      `
    SELECT
      pet.executed_at,
      e.label,
      sn.title as source_title,
      tn.title as target_title
    FROM project_edge_traversals pet
    JOIN edges e ON pet.edge_id = e.id
    JOIN nodes sn ON e.source_node_id = sn.id
    JOIN nodes tn ON e.target_node_id = tn.id
    WHERE pet.project_id = ?
    ORDER BY pet.executed_at ASC
  `
    )
    .all(project_id) as Array<{
    executed_at: string;
    label: string | null;
    source_title: string;
    target_title: string;
  }>;

  let text = `# Project History: ${project.name}\n\n`;
  text += `**Process:** ${project.process_name}\n`;
  text += `**Status:** ${project.status}\n\n`;

  // Stats
  const completed = nodeStatuses.filter((s) => s.status === 'complete').length;
  const inProgress = nodeStatuses.filter((s) => s.status === 'in_progress').length;
  const decisions = nodeStatuses.filter((s) => s.decision_result).length;

  text += `## Progress\n`;
  text += `- **Completed:** ${completed}/${nodeStatuses.length} nodes\n`;
  text += `- **In Progress:** ${inProgress} nodes\n`;
  text += `- **Decisions Made:** ${decisions}\n`;
  text += `- **Paths Traversed:** ${traversals.length}\n\n`;

  // Decision log
  const decisionNodes = nodeStatuses.filter((s) => s.decision_result);
  if (decisionNodes.length > 0) {
    text += '## Decisions Made\n\n';
    for (const node of decisionNodes) {
      text += `- **${node.node_title}:** ${node.decision_result}`;
      if (node.completed_at) text += ` (${node.completed_at})`;
      text += '\n';
    }
    text += '\n';
  }

  // Path taken
  if (traversals.length > 0) {
    text += '## Path Taken\n\n';
    for (const t of traversals) {
      const label = t.label ? ` (${t.label})` : '';
      text += `- ${t.source_title} → ${t.target_title}${label}\n`;
    }
  }

  return {
    content: [{ type: 'text' as const, text }],
  };
}

function handleListProjects(args: { status?: string }) {
  const { status } = args;

  let sql = `
    SELECT
      p.*,
      pr.name as process_name,
      COUNT(CASE WHEN pns.status = 'complete' THEN 1 END) as completed_nodes,
      COUNT(pns.id) as total_nodes
    FROM projects p
    JOIN processes pr ON p.process_id = pr.id
    LEFT JOIN project_node_statuses pns ON pns.project_id = p.id
  `;

  const params: string[] = [];
  if (status) {
    sql += ' WHERE p.status = ?';
    params.push(status);
  }

  sql += ' GROUP BY p.id ORDER BY p.updated_at DESC';

  const projects = db.prepare(sql).all(...params) as Array<{
    id: string;
    name: string;
    status: string;
    process_name: string;
    completed_nodes: number;
    total_nodes: number;
    created_at: string;
    updated_at: string;
  }>;

  let text = '# Projects\n\n';

  if (projects.length === 0) {
    text += 'No projects found.\n';
  } else {
    for (const p of projects) {
      const progress = p.total_nodes > 0 ? Math.round((p.completed_nodes / p.total_nodes) * 100) : 0;

      text += `## ${p.name}\n`;
      text += `- **ID:** ${p.id}\n`;
      text += `- **Process:** ${p.process_name}\n`;
      text += `- **Status:** ${p.status}\n`;
      text += `- **Progress:** ${p.completed_nodes}/${p.total_nodes} (${progress}%)\n`;
      text += `- **Last Updated:** ${p.updated_at}\n\n`;
    }
  }

  return {
    content: [{ type: 'text' as const, text }],
  };
}

// List available resources (processes and projects as browseable items)
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  const processes = db
    .prepare('SELECT id, name FROM processes ORDER BY name')
    .all() as Array<{ id: string; name: string }>;

  const projects = db
    .prepare("SELECT id, name FROM projects WHERE status = 'active' ORDER BY name")
    .all() as Array<{ id: string; name: string }>;

  const resources = [
    ...processes.map((p) => ({
      uri: `knowflow://process/${p.id}`,
      name: `Process: ${p.name}`,
      mimeType: 'text/markdown',
    })),
    ...projects.map((p) => ({
      uri: `knowflow://project/${p.id}`,
      name: `Project: ${p.name}`,
      mimeType: 'text/markdown',
    })),
  ];

  return { resources };
});

// Read a specific resource
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const { uri } = request.params;

  const match = uri.match(/^knowflow:\/\/(process|project)\/(.+)$/);
  if (!match) {
    throw new Error(`Invalid resource URI: ${uri}`);
  }

  const [, type, id] = match;

  if (type === 'process') {
    const result = handleGetProcessContext({ process_id: id, format: 'markdown' });
    return {
      contents: [
        {
          uri,
          mimeType: 'text/markdown',
          text: result.content[0].text,
        },
      ],
    };
  }

  if (type === 'project') {
    const result = handleGetProjectHistory({ project_id: id });
    return {
      contents: [
        {
          uri,
          mimeType: 'text/markdown',
          text: result.content[0].text,
        },
      ],
    };
  }

  throw new Error(`Unknown resource type: ${type}`);
});

// Main entry point
async function main() {
  initDb();

  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error('Know-Flow MCP server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
