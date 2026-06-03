import express from 'express';
import auditRoutes from './routes/audit.routes';
import threatsRoutes from './routes/threats.routes';
import analyticsRoutes from './routes/analytics.routes';
import { QueueService } from './services/queue.service';

const app = express();
const port = process.env.PORT || 8004;

app.use(express.json());

// Routes
app.use('/api/audit', auditRoutes);
app.use('/api/threats', threatsRoutes);
app.use('/api/analytics', analyticsRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'audit-service' });
});

// Queue Subscriber Startup
const queueService = new QueueService();
queueService.start().catch((err) => {
  console.error('[Startup] Failed to start Queue Service:', err.message);
});

const server = app.listen(port, () => {
  console.log(`Audit Service running on port ${port}`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('[Shutdown] SIGTERM received. Shutting down gracefully...');
  await queueService.stop();
  server.close(() => {
    console.log('[Shutdown] HTTP server closed.');
    process.exit(0);
  });
});

export { app, server, queueService };
