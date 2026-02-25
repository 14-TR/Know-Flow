import { Router, Request, Response } from 'express';
import { all, get, db } from '../utils/db.js';

const router = Router();

// GET /api/spec/graph?source=cheyenne-permits
// Returns spec nodes + edges for a given source
router.get('/spec/graph', (_req: Request, res: Response) => {
  try {
    const source = _req.query.source as string || 'cheyenne-permits';
    const nodes = all('SELECT * FROM spec_nodes WHERE source = ? ORDER BY phase, name', [source]);
    const nodeIds = (nodes as any[]).map(n => n.id);
    if (nodeIds.length === 0) return res.json({ nodes: [], edges: [], sources: [] });

    const placeholders = nodeIds.map(() => '?').join(',');
    const edges = all(
      `SELECT * FROM spec_edges WHERE source_id IN (${placeholders}) OR target_id IN (${placeholders})`,
      [...nodeIds, ...nodeIds]
    );

    const sources = all('SELECT DISTINCT source FROM spec_nodes', []);
    res.json({ nodes, edges, sources: (sources as any[]).map(s => s.source) });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// GET /api/projects/:id/coverage
// Which spec nodes are covered by tasks in this project, and which are gaps
router.get('/projects/:id/coverage', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const source = req.query.source as string || 'cheyenne-permits';

    const project = get('SELECT * FROM projects WHERE id = ?', [id]) as any;
    if (!project) return res.status(404).json({ error: 'Project not found' });

    // All spec nodes for this source
    const specNodes = all('SELECT * FROM spec_nodes WHERE source = ? ORDER BY phase, name', [source]) as any[];

    // Existing links for this project
    const links = all(`
      SELECT sl.*, n.title as task_title, n.type as task_type,
             pns.status as task_status
      FROM spec_links sl
      JOIN nodes n ON n.id = sl.node_id
      LEFT JOIN project_node_statuses pns ON pns.node_id = sl.node_id AND pns.project_id = sl.project_id
      WHERE sl.project_id = ?
    `, [id]) as any[];

    const linkedSpecIds = new Set(links.map((l: any) => l.spec_node_id));
    const covered = specNodes.filter(n => linkedSpecIds.has(n.id));
    const gaps = specNodes.filter(n => !linkedSpecIds.has(n.id));

    const coveragePct = specNodes.length > 0
      ? Math.round((covered.length / specNodes.length) * 100) : 0;

    res.json({
      project: { id: project.id, name: project.name },
      source,
      total_spec_nodes: specNodes.length,
      covered: covered.length,
      gaps: gaps.length,
      coverage_pct: coveragePct,
      covered_nodes: covered.map(n => ({
        ...n,
        links: links.filter((l: any) => l.spec_node_id === n.id)
      })),
      gap_nodes: gaps,
      links,
    });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// POST /api/projects/:projectId/nodes/:nodeId/spec-links
// Link a task node to a spec requirement node
router.post('/projects/:projectId/nodes/:nodeId/spec-links', (req: Request, res: Response) => {
  try {
    const { projectId, nodeId } = req.params;
    const { spec_node_id, coverage_type = 'satisfies', notes } = req.body;
    if (!spec_node_id) return res.status(400).json({ error: 'spec_node_id required' });

    db.prepare(`
      INSERT OR IGNORE INTO spec_links (project_id, node_id, spec_node_id, coverage_type, notes)
      VALUES (?, ?, ?, ?, ?)
    `).run(projectId, nodeId, spec_node_id, coverage_type, notes || null);

    res.json({ success: true, projectId, nodeId, spec_node_id, coverage_type });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/projects/:projectId/nodes/:nodeId/spec-links/:specNodeId
router.delete('/projects/:projectId/nodes/:nodeId/spec-links/:specNodeId', (req: Request, res: Response) => {
  try {
    const { projectId, nodeId, specNodeId } = req.params;
    db.prepare(`
      DELETE FROM spec_links WHERE project_id = ? AND node_id = ? AND spec_node_id = ?
    `).run(projectId, nodeId, specNodeId);
    res.json({ success: true });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

export default router;
