/**
 * ProjectIQ API Integration Tests
 *
 * Tests every major endpoint end-to-end against the running API server.
 * All test data is tagged with a unique run ID and cleaned up after each suite.
 *
 * Requires the API server running on port 5558 (via LaunchAgent or `npm run dev`).
 */

import { describe, it, expect } from 'vitest';

const BASE = 'http://127.0.0.1:5558/api';
const RUN_ID = `test-${Date.now()}`;

// Track created IDs for cleanup — populated as tests run
const ids = {
  processId: '',
  startId: '',
  taskId: '',
  decisionId: '',
  endId: '',
  edgeStart2Task: '',
  edgeTask2Decision: '',
  edgeDecision2End: '',
  edgeDecision2Task: '',
  projectId: '',
};

async function api(method: string, path: string, body?: unknown) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => null);
  return { status: res.status, data };
}

/** API returns form_schema as a JSON string — parse it */
function parseFormSchema(raw: unknown) {
  if (!raw) return null;
  if (typeof raw === 'string') return JSON.parse(raw);
  return raw;
}

// ─── Health ──────────────────────────────────────────────────────────────────

describe('Health', () => {
  it('GET /health returns ok', async () => {
    const { status, data } = await api('GET', '/health');
    expect(status).toBe(200);
    expect(data.status).toBe('ok');
  });
});

// ─── Processes ───────────────────────────────────────────────────────────────

