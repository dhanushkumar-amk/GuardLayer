import express from 'express';
import authRouter from './routes/auth.routes';
import proxyRouter from './routes/proxy.routes';

const app = express();
const PORT = process.env.PORT || 8080;

app.use(express.json());

// Register API Routes
app.use('/auth', authRouter);
app.use('/v1', proxyRouter);

// Health check endpoint (GET /health)
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'api-gateway' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    code: 'NOT_FOUND_ROUTE',
  });
});

// Global Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({
    error: 'Internal server error',
    code: 'INTERNAL_SERVER_ERROR',
  });
});

// Only listen if not running in test mode
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`API Gateway listening on port ${PORT}`);
  });
}

export default app; // Exported for supertest
