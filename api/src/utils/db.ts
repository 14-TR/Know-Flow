import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = process.env.DATA_DIR || './data';
const DB_PATH = path.join(DATA_DIR, 'knowflow.db');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Register uuid function for SQLite
db.function('uuid_generate_v4', () => uuidv4());

// Convert PostgreSQL-style $1, $2 params to SQLite ? params
function convertParams(sql: string): string {
  return sql.replace(/\$(\d+)/g, '?');
}

// Handle RETURNING clause by extracting it and doing a separate select
function parseReturning(sql: string): { sql: string; hasReturning: boolean; table: string | null } {
  const returningMatch = sql.match(/\s+RETURNING\s+\*\s*$/i);
  if (!returningMatch) {
    return { sql, hasReturning: false, table: null };
  }

  const sqlWithoutReturning = sql.replace(/\s+RETURNING\s+\*\s*$/i, '');

  // Extract table name from INSERT or UPDATE
  let table: string | null = null;
  const insertMatch = sqlWithoutReturning.match(/INSERT\s+INTO\s+(\w+)/i);
  const updateMatch = sqlWithoutReturning.match(/UPDATE\s+(\w+)/i);
  const deleteMatch = sqlWithoutReturning.match(/DELETE\s+FROM\s+(\w+)/i);

  if (insertMatch) table = insertMatch[1];
  else if (updateMatch) table = updateMatch[1];
  else if (deleteMatch) table = deleteMatch[1];

  return { sql: sqlWithoutReturning, hasReturning: true, table };
}

// Convert NOW() to datetime('now')
function convertNow(sql: string): string {
  return sql.replace(/NOW\(\)/gi, "datetime('now')");
}

// Query result interface matching pg
interface QueryResult {
  rows: unknown[];
  rowCount: number;
}

export const query = async (text: string, params?: unknown[]): Promise<QueryResult> => {
  const start = Date.now();

  let sql = convertParams(text);
  sql = convertNow(sql);

  const { sql: finalSql, hasReturning, table } = parseReturning(sql);

  try {
    const isSelect = finalSql.trim().toUpperCase().startsWith('SELECT');
    const isInsert = finalSql.trim().toUpperCase().startsWith('INSERT');
    const isUpdate = finalSql.trim().toUpperCase().startsWith('UPDATE');
    const isDelete = finalSql.trim().toUpperCase().startsWith('DELETE');

    let rows: unknown[] = [];
    let rowCount = 0;

    if (isSelect) {
      const stmt = db.prepare(finalSql);
      rows = stmt.all(...(params || []));
      rowCount = rows.length;
    } else if (isInsert && hasReturning && table) {
      const stmt = db.prepare(finalSql);
      const info = stmt.run(...(params || []));
      rowCount = info.changes;

      // Fetch the inserted row using lastInsertRowid
      const selectStmt = db.prepare(`SELECT * FROM ${table} WHERE rowid = ?`);
      rows = [selectStmt.get(info.lastInsertRowid)];
    } else if ((isUpdate || isDelete) && hasReturning && table) {
      // For UPDATE/DELETE with RETURNING, run the update first then fetch
      const whereMatch = finalSql.match(/WHERE\s+(.+)$/i);

      const stmt = db.prepare(finalSql);
      const info = stmt.run(...(params || []));
      rowCount = info.changes;

      if (whereMatch && rowCount > 0) {
        // Fetch the updated rows AFTER modification
        const selectSql = `SELECT * FROM ${table} WHERE ${whereMatch[1]}`;
        const selectStmt = db.prepare(selectSql);
        rows = selectStmt.all(...(params?.slice(-1) || [])); // Use the ID param
      }
    } else {
      const stmt = db.prepare(finalSql);
      const info = stmt.run(...(params || []));
      rowCount = info.changes;
    }

    const duration = Date.now() - start;
    console.log('Executed query', { text: text.substring(0, 50), duration, rows: rowCount });

    return { rows, rowCount };
  } catch (err) {
    console.error('Query error:', err, { sql: finalSql, params });
    throw err;
  }
};

// Transaction support - returns a client-like object
export const getClient = async () => {
  return {
    query: async (text: string, params?: unknown[]) => {
      // Handle BEGIN/COMMIT/ROLLBACK specially
      const trimmed = text.trim().toUpperCase();
      if (trimmed === 'BEGIN') {
        db.exec('BEGIN');
        return { rows: [], rowCount: 0 };
      }
      if (trimmed === 'COMMIT') {
        db.exec('COMMIT');
        return { rows: [], rowCount: 0 };
      }
      if (trimmed === 'ROLLBACK') {
        db.exec('ROLLBACK');
        return { rows: [], rowCount: 0 };
      }
      return query(text, params);
    },
    release: () => {}, // No-op for SQLite
  };
};

// Run migrations for existing databases
const runMigrations = () => {
  // Migration: Add waypoints column to edges table
  const edgeColumns = db.prepare("PRAGMA table_info(edges)").all() as { name: string }[];
  const hasWaypoints = edgeColumns.some((col) => col.name === 'waypoints');

  if (!hasWaypoints) {
    console.log('Running migration: Adding waypoints column to edges table');
    db.exec("ALTER TABLE edges ADD COLUMN waypoints TEXT DEFAULT '[]'");
    console.log('Migration complete: waypoints column added');
  }
};

// Initialize database schema
export const initDatabase = () => {
  const schemaPath = path.join(__dirname, '../../database/schema.sql');
  console.log('Looking for schema at:', schemaPath);
  if (fs.existsSync(schemaPath)) {
    const schema = fs.readFileSync(schemaPath, 'utf-8');
    db.exec(schema);
    console.log('Database schema initialized');

    // Run migrations for existing databases
    runMigrations();

    // Seed data if database is empty
    const processCount = db.prepare('SELECT COUNT(*) as count FROM processes').get() as { count: number };
    if (processCount.count === 0) {
      const seedPath = path.join(__dirname, '../../database/seed.sqlite.sql');
      if (fs.existsSync(seedPath)) {
        const seed = fs.readFileSync(seedPath, 'utf-8');
        db.exec(seed);
        console.log('Database seeded with sample data');
      }
    }
  } else {
    console.warn('Schema file not found at:', schemaPath);
  }
};

export default db;
