import Database, { Database as DatabaseType } from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Multi-user folder structure:
//
// Option A: Everything on shared drive
//   DATA_DIR=/shared/knowflow KNOWFLOW_USER=alice
//   /shared/knowflow/admin/knowflow.db   <- templates
//   /shared/knowflow/alice/knowflow.db   <- alice's projects
//
// Option B: Admin on network, users local (recommended for Windows)
//   DATA_DIR=./data ADMIN_DATA_DIR=//SERVER/KnowFlow/admin KNOWFLOW_USER=alice
//   //SERVER/KnowFlow/admin/knowflow.db  <- templates (read-only)
//   ./data/knowflow.db                   <- alice's local projects

const DATA_DIR = process.env.DATA_DIR || './data';
const KNOWFLOW_USER = process.env.KNOWFLOW_USER || 'admin';
const IS_ADMIN = KNOWFLOW_USER.toLowerCase() === 'admin';

// User's data folder - local storage for projects
const USER_DATA_DIR = IS_ADMIN ? path.join(DATA_DIR, 'admin') : DATA_DIR;
const DB_PATH = path.join(USER_DATA_DIR, 'knowflow.db');

// Admin's data folder - can be separate (network share) or same as DATA_DIR
// If ADMIN_DATA_DIR is set, use it; otherwise assume admin is at DATA_DIR/admin
const ADMIN_DATA_DIR = process.env.ADMIN_DATA_DIR || path.join(DATA_DIR, 'admin');
const ADMIN_DB_PATH = path.join(ADMIN_DATA_DIR, 'knowflow.db');

// Ensure data directories exist
if (!fs.existsSync(USER_DATA_DIR)) {
  fs.mkdirSync(USER_DATA_DIR, { recursive: true });
}

const db: DatabaseType = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// If user (not admin), attach admin DB for reading process templates
if (!IS_ADMIN && fs.existsSync(ADMIN_DB_PATH)) {
  db.exec(`ATTACH DATABASE '${ADMIN_DB_PATH}' AS admin`);
  console.log(`Attached admin database from ${ADMIN_DB_PATH}`);

  // Create TEMP views pointing to admin tables so existing queries work unchanged
  // Temp views can reference attached databases; regular views cannot
  // These views are read-only - users can't modify process templates
  db.exec(`
    CREATE TEMP VIEW IF NOT EXISTS processes AS SELECT * FROM admin.processes;
    CREATE TEMP VIEW IF NOT EXISTS nodes AS SELECT * FROM admin.nodes;
    CREATE TEMP VIEW IF NOT EXISTS edges AS SELECT * FROM admin.edges;
  `);
  console.log('Created read-only views for process templates');
} else if (!IS_ADMIN) {
  console.warn(`Warning: Admin database not found at ${ADMIN_DB_PATH}`);
  console.warn('User will not have access to process templates until admin creates them.');
}

// Export for use in routes
export const isAdmin = IS_ADMIN;
export const knowflowUser = KNOWFLOW_USER;

// Synchronous query helpers for routes that need direct DB access
// These are typed generics to avoid 'unknown' leaking into handlers
export function all<T = Record<string, unknown>>(sql: string, params: unknown[] = []): T[] {
  const stmt = db.prepare(sql);
  return stmt.all(...params) as T[];
}

