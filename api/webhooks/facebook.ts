export default function handler(req: any, res: any) {
  // GET: Meta Webhook Handshake / Challenge Verification
  if (req.method === 'GET') {
    const query = req.query || {};
    const mode = query['hub.mode'];
    const token = query['hub.verify_token'];
    const challenge = query['hub.challenge'];

    const acceptedTokens = [
      'assistante_virtuelle_webhook_verify_token',
      process.env.META_VERIFY_TOKEN,
    ].filter(Boolean);

    console.log('[VERCEL DIRECT WEBHOOK HANDSHAKE]', { mode, token, challenge });

    if (mode === 'subscribe' && challenge && token && acceptedTokens.includes(token)) {
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      return res.status(200).send(challenge);
    }

    return res.status(403).send('Forbidden: Invalid Verify Token');
  }

  // POST: Webhook Events (Messenger messages, comments)
  if (req.method === 'POST') {
    console.log('[VERCEL DIRECT WEBHOOK EVENT RECEIVED]', JSON.stringify(req.body).slice(0, 300));
    return res.status(200).send('EVENT_RECEIVED');
  }

  return res.status(405).send('Method Not Allowed');
}
