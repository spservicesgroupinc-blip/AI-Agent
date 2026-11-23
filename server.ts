import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  handleChatRequest,
  handleConfigRequest,
} from './src/server/chatProxy.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = Number(process.env.PORT || 3000);
const IS_PROD = process.env.NODE_ENV === 'production';

async function startServer() {
  const app = express();

  app.disable('x-powered-by');
  app.use(express.json({ limit: '64kb' }));

  // Read-only non-secret config status so Settings can show whether N8N_WEBHOOK_URL is active
  // without ever exposing the raw secret URL path or query parameters.
  app.get('/api/config', (_req, res) => {
    const result = handleConfigRequest(process.env);
    res.setHeader('X-Relay-Proxy', '1');
    res.setHeader('Cache-Control', 'no-store');
    res.status(result.status).json(result.body);
  });

  // Server-side webhook proxy: forwards POST JSON { sessionId, message } to the configured
  // N8N_WEBHOOK_URL secret (or optional valid client override / built-in production default).
  app.post('/api/chat', async (req, res) => {
    res.setHeader('X-Relay-Proxy', '1');
    res.setHeader('Cache-Control', 'no-store');
    const result = await handleChatRequest(req.body, process.env, { timeoutMs: 120000 });
    res.status(result.status).type(result.contentType).send(result.body);
  });

  if (!IS_PROD) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
