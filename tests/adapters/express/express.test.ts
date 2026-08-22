import type { Express, Request } from 'express';
import express from 'express';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { kiotvietExpressMiddleware, kiotvietExpressWebhook } from '../../../src/adapters/express';
import { KiotVietClient } from '../../../src/client';
import { testClientConfig } from '../../helpers/client';
import { close, listen } from '../../helpers/server';
import { SAMPLE_BODY, SECRET, sign } from '../../helpers/webhook';

describe('kiotvietExpressMiddleware', () => {
  it('requires client or getClient', () => {
    expect(() => kiotvietExpressMiddleware({})).toThrowError(/client/);
  });

  it('attaches the client to req.kiotviet', async () => {
    const app = express();
    const client = new KiotVietClient(testClientConfig());
    app.use(kiotvietExpressMiddleware({ client }));
    app.get('/check', (req, res) => res.json({ attached: req.kiotviet === client }));

    const { server, url } = await listen(app);
    try {
      const response = await fetch(`${url}/check`);
      expect(await response.json()).toEqual({ attached: true });
    }
    finally {
      await close(server);
    }
  });

  it('resolves the client per request via getClient', async () => {
    const app = express();
    const tenantClients = {
      'retailer-a': new KiotVietClient(testClientConfig('retailer-a')),
      'retailer-b': new KiotVietClient(testClientConfig('retailer-b')),
    };
    app.use(
      kiotvietExpressMiddleware({
        getClient: req => tenantClients[(req.query.tenant as string) ?? 'retailer-a'],
      }),
    );
    app.get('/check', (req, res) => res.json({ retailer: req.kiotviet?.constructor.name, ok: !!req.kiotviet }));

    const { server, url } = await listen(app);
    try {
      const response = await fetch(`${url}/check?tenant=retailer-b`);
      const body = await response.json();
      expect(body.ok).toBe(true);
    }
    finally {
      await close(server);
    }
  });
});

describe('kiotvietExpressWebhook', () => {
  describe('with raw body captured', () => {
    let server: import('node:http').Server;
    let url: string;
    const received: unknown[] = [];

    beforeAll(async () => {
      const app: Express = express();
      app.use(
        express.json({
          verify: (req, _res, buf) => {
            (req as Request).rawBody = buf;
          },
        }),
      );
      app.post(
        '/webhooks/kiotviet',
        kiotvietExpressWebhook({
          secret: SECRET,
          onEvent: (webhook) => {
            received.push(webhook.body);
          },
        }),
      );
      ({ server, url } = await listen(app));
    });

    afterAll(async () => {
      await close(server);
    });

    it('accepts a correctly signed webhook with 200', async () => {
      const response = await fetch(`${url}/webhooks/kiotviet`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'X-Hub-Signature': sign(SAMPLE_BODY) },
        body: SAMPLE_BODY,
      });

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ received: true });
      expect(received).toHaveLength(1);
    });

    it('rejects a tampered signature with 401', async () => {
      const response = await fetch(`${url}/webhooks/kiotviet`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'X-Hub-Signature': sign('{"tampered":true}') },
        body: SAMPLE_BODY,
      });

      expect(response.status).toBe(401);
      expect(await response.json()).toEqual(expect.objectContaining({ error: 'INVALID_SIGNATURE' }));
    });

    it('rejects a request without signature header with 401', async () => {
      const response = await fetch(`${url}/webhooks/kiotviet`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: SAMPLE_BODY,
      });

      expect(response.status).toBe(401);
      expect(await response.json()).toEqual(expect.objectContaining({ error: 'MISSING_SIGNATURE' }));
    });
  });

  it('fails with 500 when the raw body was not captured', async () => {
    const app: Express = express();
    app.post('/webhooks/kiotviet', kiotvietExpressWebhook({ secret: SECRET, onEvent: () => undefined }));

    const { server, url } = await listen(app);
    try {
      const response = await fetch(`${url}/webhooks/kiotviet`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'X-Hub-Signature': sign(SAMPLE_BODY) },
        body: SAMPLE_BODY,
      });

      expect(response.status).toBe(500);
      expect(await response.json()).toEqual(expect.objectContaining({ error: 'RAW_BODY_REQUIRED' }));
    }
    finally {
      await close(server);
    }
  });

  it('resolves the secret per request', async () => {
    const app: Express = express();
    app.use(
      express.json({
        verify: (req, _res, buf) => {
          (req as Request).rawBody = buf;
        },
      }),
    );
    const secrets = { 'tenant-a': SECRET };
    app.post(
      '/webhooks/kiotviet',
      kiotvietExpressWebhook({
        secret: req => secrets[(req.query.tenant as string) ?? 'tenant-a'],
        onEvent: () => undefined,
      }),
    );

    const { server, url } = await listen(app);
    try {
      const response = await fetch(`${url}/webhooks/kiotviet?tenant=tenant-a`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'X-Hub-Signature': sign(SAMPLE_BODY) },
        body: SAMPLE_BODY,
      });
      expect(response.status).toBe(200);
    }
    finally {
      await close(server);
    }
  });
});
