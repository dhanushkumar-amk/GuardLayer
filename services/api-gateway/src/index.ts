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

// Dedicated Redis subscriber instance for SSE streaming
const redisSub = new (require('ioredis'))({
  host: process.env.REDIS_HOST || 'redis',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
});

let sseClients: express.Response[] = [];

redisSub.subscribe('guardlayer:threats', 'guardlayer:audit', (err: any) => {
  if (err) {
    console.error('Failed to subscribe to Redis channels for SSE:', err);
  } else {
    console.log('Subscribed to Redis channels guardlayer:threats and guardlayer:audit');
  }
});

redisSub.on('message', (channel: string, message: string) => {
  const eventName = channel === 'guardlayer:threats' ? 'threat' : 'audit';
  sseClients.forEach((client) => {
    client.write(`event: ${eventName}\ndata: ${message}\n\n`);
  });
});

// GET /api/stream/threats - Server Sent Events endpoint with JWT Auth
app.get('/api/stream/threats', (req, res) => {
  const token = req.query.token as string;
  const JWT_SECRET = process.env.JWT_SECRET || 'guardlayer-default-jwt-secret-key';

  if (!token) {
    return res.status(401).json({ error: 'Missing authentication token' });
  }

  try {
    const jwt = require('jsonwebtoken');
    jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  // Set SSE and CORS headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  });

  // Send initial establish message
  res.write('data: {"status":"connected"}\n\n');

  // Add client response object to global list
  sseClients.push(res);

  // Keep-alive heartbeat ping every 30 seconds
  const keepAlive = setInterval(() => {
    res.write(': heartbeat\n\n');
  }, 30000);

  // Clean up listener on client disconnect
  req.on('close', () => {
    clearInterval(keepAlive);
    sseClients = sseClients.filter((client) => client !== res);
  });
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
