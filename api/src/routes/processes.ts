import { Router, Request, Response } from 'express';
import { query } from '../utils/db.js';
import { parseJsonFields } from '../utils/helpers.js';

const router = Router();

// GET all processes
router.get('/', async (req: Request, res: Response) => {
  try {
    const result = await query(
      'SELECT * FROM processes ORDER BY created_at DESC'
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// GET single process with nodes and edges
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const processResult = await query(
      'SELECT * FROM processes WHERE id = $1',
      [id]
    );

    if (processResult.rows.length === 0) {
      return res.status(404).json({ error: 'Process not found' });
    }

    const nodesResult = await query(
      'SELECT * FROM nodes WHERE process_id = $1 ORDER BY created_at',
      [id]
    );

    const edgesResult = await query(
      'SELECT * FROM edges WHERE process_id = $1 ORDER BY created_at',
      [id]
    );

    // Parse JSON fields for nodes and edges
    const nodes = nodesResult.rows.map((row) =>
      parseJsonFields(row as Record<string, unknown>, ['form_schema', 'metadata'])
    );
    const edges = edgesResult.rows.map((row) =>
      parseJsonFields(row as Record<string, unknown>, ['condition', 'waypoints'])
    );

    res.json({
      ...(processResult.rows[0] as Record<string, unknown>),
      nodes,
      edges,
    });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// POST create new process
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, description } = req.body;

    const result = await query(
      'INSERT INTO processes (name, description) VALUES ($1, $2) RETURNING *',
      [name, description]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// PUT update process
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description, version } = req.body;

    const result = await query(
      `UPDATE processes
       SET name = COALESCE($1, name),
           description = COALESCE($2, description),
           version = COALESCE($3, version)
       WHERE id = $4
       RETURNING *`,
      [name, description, version, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Process not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// DELETE process
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Check if there are any projects using this process
    const projectsCheck = await query(
      'SELECT COUNT(*) FROM projects WHERE process_id = $1',
      [id]
    );

    if (parseInt((projectsCheck.rows[0] as { count: string }).count) > 0) {
      return res.status(400).json({
        error: 'Cannot delete process with existing projects'
      });
    }

    const result = await query(
      'DELETE FROM processes WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Process not found' });
    }

    res.json({ message: 'Process deleted', process: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// GET downstream nodes from a given node using recursive CTE
router.get('/:id/downstream/:nodeId', async (req: Request, res: Response) => {
  try {
    const { id, nodeId } = req.params;

    const result = await query(
      `WITH RECURSIVE downstream AS (
        SELECT
          e.target_node_id AS node_id,
          1 AS depth,
          e.source_node_id || ',' || e.target_node_id AS path
        FROM edges e
        WHERE e.source_node_id = $1

        UNION ALL

        SELECT
          e.target_node_id,
          d.depth + 1,
          d.path || ',' || e.target_node_id
        FROM edges e
        INNER JOIN downstream d ON e.source_node_id = d.node_id
        WHERE instr(d.path, e.target_node_id) = 0
      )
      SELECT DISTINCT n.*, d.depth, d.path
      FROM downstream d
      JOIN nodes n ON n.id = d.node_id
      WHERE n.process_id = $2
      ORDER BY d.depth`,
      [nodeId, id]
    );

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});


// GET export process as JSON (for backup/sharing)
router.get('/:id/export', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const processResult = await query(
      'SELECT * FROM processes WHERE id = $1',
      [id]
    );

    if (processResult.rows.length === 0) {
      return res.status(404).json({ error: 'Process not found' });
    }

    const nodesResult = await query(
      'SELECT * FROM nodes WHERE process_id = $1 ORDER BY created_at',
      [id]
    );

    const edgesResult = await query(
      'SELECT * FROM edges WHERE process_id = $1 ORDER BY created_at',
      [id]
    );

    const nodes = nodesResult.rows.map((row) =>
      parseJsonFields(row as Record<string, unknown>, ['form_schema', 'metadata'])
    );
    const edges = edgesResult.rows.map((row) =>
      parseJsonFields(row as Record<string, unknown>, ['condition', 'waypoints'])
    );

    const process = processResult.rows[0] as Record<string, unknown>;
    const exportData = {
      _export_version: 1,
      _exported_at: new Date().toISOString(),
      process: {
        name: process.name,
        description: process.description,
        version: process.version,
      },
      nodes,
      edges,
    };

    const filename = `${String(process.name).replace(/[^a-zA-Z0-9]/g, '_')}.json`;
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/json');
    res.json(exportData);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// POST import process from JSON
router.post('/import', async (req: Request, res: Response) => {
  try {
    const { process: processData, nodes: nodesData, edges: edgesData } = req.body;

    if (!processData?.name) {
      return res.status(400).json({ error: 'Invalid export file: missing process name' });
    }

    // Build ID remap: old IDs -> new IDs generated by DB
    // We'll insert and let DB generate IDs, then remap edges
    const nodeIdMap: Record<string, string> = {};

    // Create the process
    const processResult = await query(
      'INSERT INTO processes (name, description, version) VALUES ($1, $2, $3) RETURNING *',
      [processData.name + ' (imported)', processData.description || null, processData.version || 1]
    );
    const newProcess = processResult.rows[0] as Record<string, unknown>;
    const newProcessId = String(newProcess.id);

    // Insert nodes (DB generates new IDs)
    const nodes = Array.isArray(nodesData) ? nodesData : [];
    for (const node of nodes) {
      const result = await query(
        `INSERT INTO nodes (process_id, type, title, description, form_schema, metadata, position_x, position_y)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id`,
        [
          newProcessId,
          node.type,
          node.title,
          node.description || null,
          typeof node.form_schema === 'string' ? node.form_schema : JSON.stringify(node.form_schema || {}),
          typeof node.metadata === 'string' ? node.metadata : JSON.stringify(node.metadata || {}),
          node.position_x || 0,
          node.position_y || 0,
        ]
      );
      nodeIdMap[node.id] = String((result.rows[0] as Record<string, unknown>).id);
    }

    // Insert edges with remapped node IDs
    const edges = Array.isArray(edgesData) ? edgesData : [];
    let edgesImported = 0;
    for (const edge of edges) {
      const newSourceId = nodeIdMap[edge.source_node_id];
      const newTargetId = nodeIdMap[edge.target_node_id];
      if (!newSourceId || !newTargetId) continue; // Skip if nodes not found

      await query(
        `INSERT INTO edges (process_id, source_node_id, target_node_id, label, condition, waypoints)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          newProcessId,
          newSourceId,
          newTargetId,
          edge.label || null,
          typeof edge.condition === 'string' ? edge.condition : JSON.stringify(edge.condition || {}),
          typeof edge.waypoints === 'string' ? edge.waypoints : JSON.stringify(edge.waypoints || []),
        ]
      );
      edgesImported++;
    }

    res.status(201).json({
      message: 'Process imported successfully',
      process: newProcess,
      stats: {
        nodes: Object.keys(nodeIdMap).length,
        edges: edgesImported,
      },
    });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

export { router as processRoutes };
