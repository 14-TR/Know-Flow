import { describe, it, expect, vi, beforeEach } from 'vitest';
import express, { Express } from 'express';

const { query } = vi.hoisted(() => ({
  query: vi.fn(),
}));

vi.mock('../utils/db.js', () => ({
  query,
}));

import { debugRoutes } from '../routes/debug.js';

function createTestApp(): Express {
  const app = express();
  app.use(express.json());
  app.use('/api/debug', debugRoutes);
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

describe('Debug routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('includes project edge traversals in the table count summary', async () => {
    query.mockResolvedValue({ rows: [{ count: 0 }], rowCount: 1 });

    const res = await request(createTestApp(), '/api/debug/tables');

    expect(res.status).toBe(200);
    expect((res.body as { tables: Record<string, number> }).tables.project_edge_traversals).toBe(0);
  });

  it('orders project edge traversals by executed_at', async () => {
    const sqlStatements: string[] = [];

    query.mockImplementation((sql: string) => {
      sqlStatements.push(sql);
      if (sql.includes('COUNT(*)')) {
        return Promise.resolve({ rows: [{ count: 1 }], rowCount: 1 });
      }
      return Promise.resolve({
        rows: [{ id: 'trav-1', project_id: 'proj-1', edge_id: 'edge-1', executed_at: '2026-05-16T00:00:00Z' }],
        rowCount: 1,
      });
    });

    const res = await request(createTestApp(), '/api/debug/tables/project_edge_traversals?limit=50');

    expect(res.status).toBe(200);
    expect((res.body as { rows: unknown[] }).rows).toHaveLength(1);
    expect(sqlStatements[0]).toContain('ORDER BY executed_at DESC');
    expect(sqlStatements[0]).not.toContain('ORDER BY created_at DESC');
  });

  it('rejects unknown table names before building SQL', async () => {
    const res = await request(createTestApp(), '/api/debug/tables/not_a_table');

    expect(res.status).toBe(400);
    expect(query).not.toHaveBeenCalled();
  });
});