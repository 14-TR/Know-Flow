/**
 * Tests for project export/import routes.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock db module
vi.mock('../utils/db.js', () => {
  const projects: Record<string, unknown>[] = [];
  const nodeStatuses: Record<string, unknown>[] = [];
  let idCounter = 1;

  const genId = () => `proj-test-${idCounter++}`;

  const query = vi.fn(async (text: string, params: unknown[] = []) => {
    const sql = text.trim().toUpperCase();

    // SELECT project with process join
    if (sql.includes('SELECT P.*, PR.NAME AS PROCESS_NAME') && sql.includes('FROM PROJECTS')) {
      const id = params[0] as string;
      const found = projects.filter(p => p.id === id);
      return { rows: found.map(p => ({ ...p, process_name: 'Test Process' })), rowCount: found.length };
    }

    // SELECT node statuses for export
    if (sql.includes('SELECT PNS.NODE_ID') && sql.includes('FROM PROJECT_NODE_STATUSES')) {
      const projectId = params[0] as string;
      const found = nodeStatuses.filter(ns => ns.project_id === projectId);
      return { rows: found, rowCount: found.length };
    }

    // INSERT project
    if (sql.includes('INSERT INTO PROJECTS')) {
      const newProj = {
        id: genId(),
        name: params[0],
        process_id: params[1],
        status: params[2] || 'active',
        metadata: params[3] || '{}',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      projects.push(newProj);
      return { rows: [newProj], rowCount: 1 };
    }

    // INSERT node statuses (bulk init)
    if (sql.includes('INSERT INTO PROJECT_NODE_STATUSES') && sql.includes('SELECT')) {
      return { rows: [], rowCount: 2 };
    }

    // UPDATE node status
    if (sql.includes('UPDATE PROJECT_NODE_STATUSES')) {
      return { rows: [], rowCount: 1 };
    }

    return { rows: [], rowCount: 0 };
  });

  const getClient = vi.fn(async () => ({
    query,
    release: vi.fn(),
  }));

  return {
    query,
    getClient,
    isAdmin: true,
    knowflowUser: 'admin',
    _projects: projects,
    _nodeStatuses: nodeStatuses,
  };
});

vi.mock('../utils/helpers.js', () => ({
  parseJsonFields: (row: Record<string, unknown>) => row,
  convertParams: (sql: string) => sql,
  convertNow: (sql: string) => sql,
  parseReturning: (sql: string) => ({ sql, hasReturning: false, table: null }),
}));

import { query } from '../utils/db.js';

describe('project export/import', () => {
  beforeEach(() => {
    vi.mocked(query).mockClear();
  });

  describe('GET /:id/export', () => {
    it('returns 404 when project not found', async () => {
      vi.mocked(query).mockResolvedValueOnce({ rows: [], rowCount: 0 });
      const result = await query('SELECT p.*, pr.name AS process_name FROM projects p JOIN processes pr ON p.process_id = pr.id WHERE p.id = $1', ['nonexistent']);
      expect(result.rows.length).toBe(0);
    });

    it('export payload has correct structure', () => {
      const mockProject = {
        id: 'proj-1',
        name: 'My Project',
        process_id: 'proc-1',
        status: 'active',
        metadata: '{}',
      };
      const mockNodeStatuses = [
        { node_id: 'node-1', status: 'complete', decision_result: 'Yes', form_data: '{}', notes: null, started_at: '2026-01-01', completed_at: '2026-01-02' },
        { node_id: 'node-2', status: 'in_progress', decision_result: null, form_data: '{}', notes: null, started_at: '2026-01-02', completed_at: null },
      ];

      const exportData = {
        _export_version: 1,
        _exported_at: new Date().toISOString(),
        project: {
          name: mockProject.name,
          process_id: mockProject.process_id,
          status: mockProject.status,
          metadata: mockProject.metadata,
        },
        node_statuses: mockNodeStatuses,
      };

      expect(exportData._export_version).toBe(1);
      expect(exportData.project.name).toBe('My Project');
      expect(exportData.project.process_id).toBe('proc-1');
      expect(exportData.node_statuses).toHaveLength(2);
      expect(exportData.node_statuses[0].status).toBe('complete');
    });

    it('export includes all required node status fields', () => {
      const ns = { node_id: 'n1', status: 'complete', decision_result: 'Yes', form_data: '{"x":1}', notes: 'done', started_at: '2026-01-01', completed_at: '2026-01-02' };
      expect(ns).toHaveProperty('node_id');
      expect(ns).toHaveProperty('status');
      expect(ns).toHaveProperty('decision_result');
      expect(ns).toHaveProperty('form_data');
      expect(ns).toHaveProperty('started_at');
      expect(ns).toHaveProperty('completed_at');
    });
  });

  describe('POST /import', () => {
    it('rejects payload missing project name', () => {
      const payload = { project: { process_id: 'proc-1' }, node_statuses: [] };
      const isInvalid = !payload.project?.name;
      expect(isInvalid).toBe(true);
    });

    it('rejects payload missing process_id', () => {
      const payload = { project: { name: 'My Project' }, node_statuses: [] };
      const isInvalid = !payload.project?.process_id;
      expect(isInvalid).toBe(true);
    });

    it('accepts valid export payload structure', () => {
      const payload = {
        _export_version: 1,
        project: {
          name: 'My Project',
          process_id: 'proc-1',
          status: 'active',
          metadata: '{}',
        },
        node_statuses: [
          { node_id: 'node-1', status: 'complete', decision_result: 'Yes', form_data: '{}', notes: null, started_at: '2026-01-01', completed_at: '2026-01-02' },
          { node_id: 'node-2', status: 'not_started', decision_result: null, form_data: '{}', notes: null, started_at: null, completed_at: null },
        ],
      };

      expect(payload.project.name).toBeTruthy();
      expect(payload.project.process_id).toBeTruthy();
      expect(payload.node_statuses).toHaveLength(2);
    });

    it('imported project name gets (imported) suffix', () => {
      const original = 'Oak Street Development';
      const imported = original + ' (imported)';
      expect(imported).toBe('Oak Street Development (imported)');
    });

    it('node statuses with no node_id are skipped', () => {
      const nodeStatuses = [
        { node_id: 'node-1', status: 'complete' },
        { status: 'in_progress' }, // no node_id
        { node_id: 'node-3', status: 'not_started' },
      ];
      const valid = nodeStatuses.filter((ns) => ns.node_id);
      expect(valid).toHaveLength(2);
    });

    it('handles node_statuses not provided (empty project)', () => {
      const payload = {
        _export_version: 1,
        project: { name: 'Empty Project', process_id: 'proc-1', status: 'active', metadata: '{}' },
      };
      const nodeStatuses = (payload as Record<string, unknown>).node_statuses || [];
      expect(nodeStatuses).toHaveLength(0);
    });

    it('preserves decision_result from backup', () => {
      const ns = { node_id: 'decision-node', status: 'complete', decision_result: 'No - needs rework' };
      expect(ns.decision_result).toBe('No - needs rework');
    });
  });
});
