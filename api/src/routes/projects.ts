import { Router, Request, Response } from 'express';
import { query, getClient } from '../utils/db.js';

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

    const project = projectResult.rows[0];

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
    const currentNodesResult = await query(
      'SELECT * FROM get_project_current_nodes($1)',
      [id]
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
      [name, process_id, metadata || {}]
    );

    const project = projectResult.rows[0];

    // Initialize node statuses for all nodes in the process
    await client.query(
      `INSERT INTO project_node_statuses (project_id, node_id, status)
       SELECT $1, id, 'not_started'
       FROM nodes WHERE process_id = $2`,
      [project.id, process_id]
    );

    // Find and mark start nodes as ready
    await client.query(
      `UPDATE project_node_statuses pns
       SET status = 'not_started'
       FROM nodes n
       WHERE pns.node_id = n.id
         AND pns.project_id = $1
         AND n.type = 'start'`,
      [project.id]
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
      [name, status, metadata, id]
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
