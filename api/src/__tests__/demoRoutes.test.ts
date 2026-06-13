import { beforeEach, describe, expect, it, vi } from 'vitest';
import express, { Express } from 'express';

const {
  adminState,
  mockExistsSync,
  mockReadFileSync,
  mockExec,
  mockTransaction,
  mockPrepare,
} = vi.hoisted(() => ({
  adminState: { value: true },
  mockExistsSync: vi.fn(),
  mockReadFileSync: vi.fn(),
  mockExec: vi.fn(),
  mockTransaction: vi.fn(),
  mockPrepare: vi.fn(),
}));

vi.mock('../utils/db.js', () => ({
  get isAdmin() {
    return adminState.value;
  },
  db: {
    exec: mockExec,
    transaction: mockTransaction,
    prepare: mockPrepare,
  },
}));

vi.mock('fs', () => ({
  default: {
    existsSync: mockExistsSync,
    readFileSync: mockReadFileSync,
  },
}));

import { demoRoutes } from '../routes/demo.js';

function createTestApp(): Express {
  const app = express();
  app.use(express.json());
  app.use('/api/demo', demoRoutes);
  return app;
}

async function request(
  app: Express,
  method: 'GET' | 'POST',
  path: string,
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

describe('demo routes', () => {
  beforeEach(() => {
    adminState.value = true;
    vi.clearAllMocks();
    mockTransaction.mockImplementation((fn: () => void) => () => fn());
    mockPrepare.mockImplementation(() => ({
      get: vi.fn(),
    }));
  });

  it('blocks demo reseed for non-admin users', async () => {
    adminState.value = false;

    const res = await request(createTestApp(), 'POST', '/api/demo/seed');

    expect(res.status).toBe(403);
    expect(res.body).toEqual({ error: 'Demo seed is only available in admin mode' });
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it('returns a server error when the seed file is missing', async () => {
    mockExistsSync.mockReturnValue(false);

    const res = await request(createTestApp(), 'POST', '/api/demo/seed');

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'Seed file not found' });
    expect(mockReadFileSync).not.toHaveBeenCalled();
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it('runs the seed SQL inside a transaction when the seed file exists', async () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue('INSERT INTO processes VALUES (1);');

    const res = await request(createTestApp(), 'POST', '/api/demo/seed');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      success: true,
      message: 'Demo data loaded successfully. Refresh to see the changes.',
    });
    expect(mockReadFileSync).toHaveBeenCalled();
    expect(mockTransaction).toHaveBeenCalledTimes(1);
    expect(mockExec).toHaveBeenCalledWith('INSERT INTO processes VALUES (1);');
  });

  it('reports whether demo data is present', async () => {
    mockPrepare
      .mockReturnValueOnce({ get: vi.fn(() => ({ count: 2 })) })
      .mockReturnValueOnce({ get: vi.fn(() => ({ count: 1 })) });

    const res = await request(createTestApp(), 'GET', '/api/demo/status');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      hasData: true,
      processCount: 2,
      projectCount: 1,
    });
  });
});
