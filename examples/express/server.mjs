/**
 * Express example — mount the kiotvietsdk handler and use the middleware.
 *
 * Run:  node examples/express/server.mjs
 * Try:  curl -X POST http://localhost:3001/api/kiotviet/products.list \
 *         -H 'content-type: application/json' -d '{"args":[{"pageSize":5}]}'
 *       node examples/send-webhook.mjs            # signed webhook -> 200
 *       node examples/send-webhook.mjs --tamper   # bad signature -> 401
 *
 * Resource calls hit the real KiotViet API — set real credentials in .env
 * (KIOTVIET_CLIENT_ID / KIOTVIET_CLIENT_SECRET / KIOTVIET_RETAILER).
 */
import express from 'express';
import { kiotviet } from 'kiotvietsdk';
import { toExpressHandler, kiotvietExpressMiddleware } from 'kiotvietsdk/adapters/express';

// 1. Create the instance once (like better-auth's auth.ts)
export const kv = kiotviet({
  clientId: process.env.KIOTVIET_CLIENT_ID ?? 'demo-client-id',
  clientSecret: process.env.KIOTVIET_CLIENT_SECRET ?? 'demo-client-secret',
  retailer: process.env.KIOTVIET_RETAILER ?? 'demo-retailer',
  webhook: {
    // Demo secret — KiotViet generates this when you register a webhook
    secret: process.env.KIOTVIET_WEBHOOK_SECRET ?? 'demo-webhook-secret',
    onEvent: (webhook) => {
      console.log('[webhook]', webhook.event ?? 'event', JSON.stringify(webhook.body).slice(0, 120));
    },
  },
});

const app = express();

// Raw body capture — required for webhook signature verification
app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

// 2. Single catch-all mount: every SDK endpoint + verified webhooks
app.all('/api/kiotviet/*', toExpressHandler(kv));

// 3. (Optional) classic middleware style: attach the client to req.kiotviet
app.use(kiotvietExpressMiddleware({ client: kv }));
app.get('/api/me/products', async (req, res, next) => {
  try {
    res.json(await req.kiotviet.products.list({ pageSize: 5 }));
  } catch (error) {
    next(error);
  }
});

// 4. Serve the interactive client-sdk sample page (examples/client-sdk/index.html)
import { fileURLToPath } from 'node:url';
import path from 'node:path';
app.use(
  express.static(path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'client-sdk')),
);

app.listen(3001, () => {
  console.log('Express example listening on http://localhost:3001');
  console.log('  POST /api/kiotviet/products.list   {"args":[{"pageSize":5}]}');
  console.log('  POST /api/kiotviet/webhook         (signed — see examples/send-webhook.mjs)');
});
