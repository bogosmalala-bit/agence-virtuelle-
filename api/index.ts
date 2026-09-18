// Standalone Vercel Serverless Function entry point
// Handles Meta Webhook Verification and Event Receiving with 100% resilience
export default async function handler(req: any, res: any) {
  const url = req.url || '';

  // 1. Meta Webhook Verification (GET) and Event Ingestion (POST)
  if (url.includes('/webhooks/facebook') || url.includes('/api/webhooks/facebook')) {
    if (req.method === 'GET') {
      const query = req.query || {};
      const mode = query['hub.mode'];
      const token = query['hub.verify_token'];
      const challenge = query['hub.challenge'];

      const acceptedTokens = [
        'assistante_virtuelle_webhook_verify_token',
        process.env.META_VERIFY_TOKEN,
      ].filter(Boolean);

      console.log('[VERCEL WEBHOOK HANDSHAKE]', { mode, token, challenge });

      if (mode === 'subscribe' && challenge && token && acceptedTokens.includes(token)) {
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        return res.status(200).send(challenge);
      }

      return res.status(403).send('Forbidden: Invalid Verify Token');
    }

    if (req.method === 'POST') {
      console.log('[VERCEL WEBHOOK EVENT RECEIVED]', JSON.stringify(req.body).slice(0, 300));
      return res.status(200).send('EVENT_RECEIVED');
    }
  }

  // 2. Fallback to bundled server if available
  try {
    const { createRequire } = await import('module');
    const require = createRequire(import.meta.url);
    const path = await import('path');
    const fs = await import('fs');
    
    const serverPath = path.resolve(process.cwd(), 'dist/server.cjs');
    if (fs.existsSync(serverPath)) {
      const serverModule = require(serverPath);
      const app = serverModule.default || serverModule.app || serverModule;
      if (typeof app === 'function') {
        return app(req, res);
      }
    }
  } catch (err) {
    console.warn('[VERCEL SERVER FALLBACK WARNING]', err);
  }

  // If no specific route matched
  return res.status(200).json({ status: 'ok', message: 'Vercel API Gateway Active' });
}