export function get<T = Record<string, unknown>>(sql: string, params: unknown[] = []): T | undefined {
  const stmt = db.prepare(sql);
  return stmt.get(...params) as T | undefined;
}

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
    } else if (isDelete && hasReturning && table) {
      // For DELETE with RETURNING, fetch the row BEFORE deleting
      const whereMatch = finalSql.match(/WHERE\s+(.+)$/i);

      if (whereMatch) {
        // First, fetch the row(s) that will be deleted
        const selectSql = `SELECT * FROM ${table} WHERE ${whereMatch[1]}`;
        const selectStmt = db.prepare(selectSql);
        rows = selectStmt.all(...(params?.slice(-1) || [])); // Use the ID param
      }

      // Then delete
      const stmt = db.prepare(finalSql);
      const info = stmt.run(...(params || []));
      rowCount = info.changes;
    } else if (isUpdate && hasReturning && table) {
      // For UPDATE with RETURNING, run the update first then fetch
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

// Load admin templates from admin-templates/ folder
const loadAdminTemplates = () => {
  // Create tracking table if it doesn't exist
  db.exec(`
    CREATE TABLE IF NOT EXISTS _loaded_templates (
      filename TEXT PRIMARY KEY,
      loaded_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  const templatesDir = path.join(__dirname, '../../admin-templates');
  if (!fs.existsSync(templatesDir)) {
    console.log('No admin-templates directory found, skipping template loading');
    return;
  }

  const sqlFiles = fs.readdirSync(templatesDir)
    .filter(f => f.endsWith('.sql'))
    .sort(); // Load in alphabetical order for predictability

  if (sqlFiles.length === 0) {
    console.log('No SQL files found in admin-templates/');
    return;
  }

  console.log(`Found ${sqlFiles.length} template(s) in admin-templates/`);

  for (const filename of sqlFiles) {
    // Check if already loaded
    const loaded = db.prepare('SELECT 1 FROM _loaded_templates WHERE filename = ?').get(filename);
    if (loaded) {
      console.log(`  Skipping ${filename} (already loaded)`);
      continue;
    }

    const filePath = path.join(templatesDir, filename);
    try {
      const sql = fs.readFileSync(filePath, 'utf-8');
      db.exec(sql);
      db.prepare('INSERT INTO _loaded_templates (filename) VALUES (?)').run(filename);
      console.log(`  Loaded ${filename}`);
    } catch (err) {
      console.error(`  Failed to load ${filename}:`, err);
    }
  }
};

// Initialize database schema
export const initDatabase = () => {
  console.log(`Initializing database for user: ${KNOWFLOW_USER} (admin: ${IS_ADMIN})`);

  if (IS_ADMIN) {
    // Admin: full schema with all tables
    const schemaPath = path.join(__dirname, '../../database/schema.sql');
    console.log('Looking for schema at:', schemaPath);
    if (fs.existsSync(schemaPath)) {
      const schema = fs.readFileSync(schemaPath, 'utf-8');
      db.exec(schema);
      console.log('Admin database schema initialized');

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

      // Load any admin templates
      loadAdminTemplates();
    } else {
      console.warn('Schema file not found at:', schemaPath);
    }
  } else {
    // User: only project-related tables (processes/nodes/edges come from admin views)
    const userSchemaPath = path.join(__dirname, '../../database/schema.user.sql');
    if (fs.existsSync(userSchemaPath)) {
      const schema = fs.readFileSync(userSchemaPath, 'utf-8');
      db.exec(schema);
      console.log('User database schema initialized');
    } else {
      console.warn('User schema file not found at:', userSchemaPath);
      console.warn('Creating minimal user schema inline...');
      // Fallback: create user tables inline
      db.exec(`
        -- Projects table: instances of a process for tracking
        CREATE TABLE IF NOT EXISTS projects (
            id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(hex(randomblob(2)),2) || '-' || hex(randomblob(6)))),
            name TEXT NOT NULL,
            process_id TEXT NOT NULL,
            status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived')),
            metadata TEXT DEFAULT '{}',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        -- Project Node Statuses
        CREATE TABLE IF NOT EXISTS project_node_statuses (
            id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(hex(randomblob(2)),2) || '-' || hex(randomblob(6)))),
            project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
            node_id TEXT NOT NULL,
            status TEXT DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'complete', 'skipped')),
            decision_result TEXT,
            form_data TEXT DEFAULT '{}',
            assigned_to TEXT,
            notes TEXT,
            started_at DATETIME,
            completed_at DATETIME,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(project_id, node_id)
        );

        -- Project Edge Traversals
        CREATE TABLE IF NOT EXISTS project_edge_traversals (
            id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(hex(randomblob(2)),2) || '-' || hex(randomblob(6)))),
            project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
            edge_id TEXT NOT NULL,
            executed_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        -- Indexes
        CREATE INDEX IF NOT EXISTS idx_projects_process_id ON projects(process_id);
        CREATE INDEX IF NOT EXISTS idx_project_node_statuses_project ON project_node_statuses(project_id);
        CREATE INDEX IF NOT EXISTS idx_project_node_statuses_node ON project_node_statuses(node_id);
        CREATE INDEX IF NOT EXISTS idx_project_edge_traversals_project ON project_edge_traversals(project_id);

        -- Trigger for updated_at
        CREATE TRIGGER IF NOT EXISTS update_projects_updated_at AFTER UPDATE ON projects
        BEGIN
            UPDATE projects SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
        END;

        CREATE TRIGGER IF NOT EXISTS update_project_node_statuses_updated_at AFTER UPDATE ON project_node_statuses
        BEGIN
            UPDATE project_node_statuses SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
        END;
      `);
      console.log('User schema created inline');
    }
  }
};

export default db;
