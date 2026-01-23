import { Router, Request, Response } from 'express';
import { query } from '../utils/db.js';

const router = Router();

// GET all nodes (optionally filtered by process_id)
router.get('/', async (req: Request, res: Response) => {
  try {
    const { process_id } = req.query;

    let sql = 'SELECT * FROM nodes';
    const params: unknown[] = [];

    if (process_id) {
      sql += ' WHERE process_id = $1';
      params.push(process_id);
    }

    sql += ' ORDER BY created_at';

    const result = await query(sql, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// GET single node
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await query(
      'SELECT * FROM nodes WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Node not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// POST create new node
router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      process_id,
      type,
      title,
      description,
      form_schema,
      metadata,
      position_x,
      position_y
    } = req.body;

    if (!process_id || !type || !title) {
      return res.status(400).json({
        error: 'process_id, type, and title are required'
      });
    }

    const result = await query(
      `INSERT INTO nodes
       (process_id, type, title, description, form_schema, metadata, position_x, position_y)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        process_id,
        type,
        title,
        description || null,
        JSON.stringify(form_schema || {}),
        JSON.stringify(metadata || {}),
        position_x || 0,
        position_y || 0
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// PUT update node
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      type,
      title,
      description,
      form_schema,
      metadata,
      position_x,
      position_y
    } = req.body;

    const result = await query(
      `UPDATE nodes
       SET type = COALESCE($1, type),
           title = COALESCE($2, title),
           description = COALESCE($3, description),
           form_schema = COALESCE($4, form_schema),
           metadata = COALESCE($5, metadata),
           position_x = COALESCE($6, position_x),
           position_y = COALESCE($7, position_y)
       WHERE id = $8
       RETURNING *`,
      [
        type,
        title,
        description,
        form_schema ? JSON.stringify(form_schema) : null,
        metadata ? JSON.stringify(metadata) : null,
        position_x,
        position_y,
        id
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Node not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// PATCH update node position only
router.patch('/:id/position', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { position_x, position_y } = req.body;

    const result = await query(
      `UPDATE nodes
       SET position_x = $1, position_y = $2
       WHERE id = $3
       RETURNING *`,
      [position_x, position_y, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Node not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// DELETE node
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await query(
      'DELETE FROM nodes WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Node not found' });
    }

    res.json({ message: 'Node deleted', node: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

export { router as nodeRoutes };
