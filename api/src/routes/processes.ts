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

export { router as processRoutes };
