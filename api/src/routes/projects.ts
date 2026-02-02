import { Router, Request, Response } from 'express';
import { query, getClient } from '../utils/db.js';

// Interface for project with process info
interface ProjectWithProcess {
  id: string;
  name: string;
  process_id: string;
  status: string;
  metadata: string;
  created_at: string;
  updated_at: string;
  process_name: string;
}

// Interface for basic project row
interface ProjectRow {
  id: string;
  name: string;
  process_id: string;
  status: string;
  metadata: string;
  created_at: string;
  updated_at: string;
}

const router = Router();

// GET all projects
router.get('/', async (req: Request, res: Response) => {
  try {
    const { process_id, status } = req.query;

    let sql = `
      SELECT p.*, pr.name as process_name,
             (SELECT COUNT(*) FROM project_node_statuses pns
              WHERE pns.project_id = p.id AND pns.status = 'complete') as completed_nodes,
             (SELECT COUNT(*) FROM project_node_statuses pns
              WHERE pns.project_id = p.id) as total_nodes
      FROM projects p
      JOIN processes pr ON p.process_id = pr.id
    `;
    const params: unknown[] = [];
    const conditions: string[] = [];

    if (process_id) {
      conditions.push(`p.process_id = $${params.length + 1}`);
      params.push(process_id);
    }

    if (status) {
      conditions.push(`p.status = $${params.length + 1}`);
      params.push(status);
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    sql += ' ORDER BY p.created_at DESC';

    const result = await query(sql, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// GET single project with full graph and statuses
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const projectResult = await query(
      `SELECT p.*, pr.name as process_name
       FROM projects p
       JOIN processes pr ON p.process_id = pr.id
       WHERE p.id = $1`,
      [id]
    );

    if (projectResult.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const project = projectResult.rows[0] as ProjectWithProcess;

    // Get nodes with their statuses for this project
    const nodesResult = await query(
      `SELECT n.*,
              pns.status as project_status,
              pns.decision_result,
              pns.form_data,
              pns.assigned_to,
              pns.notes,
              pns.started_at,
              pns.completed_at,
              pns.id as status_id
       FROM nodes n
       LEFT JOIN project_node_statuses pns
         ON pns.node_id = n.id AND pns.project_id = $1
       WHERE n.process_id = $2
       ORDER BY n.created_at`,
      [id, project.process_id]
    );

    // Get edges
    const edgesResult = await query(
      `SELECT e.*,
              CASE WHEN pet.id IS NOT NULL THEN true ELSE false END as traversed
       FROM edges e
       LEFT JOIN project_edge_traversals pet
         ON pet.edge_id = e.id AND pet.project_id = $1
       WHERE e.process_id = $2
       ORDER BY e.created_at`,
      [id, project.process_id]
    );

    // Get current active nodes
    // Note: SQLite requires each ? placeholder to have its own parameter value
    const currentNodesResult = await query(
      `SELECT
        n.id AS node_id,
        n.title AS node_title,
        n.type AS node_type,
        COALESCE(pns.status, 'not_started') AS status
      FROM nodes n
      INNER JOIN projects p ON n.process_id = p.process_id
      LEFT JOIN project_node_statuses pns ON pns.node_id = n.id AND pns.project_id = $1
      WHERE p.id = $2
      AND (
        (n.type = 'start' AND pns.status IS NULL)
        OR pns.status = 'in_progress'
        OR (
          COALESCE(pns.status, 'not_started') NOT IN ('complete', 'skipped')
          AND NOT EXISTS (
            SELECT 1 FROM edges e
            INNER JOIN project_node_statuses pred_status
              ON pred_status.node_id = e.source_node_id
              AND pred_status.project_id = $3
            WHERE e.target_node_id = n.id
            AND pred_status.status NOT IN ('complete', 'skipped')
          )
          AND EXISTS (
            SELECT 1 FROM edges e WHERE e.target_node_id = n.id
          )
        )
      )`,
      [id, id, id]
    );

    res.json({
      ...project,
      nodes: nodesResult.rows,
      edges: edgesResult.rows,
      currentNodes: currentNodesResult.rows,
    });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// POST create new project
router.post('/', async (req: Request, res: Response) => {
  const client = await getClient();

  try {
    const { name, process_id, metadata } = req.body;

    if (!name || !process_id) {
      return res.status(400).json({
        error: 'name and process_id are required'
      });
    }

    await client.query('BEGIN');

    // Create the project
    const projectResult = await client.query(
      `INSERT INTO projects (name, process_id, metadata)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [name, process_id, JSON.stringify(metadata || {})]
    );

    const project = projectResult.rows[0] as ProjectRow;

    // Initialize node statuses for all nodes in the process
    await client.query(
      `INSERT INTO project_node_statuses (project_id, node_id, status)
       SELECT $1, id, 'not_started'
       FROM nodes WHERE process_id = $2`,
      [project.id, process_id]
    );

    // Find and mark start nodes as ready (SQLite-compatible syntax)
    await client.query(
      `UPDATE project_node_statuses
       SET status = 'not_started'
       WHERE project_id = $1
         AND node_id IN (SELECT id FROM nodes WHERE type = 'start' AND process_id = $2)`,
      [project.id, process_id]
    );

    await client.query('COMMIT');

    res.status(201).json(project);
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: (err as Error).message });
  } finally {
    client.release();
  }
});

// PUT update project
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, status, metadata } = req.body;

    const result = await query(
      `UPDATE projects
       SET name = COALESCE($1, name),
           status = COALESCE($2, status),
           metadata = COALESCE($3, metadata)
       WHERE id = $4
       RETURNING *`,
      [name, status, metadata ? JSON.stringify(metadata) : null, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// DELETE project
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await query(
      'DELETE FROM projects WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    res.json({ message: 'Project deleted', project: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

export { router as projectRoutes };
