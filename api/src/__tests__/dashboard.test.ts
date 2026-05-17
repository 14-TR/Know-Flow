import { describe, it, expect, vi, beforeEach } from 'vitest';
import express, { Express } from 'express';

const { prepare } = vi.hoisted(() => ({
  prepare: vi.fn(),
}));

vi.mock('../utils/db.js', () => ({
  db: { prepare },
}));

import { dashboardRoutes } from '../routes/dashboard.js';

function createTestApp(): Express {
  const app = express();
  app.use(express.json());
  app.use('/api/dashboard', dashboardRoutes);
  return app;
}

async function request(app: Express, path: string): Promise<{ status: number; body: unknown }> {
  return new Promise((resolve) => {
    const server = app.listen(0, () => {
      const addr = server.address();
      const port = typeof addr === 'object' && addr ? addr.port : 3000;

      fetch(`http://127.0.0.1:${port}${path}`)
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

describe('Dashboard route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uses the SQLite edge schema when counting recent process edges', async () => {
    const app = createTestApp();
    const sqlStatements: string[] = [];

    prepare.mockImplementation((sql: string) => {
      sqlStatements.push(sql);

      if (sql.includes('SELECT COUNT(*) as count FROM processes')) {
        return { get: () => ({ count: 1 }) };
      }
      if (sql.includes('SELECT COUNT(*) as count FROM nodes')) {
        return { get: () => ({ count: 2 }) };
      }
      if (sql.includes('FROM projects') && sql.includes('COUNT(*) as total')) {
        return { get: () => ({ total: 1, active: 1, completed: 0, archived: 0 }) };
      }
      if (sql.includes('HAVING total_nodes > 0')) {
        return { all: () => [{ id: 'proj-1', total_nodes: 2, completed_nodes: 1 }] };
      }
      if (sql.includes('FROM projects p') && sql.includes('JOIN processes pr')) {
        return { all: () => [] };
      }
      if (sql.includes('FROM processes p')) {
        return {
          all: () => [
            {
              id: 'proc-1',
              name: 'Demo',
              description: null,
              created_at: '2026-05-14T00:00:00Z',
              node_count: 2,
              edge_count: 1,
            },
          ],
        };
      }
      if (sql.includes("date(completed_at) = date('now')")) {
        return { get: () => ({ count: 0 }) };
      }
      if (sql.includes("status = 'in_progress'")) {
        return { get: () => ({ count: 0 }) };
      }

      throw new Error(`Unexpected SQL: ${sql}`);
    });

    const res = await request(app, '/api/dashboard');

    expect(res.status).toBe(200);
    expect((res.body as { recentProcesses: unknown[] }).recentProcesses).toHaveLength(1);
    expect((res.body as { processes: unknown[] }).processes).toHaveLength(1);
    expect((res.body as { projects: unknown[] }).projects).toHaveLength(0);

    const recentProcessSql = sqlStatements.find((sql) => sql.includes('FROM processes p'));
    expect(recentProcessSql).toContain('e.source_node_id = n.id');
    expect(recentProcessSql).not.toContain('e.source_id');
  });
});