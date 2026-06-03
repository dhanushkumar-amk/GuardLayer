import express from 'express';
import proxyRouter from './routes/proxy.routes';

const app = express();
const port = process.env.PORT || 8003;

app.use(express.json());

// Main Proxy Routes
app.use('/proxy', proxyRouter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'llm-proxy' });
});

const server = app.listen(port, () => {
  console.log(`LLM Proxy Service running on port ${port}`);
});

export { app, server };
