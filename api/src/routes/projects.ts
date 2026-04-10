import { Router, Request, Response } from 'express';
import { query, getClient } from '../utils/db.js';
import { ProjectRow } from '../types/db.js';

interface ProjectBriefRow {
  node_id: string;
  title: string;
  type: string;
  status: string | null;
  decision_result: string | null;
  assigned_to: string | null;
  notes: string | null;
  started_at: string | null;
  completed_at: string | null;
}

interface ProjectBrief {
  summary: string;
  blockers: string[];
  upcoming: string[];
  suggested_next_action: {
    node_id: string;
    title: string;
    type: string;
    rationale: string;
  } | null;
  stats: {
    total: number;
    completed: number;
    in_progress: number;
    not_started: number;
    skipped: number;
    progress_percent: number;
  };
}

interface ProjectBriefEdgeRow {
  source_node_id: string;
  target_node_id: string;
}

function buildProjectBrief(
  project: ProjectRow,
  nodeRows: ProjectBriefRow[],
  edgeRows: ProjectBriefEdgeRow[] = []
): ProjectBrief {
  const normalized = nodeRows.map((row) => ({
    ...row,
    status: row.status ?? 'not_started',
  }));

  const total = normalized.length;
  const completed = normalized.filter((row) => row.status === 'complete').length;
  const inProgress = normalized.filter((row) => row.status === 'in_progress').length;
  const notStarted = normalized.filter((row) => row.status === 'not_started').length;
  const skipped = normalized.filter((row) => row.status === 'skipped').length;
  const progressPercent = total > 0 ? Math.round(((completed + skipped) / total) * 100) : 0;

  const statusByNodeId = new Map(normalized.map((row) => [row.node_id, row.status]));
  const inboundByTargetId = new Map<string, string[]>();

  for (const edge of edgeRows) {
    const inbound = inboundByTargetId.get(edge.target_node_id) ?? [];
    inbound.push(edge.source_node_id);
    inboundByTargetId.set(edge.target_node_id, inbound);
  }

  const readyNodes = normalized.filter((row) => {
    if (row.status !== 'not_started') {
      return false;
    }

    const predecessors = inboundByTargetId.get(row.node_id) ?? [];
    return predecessors.every((sourceNodeId) => {
      const sourceStatus = statusByNodeId.get(sourceNodeId) ?? 'not_started';
      return sourceStatus === 'complete' || sourceStatus === 'skipped';
    });
  });

  const blockers = Array.from(
    new Set([
      ...normalized
        .filter(
          (row) =>
            row.type === 'decision' &&
            (row.status === 'not_started' || row.status === 'in_progress')
        )
        .slice(0, 2)
        .map((row) => `Decision pending: ${row.title}`),
      ...normalized
        .filter((row) => row.status === 'in_progress')
        .slice(0, 2)
        .map(
          (row) =>
            `In progress: ${row.title}${row.assigned_to ? ` — owner: ${row.assigned_to}` : ''}`
        ),
    ])
  ).slice(0, 3);

  const upcoming = [
    ...normalized
      .filter((row) => row.status === 'in_progress')
      .slice(0, 3)
      .map((row) => `Continue ${row.title}`),
    ...readyNodes.slice(0, 3).map((row) => `Start ${row.title}`),
  ].slice(0, 3);

  const decisionNode = normalized.find(
    (row) => row.type === 'decision' && (row.status === 'not_started' || row.status === 'in_progress')
  );
  const inProgressNode = normalized.find((row) => row.status === 'in_progress');
  const nextNode = readyNodes[0] ?? null;

  const suggestedNextAction = decisionNode
    ? {
        node_id: decisionNode.node_id,
        title: decisionNode.title,
        type: decisionNode.type,
        rationale: 'Resolve the pending decision so the graph can advance down the correct path.',
      }
    : inProgressNode
      ? {
          node_id: inProgressNode.node_id,
          title: inProgressNode.title,
          type: inProgressNode.type,
          rationale: 'Finish the active node to unblock the next set of downstream steps.',
        }
      : nextNode
        ? {
            node_id: nextNode.node_id,
            title: nextNode.title,
            type: nextNode.type,
            rationale: 'Start the next available node to move the project forward.',
          }
        : null;

  const summaryParts = [total > 0 ? `${completed}/${total} nodes complete` : 'No nodes in this project yet'];

  if (inProgress > 0) {
    summaryParts.push(`${inProgress} in progress`);
  } else if (readyNodes.length > 0) {
    summaryParts.push(`${readyNodes.length} ready to start`);
  } else if (notStarted > 0 && total > 0) {
    summaryParts.push(`${notStarted} not started`);
  }

  if (project.status === 'completed') {
    summaryParts.push('project marked complete');
  } else if (suggestedNextAction) {
    summaryParts.push(`focus on ${suggestedNextAction.title} next`);
  }

  return {
    summary: `${summaryParts.join('. ')}.`,
    blockers,
    upcoming,
    suggested_next_action: suggestedNextAction,
    stats: {
      total,
      completed,
      in_progress: inProgress,
      not_started: notStarted,
      skipped,
      progress_percent: progressPercent,
    },
  };
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

    const project = projectResult.rows[0] as ProjectRow;

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

// GET project brief / next best action
router.get('/:id/brief', async (req: Request, res: Response) => {
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

    const project = projectResult.rows[0] as ProjectRow;

    const nodeResult = await query(
      `SELECT n.id as node_id,
              n.title,
              n.type,
              pns.status,
              pns.decision_result,
              pns.assigned_to,
              pns.notes,
              pns.started_at,
              pns.completed_at
       FROM nodes n
       LEFT JOIN project_node_statuses pns
         ON pns.node_id = n.id AND pns.project_id = $1
       WHERE n.process_id = $2
       ORDER BY
         CASE COALESCE(pns.status, 'not_started')
           WHEN 'in_progress' THEN 0
           WHEN 'not_started' THEN 1
           WHEN 'complete' THEN 2
           WHEN 'skipped' THEN 3
           ELSE 4
         END,
         n.created_at`,
      [id, project.process_id]
    );

    const edgeResult = await query(
      `SELECT source_node_id, target_node_id
       FROM edges
       WHERE process_id = $1`,
      [project.process_id]
    );

    res.json(
      buildProjectBrief(
        project,
        nodeResult.rows as ProjectBriefRow[],
        edgeResult.rows as ProjectBriefEdgeRow[]
      )
    );
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

// GET export project as JSON backup
router.get('/:id/export', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const projectResult = await query(
      `SELECT p.*, pr.name as process_name, pr.description as process_description
       FROM projects p
       JOIN processes pr ON p.process_id = pr.id
       WHERE p.id = $1`,
      [id]
    );

    if (projectResult.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const project = projectResult.rows[0] as Record<string, unknown>;

    const nodeStatusesResult = await query(
      `SELECT pns.node_id, pns.status, pns.decision_result, pns.form_data,
              pns.assigned_to, pns.notes, pns.started_at, pns.completed_at
       FROM project_node_statuses pns
       WHERE pns.project_id = $1`,
      [id]
    );

    const exportData = {
      _export_version: 1,
      _exported_at: new Date().toISOString(),
      project: {
        name: project.name,
        process_id: project.process_id,
        status: project.status,
        metadata: project.metadata,
      },
      node_statuses: nodeStatusesResult.rows,
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${String(project.name).replace(/[^a-zA-Z0-9]/g, '_')}.json"`
    );
    res.json(exportData);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// POST import project from JSON backup
router.post('/import', async (req: Request, res: Response) => {
  const client = await getClient();

  try {
    const payload = req.body;

    if (!payload?.project?.name || !payload?.project?.process_id) {
      return res.status(400).json({
        error: 'Invalid export file: missing project name or process_id'
      });
    }

    const { project: projectData, node_statuses: nodeStatuses = [] } = payload;

    await client.query('BEGIN');

    // Create the new project
    const projectResult = await client.query(
      `INSERT INTO projects (name, process_id, status, metadata)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [
        projectData.name + ' (imported)',
        projectData.process_id,
        projectData.status || 'active',
        JSON.stringify(projectData.metadata || {}),
      ]
    );

    const newProject = projectResult.rows[0] as Record<string, unknown>;
    const newProjectId = newProject.id as string;

    // Initialize all node statuses as not_started first
    await client.query(
      `INSERT INTO project_node_statuses (project_id, node_id, status)
       SELECT $1, id, 'not_started'
       FROM nodes WHERE process_id = $2`,
      [newProjectId, projectData.process_id]
    );

    // Restore saved node statuses
    let restoredCount = 0;
    for (const ns of nodeStatuses as Array<Record<string, unknown>>) {
      if (!ns.node_id) continue;

      await client.query(
        `UPDATE project_node_statuses
         SET status = $1,
             decision_result = $2,
             form_data = $3,
             notes = $4,
             started_at = $5,
             completed_at = $6
         WHERE project_id = $7 AND node_id = $8`,
        [
          ns.status || 'not_started',
          ns.decision_result || null,
          typeof ns.form_data === 'string' ? ns.form_data : JSON.stringify(ns.form_data || {}),
          ns.notes || null,
          ns.started_at || null,
          ns.completed_at || null,
          newProjectId,
          ns.node_id,
        ]
      );
      restoredCount++;
    }

    await client.query('COMMIT');

    res.status(201).json({
      message: 'Project imported successfully',
      project: { id: newProjectId, name: newProject.name as string },
      stats: { node_statuses: restoredCount },
    });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: (err as Error).message });
  } finally {
    client.release();
  }
});

export { router as projectRoutes };
