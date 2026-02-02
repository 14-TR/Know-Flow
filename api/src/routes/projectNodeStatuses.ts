import { Router, Request, Response } from 'express';
import { query, getClient } from '../utils/db.js';

// Interface for the joined query result
interface ProjectNodeStatusWithNode {
  id: string;
  project_id: string;
  node_id: string;
  status: string;
  decision_result: string | null;
  form_data: string;
  assigned_to: string | null;
  notes: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  node_type: string;
  process_id: string;
}

const router = Router();

// GET all statuses for a project
router.get('/', async (req: Request, res: Response) => {
  try {
    const { project_id } = req.query;

    if (!project_id) {
      return res.status(400).json({ error: 'project_id is required' });
    }

    const result = await query(
      `SELECT pns.*, n.title as node_title, n.type as node_type
       FROM project_node_statuses pns
       JOIN nodes n ON pns.node_id = n.id
       WHERE pns.project_id = $1
       ORDER BY n.created_at`,
      [project_id]
    );

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// GET single status
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await query(
      `SELECT pns.*, n.title as node_title, n.type as node_type, n.form_schema
       FROM project_node_statuses pns
       JOIN nodes n ON pns.node_id = n.id
       WHERE pns.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Status not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// PUT update node status (main endpoint for project tracking)
router.put('/:id', async (req: Request, res: Response) => {
  const client = await getClient();

  try {
    const { id } = req.params;
    const {
      status,
      decision_result,
      form_data,
      assigned_to,
      notes
    } = req.body;

    await client.query('BEGIN');

    // Get current status info
    const currentResult = await client.query(
      `SELECT pns.*, n.type as node_type, n.process_id
       FROM project_node_statuses pns
       JOIN nodes n ON pns.node_id = n.id
       WHERE pns.id = $1`,
      [id]
    );

    if (currentResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Status not found' });
    }

    const current = currentResult.rows[0] as ProjectNodeStatusWithNode;

    // Build update query
    let updateFields: string[] = [];
    let updateParams: unknown[] = [];
    let paramIndex = 1;

    if (status !== undefined) {
      updateFields.push(`status = $${paramIndex++}`);
      updateParams.push(status);

      if (status === 'in_progress' && current.status !== 'in_progress') {
        updateFields.push(`started_at = NOW()`);
      }

      if (status === 'complete' && current.status !== 'complete') {
        updateFields.push(`completed_at = NOW()`);
      }
    }

    if (decision_result !== undefined) {
      updateFields.push(`decision_result = $${paramIndex++}`);
      updateParams.push(decision_result);
    }

    if (form_data !== undefined) {
      updateFields.push(`form_data = $${paramIndex++}`);
      updateParams.push(JSON.stringify(form_data));
    }

    if (assigned_to !== undefined) {
      updateFields.push(`assigned_to = $${paramIndex++}`);
      updateParams.push(assigned_to);
    }

    if (notes !== undefined) {
      updateFields.push(`notes = $${paramIndex++}`);
      updateParams.push(notes);
    }

    if (updateFields.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'No fields to update' });
    }

    updateParams.push(id);

    const updateResult = await client.query(
      `UPDATE project_node_statuses
       SET ${updateFields.join(', ')}
       WHERE id = $${paramIndex}
       RETURNING *`,
      updateParams
    );

    // If this is a decision node being completed, record edge traversal
    if (status === 'complete' && current.node_type === 'decision' && decision_result) {
      // Find the edge that matches the decision result
      const edgeResult = await client.query(
        `SELECT e.id FROM edges e
         WHERE e.source_node_id = $1
           AND e.label = $2`,
        [current.node_id, decision_result]
      );

      if (edgeResult.rows.length > 0) {
        await client.query(
          `INSERT OR IGNORE INTO project_edge_traversals (project_id, edge_id)
           VALUES ($1, $2)`,
          [current.project_id, (edgeResult.rows[0] as { id: string }).id]
        );
      }
    }

    await client.query('COMMIT');

    // Return updated status with node info
    const result = await query(
      `SELECT pns.*, n.title as node_title, n.type as node_type
       FROM project_node_statuses pns
       JOIN nodes n ON pns.node_id = n.id
       WHERE pns.id = $1`,
      [id]
    );

    res.json(result.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: (err as Error).message });
  } finally {
    client.release();
  }
});

// POST bulk update positions (for drag operations)
router.post('/bulk-update', async (req: Request, res: Response) => {
  const client = await getClient();

  try {
    const { updates } = req.body;

    if (!Array.isArray(updates)) {
      return res.status(400).json({ error: 'updates must be an array' });
    }

    await client.query('BEGIN');

    for (const update of updates) {
      const { id, status, decision_result, form_data } = update;

      await client.query(
        `UPDATE project_node_statuses
         SET status = COALESCE($1, status),
             decision_result = COALESCE($2, decision_result),
             form_data = COALESCE($3, form_data)
         WHERE id = $4`,
        [status, decision_result, form_data ? JSON.stringify(form_data) : null, id]
      );
    }

    await client.query('COMMIT');

    res.json({ message: 'Bulk update successful', count: updates.length });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: (err as Error).message });
  } finally {
    client.release();
  }
});

export { router as projectNodeStatusRoutes };
