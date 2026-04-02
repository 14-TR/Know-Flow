import { Router, Request, Response } from 'express';
import { db } from '../utils/db.js';

const router = Router();

/**
 * GET /api/dashboard
 * Returns aggregated stats for the dashboard overview page.
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    // Process stats
    const processCount = (db.prepare('SELECT COUNT(*) as count FROM processes').get() as { count: number }).count;
    const nodeCount = (db.prepare('SELECT COUNT(*) as count FROM nodes').get() as { count: number }).count;

    // Project stats
    const projectStats = db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'archived' THEN 1 ELSE 0 END) as archived
      FROM projects
    `).get() as { total: number; active: number; completed: number; archived: number };

    // Completion rate (avg across active projects with at least 1 node)
    const completionData = db.prepare(`
      SELECT
        p.id,
        COUNT(pns.node_id) as total_nodes,
        SUM(CASE WHEN pns.status = 'complete' THEN 1 ELSE 0 END) as completed_nodes
      FROM projects p
      LEFT JOIN project_node_statuses pns ON pns.project_id = p.id
      WHERE p.status = 'active'
      GROUP BY p.id
      HAVING total_nodes > 0
    `).all() as { id: string; total_nodes: number; completed_nodes: number }[];

    const avgCompletion = completionData.length > 0
      ? Math.round(completionData.reduce((sum, p) => sum + (p.completed_nodes / p.total_nodes) * 100, 0) / completionData.length)
      : 0;

    // Recent projects (last 5)
    const recentProjects = db.prepare(`
      SELECT
        p.id, p.name, p.status, p.created_at,
        pr.name as process_name,
        (SELECT COUNT(*) FROM project_node_statuses pns WHERE pns.project_id = p.id) as total_nodes,
        (SELECT COUNT(*) FROM project_node_statuses pns WHERE pns.project_id = p.id AND pns.status = 'complete') as completed_nodes
      FROM projects p
      JOIN processes pr ON p.process_id = pr.id
      ORDER BY p.created_at DESC
      LIMIT 5
    `).all();

    // Recent processes (last 3)
    const recentProcesses = db.prepare(`
      SELECT
        p.id, p.name, p.description, p.created_at,
        (SELECT COUNT(*) FROM nodes n WHERE n.process_id = p.id) as node_count,
        (SELECT COUNT(*) FROM edges e JOIN nodes n ON e.source_id = n.id WHERE n.process_id = p.id) as edge_count
      FROM processes p
      ORDER BY p.created_at DESC
      LIMIT 3
    `).all();

    // Nodes completed today
    const todayCompleted = (db.prepare(`
      SELECT COUNT(*) as count FROM project_node_statuses
      WHERE status = 'complete'
      AND date(completed_at) = date('now')
    `).get() as { count: number }).count;

    // In-progress nodes count
    const inProgressNodes = (db.prepare(`
      SELECT COUNT(*) as count FROM project_node_statuses WHERE status = 'in_progress'
    `).get() as { count: number }).count;

    res.json({
      stats: {
        processCount,
        nodeCount,
        projectTotal: projectStats.total,
        projectActive: projectStats.active,
        projectCompleted: projectStats.completed,
        projectArchived: projectStats.archived,
        avgCompletion,
        todayCompleted,
        inProgressNodes,
      },
      recentProjects,
      recentProcesses,
    });
  } catch (err) {
    console.error('Dashboard error:', err);
    res.status(500).json({ error: (err as Error).message });
  }
});

export { router as dashboardRoutes };
