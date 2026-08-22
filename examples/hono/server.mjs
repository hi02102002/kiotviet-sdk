/**
 * Hono example — mount the kiotvietsdk handler exactly like better-auth.
 *
 * Run:  node examples/hono/server.mjs
 * Try:  curl -X POST http://localhost:3002/api/kiotviet/products.list \
 *         -H 'content-type: application/json' -d '{"args":[{"pageSize":5}]}'
 *       node examples/send-webhook.mjs http://localhost:3002/api/kiotviet/webhook
 */
import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { kiotviet } from 'kiotvietsdk';
import { toHonoHandler, kiotvietHonoMiddleware } from 'kiotvietsdk/adapters/hono';

// 1. Create the instance once (like better-auth's auth.ts)
export const kv = kiotviet({
  clientId: process.env.KIOTVIET_CLIENT_ID ?? 'demo-client-id',
  clientSecret: process.env.KIOTVIET_CLIENT_SECRET ?? 'demo-client-secret',
  retailer: process.env.KIOTVIET_RETAILER ?? 'demo-retailer',
  webhook: {
    secret: process.env.KIOTVIET_WEBHOOK_SECRET ?? 'demo-webhook-secret',
    onEvent: (webhook) => {
      console.log('[webhook]', webhook.event ?? 'event', JSON.stringify(webhook.body).slice(0, 120));
    },
  },
});

// KiotVietHonoEnv generic is only needed in TypeScript — see README
const app = new Hono();

// 2. Single catch-all mount: every SDK endpoint + verified webhooks
app.on(['POST', 'GET'], '/api/kiotviet/*', toHonoHandler(kv));

// 3. (Optional) classic middleware style: expose the client via c.get('kiotviet')
app.use('/api/me/*', kiotvietHonoMiddleware({ client: kv }));
app.get('/api/me/products', async (c) => c.json(await c.get('kiotviet').products.list({ pageSize: 5 })));

serve({ fetch: app.fetch, port: 3002 }, () => {
  console.log('Hono example listening on http://localhost:3002');
  console.log('  POST /api/kiotviet/products.list   {"args":[{"pageSize":5}]}');
  console.log('  POST /api/kiotviet/webhook         (signed — see examples/send-webhook.mjs)');
});
