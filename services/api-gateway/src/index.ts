import express from 'express';
import axios from 'axios';
import authRouter from './routes/auth.routes';
import proxyRouter from './routes/proxy.routes';

const app = express();
const PORT = process.env.PORT || 8080;

const CONFIG_SERVICE_URL = process.env.CONFIG_SERVICE_URL || 'http://config-service:3001';
const AUDIT_SERVICE_URL = process.env.AUDIT_SERVICE_URL || 'http://audit-service:8004';

app.use(express.json());

// Custom CORS middleware
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Proxy /api/auth/login to internal /auth/login
app.post('/api/auth/login', async (req, res, next) => {
  try {
    const response = await axios.post(`http://localhost:${PORT}/auth/login`, req.body);
    return res.status(response.status).json(response.data);
  } catch (err: any) {
    if (err.response) {
      return res.status(err.response.status).json(err.response.data);
    }
    return next(err);
  }
});

// Proxy /api/keys and /api/config to config-service
app.use(['/api/keys', '/api/config'], async (req, res, next) => {
  // Strip trailing slashes or sanitize
  const cleanUrl = req.originalUrl;
  const targetUrl = `${CONFIG_SERVICE_URL}${cleanUrl}`;
  try {
    const headers: any = {};
    if (req.headers.authorization) {
      headers.authorization = req.headers.authorization;
    }
    const response = await axios({
      method: req.method,
      url: targetUrl,
      data: req.body,
      headers
    });
    return res.status(response.status).json(response.data);
  } catch (err: any) {
    if (err.response) {
      return res.status(err.response.status).json(err.response.data);
    }
    return next(err);
  }
});

// Specific proxy for the threats SSE stream to handle chunked responses in real-time
app.get('/api/threats/stream', async (req, res, next) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  try {
    const targetUrl = `${AUDIT_SERVICE_URL}/api/threats/stream`;
    const response = await axios({
      method: 'get',
      url: targetUrl,
      responseType: 'stream'
    });

    response.data.pipe(res);

    req.on('close', () => {
      response.data.destroy();
    });
  } catch (err: any) {
    console.error('SSE Proxy Error:', err.message);
    res.end();
  }
});

// Proxy /api/audit, /api/threats, and /api/analytics to audit-service
app.use(['/api/audit', '/api/threats', '/api/analytics'], async (req, res, next) => {
  const cleanUrl = req.originalUrl;
  const targetUrl = `${AUDIT_SERVICE_URL}${cleanUrl}`;
  try {
    const headers: any = {};
    if (req.headers.authorization) {
      headers.authorization = req.headers.authorization;
    }
    const response = await axios({
      method: req.method,
      url: targetUrl,
      data: req.body,
      headers
    });
    return res.status(response.status).json(response.data);
  } catch (err: any) {
    if (err.response) {
      return res.status(err.response.status).json(err.response.data);
    }
    return next(err);
  }
});

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
