import { Router, Request, Response } from 'express';
import { all, get } from '../utils/db.js';
import type { NodeRow, EdgeRow, ProcessRow, ProjectRow, ProjectNodeStatusRow, ProjectEdgeTraversalRow } from '../types/db.js';

const router = Router();

/**
 * Graph RAG API Routes
 *
 * These endpoints enable querying and extracting context from the knowledge graph
 * for RAG (Retrieval-Augmented Generation) use cases.
 */

// Types for graph traversal
interface GraphNode {
  id: string;
  type: string;
  title: string;
  description: string | null;
  form_schema: Record<string, unknown>;
  metadata: Record<string, unknown>;
  depth?: number;
}

interface GraphEdge {
  id: string;
  source_node_id: string;
  target_node_id: string;
  label: string | null;
  condition: Record<string, unknown>;
}

interface GraphContext {
  process: {
    id: string;
    name: string;
    description: string | null;
  };
  nodes: GraphNode[];
  edges: GraphEdge[];
  paths?: string[][];
  context_text?: string;
}

/**
 * GET /api/graph/search
 * Search nodes across all processes by title, description, or content
 */
router.get('/search', (req: Request, res: Response) => {
  try {
    const { q, type, process_id, limit = '50' } = req.query;

    if (!q || typeof q !== 'string') {
      return res.status(400).json({ error: 'Search query (q) is required' });
    }

    const searchTerm = `%${q}%`;
    const limitNum = Math.min(parseInt(limit as string) || 50, 100);

    let query = `
      SELECT
        n.id,
        n.process_id,
        n.type,
        n.title,
        n.description,
        n.form_schema,
        n.metadata,
        p.name as process_name,
        p.description as process_description
      FROM nodes n
      JOIN processes p ON n.process_id = p.id
      WHERE (
        n.title LIKE ? OR
        n.description LIKE ? OR
        n.metadata LIKE ?
      )
    `;

    const params: (string | number)[] = [searchTerm, searchTerm, searchTerm];

    if (type && typeof type === 'string') {
      query += ' AND n.type = ?';
      params.push(type);
    }

    if (process_id && typeof process_id === 'string') {
      query += ' AND n.process_id = ?';
      params.push(process_id);
    }

    query += ' ORDER BY n.title LIMIT ?';
    params.push(limitNum);

    const results = all(query, params);

    // Parse JSON fields
    const nodes = results.map((row: Record<string, unknown>) => ({
      ...row,
      form_schema: JSON.parse(row.form_schema as string || '{}'),
      metadata: JSON.parse(row.metadata as string || '{}')
    }));

    res.json({
      query: q,
      count: nodes.length,
      results: nodes
    });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * GET /api/graph/process/:id/context
 * Get the full context of a process as a knowledge graph
 */
router.get('/process/:id/context', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { format = 'json', include_paths = 'false' } = req.query;

    // Get process
    const process = get('SELECT id, name, description FROM processes WHERE id = ?', [id]);
    if (!process) {
      return res.status(404).json({ error: 'Process not found' });
    }

    // Get all nodes
    const nodes = all(`
      SELECT id, type, title, description, form_schema, metadata
      FROM nodes WHERE process_id = ?
      ORDER BY type, title
    `, [id]).map((row: Record<string, unknown>) => ({
      ...row,
      form_schema: JSON.parse(row.form_schema as string || '{}'),
      metadata: JSON.parse(row.metadata as string || '{}')
    })) as GraphNode[];

    // Get all edges
    const edges = all(`
      SELECT id, source_node_id, target_node_id, label, condition
      FROM edges WHERE process_id = ?
    `, [id]).map((row: Record<string, unknown>) => ({
      ...row,
      condition: JSON.parse(row.condition as string || '{}')
    })) as GraphEdge[];

    const context: GraphContext = {
      process: process as GraphContext['process'],
      nodes,
      edges
    };

    // Optionally compute all paths from start to end
    if (include_paths === 'true') {
      context.paths = computeAllPaths(nodes, edges);
    }

    // Generate text context if requested
    if (format === 'markdown' || format === 'text') {
      context.context_text = generateContextText(context, format as 'markdown' | 'text');
    }

    res.json(context);
  } catch (error) {
    console.error('Context error:', error);
    res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * GET /api/graph/node/:id/neighborhood
 * Get a node and its immediate neighbors (connected nodes)
 */
router.get('/node/:id/neighborhood', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { depth = '1' } = req.query;
    const maxDepth = Math.min(parseInt(depth as string) || 1, 5);

    // Get the starting node
    const startNode = get(`
      SELECT id, process_id, type, title, description, form_schema, metadata
      FROM nodes WHERE id = ?
    `, [id]);

    if (!startNode) {
      return res.status(404).json({ error: 'Node not found' });
    }

    // BFS to find neighborhood
    const visited = new Set<string>([id]);
    const nodeQueue: Array<{ id: string; depth: number }> = [{ id, depth: 0 }];
    const neighborNodes: GraphNode[] = [];
    const neighborEdges: GraphEdge[] = [];

    while (nodeQueue.length > 0) {
      const current = nodeQueue.shift()!;

      if (current.depth >= maxDepth) continue;

      // Get outgoing edges
      const outEdges = all<EdgeRow>(`
        SELECT id, source_node_id, target_node_id, label, condition
        FROM edges WHERE source_node_id = ?
      `, [current.id]);

      // Get incoming edges
      const inEdges = all<EdgeRow>(`
        SELECT id, source_node_id, target_node_id, label, condition
        FROM edges WHERE target_node_id = ?
      `, [current.id]);

      const allEdges = [...outEdges, ...inEdges];

      for (const edge of allEdges) {
        const edgeData = {
          ...edge,
          condition: JSON.parse(edge.condition || '{}')
        } as GraphEdge;

        // Add edge if not already added
        if (!neighborEdges.find(e => e.id === edge.id)) {
          neighborEdges.push(edgeData);
        }

        // Find the neighbor node
        const neighborId = edge.source_node_id === current.id
          ? edge.target_node_id
          : edge.source_node_id;

        if (!visited.has(neighborId)) {
          visited.add(neighborId);

          const neighborNode = get<NodeRow>(`
            SELECT id, type, title, description, form_schema, metadata
            FROM nodes WHERE id = ?
          `, [neighborId]);

          if (neighborNode) {
            const nodeData = {
              ...neighborNode,
              form_schema: JSON.parse(neighborNode.form_schema || '{}'),
              metadata: JSON.parse(neighborNode.metadata || '{}'),
              depth: current.depth + 1
            } as GraphNode;

            neighborNodes.push(nodeData);
            nodeQueue.push({ id: neighborId, depth: current.depth + 1 });
          }
        }
      }
    }

    const centerNode = {
      ...startNode,
      form_schema: JSON.parse((startNode as Record<string, unknown>).form_schema as string || '{}'),
      metadata: JSON.parse((startNode as Record<string, unknown>).metadata as string || '{}'),
      depth: 0
    };

    res.json({
      center: centerNode,
      neighbors: neighborNodes,
      edges: neighborEdges,
      total_nodes: neighborNodes.length + 1
    });
  } catch (error) {
    console.error('Neighborhood error:', error);
    res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * GET /api/graph/node/:id/paths-to/:targetId
 * Find all paths between two nodes
 */
router.get('/node/:id/paths-to/:targetId', (req: Request, res: Response) => {
  try {
    const { id, targetId } = req.params;
    const { max_paths = '10', max_length = '20' } = req.query;

    // Verify both nodes exist and are in the same process
    const sourceNode = get<NodeRow>('SELECT id, process_id, title FROM nodes WHERE id = ?', [id]);
    const targetNode = get<NodeRow>('SELECT id, process_id, title FROM nodes WHERE id = ?', [targetId]);

    if (!sourceNode || !targetNode) {
      return res.status(404).json({ error: 'One or both nodes not found' });
    }

    if (sourceNode.process_id !== targetNode.process_id) {
      return res.status(400).json({ error: 'Nodes must be in the same process' });
    }

    // Get all edges for the process
    const edges = all<EdgeRow>(`
      SELECT source_node_id, target_node_id, label
      FROM edges WHERE process_id = ?
    `, [sourceNode.process_id]);

    // Build adjacency list
    const adjacency = new Map<string, Array<{ target: string; label: string | null }>>();
    for (const edge of edges) {
      if (!adjacency.has(edge.source_node_id)) {
        adjacency.set(edge.source_node_id, []);
      }
      adjacency.get(edge.source_node_id)!.push({
        target: edge.target_node_id,
        label: edge.label
      });
    }

    // DFS to find all paths
    const paths: Array<{ nodes: string[]; labels: (string | null)[] }> = [];
    const maxPathsNum = Math.min(parseInt(max_paths as string) || 10, 50);
    const maxLengthNum = Math.min(parseInt(max_length as string) || 20, 50);

    function dfs(
      current: string,
      target: string,
      path: string[],
      labels: (string | null)[],
      visited: Set<string>
    ) {
      if (paths.length >= maxPathsNum) return;
      if (path.length > maxLengthNum) return;

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

    dfs(id, targetId, [id], [], new Set([id]));

    // Enrich paths with node titles
    const nodeMap = new Map<string, string>();
    const nodeIds = new Set<string>();
    paths.forEach(p => p.nodes.forEach(n => nodeIds.add(n)));

    const nodesList = all<NodeRow>(`
      SELECT id, title FROM nodes WHERE id IN (${Array.from(nodeIds).map(() => '?').join(',')})
    `, Array.from(nodeIds));

    nodesList.forEach((n) => nodeMap.set(n.id, n.title));

    const enrichedPaths = paths.map(p => ({
      ...p,
      node_titles: p.nodes.map(n => nodeMap.get(n) || n),
      length: p.nodes.length
    }));

    res.json({
      source: { id, title: sourceNode.title },
      target: { id: targetId, title: targetNode.title },
      paths: enrichedPaths,
      total_paths: paths.length
    });
  } catch (error) {
    console.error('Path finding error:', error);
    res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * GET /api/graph/process/:id/subgraph
 * Extract a subgraph starting from specified nodes
 */
router.get('/process/:id/subgraph', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { start_nodes, direction = 'downstream', depth = '10' } = req.query;

    if (!start_nodes) {
      return res.status(400).json({ error: 'start_nodes parameter required (comma-separated node IDs)' });
    }

    const startNodeIds = (start_nodes as string).split(',').map(s => s.trim());
    const maxDepth = Math.min(parseInt(depth as string) || 10, 20);

    // Verify process exists
    const process = get<ProcessRow>('SELECT id, name FROM processes WHERE id = ?', [id]);
    if (!process) {
      return res.status(404).json({ error: 'Process not found' });
    }

    // Get all edges
    const edges = all<EdgeRow>('SELECT * FROM edges WHERE process_id = ?', [id]);

    // Build adjacency based on direction
    const adjacency = new Map<string, string[]>();
    for (const edge of edges) {
      if (direction === 'downstream' || direction === 'both') {
        if (!adjacency.has(edge.source_node_id)) {
          adjacency.set(edge.source_node_id, []);
        }
        adjacency.get(edge.source_node_id)!.push(edge.target_node_id);
      }
      if (direction === 'upstream' || direction === 'both') {
        if (!adjacency.has(edge.target_node_id)) {
          adjacency.set(edge.target_node_id, []);
        }
        adjacency.get(edge.target_node_id)!.push(edge.source_node_id);
      }
    }

    // BFS from start nodes
    const visited = new Set<string>(startNodeIds);
    const queue: Array<{ id: string; depth: number }> = startNodeIds.map(id => ({ id, depth: 0 }));

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

    // Get all nodes in subgraph
    const nodeIds = Array.from(visited);
    const nodes = nodeIds.length > 0 ? all(`
      SELECT id, type, title, description, form_schema, metadata
      FROM nodes WHERE id IN (${nodeIds.map(() => '?').join(',')})
    `, nodeIds).map((row: Record<string, unknown>) => ({
      ...row,
      form_schema: JSON.parse(row.form_schema as string || '{}'),
      metadata: JSON.parse(row.metadata as string || '{}')
    })) : [];

    // Get edges within subgraph
    const subgraphEdges = edges.filter(
      (e) => visited.has(e.source_node_id) && visited.has(e.target_node_id)
    ).map((row) => ({
      id: row.id,
      source_node_id: row.source_node_id,
      target_node_id: row.target_node_id,
      label: row.label,
      condition: JSON.parse(row.condition || '{}')
    }));

    res.json({
      process: process,
      start_nodes: startNodeIds,
      direction,
      depth: maxDepth,
      nodes,
      edges: subgraphEdges,
      total_nodes: nodes.length,
      total_edges: subgraphEdges.length
    });
  } catch (error) {
    console.error('Subgraph error:', error);
    res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * POST /api/graph/context/build
 * Build a custom context from selected nodes and their relationships
 */
router.post('/context/build', (req: Request, res: Response) => {
  try {
    const { node_ids, include_neighbors = true, format = 'markdown' } = req.body;

    if (!node_ids || !Array.isArray(node_ids) || node_ids.length === 0) {
      return res.status(400).json({ error: 'node_ids array is required' });
    }

    // Get specified nodes
    const nodes = all(`
      SELECT n.*, p.name as process_name
      FROM nodes n
      JOIN processes p ON n.process_id = p.id
      WHERE n.id IN (${node_ids.map(() => '?').join(',')})
    `, node_ids).map((row: Record<string, unknown>) => ({
      ...row,
      form_schema: JSON.parse(row.form_schema as string || '{}'),
      metadata: JSON.parse(row.metadata as string || '{}')
    }));

    let allNodeIds = new Set(node_ids as string[]);
    let edges: GraphEdge[] = [];

    if (include_neighbors) {
      // Get edges connecting these nodes
      edges = all(`
        SELECT id, source_node_id, target_node_id, label, condition
        FROM edges
        WHERE source_node_id IN (${node_ids.map(() => '?').join(',')})
           OR target_node_id IN (${node_ids.map(() => '?').join(',')})
      `, [...node_ids, ...node_ids]).map((row: Record<string, unknown>) => ({
        ...row,
        condition: JSON.parse(row.condition as string || '{}')
      })) as GraphEdge[];

      // Collect neighbor IDs
      edges.forEach(e => {
        allNodeIds.add(e.source_node_id);
        allNodeIds.add(e.target_node_id);
      });
    }

    // Generate context text
    let contextText = '';

    if (format === 'markdown') {
      contextText = '# Knowledge Graph Context\n\n';

      // Group nodes by process
      const nodesByProcess = new Map<string, typeof nodes>();
      nodes.forEach(node => {
        const processName = (node as Record<string, unknown>).process_name as string;
        if (!nodesByProcess.has(processName)) {
          nodesByProcess.set(processName, []);
        }
        nodesByProcess.get(processName)!.push(node);
      });

      for (const [processName, processNodes] of nodesByProcess) {
        contextText += `## Process: ${processName}\n\n`;

        for (const node of processNodes) {
          const n = node as Record<string, unknown>;
          contextText += `### ${n.title} (${n.type})\n`;
          if (n.description) {
            contextText += `${n.description}\n`;
          }
          contextText += '\n';
        }
      }

      if (edges.length > 0) {
        contextText += '## Relationships\n\n';
        const nodeMap = new Map(nodes.map((n: Record<string, unknown>) => [n.id, n.title]));

        for (const edge of edges) {
          const sourceTitle = nodeMap.get(edge.source_node_id) || edge.source_node_id;
          const targetTitle = nodeMap.get(edge.target_node_id) || edge.target_node_id;
          const label = edge.label ? ` (${edge.label})` : '';
          contextText += `- ${sourceTitle} → ${targetTitle}${label}\n`;
        }
      }
    } else {
      // Plain text format
      contextText = 'Knowledge Graph Context\n\n';
      for (const node of nodes) {
        const n = node as Record<string, unknown>;
        contextText += `[${n.type}] ${n.title}\n`;
        if (n.description) {
          contextText += `  ${n.description}\n`;
        }
      }
    }

    res.json({
      nodes,
      edges,
      context_text: contextText,
      node_count: nodes.length,
      edge_count: edges.length
    });
  } catch (error) {
    console.error('Context build error:', error);
    res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * GET /api/graph/processes/summary
 * Get a summary of all processes for quick overview
 */
router.get('/processes/summary', (req: Request, res: Response) => {
  try {
    const processes = all(`
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
    `);

    res.json({
      count: processes.length,
      processes
    });
  } catch (error) {
    console.error('Summary error:', error);
    res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * GET /api/graph/project/:id/history
 * Get the decision history and traversal path for a project
 */
router.get('/project/:id/history', (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Get project info
    const project = get(`
      SELECT p.*, pr.name as process_name
      FROM projects p
      JOIN processes pr ON p.process_id = pr.id
      WHERE p.id = ?
    `, [id]);

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Get all node statuses with node info
    const nodeStatuses = all(`
      SELECT
        pns.*,
        n.title as node_title,
        n.type as node_type,
        n.description as node_description
      FROM project_node_statuses pns
      JOIN nodes n ON pns.node_id = n.id
      WHERE pns.project_id = ?
      ORDER BY pns.completed_at ASC NULLS LAST, pns.started_at ASC NULLS LAST
    `, [id]).map((row: Record<string, unknown>) => ({
      ...row,
      form_data: JSON.parse(row.form_data as string || '{}')
    }));

    // Get edge traversals
    const traversals = all(`
      SELECT
        pet.*,
        e.label as edge_label,
        sn.title as source_title,
        tn.title as target_title
      FROM project_edge_traversals pet
      JOIN edges e ON pet.edge_id = e.id
      JOIN nodes sn ON e.source_node_id = sn.id
      JOIN nodes tn ON e.target_node_id = tn.id
      WHERE pet.project_id = ?
      ORDER BY pet.executed_at ASC
    `, [id]);

    // Build timeline
    const timeline: Array<{
      type: 'node_started' | 'node_completed' | 'edge_traversed' | 'decision_made';
      timestamp: string;
      details: Record<string, unknown>;
    }> = [];

    for (const status of nodeStatuses) {
      const s = status as Record<string, unknown>;
      if (s.started_at) {
        timeline.push({
          type: 'node_started',
          timestamp: s.started_at as string,
          details: {
            node_id: s.node_id,
            node_title: s.node_title,
            node_type: s.node_type
          }
        });
      }
      if (s.completed_at) {
        timeline.push({
          type: s.decision_result ? 'decision_made' : 'node_completed',
          timestamp: s.completed_at as string,
          details: {
            node_id: s.node_id,
            node_title: s.node_title,
            node_type: s.node_type,
            decision_result: s.decision_result,
            form_data: s.form_data
          }
        });
      }
    }

    for (const traversal of traversals) {
      const t = traversal as Record<string, unknown>;
      timeline.push({
        type: 'edge_traversed',
        timestamp: t.executed_at as string,
        details: {
          edge_id: t.edge_id,
          edge_label: t.edge_label,
          from: t.source_title,
          to: t.target_title
        }
      });
    }

    // Sort timeline by timestamp
    timeline.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    // Compute completion stats
    const stats = {
      total_nodes: nodeStatuses.length,
      completed: nodeStatuses.filter((s: Record<string, unknown>) => s.status === 'complete').length,
      in_progress: nodeStatuses.filter((s: Record<string, unknown>) => s.status === 'in_progress').length,
      skipped: nodeStatuses.filter((s: Record<string, unknown>) => s.status === 'skipped').length,
      decisions_made: nodeStatuses.filter((s: Record<string, unknown>) => s.decision_result).length,
      edges_traversed: traversals.length
    };

    res.json({
      project,
      node_statuses: nodeStatuses,
      edge_traversals: traversals,
      timeline,
      stats
    });
  } catch (error) {
    console.error('History error:', error);
    res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * GET /api/graph/export/process/:id
 * Export a process in various formats for external tools and RAG pipelines
 */
router.get('/export/process/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { format = 'json' } = req.query;

    // Get process
    const process = get('SELECT * FROM processes WHERE id = ?', [id]);
    if (!process) {
      return res.status(404).json({ error: 'Process not found' });
    }

    // Get all nodes
    const nodes = all(`
      SELECT id, type, title, description, form_schema, metadata, position_x, position_y
      FROM nodes WHERE process_id = ?
      ORDER BY type, title
    `, [id]).map((row: Record<string, unknown>) => ({
      ...row,
      form_schema: JSON.parse(row.form_schema as string || '{}'),
      metadata: JSON.parse(row.metadata as string || '{}')
    }));

    // Get all edges
    const edges = all(`
      SELECT id, source_node_id, target_node_id, label, condition
      FROM edges WHERE process_id = ?
    `, [id]).map((row: Record<string, unknown>) => ({
      ...row,
      condition: JSON.parse(row.condition as string || '{}')
    }));

    const nodeMap = new Map(nodes.map((n: Record<string, unknown>) => [n.id, n]));

    switch (format) {
      case 'json': {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="${(process as Record<string, unknown>).name}-graph.json"`);
        return res.json({
          process,
          nodes,
          edges,
          exported_at: new Date().toISOString()
        });
      }

      case 'markdown': {
        const context: GraphContext = {
          process: process as GraphContext['process'],
          nodes: nodes as GraphNode[],
          edges: edges as GraphEdge[],
          paths: computeAllPaths(nodes as GraphNode[], edges as GraphEdge[])
        };
        const markdown = generateContextText(context, 'markdown');
        res.setHeader('Content-Type', 'text/markdown');
        res.setHeader('Content-Disposition', `attachment; filename="${(process as Record<string, unknown>).name}-graph.md"`);
        return res.send(markdown);
      }

      case 'dot': {
        // Graphviz DOT format
        let dot = `digraph "${(process as Record<string, unknown>).name}" {\n`;
        dot += '  rankdir=TB;\n';
        dot += '  node [shape=box, style=rounded];\n\n';

        // Define nodes with shapes based on type
        for (const node of nodes) {
          const n = node as Record<string, unknown>;
          let shape = 'box';
          let color = '#3b82f6';
          switch (n.type) {
            case 'start': shape = 'ellipse'; color = '#22c55e'; break;
            case 'end': shape = 'ellipse'; color = '#ef4444'; break;
            case 'decision': shape = 'diamond'; color = '#eab308'; break;
            case 'task': shape = 'box'; color = '#3b82f6'; break;
          }
          const label = (n.title as string).replace(/"/g, '\\"');
          dot += `  "${n.id}" [label="${label}", shape=${shape}, fillcolor="${color}", style=filled];\n`;
        }

        dot += '\n';

        // Define edges
        for (const edge of edges) {
          const e = edge as Record<string, unknown>;
          const label = e.label ? ` [label="${(e.label as string).replace(/"/g, '\\"')}"]` : '';
          dot += `  "${e.source_node_id}" -> "${e.target_node_id}"${label};\n`;
        }

        dot += '}\n';

        res.setHeader('Content-Type', 'text/vnd.graphviz');
        res.setHeader('Content-Disposition', `attachment; filename="${(process as Record<string, unknown>).name}-graph.dot"`);
        return res.send(dot);
      }

      case 'mermaid': {
        // Mermaid flowchart format
        let mermaid = 'flowchart TD\n';

        // Define nodes
        for (const node of nodes) {
          const n = node as Record<string, unknown>;
          const id = (n.id as string).replace(/-/g, '_');
          const label = (n.title as string).replace(/"/g, "'");
          switch (n.type) {
            case 'start':
              mermaid += `  ${id}(("${label}"))\n`;
              break;
            case 'end':
              mermaid += `  ${id}(("${label}"))\n`;
              break;
            case 'decision':
              mermaid += `  ${id}{"${label}"}\n`;
              break;
            default:
              mermaid += `  ${id}["${label}"]\n`;
          }
        }

        mermaid += '\n';

        // Define edges
        for (const edge of edges) {
          const e = edge as Record<string, unknown>;
          const sourceId = (e.source_node_id as string).replace(/-/g, '_');
          const targetId = (e.target_node_id as string).replace(/-/g, '_');
          if (e.label) {
            mermaid += `  ${sourceId} -->|"${e.label}"| ${targetId}\n`;
          } else {
            mermaid += `  ${sourceId} --> ${targetId}\n`;
          }
        }

        // Add styling
        mermaid += '\n  %% Styling\n';
        for (const node of nodes) {
          const n = node as Record<string, unknown>;
          const id = (n.id as string).replace(/-/g, '_');
          switch (n.type) {
            case 'start':
              mermaid += `  style ${id} fill:#22c55e,color:#fff\n`;
              break;
            case 'end':
              mermaid += `  style ${id} fill:#ef4444,color:#fff\n`;
              break;
            case 'decision':
              mermaid += `  style ${id} fill:#eab308,color:#000\n`;
              break;
            default:
              mermaid += `  style ${id} fill:#3b82f6,color:#fff\n`;
          }
        }

        res.setHeader('Content-Type', 'text/plain');
        res.setHeader('Content-Disposition', `attachment; filename="${(process as Record<string, unknown>).name}-graph.mmd"`);
        return res.send(mermaid);
      }

      case 'llm-context': {
        // Structured context optimized for LLM consumption
        const context = generateLLMContext(
          process as Record<string, unknown>,
          nodes as GraphNode[],
          edges as GraphEdge[]
        );
        res.setHeader('Content-Type', 'text/plain');
        return res.send(context);
      }

      default:
        return res.status(400).json({ error: `Unknown format: ${format}. Supported: json, markdown, dot, mermaid, llm-context` });
    }
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * GET /api/graph/export/project/:id
 * Export a project with its execution history and decisions
 */
router.get('/export/project/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { format = 'json' } = req.query;

    // Get project with process info
    const project = get(`
      SELECT p.*, pr.name as process_name, pr.description as process_description
      FROM projects p
      JOIN processes pr ON p.process_id = pr.id
      WHERE p.id = ?
    `, [id]);

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Get node statuses
    const nodeStatuses = all(`
      SELECT
        pns.*,
        n.title as node_title,
        n.type as node_type,
        n.description as node_description
      FROM project_node_statuses pns
      JOIN nodes n ON pns.node_id = n.id
      WHERE pns.project_id = ?
      ORDER BY pns.completed_at ASC NULLS LAST
    `, [id]).map((row: Record<string, unknown>) => ({
      ...row,
      form_data: JSON.parse(row.form_data as string || '{}')
    }));

    // Get traversals
    const traversals = all(`
      SELECT
        pet.*,
        e.label as edge_label,
        sn.title as source_title,
        tn.title as target_title
      FROM project_edge_traversals pet
      JOIN edges e ON pet.edge_id = e.id
      JOIN nodes sn ON e.source_node_id = sn.id
      JOIN nodes tn ON e.target_node_id = tn.id
      WHERE pet.project_id = ?
      ORDER BY pet.executed_at ASC
    `, [id]);

    switch (format) {
      case 'json': {
        res.setHeader('Content-Type', 'application/json');
        return res.json({
          project,
          node_statuses: nodeStatuses,
          edge_traversals: traversals,
          exported_at: new Date().toISOString()
        });
      }

      case 'markdown': {
        let md = `# Project: ${(project as Record<string, unknown>).name}\n\n`;
        md += `**Process:** ${(project as Record<string, unknown>).process_name}\n`;
        md += `**Status:** ${(project as Record<string, unknown>).status}\n\n`;

        // Progress
        const completed = nodeStatuses.filter((s: Record<string, unknown>) => s.status === 'complete').length;
        md += `## Progress: ${completed}/${nodeStatuses.length} nodes completed\n\n`;

        // Decisions made
        const decisions = nodeStatuses.filter((s: Record<string, unknown>) => s.decision_result);
        if (decisions.length > 0) {
          md += '## Decisions Made\n\n';
          for (const d of decisions) {
            const dec = d as Record<string, unknown>;
            md += `### ${dec.node_title}\n`;
            md += `**Decision:** ${dec.decision_result}\n`;
            if (dec.notes) md += `**Notes:** ${dec.notes}\n`;
            if (dec.completed_at) md += `**When:** ${dec.completed_at}\n`;
            md += '\n';
          }
        }

        // Path taken
        if (traversals.length > 0) {
          md += '## Path Taken\n\n';
          for (const t of traversals) {
            const trav = t as Record<string, unknown>;
            const label = trav.edge_label ? ` (${trav.edge_label})` : '';
            md += `- ${trav.source_title} → ${trav.target_title}${label}\n`;
          }
        }

        // All node statuses
        md += '\n## Node Details\n\n';
        for (const status of nodeStatuses) {
          const s = status as Record<string, unknown>;
          md += `### ${s.node_title} (${s.node_type})\n`;
          md += `**Status:** ${s.status}\n`;
          if (s.assigned_to) md += `**Assigned to:** ${s.assigned_to}\n`;
          if (s.notes) md += `**Notes:** ${s.notes}\n`;
          if (Object.keys(s.form_data as object || {}).length > 0) {
            md += `**Form Data:**\n\`\`\`json\n${JSON.stringify(s.form_data, null, 2)}\n\`\`\`\n`;
          }
          md += '\n';
        }

        res.setHeader('Content-Type', 'text/markdown');
        return res.send(md);
      }

      case 'llm-context': {
        let context = `PROJECT EXECUTION CONTEXT\n`;
        context += `========================\n\n`;
        context += `Project: ${(project as Record<string, unknown>).name}\n`;
        context += `Process: ${(project as Record<string, unknown>).process_name}\n`;
        context += `Status: ${(project as Record<string, unknown>).status}\n\n`;

        // Decisions
        const decisions = nodeStatuses.filter((s: Record<string, unknown>) => s.decision_result);
        if (decisions.length > 0) {
          context += `DECISIONS MADE:\n`;
          for (const d of decisions) {
            const dec = d as Record<string, unknown>;
            context += `- At "${dec.node_title}": chose "${dec.decision_result}"`;
            if (dec.notes) context += ` (reason: ${dec.notes})`;
            context += `\n`;
          }
          context += '\n';
        }

        // Path
        if (traversals.length > 0) {
          context += `EXECUTION PATH:\n`;
          const pathSteps = traversals.map((t: Record<string, unknown>) => {
            const label = t.edge_label ? ` [${t.edge_label}]` : '';
            return `${t.source_title}${label} -> ${t.target_title}`;
          });
          context += pathSteps.join('\n') + '\n\n';
        }

        // Current state
        const inProgress = nodeStatuses.filter((s: Record<string, unknown>) => s.status === 'in_progress');
        if (inProgress.length > 0) {
          context += `CURRENTLY IN PROGRESS:\n`;
          for (const node of inProgress) {
            context += `- ${(node as Record<string, unknown>).node_title}\n`;
          }
        }

        res.setHeader('Content-Type', 'text/plain');
        return res.send(context);
      }

      default:
        return res.status(400).json({ error: `Unknown format: ${format}. Supported: json, markdown, llm-context` });
    }
  } catch (error) {
    console.error('Export project error:', error);
    res.status(500).json({ error: (error as Error).message });
  }
});

// Helper function for LLM-optimized context
function generateLLMContext(
  process: Record<string, unknown>,
  nodes: GraphNode[],
  edges: GraphEdge[]
): string {
  const nodeMap = new Map(nodes.map(n => [n.id, n]));

  let context = `KNOWLEDGE GRAPH: ${process.name}\n`;
  context += `${'='.repeat(40)}\n\n`;

  if (process.description) {
    context += `DESCRIPTION: ${process.description}\n\n`;
  }

  // Build structured representation
  context += `WORKFLOW STRUCTURE:\n`;
  context += `-`.repeat(20) + '\n\n';

  // Start nodes
  const startNodes = nodes.filter(n => n.type === 'start');
  if (startNodes.length > 0) {
    context += `ENTRY POINTS:\n`;
    for (const node of startNodes) {
      context += `  * ${node.title}`;
      if (node.description) context += `: ${node.description}`;
      context += '\n';
    }
    context += '\n';
  }

  // Tasks
  const taskNodes = nodes.filter(n => n.type === 'task');
  if (taskNodes.length > 0) {
    context += `TASKS:\n`;
    for (const node of taskNodes) {
      context += `  * ${node.title}`;
      if (node.description) context += `: ${node.description}`;
      context += '\n';

      // Show what comes next
      const outEdges = edges.filter(e => e.source_node_id === node.id);
      if (outEdges.length > 0) {
        for (const edge of outEdges) {
          const target = nodeMap.get(edge.target_node_id);
          context += `      -> ${target?.title || 'unknown'}`;
          if (edge.label) context += ` (${edge.label})`;
          context += '\n';
        }
      }
    }
    context += '\n';
  }

  // Decisions
  const decisionNodes = nodes.filter(n => n.type === 'decision');
  if (decisionNodes.length > 0) {
    context += `DECISION POINTS:\n`;
    for (const node of decisionNodes) {
      context += `  * ${node.title}`;
      if (node.description) context += `: ${node.description}`;
      context += '\n';

      // Show options
      const outEdges = edges.filter(e => e.source_node_id === node.id);
      if (outEdges.length > 0) {
        context += `    OPTIONS:\n`;
        for (const edge of outEdges) {
          const target = nodeMap.get(edge.target_node_id);
          const label = edge.label || 'default';
          context += `      - "${label}" -> ${target?.title || 'unknown'}\n`;
        }
      }
    }
    context += '\n';
  }

  // End nodes
  const endNodes = nodes.filter(n => n.type === 'end');
  if (endNodes.length > 0) {
    context += `EXIT POINTS:\n`;
    for (const node of endNodes) {
      context += `  * ${node.title}`;
      if (node.description) context += `: ${node.description}`;
      context += '\n';
    }
    context += '\n';
  }

  // Summary stats
  context += `SUMMARY:\n`;
  context += `  - Total nodes: ${nodes.length}\n`;
  context += `  - Decision points: ${decisionNodes.length}\n`;
  context += `  - Total connections: ${edges.length}\n`;

  return context;
}

// Helper functions

function computeAllPaths(nodes: GraphNode[], edges: GraphEdge[]): string[][] {
  const startNodes = nodes.filter(n => n.type === 'start');
  const endNodes = nodes.filter(n => n.type === 'end');

  if (startNodes.length === 0 || endNodes.length === 0) {
    return [];
  }

  // Build adjacency list
  const adjacency = new Map<string, string[]>();
  for (const edge of edges) {
    if (!adjacency.has(edge.source_node_id)) {
      adjacency.set(edge.source_node_id, []);
    }
    adjacency.get(edge.source_node_id)!.push(edge.target_node_id);
  }

  const allPaths: string[][] = [];
  const endNodeIds = new Set(endNodes.map(n => n.id));

  function dfs(current: string, path: string[], visited: Set<string>) {
    if (allPaths.length >= 100) return; // Limit paths

    if (endNodeIds.has(current)) {
      allPaths.push([...path]);
      return;
    }

    const neighbors = adjacency.get(current) || [];
    for (const next of neighbors) {
      if (!visited.has(next)) {
        visited.add(next);
        path.push(next);
        dfs(next, path, visited);
        path.pop();
        visited.delete(next);
      }
    }
  }

  for (const start of startNodes) {
    dfs(start.id, [start.id], new Set([start.id]));
  }

  return allPaths;
}

function generateContextText(context: GraphContext, format: 'markdown' | 'text'): string {
  const { process, nodes, edges, paths } = context;

  // Build node lookup
  const nodeMap = new Map(nodes.map(n => [n.id, n]));

  if (format === 'markdown') {
    let text = `# ${process.name}\n\n`;

    if (process.description) {
      text += `${process.description}\n\n`;
    }

    // Group by type
    const byType = new Map<string, GraphNode[]>();
    for (const node of nodes) {
      if (!byType.has(node.type)) {
        byType.set(node.type, []);
      }
      byType.get(node.type)!.push(node);
    }

    const typeOrder = ['start', 'task', 'decision', 'end'];
    for (const type of typeOrder) {
      const typeNodes = byType.get(type);
      if (!typeNodes || typeNodes.length === 0) continue;

      text += `## ${type.charAt(0).toUpperCase() + type.slice(1)} Nodes\n\n`;

      for (const node of typeNodes) {
        text += `### ${node.title}\n`;
        if (node.description) {
          text += `${node.description}\n`;
        }

        // Show outgoing edges
        const outEdges = edges.filter(e => e.source_node_id === node.id);
        if (outEdges.length > 0) {
          text += '\n**Next steps:**\n';
          for (const edge of outEdges) {
            const target = nodeMap.get(edge.target_node_id);
            const label = edge.label ? ` (${edge.label})` : '';
            text += `- → ${target?.title || edge.target_node_id}${label}\n`;
          }
        }
        text += '\n';
      }
    }

    // Show paths if available
    if (paths && paths.length > 0) {
      text += '## Possible Paths\n\n';
      for (let i = 0; i < Math.min(paths.length, 10); i++) {
        const pathTitles = paths[i].map(id => nodeMap.get(id)?.title || id);
        text += `${i + 1}. ${pathTitles.join(' → ')}\n`;
      }
    }

    return text;
  }

  // Plain text format
  let text = `Process: ${process.name}\n`;
  if (process.description) {
    text += `Description: ${process.description}\n`;
  }
  text += '\nNodes:\n';

  for (const node of nodes) {
    text += `  [${node.type}] ${node.title}`;
    if (node.description) {
      text += `: ${node.description}`;
    }
    text += '\n';
  }

  text += '\nConnections:\n';
  for (const edge of edges) {
    const source = nodeMap.get(edge.source_node_id);
    const target = nodeMap.get(edge.target_node_id);
    const label = edge.label ? ` (${edge.label})` : '';
    text += `  ${source?.title || edge.source_node_id} -> ${target?.title || edge.target_node_id}${label}\n`;
  }

  return text;
}

export const graphRagRoutes = router;
