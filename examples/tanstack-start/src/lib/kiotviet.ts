import { kiotviet } from 'kiotvietsdk';

// The shared instance — like better-auth's auth.ts.
// Resource calls hit the real KiotViet API: set KIOTVIET_* env vars.
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
