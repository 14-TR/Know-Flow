/**
 * Tests for adminOnly middleware.
 *
 * This middleware gates write operations (POST/PUT/PATCH/DELETE) to admin users only,
 * while allowing all GET (read-only) requests through regardless of role.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';

// Mock the db module to avoid side effects (database connections, file I/O)
vi.mock('../utils/db.js', () => ({
  isAdmin: true,
  knowflowUser: 'admin',
}));

// Import after mock so we can dynamically change values
import * as db from '../utils/db.js';
import { adminOnly } from '../middleware/adminOnly.js';

/** Create a minimal mock Request with the given HTTP method */
function mockRequest(method: string): Request {
  return { method } as Request;
}

/** Create a mock Response with json and status helpers */
function mockResponse(): Response & { statusCode: number; body: unknown } {
  const res = {
    statusCode: 200,
    body: undefined as unknown,
    status(code: number) {
      res.statusCode = code;
      return res;
    },
    json(data: unknown) {
      res.body = data;
      return res;
    },
  };
  return res as unknown as Response & { statusCode: number; body: unknown };
}

describe('adminOnly middleware', () => {
  let next: NextFunction;

  beforeEach(() => {
    next = vi.fn();
  });

  // ───────── GET requests (always allowed) ─────────

  describe('GET requests', () => {
    it('should allow GET for admin users', () => {
      // isAdmin is true by default from mock
      const req = mockRequest('GET');
      const res = mockResponse();

      adminOnly(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should allow GET for non-admin users', () => {
      // Temporarily override the module exports
      vi.spyOn(db, 'isAdmin', 'get').mockReturnValue(false);
      vi.spyOn(db, 'knowflowUser', 'get').mockReturnValue('alice');

      const req = mockRequest('GET');
      const res = mockResponse();

      adminOnly(req, res, next);

      expect(next).toHaveBeenCalled();
      vi.restoreAllMocks();
    });
  });

  // ───────── Write methods for admin users (allowed) ─────────

  describe('write operations by admin', () => {
    beforeEach(() => {
      vi.spyOn(db, 'isAdmin', 'get').mockReturnValue(true);
      vi.spyOn(db, 'knowflowUser', 'get').mockReturnValue('admin');
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('should allow POST for admin', () => {
      const req = mockRequest('POST');
      const res = mockResponse();
      adminOnly(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it('should allow PUT for admin', () => {
      const req = mockRequest('PUT');
      const res = mockResponse();
      adminOnly(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it('should allow PATCH for admin', () => {
      const req = mockRequest('PATCH');
      const res = mockResponse();
      adminOnly(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it('should allow DELETE for admin', () => {
      const req = mockRequest('DELETE');
      const res = mockResponse();
      adminOnly(req, res, next);
      expect(next).toHaveBeenCalled();
    });
  });

  // ───────── Write methods for non-admin users (blocked) ─────────

  describe('write operations by non-admin', () => {
    beforeEach(() => {
      vi.spyOn(db, 'isAdmin', 'get').mockReturnValue(false);
      vi.spyOn(db, 'knowflowUser', 'get').mockReturnValue('alice');
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('should block POST for non-admin with 403', () => {
      const req = mockRequest('POST');
      const res = mockResponse();

      adminOnly(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.statusCode).toBe(403);
      expect(res.body).toEqual(
        expect.objectContaining({
          error: 'Permission denied',
        })
      );
    });

    it('should block PUT for non-admin with 403', () => {
      const req = mockRequest('PUT');
      const res = mockResponse();

      adminOnly(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.statusCode).toBe(403);
    });

    it('should block PATCH for non-admin with 403', () => {
      const req = mockRequest('PATCH');
      const res = mockResponse();

      adminOnly(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.statusCode).toBe(403);
    });

    it('should block DELETE for non-admin with 403', () => {
      const req = mockRequest('DELETE');
      const res = mockResponse();

      adminOnly(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.statusCode).toBe(403);
    });

    it('should include the username in the error message', () => {
      const req = mockRequest('POST');
      const res = mockResponse();

      adminOnly(req, res, next);

      expect((res.body as { message: string }).message).toContain('alice');
    });
  });
});
