import express from 'express';
import cors from 'cors';
import { processRoutes } from './routes/processes.js';
import { nodeRoutes } from './routes/nodes.js';
import { edgeRoutes } from './routes/edges.js';
import { projectRoutes } from './routes/projects.js';
import { projectNodeStatusRoutes } from './routes/projectNodeStatuses.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/processes', processRoutes);
app.use('/api/nodes', nodeRoutes);
app.use('/api/edges', edgeRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/project-node-statuses', projectNodeStatusRoutes);

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err.message);
  res.status(500).json({ error: err.message });
});

app.listen(PORT, () => {
  console.log(`Know-Flow API running on port ${PORT}`);
});
