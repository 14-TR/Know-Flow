import { Router, Request, Response } from 'express';
import { db } from '../utils/db.js';

const router = Router();

const activeWorkflowCtes = `
      WITH RECURSIVE node_statuses AS (
        SELECT
          p.id AS project_id,
          p.name AS project_name,
          n.id AS node_id,
          n.title,
          n.type,
          COALESCE(pns.status, 'not_started') AS status
        FROM projects p
        JOIN nodes n ON n.process_id = p.process_id
        LEFT JOIN project_node_statuses pns
          ON pns.project_id = p.id AND pns.node_id = n.id
        WHERE p.status = 'active'
      ),
      root_nodes AS (
        SELECT ns.project_id, ns.node_id
        FROM node_statuses ns
        WHERE NOT EXISTS (
          SELECT 1 FROM edges e WHERE e.target_node_id = ns.node_id
        )
      ),
      active_nodes(project_id, node_id) AS (
        SELECT project_id, node_id FROM root_nodes
        UNION
        SELECT source_ns.project_id, e.target_node_id
        FROM active_nodes an
        JOIN node_statuses source_ns
          ON source_ns.project_id = an.project_id
         AND source_ns.node_id = an.node_id
        JOIN edges e ON e.source_node_id = source_ns.node_id
        JOIN node_statuses target_ns
          ON target_ns.project_id = source_ns.project_id
         AND target_ns.node_id = e.target_node_id
        LEFT JOIN project_edge_traversals pet
          ON pet.project_id = source_ns.project_id
         AND pet.edge_id = e.id
        WHERE source_ns.status IN ('complete', 'skipped')
          AND (
            source_ns.type <> 'decision'
            OR pet.id IS NOT NULL
          )
      ),
      considered_nodes(project_id, node_id) AS (
        SELECT project_id, node_id FROM active_nodes
        UNION
        SELECT source_ns.project_id, e.target_node_id
        FROM active_nodes an
        JOIN node_statuses source_ns
          ON source_ns.project_id = an.project_id
         AND source_ns.node_id = an.node_id
        JOIN edges e ON e.source_node_id = source_ns.node_id
        JOIN node_statuses target_ns
          ON target_ns.project_id = source_ns.project_id
         AND target_ns.node_id = e.target_node_id
        WHERE source_ns.status NOT IN ('complete', 'skipped')
          AND source_ns.type <> 'decision'
      ),
      active_predecessor_statuses AS (
        SELECT
          cn.project_id,
          cn.node_id,
          COUNT(
            CASE
              WHEN source_active.node_id IS NOT NULL
               AND (
                 source_ns.type <> 'decision'
                 OR pet.id IS NOT NULL
               )
              THEN e.source_node_id
            END
          ) AS predecessor_count,
          SUM(
            CASE
              WHEN source_active.node_id IS NOT NULL
               AND (
                 source_ns.type <> 'decision'
                 OR pet.id IS NOT NULL
               )
               AND COALESCE(source_ns.status, 'not_started') NOT IN ('complete', 'skipped')
              THEN 1
              ELSE 0
            END
          ) AS open_predecessor_count
        FROM considered_nodes cn
        LEFT JOIN edges e ON e.target_node_id = cn.node_id
        LEFT JOIN node_statuses source_ns
          ON source_ns.project_id = cn.project_id
         AND source_ns.node_id = e.source_node_id
        LEFT JOIN active_nodes source_active
          ON source_active.project_id = source_ns.project_id
         AND source_active.node_id = source_ns.node_id
        LEFT JOIN project_edge_traversals pet
          ON pet.project_id = cn.project_id
         AND pet.edge_id = e.id
        GROUP BY cn.project_id, cn.node_id
      )`;

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
      ${activeWorkflowCtes}
      SELECT
        SUM(
          CASE
            WHEN ns.status = 'not_started'
             AND COALESCE(aps.open_predecessor_count, 0) = 0
            THEN 1
            ELSE 0
          END
        ) AS ready_nodes,
        SUM(
          CASE
            WHEN ns.status = 'not_started'
             AND COALESCE(aps.predecessor_count, 0) > 0
             AND COALESCE(aps.open_predecessor_count, 0) > 0
            THEN 1
            ELSE 0
          END
        ) AS blocked_nodes
      FROM considered_nodes cn
      JOIN node_statuses ns
        ON ns.project_id = cn.project_id AND ns.node_id = cn.node_id
      LEFT JOIN active_predecessor_statuses aps
        ON aps.project_id = ns.project_id AND aps.node_id = ns.node_id
    `).get() as { ready_nodes: number | null; blocked_nodes: number | null };

    const attentionItems = db.prepare(`
      ${activeWorkflowCtes},
      blocking_predecessors AS (
        SELECT
          cn.project_id,
          cn.node_id,
          GROUP_CONCAT(source_ns.title, ', ') AS blocker_titles
        FROM considered_nodes cn
        JOIN edges e ON e.target_node_id = cn.node_id
        JOIN node_statuses source_ns
          ON source_ns.project_id = cn.project_id
         AND source_ns.node_id = e.source_node_id
        JOIN active_nodes source_active
          ON source_active.project_id = source_ns.project_id
         AND source_active.node_id = source_ns.node_id
        LEFT JOIN project_edge_traversals pet
          ON pet.project_id = cn.project_id
         AND pet.edge_id = e.id
        WHERE COALESCE(source_ns.status, 'not_started') NOT IN ('complete', 'skipped')
          AND (
            source_ns.type <> 'decision'
            OR pet.id IS NOT NULL
          )
        GROUP BY cn.project_id, cn.node_id
      )
      SELECT
        ns.project_id,
        ns.project_name,
        ns.node_id,
        ns.title,
        ns.type,
        CASE
          WHEN COALESCE(aps.predecessor_count, 0) > 0
           AND COALESCE(aps.open_predecessor_count, 0) > 0
          THEN 'blocked'
          ELSE 'ready'
        END AS attention_type,
        COALESCE(aps.open_predecessor_count, 0) AS blocker_count,
        COALESCE(bp.blocker_titles, '') AS blocker_titles,
        CASE
          WHEN COALESCE(aps.predecessor_count, 0) > 0
           AND COALESCE(aps.open_predecessor_count, 0) > 0
          THEN printf('Waiting on %s', COALESCE(NULLIF(bp.blocker_titles, ''), 'upstream work'))
          WHEN COALESCE(aps.predecessor_count, 0) = 0
          THEN 'No predecessors; ready to start'
          ELSE 'All predecessors complete or skipped'
        END AS reason
      FROM considered_nodes cn
      JOIN node_statuses ns
        ON ns.project_id = cn.project_id AND ns.node_id = cn.node_id
      LEFT JOIN active_predecessor_statuses aps
        ON aps.project_id = ns.project_id AND aps.node_id = ns.node_id
      LEFT JOIN blocking_predecessors bp
        ON bp.project_id = ns.project_id AND bp.node_id = ns.node_id
      WHERE ns.status = 'not_started'
        AND (
          COALESCE(aps.open_predecessor_count, 0) = 0
          OR (
            COALESCE(aps.predecessor_count, 0) > 0
            AND COALESCE(aps.open_predecessor_count, 0) > 0
          )
        )
      ORDER BY
        CASE attention_type WHEN 'blocked' THEN 0 ELSE 1 END,
        blocker_count DESC,
        ns.project_name ASC,
        ns.title ASC
      LIMIT 6
    `).all();

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
      attentionItems,
    });
  } catch (err) {
    console.error('Dashboard error:', err);
    res.status(500).json({ error: (err as Error).message });
  }
});

export { router as dashboardRoutes };