describe('Processes', () => {
  it('GET /processes returns array', async () => {
    const { status, data } = await api('GET', '/processes');
    expect(status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
  });

  it('POST /processes creates a process', async () => {
    const { status, data } = await api('POST', '/processes', {
      name: `[${RUN_ID}] Integration Test Process`,
      description: 'Created by integration test — safe to delete',
    });
    expect(status).toBe(201);
    expect(data.id).toBeTruthy();
    expect(data.name).toContain(RUN_ID);
    ids.processId = data.id;
  });

  it('GET /processes/:id returns the created process', async () => {
    const { status, data } = await api('GET', `/processes/${ids.processId}`);
    expect(status).toBe(200);
    expect(data.id).toBe(ids.processId);
    expect(data.nodes).toEqual([]);
    expect(data.edges).toEqual([]);
  });

  it('GET /processes/:id returns 404 for unknown id', async () => {
    const { status } = await api('GET', '/processes/does-not-exist');
    expect(status).toBe(404);
  });
});

// ─── Nodes ───────────────────────────────────────────────────────────────────

describe('Nodes', () => {
  it('POST /nodes creates a start node', async () => {
    const { status, data } = await api('POST', '/nodes', {
      process_id: ids.processId,
      type: 'start',
      title: `[${RUN_ID}] Start`,
      position_x: 0, position_y: 0,
    });
    expect(status).toBe(201);
    expect(data.type).toBe('start');
    ids.startId = data.id;
  });

  it('POST /nodes creates a task node with form fields', async () => {
    const { status, data } = await api('POST', '/nodes', {
      process_id: ids.processId,
      type: 'task',
      title: `[${RUN_ID}] Review Application`,
      description: 'Check completeness of submitted documents',
      form_schema: {
        fields: [
          { name: 'reviewer', label: 'Reviewer Name', type: 'text', required: true },
          { name: 'notes', label: 'Notes', type: 'textarea', required: false },
        ],
      },
      position_x: 200, position_y: 0,
    });
    // Save id first — before any assertion that might throw
    ids.taskId = data.id;
    expect(status).toBe(201);
    expect(ids.taskId).toBeTruthy();
    // form_schema comes back as a JSON string from the API
    const schema = parseFormSchema(data.form_schema);
    expect(schema?.fields).toHaveLength(2);
    expect(schema?.fields[0].name).toBe('reviewer');
  });

  it('POST /nodes creates a decision node', async () => {
    const { status, data } = await api('POST', '/nodes', {
      process_id: ids.processId,
      type: 'decision',
      title: `[${RUN_ID}] Application Complete?`,
      position_x: 400, position_y: 0,
    });
    ids.decisionId = data.id;
    expect(status).toBe(201);
    expect(data.type).toBe('decision');
  });

  it('POST /nodes creates an end node', async () => {
    const { status, data } = await api('POST', '/nodes', {
      process_id: ids.processId,
      type: 'end',
      title: `[${RUN_ID}] Permit Issued`,
      position_x: 600, position_y: 0,
    });
    ids.endId = data.id;
    expect(status).toBe(201);
    expect(data.type).toBe('end');
  });

  it('PUT /nodes/:id updates a node title', async () => {
    const { status, data } = await api('PUT', `/nodes/${ids.startId}`, {
      title: `[${RUN_ID}] Start (updated)`,
    });
    expect(status).toBe(200);
    expect(data.title).toContain('updated');
  });

  it('PUT /nodes/:id preserves form_schema when only description is updated', async () => {
    const { status, data } = await api('PUT', `/nodes/${ids.taskId}`, {
      description: 'Updated description only',
    });
    expect(status).toBe(200);
    const schema = parseFormSchema(data.form_schema);
    expect(schema?.fields).toHaveLength(2);
  });

  it('GET /nodes?process_id= returns all 4 nodes', async () => {
    const { status, data } = await api('GET', `/nodes?process_id=${ids.processId}`);
    expect(status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBe(4);
  });

  it('PATCH /nodes/:id/position updates position', async () => {
    const { status, data } = await api('PATCH', `/nodes/${ids.startId}/position`, {
      position_x: 100, position_y: 50,
    });
    expect(status).toBe(200);
    expect(data.position_x).toBe(100);
    expect(data.position_y).toBe(50);
  });
});

// ─── Edges ───────────────────────────────────────────────────────────────────

describe('Edges', () => {
  it('POST /edges creates edge: start → task', async () => {
    const { status, data } = await api('POST', '/edges', {
      process_id: ids.processId,
      source_node_id: ids.startId,
      target_node_id: ids.taskId,
      label: null,
    });
    ids.edgeStart2Task = data.id;
    expect(status).toBe(201);
    expect(ids.edgeStart2Task).toBeTruthy();
  });

  it('POST /edges creates edge: task → decision', async () => {
    const { status, data } = await api('POST', '/edges', {
      process_id: ids.processId,
      source_node_id: ids.taskId,
      target_node_id: ids.decisionId,
      label: null,
    });
    ids.edgeTask2Decision = data.id;
    expect(status).toBe(201);
  });

  it('POST /edges creates Yes edge: decision → end', async () => {
    const { status, data } = await api('POST', '/edges', {
      process_id: ids.processId,
      source_node_id: ids.decisionId,
      target_node_id: ids.endId,
      label: 'Yes',
    });
    ids.edgeDecision2End = data.id;
    expect(status).toBe(201);
    expect(data.label).toBe('Yes');
  });

  it('POST /edges creates No edge: decision → task (loop)', async () => {
    const { status, data } = await api('POST', '/edges', {
      process_id: ids.processId,
      source_node_id: ids.decisionId,
      target_node_id: ids.taskId,
      label: 'No',
    });
    ids.edgeDecision2Task = data.id;
    expect(status).toBe(201);
    expect(data.label).toBe('No');
  });

  it('PUT /edges/:id updates edge label', async () => {
    const { status, data } = await api('PUT', `/edges/${ids.edgeStart2Task}`, { label: 'Proceed' });
    expect(status).toBe(200);
    expect(data.label).toBe('Proceed');
    await api('PUT', `/edges/${ids.edgeStart2Task}`, { label: null }); // restore
  });

  it('Process now has 4 nodes and 4 edges', async () => {
    const { data } = await api('GET', `/processes/${ids.processId}`);
    expect(data.nodes).toHaveLength(4);
    expect(data.edges).toHaveLength(4);
  });
});

// ─── Projects ────────────────────────────────────────────────────────────────

describe('Projects', () => {
  it('POST /projects creates a project from the test process', async () => {
    const { status, data } = await api('POST', '/projects', {
      name: `[${RUN_ID}] Test Project Instance`,
      process_id: ids.processId,
    });
    ids.projectId = data.id;
    expect(status).toBe(201);
    expect(ids.projectId).toBeTruthy();
  });

  it('GET /projects returns array including the new project', async () => {
    const { status, data } = await api('GET', '/projects');
    expect(status).toBe(200);
    const found = data.find((p: { id: string }) => p.id === ids.projectId);
    expect(found).toBeTruthy();
  });

  it('GET /projects/:id returns 4 node statuses', async () => {
    const { status, data } = await api('GET', `/projects/${ids.projectId}`);
    expect(status).toBe(200);
    expect(data.nodes).toHaveLength(4);
  });

  it('Start node has project_status = ready', async () => {
    const { data } = await api('GET', `/projects/${ids.projectId}`);
    // Project returns nodes with `project_status` field, not `status`
    const startNode = data.nodes.find((n: { type: string }) => n.type === 'start');
    expect(startNode).toBeTruthy();
    expect(startNode.project_status).toBe('ready');
  });

  it('PUT /project-node-statuses/:statusId updates to complete', async () => {
    const { data: project } = await api('GET', `/projects/${ids.projectId}`);
    const startNode = project.nodes.find((n: { type: string }) => n.type === 'start');
    // The status record ID is `status_id` on the joined result
    const statusId = startNode.status_id;
    expect(statusId).toBeTruthy();
    const { status, data } = await api('PUT', `/project-node-statuses/${statusId}`, {
      status: 'complete',
    });
    expect(status).toBe(200);
    expect(data.status).toBe('complete');
  });
});

// ─── Dashboard ───────────────────────────────────────────────────────────────

describe('Dashboard', () => {
  it('GET /dashboard returns summary + projects array', async () => {
    const { status, data } = await api('GET', '/dashboard');
    expect(status).toBe(200);
    expect(typeof data.summary.total).toBe('number');
    expect(Array.isArray(data.projects)).toBe(true);
  });

  it('Dashboard includes test project with health + completion_pct', async () => {
    const { data } = await api('GET', '/dashboard');
    const found = data.projects.find((p: { id: string }) => p.id === ids.projectId);
    expect(found).toBeTruthy();
    expect(typeof found.completion_pct).toBe('number');
    expect(typeof found.health).toBe('string');
  });
});

// ─── Spec KG ─────────────────────────────────────────────────────────────────

describe('Spec KG', () => {
  it('GET /spec/graph returns Cheyenne permit nodes + edges', async () => {
    const { status, data } = await api('GET', '/spec/graph');
    expect(status).toBe(200);
    expect(data.nodes.length).toBeGreaterThan(10);
    expect(data.edges.length).toBeGreaterThan(5);
  });

  it('Spec graph contains both step and agency node types', async () => {
    const { data } = await api('GET', '/spec/graph');
    const types = new Set(data.nodes.map((n: { type: string }) => n.type));
    expect(types.has('step')).toBe(true);
    expect(types.has('agency')).toBe(true);
  });

  it('GET /projects/:id/coverage returns structured coverage data', async () => {
    const { status, data } = await api('GET', `/projects/${ids.projectId}/coverage`);
    expect(status).toBe(200);
    expect(typeof data.total_spec_nodes).toBe('number');
    expect(typeof data.coverage_pct).toBe('number');
    expect(Array.isArray(data.gap_nodes)).toBe(true);
    expect(data.coverage_pct).toBe(0); // No links created yet
  });
});

// ─── Cleanup ─────────────────────────────────────────────────────────────────

describe('Cleanup', () => {
  it('DELETE project', async () => {
    const { status } = await api('DELETE', `/projects/${ids.projectId}`);
    expect([200, 204]).toContain(status);
  });

  it('DELETE all 4 edges', async () => {
    const edgeIds = [ids.edgeStart2Task, ids.edgeTask2Decision, ids.edgeDecision2End, ids.edgeDecision2Task];
    for (const id of edgeIds.filter(Boolean)) {
      const { status } = await api('DELETE', `/edges/${id}`);
      expect([200, 204]).toContain(status);
    }
  });

  it('DELETE all 4 nodes', async () => {
    const nodeIds = [ids.startId, ids.taskId, ids.decisionId, ids.endId];
    for (const id of nodeIds.filter(Boolean)) {
      const { status } = await api('DELETE', `/nodes/${id}`);
      expect([200, 204]).toContain(status);
    }
  });

  it('DELETE process', async () => {
    const { status } = await api('DELETE', `/processes/${ids.processId}`);
    expect([200, 204]).toContain(status);
  });

  it('Verify process is gone (404)', async () => {
    const { status } = await api('GET', `/processes/${ids.processId}`);
    expect(status).toBe(404);
  });
});
