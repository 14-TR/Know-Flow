import { describe, it, expect, vi, beforeEach } from 'vitest';
import express, { Express } from 'express';

vi.mock('../utils/db.js', () => ({
  query: vi.fn(),
  getClient: vi.fn(),
}));

import * as db from '../utils/db.js';
import { projectRoutes } from '../routes/projects.js';

function createTestApp(): Express {
  const app = express();
  app.use(express.json());
  app.use('/api/projects', projectRoutes);
  return app;
}

async function request(
  app: Express,
  method: string,
  path: string
): Promise<{ status: number; body: unknown }> {
  return new Promise((resolve) => {
    const server = app.listen(0, () => {
      const addr = server.address();
      const port = typeof addr === 'object' && addr ? addr.port : 3000;

      fetch(`http://127.0.0.1:${port}${path}`, { method })
        .then(async (res) => {
          const data = await res.json();
          server.close();
          resolve({ status: res.status, body: data });
        })
        .catch((err) => {
          server.close();
          resolve({ status: 500, body: { error: err.message } });
        });
    });
  });
}

describe('Project brief route', () => {
  let app: Express;

  beforeEach(() => {
    app = createTestApp();
    vi.clearAllMocks();
  });

  it('returns a graph-aware brief that only surfaces actually ready nodes', async () => {
    vi.mocked(db.query)
      .mockResolvedValueOnce({
        rows: [{ id: 'proj-1', name: 'Alpha', process_id: 'proc-1', status: 'active' }],
        rowCount: 1,
      })
      .mockResolvedValueOnce({
        rows: [
          {
            node_id: 'node-2',
            title: 'Gather requirements',
            type: 'task',
            status: 'not_started',
            decision_result: null,
            assigned_to: null,
            notes: null,
            started_at: null,
            completed_at: null,
            due_date: null,
          },
          {
            node_id: 'node-3',
            title: 'Build prototype',
            type: 'task',
            status: 'not_started',
            decision_result: null,
            assigned_to: null,
            notes: null,
            started_at: null,
            completed_at: null,
            due_date: null,
          },
          {
            node_id: 'node-1',
            title: 'Kickoff',
            type: 'start',
            status: 'complete',
            decision_result: null,
            assigned_to: null,
            notes: null,
            started_at: null,
            completed_at: null,
            due_date: null,
          },
        ],
        rowCount: 3,
      })
      .mockResolvedValueOnce({
        rows: [
          { source_node_id: 'node-1', target_node_id: 'node-2' },
          { source_node_id: 'node-2', target_node_id: 'node-3' },
        ],
        rowCount: 2,
      });

    const res = await request(app, 'GET', '/api/projects/proj-1/brief');

    expect(res.status).toBe(200);
    expect((res.body as { summary: string }).summary).toContain('1 ready to start');
    expect((res.body as { upcoming: string[] }).upcoming).toEqual(['Start Gather requirements']);
    expect(
      (res.body as { suggested_next_action: { title: string } }).suggested_next_action.title
    ).toBe('Gather requirements');
  });

  it('keeps pending decisions as the suggested next action', async () => {
    vi.mocked(db.query)
      .mockResolvedValueOnce({
        rows: [{ id: 'proj-1', name: 'Alpha', process_id: 'proc-1', status: 'active' }],
        rowCount: 1,
      })
      .mockResolvedValueOnce({
        rows: [
          {
            node_id: 'node-3',
            title: 'Choose deployment path',
            type: 'decision',
            status: 'in_progress',
            decision_result: null,
            assigned_to: 'TR',
            notes: null,
            started_at: null,
            completed_at: null,
            due_date: null,
          },
          {
            node_id: 'node-4',
            title: 'Deploy API',
            type: 'task',
            status: 'not_started',
            decision_result: null,
            assigned_to: null,
            notes: null,
            started_at: null,
            completed_at: null,
            due_date: null,
          },
          {
            node_id: 'node-1',
            title: 'Kickoff',
            type: 'start',
            status: 'complete',
            decision_result: null,
            assigned_to: null,
            notes: null,
            started_at: null,
            completed_at: null,
            due_date: null,
          },
        ],
        rowCount: 3,
      })
      .mockResolvedValueOnce({
        rows: [{ source_node_id: 'node-3', target_node_id: 'node-4' }],
        rowCount: 1,
      });

    const res = await request(app, 'GET', '/api/projects/proj-1/brief');

    expect(res.status).toBe(200);
    expect((res.body as { blockers: string[] }).blockers).toContain(
      'Decision pending: Choose deployment path'
    );
    expect(
      (res.body as { suggested_next_action: { title: string } }).suggested_next_action.title
    ).toBe('Choose deployment path');
  });

  it('surfaces overdue and next due dates inside the brief', async () => {
    vi.mocked(db.query)
      .mockResolvedValueOnce({
        rows: [{ id: 'proj-2', name: 'Beta', process_id: 'proc-2', status: 'active' }],
        rowCount: 1,
      })
      .mockResolvedValueOnce({
        rows: [
          {
            node_id: 'node-10',
            title: 'Draft statement of work',
            type: 'task',
            status: 'in_progress',
            decision_result: null,
            assigned_to: 'TR',
            notes: null,
            started_at: null,
            completed_at: null,
            due_date: '2026-04-10',
          },
          {
            node_id: 'node-11',
            title: 'Review estimate',
            type: 'task',
            status: 'not_started',
            decision_result: null,
            assigned_to: null,
            notes: null,
            started_at: null,
            completed_at: null,
            due_date: '2026-04-14',
          },
        ],
        rowCount: 2,
      })
      .mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      });

    const res = await request(app, 'GET', '/api/projects/proj-2/brief');

    expect(res.status).toBe(200);
    expect((res.body as { summary: string }).summary).toContain('1 overdue');
    expect((res.body as { blockers: string[] }).blockers).toContain(
      'Overdue: Draft statement of work (due Apr 10)'
    );
    expect((res.body as { upcoming: string[] }).upcoming).toEqual([
      'Catch up Apr 10 — Draft statement of work',
      'Due Apr 14 — Review estimate',
    ]);
    expect(
      (res.body as { stats: { overdue: number; next_due_date: string | null } }).stats
    ).toMatchObject({ overdue: 1, next_due_date: '2026-04-10' });
  });


  it('returns 404 when the project does not exist', async () => {
    vi.mocked(db.query).mockResolvedValueOnce({ rows: [], rowCount: 0 });

    const res = await request(app, 'GET', '/api/projects/missing/brief');

    expect(res.status).toBe(404);
    expect((res.body as { error: string }).error).toContain('Project not found');
  });
});
