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
        (SELECT COUNT(*) FROM edges e JOIN nodes n ON e.source_node_id = n.id WHERE n.process_id = p.id) as edge_count
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

    // Active workflow signal: nodes ready to start vs. blocked by unfinished predecessors.
    const workflowSignal = db.prepare(`
      WITH node_statuses AS (
        SELECT
          p.id AS project_id,
          n.id AS node_id,
          COALESCE(pns.status, 'not_started') AS status
        FROM projects p
        JOIN nodes n ON n.process_id = p.process_id
        LEFT JOIN project_node_statuses pns
          ON pns.project_id = p.id AND pns.node_id = n.id
        WHERE p.status = 'active'
      ),
      predecessor_statuses AS (
        SELECT
          ns.project_id,
          ns.node_id,
          COUNT(e.source_node_id) AS predecessor_count,
          SUM(
            CASE
              WHEN COALESCE(source_ns.status, 'not_started') NOT IN ('complete', 'skipped')
              THEN 1
              ELSE 0
            END
          ) AS open_predecessor_count
        FROM node_statuses ns
        LEFT JOIN edges e ON e.target_node_id = ns.node_id
        LEFT JOIN node_statuses source_ns
          ON source_ns.project_id = ns.project_id
         AND source_ns.node_id = e.source_node_id
        GROUP BY ns.project_id, ns.node_id
      )
      SELECT
        SUM(
          CASE
            WHEN ns.status = 'not_started'
             AND COALESCE(ps.open_predecessor_count, 0) = 0
            THEN 1
            ELSE 0
          END
        ) AS ready_nodes,
        SUM(
          CASE
            WHEN ns.status = 'not_started'
             AND COALESCE(ps.predecessor_count, 0) > 0
             AND COALESCE(ps.open_predecessor_count, 0) > 0
            THEN 1
            ELSE 0
          END
        ) AS blocked_nodes
      FROM node_statuses ns
      LEFT JOIN predecessor_statuses ps
        ON ps.project_id = ns.project_id AND ps.node_id = ns.node_id
    `).get() as { ready_nodes: number | null; blocked_nodes: number | null };

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
        readyNodes: workflowSignal.ready_nodes ?? 0,
        blockedNodes: workflowSignal.blocked_nodes ?? 0,
      },
      projects: recentProjects,
      processes: recentProcesses,
      recentProjects,
      recentProcesses,
    });
  } catch (err) {
    console.error('Dashboard error:', err);
    res.status(500).json({ error: (err as Error).message });
  }
});

export { router as dashboardRoutes };
