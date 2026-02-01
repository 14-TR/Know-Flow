/**
 * Utility helper functions for Know-Flow API.
 * These functions are used across routes for data transformation.
 */

/**
 * Parse JSON fields that SQLite returns as strings.
 * Handles invalid JSON gracefully with sensible defaults.
 *
 * @param row - Database row object
 * @param fields - Array of field names to parse as JSON
 * @returns Row with specified fields parsed as JSON
 */
export function parseJsonFields(
  row: Record<string, unknown>,
  fields: string[]
): Record<string, unknown> {
  if (!row) return row;
  const parsed = { ...row };
  for (const field of fields) {
    if (typeof parsed[field] === 'string') {
      try {
        parsed[field] = JSON.parse(parsed[field] as string);
      } catch {
        // Default to empty array for waypoints, empty object for others
        parsed[field] = field === 'waypoints' ? [] : {};
      }
    }
    // Ensure waypoints is always an array
    if (field === 'waypoints' && !Array.isArray(parsed[field])) {
      parsed[field] = [];
    }
  }
  return parsed;
}

/**
 * Convert PostgreSQL-style $1, $2 params to SQLite ? params.
 *
 * @param sql - SQL query string with PostgreSQL-style parameters
 * @returns SQL query string with SQLite-style parameters
 */
export function convertParams(sql: string): string {
  return sql.replace(/\$(\d+)/g, '?');
}

/**
 * Convert PostgreSQL NOW() function to SQLite datetime('now').
 *
 * @param sql - SQL query string
 * @returns SQL query string with converted NOW() calls
 */
export function convertNow(sql: string): string {
  return sql.replace(/NOW\(\)/gi, "datetime('now')");
}

/**
 * Parse and extract RETURNING clause from SQL statement.
 * SQLite doesn't support RETURNING in the same way as PostgreSQL,
 * so we need to handle it separately.
 *
 * @param sql - SQL query string
 * @returns Object with cleaned SQL, whether RETURNING was present, and table name
 */
export function parseReturning(sql: string): {
  sql: string;
  hasReturning: boolean;
  table: string | null;
} {
  const returningMatch = sql.match(/\s+RETURNING\s+\*\s*$/i);
  if (!returningMatch) {
    return { sql, hasReturning: false, table: null };
  }

  const sqlWithoutReturning = sql.replace(/\s+RETURNING\s+\*\s*$/i, '');

  // Extract table name from INSERT, UPDATE, or DELETE
  let table: string | null = null;
  const insertMatch = sqlWithoutReturning.match(/INSERT\s+INTO\s+(\w+)/i);
  const updateMatch = sqlWithoutReturning.match(/UPDATE\s+(\w+)/i);
  const deleteMatch = sqlWithoutReturning.match(/DELETE\s+FROM\s+(\w+)/i);

  if (insertMatch) table = insertMatch[1];
  else if (updateMatch) table = updateMatch[1];
  else if (deleteMatch) table = deleteMatch[1];

  return { sql: sqlWithoutReturning, hasReturning: true, table };
}
