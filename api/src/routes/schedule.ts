import { Router, Request, Response } from 'express';
import { all, get, db } from '../utils/db.js';

const router = Router();

// GET /api/projects/:id/calendar
router.get('/projects/:id/calendar', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const project = get('SELECT * FROM projects WHERE id = ?', [id]);
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const nodes = all(`
      SELECT 
        n.id as node_id, n.title, n.type, n.process_id,
        n.position_x, n.position_y,
        COALESCE(pns.estimated_days,
          CASE n.type WHEN 'task' THEN 5 WHEN 'decision' THEN 2 WHEN 'milestone' THEN 0 ELSE 0 END
        ) as estimated_days,
        pns.due_date, pns.date_pinned, pns.status,
        pns.started_at, pns.completed_at, pns.assigned_to, pns.notes
      FROM nodes n
      LEFT JOIN project_node_statuses pns ON pns.node_id = n.id AND pns.project_id = ?
      WHERE n.process_id = ?
      ORDER BY n.position_y ASC, n.position_x ASC
    `, [id, (project as any).process_id]);

    const edges = all('SELECT source_node_id, target_node_id FROM edges WHERE process_id = ?',
      [(project as any).process_id]);

    res.json({ project, nodes, edges });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/projects/:id/schedule
router.post('/projects/:id/schedule', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { startDate, endDate, direction = 'forward' } = req.body;

    const project = get('SELECT * FROM projects WHERE id = ?', [id]) as any;
    if (!project) return res.status(404).json({ error: 'Project not found' });

    if (direction === 'forward' && !startDate)
      return res.status(400).json({ error: 'startDate required for forward scheduling' });
    if (direction === 'backward' && !endDate)
      return res.status(400).json({ error: 'endDate required for backward scheduling' });

    const nodes = all(`
      SELECT n.id as node_id, n.title, n.type,
        COALESCE(pns.estimated_days,
          CASE n.type WHEN 'task' THEN 5 WHEN 'decision' THEN 2 WHEN 'milestone' THEN 0 ELSE 0 END
        ) as estimated_days,
        COALESCE(pns.date_pinned, 0) as date_pinned,
        pns.due_date
      FROM nodes n
      LEFT JOIN project_node_statuses pns ON pns.node_id = n.id AND pns.project_id = ?
      WHERE n.process_id = ?
    `, [id, project.process_id]) as any[];

    const edges = all('SELECT source_node_id, target_node_id FROM edges WHERE process_id = ?',
      [project.process_id]) as any[];

    const nodeMap = new Map(nodes.map((n: any) => [n.node_id, n]));
    const children = new Map<string, string[]>();
    const parents  = new Map<string, string[]>();
    for (const n of nodes) { children.set(n.node_id, []); parents.set(n.node_id, []); }
    for (const e of edges) {
      children.get(e.source_node_id)?.push(e.target_node_id);
      parents.get(e.target_node_id)?.push(e.source_node_id);
    }

    const dueDates = new Map<string, Date>();
    for (const n of nodes) {
      if (n.date_pinned && n.due_date) dueDates.set(n.node_id, new Date(n.due_date));
    }

    if (direction === 'forward') {
      const inDegree = new Map(nodes.map((n: any) => [n.node_id, (parents.get(n.node_id) || []).length]));
      const queue = nodes.filter((n: any) => inDegree.get(n.node_id) === 0).map((n: any) => n.node_id);
      const anchor = new Date(startDate);
      const earliestStart = new Map<string, Date>();
      for (const n of nodes.filter((n: any) => inDegree.get(n.node_id) === 0)) {
        earliestStart.set(n.node_id, anchor);
      }
      while (queue.length) {
        const curr = queue.shift()!;
        const node = nodeMap.get(curr) as any;
        const start = earliestStart.get(curr) || anchor;
        const due = (dueDates.has(curr) && node.date_pinned)
          ? dueDates.get(curr)!
          : addWorkDays(start, node.estimated_days || 0);
        dueDates.set(curr, due);
        for (const child of (children.get(curr) || [])) {
          const existing = earliestStart.get(child);
          if (!existing || due > existing) earliestStart.set(child, due);
          const newDeg = (inDegree.get(child) || 0) - 1;
          inDegree.set(child, newDeg);
          if (newDeg === 0) queue.push(child);
        }
      }
    } else {
      const outDegree = new Map(nodes.map((n: any) => [n.node_id, (children.get(n.node_id) || []).length]));
      const queue = nodes.filter((n: any) => outDegree.get(n.node_id) === 0).map((n: any) => n.node_id);
      const anchor = new Date(endDate);
      const latestDue = new Map<string, Date>();
      for (const n of nodes.filter((n: any) => outDegree.get(n.node_id) === 0)) {
        latestDue.set(n.node_id, anchor);
      }
      while (queue.length) {
        const curr = queue.shift()!;
        const node = nodeMap.get(curr) as any;
        const due = latestDue.get(curr) || anchor;
        if (!dueDates.has(curr) || !node.date_pinned) dueDates.set(curr, due);
        for (const parent of (parents.get(curr) || [])) {
          const parentNode = nodeMap.get(parent) as any;
          const parentDue = subtractWorkDays(due, parentNode.estimated_days || 0);
          const existing = latestDue.get(parent);
          if (!existing || parentDue < existing) latestDue.set(parent, parentDue);
          const newDeg = (outDegree.get(parent) || 0) - 1;
          outDegree.set(parent, newDeg);
          if (newDeg === 0) queue.push(parent);
        }
      }
    }

    // Persist calculated dates
    const upsert = db.prepare(
      `INSERT INTO project_node_statuses (project_id, node_id, due_date)
       VALUES (?, ?, ?)
       ON CONFLICT(project_id, node_id) DO UPDATE SET due_date = excluded.due_date`
    );
    const upsertTx = db.transaction(() => {
      for (const [nodeId, date] of dueDates) {
        const node = nodeMap.get(nodeId) as any;
        if (node?.date_pinned) continue;
        upsert.run(id, nodeId, date.toISOString().split('T')[0]);
      }
    });
    upsertTx();

    res.json({
      success: true,
      direction,
      anchor: direction === 'forward' ? startDate : endDate,
      nodesScheduled: dueDates.size,
      schedule: Array.from(dueDates.entries())
        .map(([nodeId, date]) => ({
          nodeId,
          title: (nodeMap.get(nodeId) as any)?.title,
          due_date: date.toISOString().split('T')[0]
        }))
        .sort((a, b) => a.due_date.localeCompare(b.due_date))
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/projects/:projectId/nodes/:nodeId/date — manual pin override
router.put('/projects/:projectId/nodes/:nodeId/date', async (req: Request, res: Response) => {
  try {
    const { projectId, nodeId } = req.params;
    const { due_date, estimated_days, pinned = true } = req.body;

    db.prepare(`
      INSERT INTO project_node_statuses (project_id, node_id, due_date, estimated_days, date_pinned)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(project_id, node_id) DO UPDATE SET
        due_date = excluded.due_date,
        estimated_days = excluded.estimated_days,
        date_pinned = excluded.date_pinned
    `).run(projectId, nodeId, due_date || null, estimated_days || null, pinned ? 1 : 0);

    res.json({ success: true, nodeId, due_date, pinned });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

function addWorkDays(start: Date, days: number): Date {
  const d = new Date(start);
  let added = 0;
  while (added < days) {
    d.setDate(d.getDate() + 1);
    if (d.getDay() !== 0 && d.getDay() !== 6) added++;
  }
  return d;
}

function subtractWorkDays(end: Date, days: number): Date {
  const d = new Date(end);
  let subtracted = 0;
  while (subtracted < days) {
    d.setDate(d.getDate() - 1);
    if (d.getDay() !== 0 && d.getDay() !== 6) subtracted++;
  }
  return d;
}

export default router;
