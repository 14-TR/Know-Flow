import { Router, Request, Response } from 'express';
import { all, get } from '../utils/db.js';

const router = Router();

// GET /api/dashboard
// Aggregated view across all projects: stats + per-project health
router.get('/dashboard', async (_req: Request, res: Response) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    // All projects with process name + node counts
    const projects = all(`
      SELECT 
        p.id, p.name, p.status, p.process_id, p.created_at,
        pr.name as process_name,
        COUNT(DISTINCT n.id) as total_nodes,
        COUNT(DISTINCT CASE WHEN pns.status = 'complete' THEN pns.node_id END) as completed_nodes,
        COUNT(DISTINCT CASE WHEN pns.status = 'in_progress' THEN pns.node_id END) as in_progress_nodes,
        COUNT(DISTINCT CASE WHEN pns.status = 'not_started' OR pns.status IS NULL THEN n.id END) as not_started_nodes,
        COUNT(DISTINCT CASE 
          WHEN pns.due_date IS NOT NULL 
            AND pns.due_date < ? 
            AND (pns.status != 'complete' AND pns.status != 'skipped')
          THEN pns.node_id 
        END) as overdue_nodes
      FROM projects p
      JOIN processes pr ON pr.id = p.process_id
      LEFT JOIN nodes n ON n.process_id = p.process_id
      LEFT JOIN project_node_statuses pns ON pns.project_id = p.id AND pns.node_id = n.id
      GROUP BY p.id
      ORDER BY p.created_at DESC
    `, [today]) as any[];

    // Next upcoming task per project (closest future due date, not complete)
    const nextDueMap = new Map<string, any>();
    for (const proj of projects) {
      const next = get(`
        SELECT n.title, n.type, pns.due_date, pns.status
        FROM project_node_statuses pns
        JOIN nodes n ON n.id = pns.node_id
        WHERE pns.project_id = ?
          AND pns.due_date >= ?
          AND pns.status NOT IN ('complete', 'skipped')
        ORDER BY pns.due_date ASC
        LIMIT 1
      `, [proj.id, today]) as any;
      if (next) nextDueMap.set(proj.id, next);
    }

    // Most recent activity per project
    const recentMap = new Map<string, any>();
    for (const proj of projects) {
      const recent = get(`
        SELECT n.title, pns.status, pns.updated_at
        FROM project_node_statuses pns
        JOIN nodes n ON n.id = pns.node_id
        WHERE pns.project_id = ? AND pns.status != 'not_started'
        ORDER BY pns.updated_at DESC
        LIMIT 1
      `, [proj.id]) as any;
      if (recent) recentMap.set(proj.id, recent);
    }

    // Build enriched project list
    const enriched = projects.map(p => {
      const pct = p.total_nodes > 0
        ? Math.round((p.completed_nodes / p.total_nodes) * 100) : 0;
      const next = nextDueMap.get(p.id);
      const recent = recentMap.get(p.id);
      const daysUntil = next?.due_date
        ? Math.ceil((new Date(next.due_date).getTime() - new Date(today).getTime()) / 86400000)
        : null;

      let health: 'on-track' | 'at-risk' | 'overdue' | 'not-started' | 'complete' = 'not-started';
      if (p.status === 'completed') health = 'complete';
      else if (p.overdue_nodes > 0) health = 'overdue';
      else if (daysUntil !== null && daysUntil <= 3) health = 'at-risk';
      else if (p.in_progress_nodes > 0 || p.completed_nodes > 0) health = 'on-track';

      return {
        ...p,
        completion_pct: pct,
        health,
        next_due: next || null,
        days_until_next_due: daysUntil,
        last_activity: recent || null,
      };
    });

    // Summary stats
    const total = enriched.length;
    const active = enriched.filter(p => p.status === 'active').length;
    const completed = enriched.filter(p => p.status === 'completed').length;
    const overdue = enriched.filter(p => p.overdue_nodes > 0).length;
    const atRisk = enriched.filter(p => p.health === 'at-risk').length;
    const totalNodes = enriched.reduce((s, p) => s + p.total_nodes, 0);
    const totalComplete = enriched.reduce((s, p) => s + p.completed_nodes, 0);
    const overallPct = totalNodes > 0 ? Math.round((totalComplete / totalNodes) * 100) : 0;

    res.json({
      summary: { total, active, completed, overdue, atRisk, overallPct },
      projects: enriched,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
