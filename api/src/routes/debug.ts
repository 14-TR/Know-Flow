import { Router, Request, Response } from 'express';
import { query } from '../utils/db.js';

const router = Router();

// GET all tables and their row counts
router.get('/tables', async (req: Request, res: Response) => {
  try {
    const tables = ['processes', 'nodes', 'edges', 'projects', 'project_node_statuses'];
    const counts: Record<string, number> = {};

    for (const table of tables) {
      const result = await query(`SELECT COUNT(*) as count FROM ${table}`, []);
      counts[table] = (result.rows[0] as { count: number }).count;
    }

    res.json({ tables: counts });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// GET contents of a specific table
router.get('/tables/:table', async (req: Request, res: Response) => {
  try {
    const { table } = req.params;
    const allowedTables = ['processes', 'nodes', 'edges', 'projects', 'project_node_statuses', 'project_edge_traversals'];

    if (!allowedTables.includes(table)) {
      return res.status(400).json({ error: 'Invalid table name' });
    }

    const limit = Math.min(parseInt(req.query.limit as string) || 100, 1000);
    const offset = parseInt(req.query.offset as string) || 0;

    const result = await query(
      `SELECT * FROM ${table} ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    const countResult = await query(`SELECT COUNT(*) as count FROM ${table}`, []);
    const total = (countResult.rows[0] as { count: number }).count;

    res.json({
      table,
      rows: result.rows,
      total,
      limit,
      offset,
    });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

export { router as debugRoutes };
