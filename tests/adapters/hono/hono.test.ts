import type {
  KiotVietHonoEnv,
} from '../../../src/adapters/hono';
import { Hono } from 'hono';
import { describe, expect, it } from 'vitest';
import {
  kiotvietHonoMiddleware,
  kiotvietWebhookHandler,
  registerKiotVietWebhook,
} from '../../../src/adapters/hono';
import { KiotVietClient } from '../../../src/client';
import { testClientConfig } from '../../helpers/client';
import { SAMPLE_BODY, SECRET, sign } from '../../helpers/webhook';

function post(signature?: string) {
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (signature !== undefined) {
    headers['X-Hub-Signature'] = signature;
  }
  return { method: 'POST', headers, body: SAMPLE_BODY } as const;
}

describe('kiotvietHonoMiddleware', () => {
  it('requires client or getClient', () => {
    expect(() => kiotvietHonoMiddleware({})).toThrowError(/client/);
  });

  it('exposes the client via c.get("kiotviet")', async () => {
    const client = new KiotVietClient(testClientConfig());
    const app = new Hono<KiotVietHonoEnv>();
    app.use('*', kiotvietHonoMiddleware({ client }));
    app.get('/check', c => c.json({ attached: c.get('kiotviet') === client }));

    const response = await app.request('/check');
    expect(await response.json()).toEqual({ attached: true });
  });

  it('resolves the client per request via getClient', async () => {
    const clientA = new KiotVietClient(testClientConfig('retailer-a'));
    const clientB = new KiotVietClient(testClientConfig('retailer-b'));
    const app = new Hono<KiotVietHonoEnv>();
    app.use(
      '*',
      kiotvietHonoMiddleware({
        getClient: c => (c.req.query('tenant') === 'b' ? clientB : clientA),
      }),
    );
    app.get('/check', c => c.json({ isB: c.get('kiotviet') === clientB }));

    const response = await app.request('/check?tenant=b');
    expect(await response.json()).toEqual({ isB: true });
  });
});

describe('kiotvietWebhookHandler', () => {
  it('accepts a correctly signed webhook', async () => {
    const received: unknown[] = [];
    const app = new Hono<KiotVietHonoEnv>();
    registerKiotVietWebhook(app, '/webhooks/kiotviet', {
      secret: SECRET,
      onEvent: (webhook) => {
        received.push(webhook.body);
      },
    });

    const response = await app.request('/webhooks/kiotviet', post(sign(SAMPLE_BODY)));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ received: true });
    expect(received).toHaveLength(1);
  });

  it('rejects a tampered signature with 401', async () => {
    const app = new Hono<KiotVietHonoEnv>();
    registerKiotVietWebhook(app, '/webhooks/kiotviet', { secret: SECRET, onEvent: () => undefined });

    const response = await app.request('/webhooks/kiotviet', post(sign('{"tampered":true}')));

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual(expect.objectContaining({ error: 'INVALID_SIGNATURE' }));
  });

  it('rejects a missing signature header with 401', async () => {
    const app = new Hono<KiotVietHonoEnv>();
    app.post('/webhooks/kiotviet', kiotvietWebhookHandler({ secret: SECRET, onEvent: () => undefined }));

    const response = await app.request('/webhooks/kiotviet', post());

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual(expect.objectContaining({ error: 'MISSING_SIGNATURE' }));
  });

  it('honors a Response returned by onEvent', async () => {
    const app = new Hono<KiotVietHonoEnv>();
    registerKiotVietWebhook(app, '/webhooks/kiotviet', {
      secret: SECRET,
      onEvent: (_webhook, c) => c.json({ custom: true }, 202),
    });

    const response = await app.request('/webhooks/kiotviet', post(sign(SAMPLE_BODY)));

    expect(response.status).toBe(202);
    expect(await response.json()).toEqual({ custom: true });
  });

  it('resolves the secret per request', async () => {
    const app = new Hono<KiotVietHonoEnv>();
    registerKiotVietWebhook(app, '/webhooks/kiotviet', {
      secret: c => (c.req.query('tenant') === 'a' ? SECRET : 'wrong'),
      onEvent: () => undefined,
    });

    const ok = await app.request('/webhooks/kiotviet?tenant=a', post(sign(SAMPLE_BODY)));
    expect(ok.status).toBe(200);

    const rejected = await app.request('/webhooks/kiotviet?tenant=b', post(sign(SAMPLE_BODY)));
    expect(rejected.status).toBe(401);
  });
});
