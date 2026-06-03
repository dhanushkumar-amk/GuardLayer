import express from 'express';
import keysRouter from './routes/keys.routes';
import configRouter from './routes/config.routes';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());

// Routes
app.use('/api/keys', keysRouter);
app.use('/api/config', configRouter);

// Health check endpoint (GET /health)
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'config-service' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    code: 'NOT_FOUND_ROUTE',
  });
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({
    error: 'Internal server error',
    code: 'INTERNAL_SERVER_ERROR',
  });
});

app.listen(PORT, () => {
  console.log(`Config service listening on port ${PORT}`);
});

export default app; // Exported for testing
