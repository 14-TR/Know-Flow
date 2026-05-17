import { Router, Request, Response } from 'express';
import { query } from '../utils/db.js';

const router = Router();

const allowedTables = ['processes', 'nodes', 'edges', 'projects', 'project_node_statuses', 'project_edge_traversals'] as const;
const tableOrderColumns: Record<(typeof allowedTables)[number], string> = {
  processes: 'created_at',
  nodes: 'created_at',
  edges: 'created_at',
  projects: 'created_at',
  project_node_statuses: 'created_at',
  project_edge_traversals: 'executed_at',
};

// GET all tables and their row counts
router.get('/tables', async (req: Request, res: Response) => {
  try {
    const counts: Record<string, number> = {};

    for (const table of allowedTables) {
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

    if (!isAllowedTable(table)) {
      return res.status(400).json({ error: 'Invalid table name' });
    }

    const limit = Math.min(parseInt(req.query.limit as string) || 100, 1000);
    const offset = parseInt(req.query.offset as string) || 0;
    const orderColumn = tableOrderColumns[table];

    const result = await query(
      `SELECT * FROM ${table} ORDER BY ${orderColumn} DESC LIMIT $1 OFFSET $2`,
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

function isAllowedTable(table: string): table is (typeof allowedTables)[number] {
  return (allowedTables as readonly string[]).includes(table);
}

export { router as debugRoutes };