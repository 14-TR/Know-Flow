import { Router, Request, Response } from 'express';
import { query } from '../utils/db.js';

const router = Router();

// Helper to parse JSON fields that SQLite returns as strings
function parseEdgeJsonFields(edge: Record<string, unknown>): Record<string, unknown> {
  if (!edge) return edge;

  const parsed = { ...edge };

  // Parse condition if it's a string
  if (typeof parsed.condition === 'string') {
    try {
      parsed.condition = JSON.parse(parsed.condition);
    } catch {
      parsed.condition = {};
    }
  }

  // Parse waypoints if it's a string
  if (typeof parsed.waypoints === 'string') {
    try {
      parsed.waypoints = JSON.parse(parsed.waypoints);
    } catch {
      parsed.waypoints = [];
    }
  }

  // Ensure waypoints is always an array
  if (!Array.isArray(parsed.waypoints)) {
    parsed.waypoints = [];
  }

  return parsed;
}

// GET all edges (optionally filtered by process_id)
router.get('/', async (req: Request, res: Response) => {
  try {
    const { process_id } = req.query;

    let sql = 'SELECT * FROM edges';
    const params: unknown[] = [];

    if (process_id) {
      sql += ' WHERE process_id = $1';
      params.push(process_id);
    }

    sql += ' ORDER BY created_at';

    const result = await query(sql, params);
    const edges = result.rows.map((row) => parseEdgeJsonFields(row as Record<string, unknown>));
    res.json(edges);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// GET single edge
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await query(
      'SELECT * FROM edges WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Edge not found' });
    }

    res.json(parseEdgeJsonFields(result.rows[0] as Record<string, unknown>));
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// POST create new edge
router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      process_id,
      source_node_id,
      target_node_id,
      label,
      condition,
      waypoints
    } = req.body;

    if (!process_id || !source_node_id || !target_node_id) {
      return res.status(400).json({
        error: 'process_id, source_node_id, and target_node_id are required'
      });
    }

    // Verify both nodes belong to the same process
    const nodesCheck = await query(
      `SELECT COUNT(*) FROM nodes
       WHERE id IN ($1, $2) AND process_id = $3`,
      [source_node_id, target_node_id, process_id]
    );

    if (parseInt(nodesCheck.rows[0].count) !== 2) {
      return res.status(400).json({
        error: 'Both nodes must belong to the specified process'
      });
    }

    const result = await query(
      `INSERT INTO edges
       (process_id, source_node_id, target_node_id, label, condition, waypoints)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [process_id, source_node_id, target_node_id, label || null, JSON.stringify(condition || {}), JSON.stringify(waypoints || [])]
    );

    res.status(201).json(parseEdgeJsonFields(result.rows[0] as Record<string, unknown>));
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// PUT update edge
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { label, condition, waypoints } = req.body;

    const result = await query(
      `UPDATE edges
       SET label = COALESCE($1, label),
           condition = COALESCE($2, condition),
           waypoints = COALESCE($3, waypoints)
       WHERE id = $4
       RETURNING *`,
      [label, condition ? JSON.stringify(condition) : null, waypoints ? JSON.stringify(waypoints) : null, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Edge not found' });
    }

    res.json(parseEdgeJsonFields(result.rows[0] as Record<string, unknown>));
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// PATCH update edge waypoints only (for real-time dragging)
router.patch('/:id/waypoints', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { waypoints } = req.body;

    if (!Array.isArray(waypoints)) {
      return res.status(400).json({ error: 'waypoints must be an array' });
    }

    const result = await query(
      `UPDATE edges SET waypoints = $1 WHERE id = $2 RETURNING *`,
      [JSON.stringify(waypoints), id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Edge not found' });
    }

    res.json(parseEdgeJsonFields(result.rows[0] as Record<string, unknown>));
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// DELETE edge
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await query(
      'DELETE FROM edges WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Edge not found' });
    }

    res.json({ message: 'Edge deleted', edge: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

export { router as edgeRoutes };
