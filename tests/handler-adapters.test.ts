import type { AddressInfo } from 'node:net';
import { All, Controller, Module, Req, Res } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import express from 'express';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { kiotviet } from '../src';
import { toWebHandler } from '../src/adapters/core';
import { toExpressHandler } from '../src/adapters/express';
import { toHonoHandler } from '../src/adapters/hono';
import { toNestHandler } from '../src/adapters/nestjs';
import { toNextJsHandler } from '../src/adapters/next';
import { testClientConfig } from './helpers/client';
import { close, listen } from './helpers/server';
import 'reflect-metadata';

const PRODUCTS = { total: 3, data: [{ id: 1 }, { id: 2 }, { id: 3 }] };

function makeKv() {
  const kv = kiotviet(testClientConfig());
  kv.apiClient.get = vi.fn().mockResolvedValue({ data: PRODUCTS });
  kv.apiClient.post = vi.fn().mockResolvedValue({ data: { id: 9, message: 'ok' } });
  return kv;
}

const RPC_BODY = JSON.stringify({ args: [{ pageSize: 3 }] });

describe('toWebHandler', () => {
  it('routes requests straight to kv.handler', async () => {
    const kv = makeKv();
    const handler = toWebHandler(kv);

    const response = await handler(
      new Request('http://localhost/api/kiotviet/products.list', { method: 'POST', body: RPC_BODY }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(PRODUCTS);
  });
});

describe('toNextJsHandler', () => {
  it('exposes GET and POST route exports', async () => {
    const kv = makeKv();
    const { GET, POST } = toNextJsHandler(kv);

    const posted = await POST(
      new Request('http://localhost/api/kiotviet/products.list', { method: 'POST', body: RPC_BODY }),
    );
    expect(await posted.json()).toEqual(PRODUCTS);

    const got = await GET(new Request('http://localhost/api/kiotviet/locations.list?args=[]'));
    expect(got.status).toBe(200);
  });
});

describe('toHonoHandler', () => {
  it('mounts with a single catch-all route', async () => {
    const { Hono } = await import('hono');
    const kv = makeKv();
    const app = new Hono();

    app.on(['POST', 'GET'], '/api/kiotviet/*', toHonoHandler(kv));

    const response = await app.request('/api/kiotviet/products.list', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: RPC_BODY,
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(PRODUCTS);
  });
});

describe('toExpressHandler', () => {
  let server: import('node:http').Server;
  let url: string;

  beforeAll(async () => {
    const kv = makeKv();
    const app = express();
    app.use(
      express.json({
        verify: (req, _res, buf) => {
          (req as { rawBody?: Buffer }).rawBody = buf;
        },
      }),
    );
    app.all('/api/kiotviet/*', toExpressHandler(kv));
    ({ server, url } = await listen(app));
  });

  afterAll(async () => {
    await close(server);
  });

  it('serves the RPC endpoint over HTTP', async () => {
    const response = await fetch(`${url}/api/kiotviet/products.list`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: RPC_BODY,
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(PRODUCTS);
  });

  it('returns 404 for unknown routes', async () => {
    const response = await fetch(`${url}/api/kiotviet/nope.list`, {
      method: 'POST',
      body: '[]',
    });
    expect(response.status).toBe(404);
  });
});

describe('toNestHandler', () => {
  let baseUrl: string;
  let app: { close: () => Promise<void> };

  beforeAll(async () => {
    const kv = makeKv();
    type NestHandle = ReturnType<typeof toNestHandler>;

    @Controller()
    class KiotvietController {
      @All('api/kiotviet/:route')
      handle(@Req() req: Parameters<NestHandle>[0], @Res() res: Parameters<NestHandle>[1]) {
        return toNestHandler(kv)(req, res);
      }
    }

    @Module({ controllers: [KiotvietController] })
    class HandlerAppModule {}

    const nestApp = await NestFactory.create(HandlerAppModule, { rawBody: true });
    await nestApp.listen(0);
    const { port } = nestApp.getHttpServer().address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${port}`;
    app = nestApp;
  });

  afterAll(async () => {
    await app.close();
  });

  it('serves the RPC endpoint from a Nest controller', async () => {
    const response = await fetch(`${baseUrl}/api/kiotviet/products.list`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: RPC_BODY,
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(PRODUCTS);
  });
});
