import { Router, Request, Response } from 'express';
import { db, isAdmin } from '../utils/db.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = Router();

/**
 * POST /api/demo/seed
 * Re-loads the seed data (processes + sample projects).
 * Idempotent: uses INSERT OR IGNORE so existing data is preserved.
 * Admin-only route since it writes processes table.
 */
router.post('/seed', async (req: Request, res: Response) => {
  if (!isAdmin) {
    return res.status(403).json({ error: 'Demo seed is only available in admin mode' });
  }

  try {
    const seedPath = path.join(__dirname, '../../../database/seed.sqlite.sql');

    if (!fs.existsSync(seedPath)) {
      return res.status(500).json({ error: 'Seed file not found' });
    }

    const seed = fs.readFileSync(seedPath, 'utf-8');

    // Run in a transaction for atomicity
    const runSeed = db.transaction(() => {
      db.exec(seed);
    });

    runSeed();

    res.json({
      success: true,
      message: 'Demo data loaded successfully. Refresh to see the changes.',
    });
  } catch (err) {
    console.error('Demo seed error:', err);
    res.status(500).json({ error: (err as Error).message });
  }
});

/**
 * GET /api/demo/status
 * Check whether demo data is present.
 */
router.get('/status', async (req: Request, res: Response) => {
  try {
    const processCount = db.prepare('SELECT COUNT(*) as count FROM processes').get() as { count: number };
    const projectCount = db.prepare('SELECT COUNT(*) as count FROM projects').get() as { count: number };

    res.json({
      hasData: processCount.count > 0,
      processCount: processCount.count,
      projectCount: projectCount.count,
    });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

export { router as demoRoutes };
