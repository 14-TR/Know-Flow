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


  it('surfaces dependency-blocked nodes in the brief', async () => {
    vi.mocked(db.query)
      .mockResolvedValueOnce({
        rows: [{ id: 'proj-1', name: 'Alpha', process_id: 'proc-1', status: 'active' }],
        rowCount: 1,
      })
      .mockResolvedValueOnce({
        rows: [
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
            node_id: 'node-2',
            title: 'Gather requirements',
            type: 'task',
            status: 'in_progress',
            decision_result: null,
            assigned_to: 'TR',
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
    expect((res.body as { summary: string }).summary).toContain('1 blocked');
    expect((res.body as { blockers: string[] }).blockers).toContain(
      'Blocked: Build prototype waiting on Gather requirements'
    );
    expect(
      (res.body as { stats: { blocked: number } }).stats.blocked
    ).toBe(1);
  });

  it('does not count downstream untouched nodes as blocked before start begins', async () => {
    vi.mocked(db.query)
      .mockResolvedValueOnce({
        rows: [{ id: 'proj-1', name: 'Alpha', process_id: 'proc-1', status: 'active' }],
        rowCount: 1,
      })
      .mockResolvedValueOnce({
        rows: [
          {
            node_id: 'node-1',
            title: 'Start',
            type: 'start',
            status: null,
            decision_result: null,
            assigned_to: null,
            notes: null,
            started_at: null,
            completed_at: null,
          },
          {
            node_id: 'node-2',
            title: 'Document Schema',
            type: 'task',
            status: null,
            decision_result: null,
            assigned_to: null,
            notes: null,
            started_at: null,
            completed_at: null,
          },
          {
            node_id: 'node-3',
            title: 'Build prototype',
            type: 'task',
            status: null,
            decision_result: null,
            assigned_to: null,
            notes: null,
            started_at: null,
            completed_at: null,
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
    expect((res.body as { blockers: string[] }).blockers).toEqual([]);
    expect((res.body as { stats: { blocked: number } }).stats.blocked).toBe(0);
    expect((res.body as { upcoming: string[] }).upcoming).toEqual(['Start']);
    expect(
      (res.body as { suggested_next_action: { title: string } }).suggested_next_action.title
    ).toBe('Start');
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

  it('does not duplicate start-node titles in upcoming copy', async () => {
    vi.mocked(db.query)
      .mockResolvedValueOnce({
        rows: [{ id: 'proj-1', name: 'Alpha', process_id: 'proc-1', status: 'active' }],
        rowCount: 1,
      })
      .mockResolvedValueOnce({
        rows: [
          {
            node_id: 'node-1',
            title: 'Start',
            type: 'start',
            status: 'not_started',
            decision_result: null,
            assigned_to: null,
            notes: null,
            started_at: null,
            completed_at: null,
          },
        ],
        rowCount: 1,
      })
      .mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      });

    const res = await request(app, 'GET', '/api/projects/proj-1/brief');

    expect(res.status).toBe(200);
    expect((res.body as { upcoming: string[] }).upcoming).toEqual(['Start']);
  });

  it('keeps downstream decisions out of the brief while development is still in progress', async () => {
    vi.mocked(db.query)
      .mockResolvedValueOnce({
        rows: [{ id: 'proj-1', name: 'Auth Feature', process_id: 'proc-1', status: 'active' }],
        rowCount: 1,
      })
      .mockResolvedValueOnce({
        rows: [
          {
            node_id: 'scope',
            title: 'Scope Confirmed',
            type: 'task',
            status: 'complete',
            decision_result: null,
            assigned_to: null,
            notes: null,
            started_at: null,
            completed_at: null,
          },
          {
            node_id: 'design',
            title: 'Design Approved',
            type: 'decision',
            status: 'complete',
            decision_result: 'Yes',
            assigned_to: null,
            notes: null,
            started_at: null,
            completed_at: null,
          },
          {
            node_id: 'development',
            title: 'Development',
            type: 'task',
            status: 'in_progress',
            decision_result: null,
            assigned_to: 'TR',
            notes: null,
            started_at: null,
            completed_at: null,
          },
          {
            node_id: 'code-review',
            title: 'Code Review Passed?',
            type: 'decision',
            status: 'not_started',
            decision_result: null,
            assigned_to: null,
            notes: null,
            started_at: null,
            completed_at: null,
          },
          {
            node_id: 'qa',
            title: 'QA Passed?',
            type: 'decision',
            status: 'not_started',
            decision_result: null,
            assigned_to: null,
            notes: null,
            started_at: null,
            completed_at: null,
          },
        ],
        rowCount: 5,
      })
      .mockResolvedValueOnce({
        rows: [
          { source_node_id: 'scope', target_node_id: 'design', label: null, condition: null },
          { source_node_id: 'design', target_node_id: 'development', label: 'Yes', condition: '{"value":"Yes"}' },
          { source_node_id: 'development', target_node_id: 'code-review', label: null, condition: null },
          { source_node_id: 'code-review', target_node_id: 'qa', label: 'Yes', condition: '{"value":"Yes"}' },
        ],
        rowCount: 4,
      });

    const res = await request(app, 'GET', '/api/projects/proj-1/brief');

    expect(res.status).toBe(200);
    expect((res.body as { suggested_next_action: { title: string } }).suggested_next_action.title).toBe(
      'Development'
    );
    expect((res.body as { blockers: string[] }).blockers).toContain('In progress: Development — owner: TR');
    expect((res.body as { blockers: string[] }).blockers).toContain(
      'Blocked: Code Review Passed? waiting on Development'
    );
    expect((res.body as { blockers: string[] }).blockers).not.toContain(
      'Decision pending: Code Review Passed?'
    );
    expect((res.body as { blockers: string[] }).blockers).not.toContain(
      'Decision pending: QA Passed?'
    );
  });

  it('returns 404 when the project does not exist', async () => {
    vi.mocked(db.query).mockResolvedValueOnce({ rows: [], rowCount: 0 });

    const res = await request(app, 'GET', '/api/projects/missing/brief');

    expect(res.status).toBe(404);
    expect((res.body as { error: string }).error).toContain('Project not found');
  });

  it('returns only in-progress and actually ready nodes in currentNodes', async () => {
    vi.mocked(db.query)
      .mockResolvedValueOnce({
        rows: [{ id: 'proj-1', name: 'Alpha', process_id: 'proc-1', status: 'active' }],
        rowCount: 1,
      })
      .mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      })
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'node-1',
            title: 'Start',
            type: 'start',
            project_status: null,
            decision_result: null,
            form_data: null,
            assigned_to: null,
            notes: null,
            started_at: null,
            completed_at: null,
            status_id: null,
          },
          {
            id: 'node-2',
            title: 'Document Schema',
            type: 'task',
            project_status: null,
            decision_result: null,
            form_data: null,
            assigned_to: null,
            notes: null,
            started_at: null,
            completed_at: null,
            status_id: null,
          },
          {
            id: 'node-3',
            title: 'Build prototype',
            type: 'task',
            project_status: null,
            decision_result: null,
            form_data: null,
            assigned_to: null,
            notes: null,
            started_at: null,
            completed_at: null,
            status_id: null,
          },
        ],
        rowCount: 3,
      })
      .mockResolvedValueOnce({
        rows: [
          { source_node_id: 'node-1', target_node_id: 'node-2', id: 'edge-1' },
          { source_node_id: 'node-2', target_node_id: 'node-3', id: 'edge-2' },
        ],
        rowCount: 2,
      });

    const res = await request(app, 'GET', '/api/projects/proj-1');

    expect(res.status).toBe(200);
    expect(vi.mocked(db.query).mock.calls[1]?.[0]).toContain(
      'INSERT OR IGNORE INTO project_node_statuses'
    );
    expect((res.body as { currentNodes: Array<{ node_id: string }> }).currentNodes).toEqual([
      {
        node_id: 'node-1',
        node_title: 'Start',
        node_type: 'start',
        status: 'not_started',
      },
    ]);
  });

  it('filters inactive decision branches out of currentNodes after a completed choice', async () => {
    vi.mocked(db.query)
      .mockResolvedValueOnce({
        rows: [{ id: 'proj-1', name: 'Alpha', process_id: 'proc-1', status: 'active' }],
        rowCount: 1,
      })
      .mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      })
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'node-start',
            title: 'Feature Requested',
            type: 'start',
            project_status: 'complete',
            decision_result: null,
            assigned_to: null,
            notes: null,
            started_at: null,
            completed_at: null,
            status_id: 'status-start',
          },
          {
            id: 'node-decision',
            title: 'In Scope?',
            type: 'decision',
            project_status: 'complete',
            decision_result: 'Yes',
            assigned_to: null,
            notes: null,
            started_at: null,
            completed_at: null,
            status_id: 'status-decision',
          },
          {
            id: 'node-dev',
            title: 'Development',
            type: 'task',
            project_status: 'not_started',
            decision_result: null,
            assigned_to: null,
            notes: null,
            started_at: null,
            completed_at: null,
            status_id: 'status-dev',
          },
          {
            id: 'node-reject',
            title: 'Feature Rejected',
            type: 'end',
            project_status: 'not_started',
            decision_result: null,
            assigned_to: null,
            notes: null,
            started_at: null,
            completed_at: null,
            status_id: 'status-reject',
          },
        ],
        rowCount: 4,
      })
      .mockResolvedValueOnce({
        rows: [
          { source_node_id: 'node-start', target_node_id: 'node-decision', id: 'edge-1', label: null, condition: '{}' },
          { source_node_id: 'node-decision', target_node_id: 'node-dev', id: 'edge-2', label: 'Yes', condition: '{"field":"inScope","value":"Yes"}' },
          { source_node_id: 'node-decision', target_node_id: 'node-reject', id: 'edge-3', label: 'No', condition: '{"field":"inScope","value":"No"}' },
        ],
        rowCount: 3,
      });

    const res = await request(app, 'GET', '/api/projects/proj-1');

    expect(res.status).toBe(200);
    expect((res.body as { currentNodes: Array<{ node_id: string }> }).currentNodes).toEqual([
      {
        node_id: 'node-dev',
        node_title: 'Development',
        node_type: 'task',
        status: 'not_started',
      },
    ]);
  });

  it('backfills missing node status rows before returning tracker nodes', async () => {
    vi.mocked(db.query)
      .mockResolvedValueOnce({
        rows: [{ id: 'proj-1', name: 'Alpha', process_id: 'proc-1', status: 'active' }],
        rowCount: 1,
      })
      .mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      })
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'node-1',
            title: 'Start',
            type: 'start',
            project_status: 'not_started',
            decision_result: null,
            form_data: {},
            assigned_to: null,
            notes: null,
            started_at: null,
            completed_at: null,
            status_id: 'status-1',
          },
        ],
        rowCount: 1,
      })
      .mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      });

    const res = await request(app, 'GET', '/api/projects/proj-1');

    expect(res.status).toBe(200);
    expect((res.body as { nodes: Array<{ status_id: string | null }> }).nodes[0]?.status_id).toBe(
      'status-1'
    );
  });
});
