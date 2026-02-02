/**
 * Tests for helper functions used across routes.
 *
 * These tests cover JSON parsing utilities and SQL conversion helpers
 * that don't require database connections.
 */
import { describe, it, expect } from 'vitest';
import {
  parseJsonFields,
  convertParams,
  convertNow,
  parseReturning,
} from '../utils/helpers.js';

describe('parseJsonFields', () => {
  it('should return null/undefined row unchanged', () => {
    expect(parseJsonFields(null as unknown as Record<string, unknown>, ['field'])).toBeNull();
    expect(parseJsonFields(undefined as unknown as Record<string, unknown>, ['field'])).toBeUndefined();
  });

  it('should parse valid JSON string fields', () => {
    const row = {
      id: '123',
      metadata: '{"key": "value"}',
      form_schema: '{"type": "object"}',
    };

    const result = parseJsonFields(row, ['metadata', 'form_schema']);

    expect(result.metadata).toEqual({ key: 'value' });
    expect(result.form_schema).toEqual({ type: 'object' });
    expect(result.id).toBe('123'); // Non-JSON field unchanged
  });

  it('should handle invalid JSON by returning empty object', () => {
    const row = {
      id: '123',
      metadata: 'not valid json {{{',
    };

    const result = parseJsonFields(row, ['metadata']);

    expect(result.metadata).toEqual({});
  });

  it('should handle invalid JSON for waypoints by returning empty array', () => {
    const row = {
      id: '123',
      waypoints: 'invalid json',
    };

    const result = parseJsonFields(row, ['waypoints']);

    expect(result.waypoints).toEqual([]);
  });

  it('should ensure waypoints is always an array', () => {
    const row = {
      id: '123',
      waypoints: '{"not": "array"}',
    };

    const result = parseJsonFields(row, ['waypoints']);

    // Even though it parses to an object, waypoints should be forced to array
    expect(Array.isArray(result.waypoints)).toBe(true);
  });

  it('should handle already-parsed objects (not strings)', () => {
    const row = {
      id: '123',
      metadata: { already: 'parsed' },
    };

    const result = parseJsonFields(row, ['metadata']);

    expect(result.metadata).toEqual({ already: 'parsed' });
  });

  it('should handle nested JSON arrays', () => {
    const row = {
      id: '123',
      waypoints: '[{"x": 100, "y": 200}, {"x": 300, "y": 400}]',
    };

    const result = parseJsonFields(row, ['waypoints']);

    expect(result.waypoints).toEqual([
      { x: 100, y: 200 },
      { x: 300, y: 400 },
    ]);
  });

  it('should not modify fields not in the list', () => {
    const row = {
      id: '123',
      metadata: '{"key": "value"}',
      other: '{"should": "stay string"}',
    };

    const result = parseJsonFields(row, ['metadata']);

    expect(result.metadata).toEqual({ key: 'value' });
    expect(result.other).toBe('{"should": "stay string"}');
  });

  it('should handle empty row', () => {
    const row = {};

    const result = parseJsonFields(row, ['metadata']);

    expect(result).toEqual({});
  });

  it('should handle missing fields gracefully', () => {
    const row = {
      id: '123',
    };

    const result = parseJsonFields(row, ['metadata', 'nonexistent']);

    expect(result.id).toBe('123');
    expect(result.metadata).toBeUndefined();
  });
});

describe('convertParams', () => {
  it('should convert single parameter', () => {
    const sql = 'SELECT * FROM users WHERE id = $1';
    expect(convertParams(sql)).toBe('SELECT * FROM users WHERE id = ?');
  });

  it('should convert multiple parameters', () => {
    const sql = 'INSERT INTO users (name, email) VALUES ($1, $2)';
    expect(convertParams(sql)).toBe('INSERT INTO users (name, email) VALUES (?, ?)');
  });

  it('should convert parameters in any order', () => {
    const sql = 'UPDATE users SET name = $2 WHERE id = $1';
    expect(convertParams(sql)).toBe('UPDATE users SET name = ? WHERE id = ?');
  });

  it('should handle SQL without parameters', () => {
    const sql = 'SELECT * FROM users';
    expect(convertParams(sql)).toBe('SELECT * FROM users');
  });

  it('should handle double-digit parameters', () => {
    const sql = 'SELECT * FROM t WHERE a = $1 AND b = $10 AND c = $11';
    expect(convertParams(sql)).toBe('SELECT * FROM t WHERE a = ? AND b = ? AND c = ?');
  });
});

describe('convertNow', () => {
  it('should convert NOW() function', () => {
    expect(convertNow('SELECT NOW()')).toBe("SELECT datetime('now')");
  });

  it('should convert lowercase now()', () => {
    expect(convertNow('SELECT now()')).toBe("SELECT datetime('now')");
  });

  it('should convert multiple NOW() calls', () => {
    expect(convertNow('INSERT INTO t (a, b) VALUES (NOW(), NOW())'))
      .toBe("INSERT INTO t (a, b) VALUES (datetime('now'), datetime('now'))");
  });

  it('should not modify SQL without NOW()', () => {
    const sql = 'SELECT * FROM users';
    expect(convertNow(sql)).toBe(sql);
  });
});

describe('parseReturning', () => {
  it('should detect INSERT with RETURNING', () => {
    const sql = 'INSERT INTO users (name) VALUES ($1) RETURNING *';
    const result = parseReturning(sql);

    expect(result.hasReturning).toBe(true);
    expect(result.table).toBe('users');
    expect(result.sql).toBe('INSERT INTO users (name) VALUES ($1)');
  });

  it('should detect UPDATE with RETURNING', () => {
    const sql = 'UPDATE users SET name = $1 WHERE id = $2 RETURNING *';
    const result = parseReturning(sql);

    expect(result.hasReturning).toBe(true);
    expect(result.table).toBe('users');
    expect(result.sql).toBe('UPDATE users SET name = $1 WHERE id = $2');
  });

  it('should detect DELETE with RETURNING', () => {
    const sql = 'DELETE FROM users WHERE id = $1 RETURNING *';
    const result = parseReturning(sql);

    expect(result.hasReturning).toBe(true);
    expect(result.table).toBe('users');
    expect(result.sql).toBe('DELETE FROM users WHERE id = $1');
  });

  it('should return unchanged SQL without RETURNING', () => {
    const sql = 'SELECT * FROM users WHERE id = $1';
    const result = parseReturning(sql);

    expect(result.hasReturning).toBe(false);
    expect(result.table).toBeNull();
    expect(result.sql).toBe(sql);
  });

  it('should handle case-insensitive RETURNING', () => {
    const sql = 'INSERT INTO users (name) VALUES ($1) returning *';
    const result = parseReturning(sql);

    expect(result.hasReturning).toBe(true);
    expect(result.table).toBe('users');
  });

  it('should return null table when RETURNING present but no recognized SQL verb', () => {
    // Edge case: RETURNING clause without INSERT/UPDATE/DELETE pattern
    // (e.g., malformed or unusual SQL that still ends with RETURNING *)
    const sql = 'SELECT * FROM users RETURNING *';
    const result = parseReturning(sql);

    expect(result.hasReturning).toBe(true);
    expect(result.table).toBeNull();
    expect(result.sql).toBe('SELECT * FROM users');
  });
});
