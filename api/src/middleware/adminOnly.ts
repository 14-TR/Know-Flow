import { Request, Response, NextFunction } from 'express';
import { isAdmin, knowflowUser } from '../utils/db.js';

/**
 * Middleware that blocks non-admin users from modifying process templates.
 * Users can still READ templates via the attached admin database views.
 */
export const adminOnly = (req: Request, res: Response, next: NextFunction) => {
  // Allow all GET requests (read-only)
  if (req.method === 'GET') {
    return next();
  }

  // Block non-admin users from write operations
  if (!isAdmin) {
    return res.status(403).json({
      error: 'Permission denied',
      message: `User "${knowflowUser}" cannot modify process templates. Only admin can create, update, or delete processes, nodes, and edges.`,
    });
  }

  next();
};
