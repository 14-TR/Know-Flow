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

  it('returns a heuristic brief with blockers and next action', async () => {
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
          },
        ],
        rowCount: 3,
      });

    const res = await request(app, 'GET', '/api/projects/proj-1/brief');

    expect(res.status).toBe(200);
    expect((res.body as { summary: string }).summary).toContain('1/3 nodes complete');
    expect((res.body as { blockers: string[] }).blockers).toContain(
      'Decision pending: Choose deployment path'
    );
    expect(
      (res.body as { suggested_next_action: { title: string } }).suggested_next_action.title
    ).toBe('Choose deployment path');
  });

  it('returns 404 when the project does not exist', async () => {
    vi.mocked(db.query).mockResolvedValueOnce({ rows: [], rowCount: 0 });

    const res = await request(app, 'GET', '/api/projects/missing/brief');

    expect(res.status).toBe(404);
    expect((res.body as { error: string }).error).toContain('Project not found');
  });
});
