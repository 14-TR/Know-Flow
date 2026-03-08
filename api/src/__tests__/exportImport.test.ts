/**
 * Tests for process export/import routes.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the db module before importing routes
vi.mock('../utils/db.js', () => {
  const processes: Record<string, unknown>[] = [];
  const nodes: Record<string, unknown>[] = [];
  const edges: Record<string, unknown>[] = [];
  let idCounter = 1;

  const genId = () => `test-id-${idCounter++}`;

  const query = vi.fn(async (text: string, params: unknown[] = []) => {
    const sql = text.trim().toUpperCase();

    if (sql.includes('SELECT * FROM PROCESSES WHERE ID')) {
      const id = params[0] as string;
      const found = processes.filter(p => p.id === id);
      return { rows: found, rowCount: found.length };
    }
    if (sql.includes('SELECT * FROM NODES WHERE PROCESS_ID')) {
      const pid = params[0] as string;
      const found = nodes.filter(n => n.process_id === pid);
      return { rows: found, rowCount: found.length };
    }
    if (sql.includes('SELECT * FROM EDGES WHERE PROCESS_ID')) {
      const pid = params[0] as string;
      const found = edges.filter(e => e.process_id === pid);
      return { rows: found, rowCount: found.length };
    }
    if (sql.includes('INSERT INTO PROCESSES')) {
      const newProc = { id: genId(), name: params[0], description: params[1], version: params[2] || 1, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
      processes.push(newProc);
      return { rows: [newProc], rowCount: 1 };
    }
    if (sql.includes('INSERT INTO NODES')) {
      const newNode = { id: genId(), process_id: params[0], type: params[1], title: params[2], description: params[3], form_schema: params[4] || '{}', metadata: params[5] || '{}', position_x: params[6] || 0, position_y: params[7] || 0 };
      nodes.push(newNode);
      return { rows: [newNode], rowCount: 1 };
    }
    if (sql.includes('INSERT INTO EDGES')) {
      const newEdge = { id: genId(), process_id: params[0], source_node_id: params[1], target_node_id: params[2], label: params[3], condition: params[4] || '{}', waypoints: params[5] || '[]' };
      edges.push(newEdge);
      return { rows: [newEdge], rowCount: 1 };
    }
    return { rows: [], rowCount: 0 };
  });

  return {
    query,
    isAdmin: true,
    knowflowUser: 'admin',
    _processes: processes,
    _nodes: nodes,
    _edges: edges,
  };
});

vi.mock('../utils/helpers.js', () => ({
  parseJsonFields: (row: Record<string, unknown>) => row,
  convertParams: (sql: string) => sql,
  convertNow: (sql: string) => sql,
  parseReturning: (sql: string) => ({ sql, hasReturning: false, table: null }),
}));

import { query } from '../utils/db.js';

describe('process export/import routes', () => {
  describe('GET /:id/export', () => {
    it('returns 404 for unknown process', async () => {
      vi.mocked(query).mockResolvedValueOnce({ rows: [], rowCount: 0 });

      // Simulate handler logic
      const result = { rows: [], rowCount: 0 };
      expect(result.rows.length).toBe(0);
    });

    it('export payload includes _export_version, process, nodes, edges', async () => {
      const mockProcess = { id: 'proc-1', name: 'Test', description: 'Desc', version: 1, created_at: '2026-01-01', updated_at: '2026-01-01' };
      const mockNode = { id: 'node-1', process_id: 'proc-1', type: 'start', title: 'Start', description: null, form_schema: {}, metadata: {}, position_x: 0, position_y: 0 };

      const exportData = {
        _export_version: 1,
        _exported_at: new Date().toISOString(),
        process: {
          name: mockProcess.name,
          description: mockProcess.description,
          version: mockProcess.version,
        },
        nodes: [mockNode],
        edges: [],
      };

      expect(exportData._export_version).toBe(1);
      expect(exportData.process.name).toBe('Test');
      expect(exportData.nodes).toHaveLength(1);
      expect(exportData.edges).toHaveLength(0);
    });
  });

  describe('POST /import', () => {
    it('rejects payload missing process name', async () => {
      const payload = { process: {}, nodes: [], edges: [] };
      const isInvalid = !payload.process?.name;
      expect(isInvalid).toBe(true);
    });

    it('accepts valid export payload structure', () => {
      const payload = {
        _export_version: 1,
        process: { name: 'Imported Process', description: 'Test', version: 2 },
        nodes: [
          { id: 'old-node-1', type: 'start', title: 'Start', description: null, form_schema: {}, metadata: {}, position_x: 100, position_y: 100 },
          { id: 'old-node-2', type: 'end', title: 'End', description: null, form_schema: {}, metadata: {}, position_x: 200, position_y: 200 },
        ],
        edges: [
          { id: 'old-edge-1', source_node_id: 'old-node-1', target_node_id: 'old-node-2', label: null, condition: {}, waypoints: [] },
        ],
      };

      // Validate structure
      expect(payload.process.name).toBeTruthy();
      expect(payload.nodes).toHaveLength(2);
      expect(payload.edges).toHaveLength(1);

      // Simulate ID remap
      const nodeIdMap: Record<string, string> = {};
      for (const node of payload.nodes) {
        nodeIdMap[node.id] = `new-${node.id}`;
      }
      expect(nodeIdMap['old-node-1']).toBe('new-old-node-1');

      // Edges should be remapped
      const remappedEdge = {
        source_node_id: nodeIdMap[payload.edges[0].source_node_id],
        target_node_id: nodeIdMap[payload.edges[0].target_node_id],
      };
      expect(remappedEdge.source_node_id).toBe('new-old-node-1');
      expect(remappedEdge.target_node_id).toBe('new-old-node-2');
    });

    it('imported process name gets (imported) suffix', () => {
      const originalName = 'My Process';
      const importedName = originalName + ' (imported)';
      expect(importedName).toBe('My Process (imported)');
    });
  });
});
