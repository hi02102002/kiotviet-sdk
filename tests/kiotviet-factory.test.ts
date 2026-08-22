import { describe, expect, it, vi } from 'vitest';
import { kiotviet, KiotVietClient } from '../src';
import { testClientConfig } from './helpers/client';
import { SAMPLE_BODY, SECRET, sign } from './helpers/webhook';

function request(path: string, init?: RequestInit): Request {
  return new Request(`http://localhost/api/kiotviet${path}`, init);
}

describe('kiotviet() factory', () => {
  it('returns a full KiotVietClient with all resource handlers', () => {
    const kv = kiotviet(testClientConfig());

    expect(kv).toBeInstanceOf(KiotVietClient);
    for (const handler of [
      'products',
      'customers',
      'orders',
      'invoices',
      'webhooks',
      'locations',
      'coupons',
      'vouchers',
      'settings',
      'surcharges',
    ]) {
      expect(kv[handler as keyof typeof kv]).toBeDefined();
    }
  });

  it('throws on missing credentials, like the class constructor', () => {
    expect(() => kiotviet({ clientId: '', clientSecret: '', retailerName: '' })).toThrowError(
      /clientId, clientSecret, and retailerName are required/,
    );
  });
});

describe('kv.handler RPC ({resource}.{method})', () => {
  it('calls any resource handler with JSON args', async () => {
    const kv = kiotviet(testClientConfig());
    const list = vi.fn().mockResolvedValue({ data: { total: 2, data: [] } });
    kv.apiClient.get = list;

    const response = await kv.handler(
      request('/products.list', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ args: [{ pageSize: 10 }] }),
      }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ total: 2, data: [] });
    expect(list).toHaveBeenCalledWith('/products', { params: { pageSize: 10 } });
  });

  it('accepts a bare JSON array body as args', async () => {
    const kv = kiotviet(testClientConfig());
    const get = vi.fn().mockResolvedValue({ data: { id: 123 } });
    kv.apiClient.get = get;

    const response = await kv.handler(
      request('/products.getById', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify([123]),
      }),
    );

    expect(response.status).toBe(200);
    expect(get).toHaveBeenCalledWith('/products/123');
  });

  it('supports GET with an args query parameter', async () => {
    const kv = kiotviet(testClientConfig());
    const get = vi.fn().mockResolvedValue({ data: { total: 0, data: [] } });
    kv.apiClient.get = get;

    const response = await kv.handler(request('/locations.list?args=[]', { method: 'GET' }));

    expect(response.status).toBe(200);
    expect(get).toHaveBeenCalledWith('/locations');
  });

  it('calls write endpoints with args (create)', async () => {
    const kv = kiotviet(testClientConfig());
    const post = vi.fn().mockResolvedValue({ data: { id: 1 } });
    kv.apiClient.post = post;
    const params = { name: 'Jane', contactNumber: '0909123456' };

    const response = await kv.handler(
      request('/customers.create', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ args: [params] }),
      }),
    );

    expect(response.status).toBe(200);
    expect(post).toHaveBeenCalledWith('/customers', params);
  });

  it('mounts on Hono exactly like auth.handler(c.req.raw)', async () => {
    const { Hono } = await import('hono');
    const kv = kiotviet(testClientConfig());
    const list = vi.fn().mockResolvedValue({ data: { total: 5, data: [] } });
    kv.apiClient.get = list;

    const app = new Hono();
    app.on(['POST', 'GET'], '/api/kiotviet/*', c => kv.handler(c.req.raw));

    const response = await app.request('/api/kiotviet/products.list', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ args: [{ pageSize: 5 }] }),
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ total: 5, data: [] });
    expect(list).toHaveBeenCalled();
  });

  it('returns 404 for an unknown resource', async () => {
    const kv = kiotviet(testClientConfig());
    const response = await kv.handler(request('/apiClient.get', { method: 'POST', body: '[]' }));

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual(expect.objectContaining({ error: 'NOT_FOUND' }));
  });

  it('returns 404 for an unknown method', async () => {
    const kv = kiotviet(testClientConfig());
    const response = await kv.handler(request('/products.explode', { method: 'POST', body: '[]' }));

    expect(response.status).toBe(404);
  });

  it('returns 400 for a malformed args body', async () => {
    const kv = kiotviet(testClientConfig());
    const response = await kv.handler(
      request('/products.list', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ args: 'not-an-array' }),
      }),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual(expect.objectContaining({ error: 'BAD_REQUEST' }));
  });

  it('maps KiotVietApiError to its status code', async () => {
    const { KiotVietApiError } = await import('../src/errors');
    const kv = kiotviet(testClientConfig());
    kv.apiClient.get = vi.fn().mockRejectedValue(
      new KiotVietApiError('not found', 404, { errorCode: 'NotFound', message: 'missing' }),
    );

    const response = await kv.handler(request('/products.getById', { method: 'POST', body: '[999]' }));

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual(expect.objectContaining({ error: 'NotFound' }));
  });

  it('responds 405 for unsupported methods', async () => {
    const kv = kiotviet(testClientConfig());
    const response = await kv.handler(request('/products.list', { method: 'DELETE' }));

    expect(response.status).toBe(405);
  });
});

describe('kv.handler webhook route', () => {
  function webhookRequest(signature?: string, method = 'POST'): Request {
    const headers: Record<string, string> = { 'content-type': 'application/json' };
    if (signature !== undefined) {
      headers['X-Hub-Signature'] = signature;
    }
    return request('/webhook', { method, headers, body: SAMPLE_BODY });
  }

  it('accepts a signed webhook with 200 and dispatches onEvent', async () => {
    const received: string[] = [];
    const kv = kiotviet({
      ...testClientConfig(),
      webhook: {
        secret: SECRET,
        onEvent: (webhook) => {
          received.push(webhook.raw);
        },
      },
    });

    const response = await kv.handler(webhookRequest(sign(SAMPLE_BODY)));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ received: true });
    expect(received).toEqual([SAMPLE_BODY]);
  });

  it('rejects a tampered signature with 401', async () => {
    const kv = kiotviet({
      ...testClientConfig(),
      webhook: { secret: SECRET, onEvent: () => undefined },
    });

    const response = await kv.handler(webhookRequest(sign('{"tampered":true}')));

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual(expect.objectContaining({ error: 'INVALID_SIGNATURE' }));
  });

  it('responds 500 when no webhook option was configured', async () => {
    const kv = kiotviet(testClientConfig());

    const response = await kv.handler(webhookRequest(sign(SAMPLE_BODY)));

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual(expect.objectContaining({ error: 'WEBHOOK_NOT_CONFIGURED' }));
  });
});
