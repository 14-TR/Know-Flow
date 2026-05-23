import { afterEach, describe, expect, it, vi } from 'vitest';
import express, { Express } from 'express';
import fs from 'fs';
import os from 'os';
import path from 'path';

let tempDataDir: string | null = null;

async function createSeededDashboardApp(): Promise<Express> {
  vi.resetModules();
  tempDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'knowflow-dashboard-'));
  process.env.DATA_DIR = tempDataDir;
  process.env.KNOWFLOW_USER = 'admin';

  const dbModule = await import('../utils/db.js');
  dbModule.initDatabase();
  const { dashboardRoutes } = await import('../routes/dashboard.js');

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

describe('Dashboard seeded workflow signal', () => {
  afterEach(async () => {
    const dbModule = await import('../utils/db.js');
    dbModule.db.close();
    delete process.env.DATA_DIR;
    delete process.env.KNOWFLOW_USER;

    if (tempDataDir) {
      fs.rmSync(tempDataDir, { recursive: true, force: true });
      tempDataDir = null;
    }
  });

  it('does not surface conditional alternate-path blockers before the decision path is selected', async () => {
    const app = await createSeededDashboardApp();

    const res = await request(app, '/api/dashboard');

    expect(res.status).toBe(200);

    const body = res.body as {
      stats: { readyNodes: number; blockedNodes: number };
      attentionItems: { title: string; reason: string }[];
    };

    expect(body.stats.readyNodes).toBe(0);
    expect(body.stats.blockedNodes).toBe(0);
    expect(body.attentionItems.map((item) => item.title)).not.toContain('Project Terminated');
    expect(body.attentionItems.map((item) => item.title)).not.toContain('Construction Phase');
    expect(body.attentionItems.map((item) => item.title)).not.toContain('Certificate of Occupancy Issued');
    expect(body.attentionItems.some((item) => item.reason.includes('Annexation Approved?'))).toBe(false);
  });
});
