/**
 * Integration tests for Graph RAG routes.
 *
 * These tests cover all endpoints in the graphRag router for knowledge graph
 * queries, context extraction, and export functionality.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express, { Express } from 'express';

// Mock data for tests
const mockProcesses = [
  { id: 'proc-1', name: 'Test Process', description: 'A test process', version: '1.0' },
  { id: 'proc-2', name: 'Second Process', description: 'Another process', version: '1.0' },
];

const mockNodes = [
  { id: 'node-1', process_id: 'proc-1', type: 'start', title: 'Start', description: 'Starting point', form_schema: '{}', metadata: '{}', position_x: 0, position_y: 0 },
  { id: 'node-2', process_id: 'proc-1', type: 'task', title: 'Task 1', description: 'First task', form_schema: '{"type":"object"}', metadata: '{"key":"value"}', position_x: 100, position_y: 0 },
  { id: 'node-3', process_id: 'proc-1', type: 'decision', title: 'Decision Point', description: 'Make a choice', form_schema: '{}', metadata: '{}', position_x: 200, position_y: 0 },
  { id: 'node-4', process_id: 'proc-1', type: 'task', title: 'Task 2A', description: 'Path A task', form_schema: '{}', metadata: '{}', position_x: 300, position_y: -50 },
  { id: 'node-5', process_id: 'proc-1', type: 'end', title: 'End', description: 'Finish', form_schema: '{}', metadata: '{}', position_x: 400, position_y: 0 },
];

const mockEdges = [
  { id: 'edge-1', process_id: 'proc-1', source_node_id: 'node-1', target_node_id: 'node-2', label: null, condition: '{}', waypoints: '[]' },
  { id: 'edge-2', process_id: 'proc-1', source_node_id: 'node-2', target_node_id: 'node-3', label: 'next', condition: '{}', waypoints: '[]' },
  { id: 'edge-3', process_id: 'proc-1', source_node_id: 'node-3', target_node_id: 'node-4', label: 'yes', condition: '{"value":"yes"}', waypoints: '[]' },
  { id: 'edge-4', process_id: 'proc-1', source_node_id: 'node-3', target_node_id: 'node-5', label: 'no', condition: '{"value":"no"}', waypoints: '[]' },
  { id: 'edge-5', process_id: 'proc-1', source_node_id: 'node-4', target_node_id: 'node-5', label: null, condition: '{}', waypoints: '[]' },
];

const mockProjects = [
  { id: 'proj-1', name: 'Test Project', process_id: 'proc-1', status: 'active', metadata: '{}', process_name: 'Test Process', process_description: 'A test process' },
];

const mockNodeStatuses = [
  { id: 'status-1', project_id: 'proj-1', node_id: 'node-1', status: 'complete', decision_result: null, form_data: '{}', assigned_to: null, notes: 'Started', started_at: '2024-01-01T00:00:00Z', completed_at: '2024-01-01T00:01:00Z', node_title: 'Start', node_type: 'start', node_description: 'Starting point' },
  { id: 'status-2', project_id: 'proj-1', node_id: 'node-2', status: 'complete', decision_result: null, form_data: '{"answer":"42"}', assigned_to: 'alice', notes: null, started_at: '2024-01-01T00:01:00Z', completed_at: '2024-01-01T00:05:00Z', node_title: 'Task 1', node_type: 'task', node_description: 'First task' },
  { id: 'status-3', project_id: 'proj-1', node_id: 'node-3', status: 'complete', decision_result: 'yes', form_data: '{}', assigned_to: null, notes: 'Chose yes', started_at: '2024-01-01T00:05:00Z', completed_at: '2024-01-01T00:06:00Z', node_title: 'Decision Point', node_type: 'decision', node_description: 'Make a choice' },
  { id: 'status-4', project_id: 'proj-1', node_id: 'node-4', status: 'in_progress', decision_result: null, form_data: '{}', assigned_to: 'bob', notes: null, started_at: '2024-01-01T00:06:00Z', completed_at: null, node_title: 'Task 2A', node_type: 'task', node_description: 'Path A task' },
];

const mockTraversals = [
  { id: 'trav-1', project_id: 'proj-1', edge_id: 'edge-1', executed_at: '2024-01-01T00:01:00Z', edge_label: null, source_title: 'Start', target_title: 'Task 1' },
  { id: 'trav-2', project_id: 'proj-1', edge_id: 'edge-2', executed_at: '2024-01-01T00:05:00Z', edge_label: 'next', source_title: 'Task 1', target_title: 'Decision Point' },
  { id: 'trav-3', project_id: 'proj-1', edge_id: 'edge-3', executed_at: '2024-01-01T00:06:00Z', edge_label: 'yes', source_title: 'Decision Point', target_title: 'Task 2A' },
];

// Mock the db module
vi.mock('../utils/db.js', () => ({
  all: vi.fn(),
  get: vi.fn(),
  isAdmin: true,
  knowflowUser: 'admin',
}));

import * as db from '../utils/db.js';
import { graphRagRoutes } from '../routes/graphRag.js';

// Helper to create test app
function createTestApp(): Express {
  const app = express();
  app.use(express.json());
  app.use('/api/graph', graphRagRoutes);
  return app;
}

// Helper to make HTTP requests using a test server
async function request(
  app: Express,
  method: string,
  path: string,
  body?: unknown
): Promise<{ status: number; body: unknown; headers: Record<string, string> }> {
  return new Promise((resolve) => {
    const server = app.listen(0, () => {
      const addr = server.address();
      const port = typeof addr === 'object' && addr ? addr.port : 3000;

      fetch(`http://127.0.0.1:${port}${path}`, {
        method,
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      })
        .then(async (res) => {
          const contentType = res.headers.get('content-type') || '';
          let data: unknown;
          if (contentType.includes('application/json')) {
            data = await res.json();
          } else {
            data = await res.text();
          }
          server.close();
          resolve({
            status: res.status,
            body: data,
            headers: Object.fromEntries(res.headers.entries()),
          });
        })
        .catch((err) => {
          server.close();
          resolve({ status: 500, body: { error: err.message }, headers: {} });
        });
    });
  });
}

describe('Graph RAG Routes', () => {
  let app: Express;

  beforeEach(() => {
    app = createTestApp();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // GET /api/graph/search
  // ═══════════════════════════════════════════════════════════════════════════

  describe('GET /search', () => {
    it('should search nodes by query string', async () => {
      vi.mocked(db.all).mockReturnValue([
        { ...mockNodes[1], process_name: 'Test Process', process_description: 'A test process' },
      ]);

      const res = await request(app, 'GET', '/api/graph/search?q=Task');

      expect(res.status).toBe(200);
      expect((res.body as { count: number }).count).toBe(1);
      expect((res.body as { results: unknown[] }).results).toHaveLength(1);
      expect((res.body as { query: string }).query).toBe('Task');
    });

    it('should return 400 when query is missing', async () => {
      const res = await request(app, 'GET', '/api/graph/search');

      expect(res.status).toBe(400);
      expect((res.body as { error: string }).error).toContain('required');
    });

    it('should filter by type when provided', async () => {
      vi.mocked(db.all).mockReturnValue([]);

      const res = await request(app, 'GET', '/api/graph/search?q=Test&type=task');

      expect(res.status).toBe(200);
      expect(vi.mocked(db.all)).toHaveBeenCalledWith(
        expect.stringContaining('n.type = ?'),
        expect.arrayContaining(['task'])
      );
    });

    it('should filter by process_id when provided', async () => {
      vi.mocked(db.all).mockReturnValue([]);

      const res = await request(app, 'GET', '/api/graph/search?q=Test&process_id=proc-1');

      expect(res.status).toBe(200);
      expect(vi.mocked(db.all)).toHaveBeenCalledWith(
        expect.stringContaining('n.process_id = ?'),
        expect.arrayContaining(['proc-1'])
      );
    });

    it('should respect limit parameter', async () => {
      vi.mocked(db.all).mockReturnValue([]);

      await request(app, 'GET', '/api/graph/search?q=Test&limit=10');

      expect(vi.mocked(db.all)).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([10])
      );
    });

    it('should cap limit at 100', async () => {
      vi.mocked(db.all).mockReturnValue([]);

      await request(app, 'GET', '/api/graph/search?q=Test&limit=500');

      expect(vi.mocked(db.all)).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([100])
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // GET /api/graph/process/:id/context
  // ═══════════════════════════════════════════════════════════════════════════

  describe('GET /process/:id/context', () => {
    it('should return full process context', async () => {
      vi.mocked(db.get).mockReturnValue(mockProcesses[0]);
      vi.mocked(db.all)
        .mockReturnValueOnce(mockNodes.filter((n) => n.process_id === 'proc-1'))
        .mockReturnValueOnce(mockEdges.filter((e) => e.process_id === 'proc-1'));

      const res = await request(app, 'GET', '/api/graph/process/proc-1/context');

      expect(res.status).toBe(200);
      const body = res.body as { process: { id: string }; nodes: unknown[]; edges: unknown[] };
      expect(body.process.id).toBe('proc-1');
      expect(body.nodes).toHaveLength(5);
      expect(body.edges).toHaveLength(5);
    });

    it('should return 404 for non-existent process', async () => {
      vi.mocked(db.get).mockReturnValue(undefined);

      const res = await request(app, 'GET', '/api/graph/process/invalid/context');

      expect(res.status).toBe(404);
      expect((res.body as { error: string }).error).toContain('not found');
    });

    it('should include paths when requested', async () => {
      vi.mocked(db.get).mockReturnValue(mockProcesses[0]);
      vi.mocked(db.all)
        .mockReturnValueOnce(mockNodes.filter((n) => n.process_id === 'proc-1'))
        .mockReturnValueOnce(mockEdges.filter((e) => e.process_id === 'proc-1'));

      const res = await request(app, 'GET', '/api/graph/process/proc-1/context?include_paths=true');

      expect(res.status).toBe(200);
      expect((res.body as { paths: string[][] }).paths).toBeDefined();
    });

    it('should include context_text for markdown format', async () => {
      vi.mocked(db.get).mockReturnValue(mockProcesses[0]);
      vi.mocked(db.all)
        .mockReturnValueOnce(mockNodes.filter((n) => n.process_id === 'proc-1'))
        .mockReturnValueOnce(mockEdges.filter((e) => e.process_id === 'proc-1'));

      const res = await request(app, 'GET', '/api/graph/process/proc-1/context?format=markdown');

      expect(res.status).toBe(200);
      expect((res.body as { context_text: string }).context_text).toContain('# Test Process');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // GET /api/graph/node/:id/neighborhood
  // ═══════════════════════════════════════════════════════════════════════════

  describe('GET /node/:id/neighborhood', () => {
    it('should return node and its neighbors', async () => {
      vi.mocked(db.get)
        .mockReturnValueOnce(mockNodes[2]) // Center node (decision)
        .mockReturnValueOnce(mockNodes[1]) // Neighbor (task 1)
        .mockReturnValueOnce(mockNodes[3]) // Neighbor (task 2A)
        .mockReturnValueOnce(mockNodes[4]); // Neighbor (end)
      vi.mocked(db.all)
        .mockReturnValueOnce([mockEdges[2], mockEdges[3]]) // Outgoing from node-3
        .mockReturnValueOnce([mockEdges[1]]); // Incoming to node-3

      const res = await request(app, 'GET', '/api/graph/node/node-3/neighborhood');

      expect(res.status).toBe(200);
      const body = res.body as { center: { id: string }; neighbors: unknown[]; edges: unknown[] };
      expect(body.center.id).toBe('node-3');
      expect(body.neighbors.length).toBeGreaterThan(0);
    });

    it('should return 404 for non-existent node', async () => {
      vi.mocked(db.get).mockReturnValue(undefined);

      const res = await request(app, 'GET', '/api/graph/node/invalid/neighborhood');

      expect(res.status).toBe(404);
      expect((res.body as { error: string }).error).toContain('not found');
    });

    it('should respect depth parameter', async () => {
      vi.mocked(db.get).mockReturnValueOnce(mockNodes[0]);
      vi.mocked(db.all).mockReturnValue([]);

      const res = await request(app, 'GET', '/api/graph/node/node-1/neighborhood?depth=2');

      expect(res.status).toBe(200);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // GET /api/graph/node/:id/paths-to/:targetId
  // ═══════════════════════════════════════════════════════════════════════════

  describe('GET /node/:id/paths-to/:targetId', () => {
    it('should find paths between two nodes', async () => {
      vi.mocked(db.get)
        .mockReturnValueOnce({ ...mockNodes[0], process_id: 'proc-1', title: 'Start' })
        .mockReturnValueOnce({ ...mockNodes[4], process_id: 'proc-1', title: 'End' });
      vi.mocked(db.all)
        .mockReturnValueOnce(mockEdges.filter((e) => e.process_id === 'proc-1'))
        .mockReturnValueOnce(mockNodes.filter((n) => n.process_id === 'proc-1'));

      const res = await request(app, 'GET', '/api/graph/node/node-1/paths-to/node-5');

      expect(res.status).toBe(200);
      const body = res.body as { source: { id: string }; target: { id: string }; paths: unknown[] };
      expect(body.source.id).toBe('node-1');
      expect(body.target.id).toBe('node-5');
    });

    it('should return 404 if source node not found', async () => {
      vi.mocked(db.get).mockReturnValueOnce(undefined).mockReturnValueOnce(mockNodes[4]);

      const res = await request(app, 'GET', '/api/graph/node/invalid/paths-to/node-5');

      expect(res.status).toBe(404);
      expect((res.body as { error: string }).error).toContain('not found');
    });

    it('should return 404 if target node not found', async () => {
      vi.mocked(db.get).mockReturnValueOnce(mockNodes[0]).mockReturnValueOnce(undefined);

      const res = await request(app, 'GET', '/api/graph/node/node-1/paths-to/invalid');

      expect(res.status).toBe(404);
    });

    it('should return 400 if nodes are in different processes', async () => {
      vi.mocked(db.get)
        .mockReturnValueOnce({ ...mockNodes[0], process_id: 'proc-1' })
        .mockReturnValueOnce({ ...mockNodes[4], process_id: 'proc-2' });

      const res = await request(app, 'GET', '/api/graph/node/node-1/paths-to/node-5');

      expect(res.status).toBe(400);
      expect((res.body as { error: string }).error).toContain('same process');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // GET /api/graph/process/:id/subgraph
  // ═══════════════════════════════════════════════════════════════════════════

  describe('GET /process/:id/subgraph', () => {
    it('should extract downstream subgraph from start nodes', async () => {
      vi.mocked(db.get).mockReturnValue(mockProcesses[0]);
      vi.mocked(db.all)
        .mockReturnValueOnce(mockEdges.filter((e) => e.process_id === 'proc-1'))
        .mockReturnValueOnce(mockNodes.filter((n) => ['node-1', 'node-2'].includes(n.id)));

      const res = await request(app, 'GET', '/api/graph/process/proc-1/subgraph?start_nodes=node-1');

      expect(res.status).toBe(200);
      const body = res.body as { process: { id: string }; nodes: unknown[]; edges: unknown[] };
      expect(body.process.id).toBe('proc-1');
    });

    it('should return 400 when start_nodes is missing', async () => {
      vi.mocked(db.get).mockReturnValue(mockProcesses[0]);

      const res = await request(app, 'GET', '/api/graph/process/proc-1/subgraph');

      expect(res.status).toBe(400);
      expect((res.body as { error: string }).error).toContain('start_nodes');
    });

    it('should return 404 for non-existent process', async () => {
      vi.mocked(db.get).mockReturnValue(undefined);

      const res = await request(app, 'GET', '/api/graph/process/invalid/subgraph?start_nodes=node-1');

      expect(res.status).toBe(404);
    });

    it('should support upstream direction', async () => {
      vi.mocked(db.get).mockReturnValue(mockProcesses[0]);
      vi.mocked(db.all)
        .mockReturnValueOnce(mockEdges)
        .mockReturnValueOnce(mockNodes.slice(0, 2));

      const res = await request(
        app,
        'GET',
        '/api/graph/process/proc-1/subgraph?start_nodes=node-5&direction=upstream'
      );

      expect(res.status).toBe(200);
      expect((res.body as { direction: string }).direction).toBe('upstream');
    });

    it('should support both direction', async () => {
      vi.mocked(db.get).mockReturnValue(mockProcesses[0]);
      vi.mocked(db.all)
        .mockReturnValueOnce(mockEdges)
        .mockReturnValueOnce(mockNodes);

      const res = await request(
        app,
        'GET',
        '/api/graph/process/proc-1/subgraph?start_nodes=node-3&direction=both'
      );

      expect(res.status).toBe(200);
      expect((res.body as { direction: string }).direction).toBe('both');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // POST /api/graph/context/build
  // ═══════════════════════════════════════════════════════════════════════════

  describe('POST /context/build', () => {
    it('should build context from selected node IDs', async () => {
      vi.mocked(db.all)
        .mockReturnValueOnce(mockNodes.slice(0, 2).map((n) => ({ ...n, process_name: 'Test Process' })))
        .mockReturnValueOnce([mockEdges[0]]);

      const res = await request(app, 'POST', '/api/graph/context/build', {
        node_ids: ['node-1', 'node-2'],
      });

      expect(res.status).toBe(200);
      const body = res.body as { nodes: unknown[]; edges: unknown[]; context_text: string };
      expect(body.nodes).toHaveLength(2);
      expect(body.context_text).toBeDefined();
    });

    it('should return 400 when node_ids is missing', async () => {
      const res = await request(app, 'POST', '/api/graph/context/build', {});

      expect(res.status).toBe(400);
      expect((res.body as { error: string }).error).toContain('node_ids');
    });

    it('should return 400 when node_ids is empty', async () => {
      const res = await request(app, 'POST', '/api/graph/context/build', {
        node_ids: [],
      });

      expect(res.status).toBe(400);
    });

    it('should exclude neighbors when include_neighbors is false', async () => {
      vi.mocked(db.all).mockReturnValueOnce(
        mockNodes.slice(0, 2).map((n) => ({ ...n, process_name: 'Test Process' }))
      );

      const res = await request(app, 'POST', '/api/graph/context/build', {
        node_ids: ['node-1', 'node-2'],
        include_neighbors: false,
      });

      expect(res.status).toBe(200);
      // Should only query nodes, not edges
      expect(vi.mocked(db.all)).toHaveBeenCalledTimes(1);
    });

    it('should support plain text format', async () => {
      vi.mocked(db.all)
        .mockReturnValueOnce(mockNodes.slice(0, 1).map((n) => ({ ...n, process_name: 'Test Process' })))
        .mockReturnValueOnce([]);

      const res = await request(app, 'POST', '/api/graph/context/build', {
        node_ids: ['node-1'],
        format: 'text',
      });

      expect(res.status).toBe(200);
      expect((res.body as { context_text: string }).context_text).toContain('[start]');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // GET /api/graph/processes/summary
  // ═══════════════════════════════════════════════════════════════════════════

  describe('GET /processes/summary', () => {
    it('should return summary of all processes', async () => {
      vi.mocked(db.all).mockReturnValue([
        {
          id: 'proc-1',
          name: 'Test Process',
          description: 'Test',
          version: '1.0',
          node_count: 5,
          edge_count: 5,
          decision_count: 1,
          project_count: 2,
        },
        {
          id: 'proc-2',
          name: 'Another',
          description: null,
          version: '1.0',
          node_count: 3,
          edge_count: 2,
          decision_count: 0,
          project_count: 0,
        },
      ]);

      const res = await request(app, 'GET', '/api/graph/processes/summary');

      expect(res.status).toBe(200);
      const body = res.body as { count: number; processes: unknown[] };
      expect(body.count).toBe(2);
      expect(body.processes).toHaveLength(2);
    });

    it('should return empty array when no processes exist', async () => {
      vi.mocked(db.all).mockReturnValue([]);

      const res = await request(app, 'GET', '/api/graph/processes/summary');

      expect(res.status).toBe(200);
      expect((res.body as { count: number }).count).toBe(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // GET /api/graph/project/:id/history
  // ═══════════════════════════════════════════════════════════════════════════

  describe('GET /project/:id/history', () => {
    it('should return project decision history', async () => {
      vi.mocked(db.get).mockReturnValue(mockProjects[0]);
      vi.mocked(db.all).mockReturnValueOnce(mockNodeStatuses).mockReturnValueOnce(mockTraversals);

      const res = await request(app, 'GET', '/api/graph/project/proj-1/history');

      expect(res.status).toBe(200);
      const body = res.body as {
        project: { id: string };
        timeline: unknown[];
        stats: { total_nodes: number; completed: number };
      };
      expect(body.project.id).toBe('proj-1');
      expect(body.timeline).toBeDefined();
      expect(body.stats.total_nodes).toBe(4);
      expect(body.stats.completed).toBe(3);
    });

    it('should return 404 for non-existent project', async () => {
      vi.mocked(db.get).mockReturnValue(undefined);

      const res = await request(app, 'GET', '/api/graph/project/invalid/history');

      expect(res.status).toBe(404);
      expect((res.body as { error: string }).error).toContain('not found');
    });

    it('should include stats with decision and traversal counts', async () => {
      vi.mocked(db.get).mockReturnValue(mockProjects[0]);
      vi.mocked(db.all).mockReturnValueOnce(mockNodeStatuses).mockReturnValueOnce(mockTraversals);

      const res = await request(app, 'GET', '/api/graph/project/proj-1/history');

      expect(res.status).toBe(200);
      const body = res.body as { stats: { decisions_made: number; edges_traversed: number } };
      expect(body.stats.decisions_made).toBe(1);
      expect(body.stats.edges_traversed).toBe(3);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // GET /api/graph/export/process/:id
  // ═══════════════════════════════════════════════════════════════════════════

  describe('GET /export/process/:id', () => {
    it('should export process as JSON by default', async () => {
      vi.mocked(db.get).mockReturnValue(mockProcesses[0]);
      vi.mocked(db.all)
        .mockReturnValueOnce(mockNodes.filter((n) => n.process_id === 'proc-1'))
        .mockReturnValueOnce(mockEdges.filter((e) => e.process_id === 'proc-1'));

      const res = await request(app, 'GET', '/api/graph/export/process/proc-1');

      expect(res.status).toBe(200);
      const body = res.body as { process: { id: string }; nodes: unknown[]; edges: unknown[] };
      expect(body.process.id).toBe('proc-1');
      expect(body.nodes).toHaveLength(5);
      expect(body.exported_at).toBeDefined();
    });

    it('should return 404 for non-existent process', async () => {
      vi.mocked(db.get).mockReturnValue(undefined);

      const res = await request(app, 'GET', '/api/graph/export/process/invalid');

      expect(res.status).toBe(404);
    });

    it('should export as markdown format', async () => {
      vi.mocked(db.get).mockReturnValue(mockProcesses[0]);
      vi.mocked(db.all)
        .mockReturnValueOnce(mockNodes.filter((n) => n.process_id === 'proc-1'))
        .mockReturnValueOnce(mockEdges.filter((e) => e.process_id === 'proc-1'));

      const res = await request(app, 'GET', '/api/graph/export/process/proc-1?format=markdown');

      expect(res.status).toBe(200);
      expect(typeof res.body).toBe('string');
      expect(res.body as string).toContain('# Test Process');
    });

    it('should export as DOT format for Graphviz', async () => {
      vi.mocked(db.get).mockReturnValue(mockProcesses[0]);
      vi.mocked(db.all)
        .mockReturnValueOnce(mockNodes.filter((n) => n.process_id === 'proc-1'))
        .mockReturnValueOnce(mockEdges.filter((e) => e.process_id === 'proc-1'));

      const res = await request(app, 'GET', '/api/graph/export/process/proc-1?format=dot');

      expect(res.status).toBe(200);
      expect(typeof res.body).toBe('string');
      expect(res.body as string).toContain('digraph');
      expect(res.body as string).toContain('->');
    });

    it('should export as Mermaid format', async () => {
      vi.mocked(db.get).mockReturnValue(mockProcesses[0]);
      vi.mocked(db.all)
        .mockReturnValueOnce(mockNodes.filter((n) => n.process_id === 'proc-1'))
        .mockReturnValueOnce(mockEdges.filter((e) => e.process_id === 'proc-1'));

      const res = await request(app, 'GET', '/api/graph/export/process/proc-1?format=mermaid');

      expect(res.status).toBe(200);
      expect(typeof res.body).toBe('string');
      expect(res.body as string).toContain('flowchart TD');
    });

    it('should export as llm-context format', async () => {
      vi.mocked(db.get).mockReturnValue(mockProcesses[0]);
      vi.mocked(db.all)
        .mockReturnValueOnce(mockNodes.filter((n) => n.process_id === 'proc-1'))
        .mockReturnValueOnce(mockEdges.filter((e) => e.process_id === 'proc-1'));

      const res = await request(app, 'GET', '/api/graph/export/process/proc-1?format=llm-context');

      expect(res.status).toBe(200);
      expect(typeof res.body).toBe('string');
      expect(res.body as string).toContain('KNOWLEDGE GRAPH');
    });

    it('should return 400 for unknown format', async () => {
      vi.mocked(db.get).mockReturnValue(mockProcesses[0]);
      vi.mocked(db.all)
        .mockReturnValueOnce(mockNodes)
        .mockReturnValueOnce(mockEdges);

      const res = await request(app, 'GET', '/api/graph/export/process/proc-1?format=invalid');

      expect(res.status).toBe(400);
      expect((res.body as { error: string }).error).toContain('Unknown format');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // GET /api/graph/export/project/:id
  // ═══════════════════════════════════════════════════════════════════════════

  describe('GET /export/project/:id', () => {
    it('should export project as JSON by default', async () => {
      vi.mocked(db.get).mockReturnValue(mockProjects[0]);
      vi.mocked(db.all).mockReturnValueOnce(mockNodeStatuses).mockReturnValueOnce(mockTraversals);

      const res = await request(app, 'GET', '/api/graph/export/project/proj-1');

      expect(res.status).toBe(200);
      const body = res.body as {
        project: { id: string };
        node_statuses: unknown[];
        edge_traversals: unknown[];
      };
      expect(body.project.id).toBe('proj-1');
      expect(body.node_statuses).toHaveLength(4);
      expect(body.edge_traversals).toHaveLength(3);
    });

    it('should return 404 for non-existent project', async () => {
      vi.mocked(db.get).mockReturnValue(undefined);

      const res = await request(app, 'GET', '/api/graph/export/project/invalid');

      expect(res.status).toBe(404);
      expect((res.body as { error: string }).error).toContain('not found');
    });

    it('should export as markdown format', async () => {
      vi.mocked(db.get).mockReturnValue(mockProjects[0]);
      vi.mocked(db.all).mockReturnValueOnce(mockNodeStatuses).mockReturnValueOnce(mockTraversals);

      const res = await request(app, 'GET', '/api/graph/export/project/proj-1?format=markdown');

      expect(res.status).toBe(200);
      expect(typeof res.body).toBe('string');
      expect(res.body as string).toContain('# Project: Test Project');
      expect(res.body as string).toContain('## Decisions Made');
    });

    it('should export as llm-context format', async () => {
      vi.mocked(db.get).mockReturnValue(mockProjects[0]);
      vi.mocked(db.all).mockReturnValueOnce(mockNodeStatuses).mockReturnValueOnce(mockTraversals);

      const res = await request(app, 'GET', '/api/graph/export/project/proj-1?format=llm-context');

      expect(res.status).toBe(200);
      expect(typeof res.body).toBe('string');
      expect(res.body as string).toContain('PROJECT EXECUTION CONTEXT');
      expect(res.body as string).toContain('DECISIONS MADE');
    });

    it('should return 400 for unknown format', async () => {
      vi.mocked(db.get).mockReturnValue(mockProjects[0]);
      vi.mocked(db.all).mockReturnValueOnce(mockNodeStatuses).mockReturnValueOnce(mockTraversals);

      const res = await request(app, 'GET', '/api/graph/export/project/proj-1?format=invalid');

      expect(res.status).toBe(400);
      expect((res.body as { error: string }).error).toContain('Unknown format');
    });
  });
});
