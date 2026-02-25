import express from 'express';
import cors from 'cors';
import { processRoutes } from './routes/processes.js';
import { nodeRoutes } from './routes/nodes.js';
import { edgeRoutes } from './routes/edges.js';
import { projectRoutes } from './routes/projects.js';
import { projectNodeStatusRoutes } from './routes/projectNodeStatuses.js';
import { debugRoutes } from './routes/debug.js';
import { graphRagRoutes } from './routes/graphRag.js';
import scheduleRouter from './routes/schedule.js';
import dashboardRouter from './routes/dashboard.js';
import { initDatabase, isAdmin, knowflowUser } from './utils/db.js';
import { adminOnly } from './middleware/adminOnly.js';

// Initialize database schema
initDatabase();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// User info endpoint
app.get('/api/whoami', (req, res) => {
  res.json({ user: knowflowUser, isAdmin });
});

// Routes - Template routes (admin-only for writes, everyone can read)
app.use('/api/processes', adminOnly, processRoutes);
app.use('/api/nodes', adminOnly, nodeRoutes);
app.use('/api/edges', adminOnly, edgeRoutes);

// Routes - User routes (everyone can read/write their own projects)
app.use('/api/projects', projectRoutes);
app.use('/api/project-node-statuses', projectNodeStatusRoutes);
app.use('/api/debug', debugRoutes);
app.use('/api/graph', graphRagRoutes);
app.use('/api', scheduleRouter);
app.use('/api', dashboardRouter);

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err.message);
  res.status(500).json({ error: err.message });
});

app.listen(PORT, () => {
  console.log(`Know-Flow API running on port ${PORT}`);
  console.log(`User: ${knowflowUser} (${isAdmin ? 'admin' : 'read-only templates'})`);
});
