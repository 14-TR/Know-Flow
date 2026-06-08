import { afterEach, describe, expect, it } from 'vitest';
import Database from 'better-sqlite3';
import fs from 'fs';
import os from 'os';
import path from 'path';

const repoRoot = path.resolve(import.meta.dirname, '../../..');
const schemaSql = fs.readFileSync(path.join(repoRoot, 'database/schema.sql'), 'utf8');
const seedSql = fs.readFileSync(path.join(repoRoot, 'database/seed.sqlite.sql'), 'utf8');

const tempDirs: string[] = [];

function createTempDb() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'projectiq-demo-seed-'));
  tempDirs.push(tempDir);
  const dbPath = path.join(tempDir, 'knowflow.db');
  const db = new Database(dbPath);
  db.exec(schemaSql);
  return db;
}

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  }
});

describe('demo reseed baseline', () => {
  it('clears stale completed_at when reseeding an in-progress seeded node', () => {
    const db = createTempDb();

    try {
      db.exec(seedSql);

      const projectId = 'p3333333-3333-4333-8333-333333333333';
      const nodeId = 'fa000007-0000-4000-8000-000000000007';

      db.prepare(
        `UPDATE project_node_statuses
         SET status = 'complete',
             completed_at = datetime('now')
         WHERE project_id = ?
           AND node_id = ?`
      ).run(projectId, nodeId);

      db.exec(seedSql);

      const row = db.prepare(
        `SELECT status, completed_at
         FROM project_node_statuses
         WHERE project_id = ?
           AND node_id = ?`
      ).get(projectId, nodeId) as { status: string; completed_at: string | null };

      expect(row.status).toBe('in_progress');
      expect(row.completed_at).toBeNull();
    } finally {
      db.close();
    }
  });
});
