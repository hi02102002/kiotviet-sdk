import type { ParsedKiotVietWebhook } from './adapters/core/webhook';
import type { KiotvietResourceName } from './resource-names';
import type { KiotVietClientConfig } from './types/common';
import { KiotVietWebhookError, verifyKiotVietWebRequest } from './adapters/core/webhook';
import { KiotVietClient } from './client';

import { KiotVietApiError } from './errors';
import { RESOURCES } from './resource-names';

/** Webhook configuration for the instance's `handler` (better-auth style). */
export interface KiotvietWebhookConfig {
  /** The webhook secret, or a function resolving it per request (multi tenant) */
  secret: string | ((request: Request) => string | Promise<string>);
  /** Called with the verified webhook payload */
  onEvent: (webhook: ParsedKiotVietWebhook, request: Request) => void | Promise<void>;
}

/** Options accepted by the {@link kiotviet} factory. */
export interface KiotvietOptions extends Omit<KiotVietClientConfig, 'retailerName'> {
  /** Store name in KiotViet — better-auth style alias for `retailerName` */
  retailer?: string;
  /** Store name in KiotViet (the class API name; `retailer` also works) */
  retailerName?: string;
  /** When provided, the instance's `handler` also accepts KiotViet webhooks */
  webhook?: KiotvietWebhookConfig;
}

/**
 * A `kiotviet()` instance: the full {@link KiotVietClient} with all resource
 * handlers, plus a web-standard `handler` exposing every SDK endpoint.
 */
export type KiotvietInstance = KiotVietClient & {
  handler: (request: Request) => Promise<Response>;
};

type ResourceName = KiotvietResourceName;

function json(payload: unknown, status: number): Response {
  return Response.json(payload, { status });
}

/**
 * Create a KiotViet client instance — the better-auth-style entry point.
 *
 * The returned instance exposes a web-standard `handler` that serves every
 * SDK endpoint, so it can be mounted with a single catch-all route:
 *
 * - `POST /webhook` — verified KiotViet webhook (requires the `webhook` option)
 * - `POST /{resource}.{method}` — calls any resource handler, e.g.
 *   `POST /products.list` with body `{ "args": [{ "pageSize": 10 }] }` or
 *   `POST /products.getById` with body `{ "args": [123] }`
 *
 * Protect the mount point with your own auth middleware: the handler exposes
 * the full KiotViet API surface of your retailer.
 *
 * @example
 * ```typescript
 * // lib/kiotviet.ts
 * import { kiotviet } from "kiotvietsdk";
 *
 * export const kv = kiotviet({
 *   clientId: process.env.KIOTVIET_CLIENT_ID!,
 *   clientSecret: process.env.KIOTVIET_CLIENT_SECRET!,
 *   retailer: "my-shop",
 *   webhook: {
 *     secret: process.env.KIOTVIET_WEBHOOK_SECRET!,
 *     onEvent: (webhook) => console.log(webhook.event, webhook.body),
 *   },
 * });
 * ```
 *
 * @example
 * ```typescript
 * // Hono — mount like better-auth's auth.handler
 * import { Hono } from "hono";
 * import { kv } from "./lib/kiotviet";
 *
 * const app = new Hono();
 * app.on(["POST", "GET"], "/api/kiotviet/*", (c) => kv.handler(c.req.raw));
 * ```
 */
export function kiotviet(options: KiotvietOptions): KiotvietInstance {
  const { webhook, retailer, retailerName, ...rest } = options;
  const config = { ...rest, retailerName: retailerName ?? retailer } as KiotVietClientConfig;
  const client = new KiotVietClient(config);

  async function handleWebhook(request: Request): Promise<Response> {
    if (!webhook) {
      return json(
        {
          error: 'WEBHOOK_NOT_CONFIGURED',
          message: 'Pass a `webhook: { secret, onEvent }` option to kiotviet() to receive webhooks.',
        },
        500,
      );
    }
    try {
      const parsed = await verifyKiotVietWebRequest(request, webhook.secret);
      await webhook.onEvent(parsed, request);
      return json({ received: true }, 200);
    }
    catch (error) {
      if (error instanceof KiotVietWebhookError) {
        return json({ error: error.code, message: error.message }, 401);
      }
      return json({ error: 'INTERNAL_ERROR', message: (error as Error).message }, 500);
    }
  }

  async function readArgs(request: Request, url: URL): Promise<unknown[]> {
    const queryArgs = url.searchParams.get('args');
    const raw = queryArgs ?? (request.method === 'POST' ? await request.text() : '');
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) {
      return parsed;
    }
    if (parsed && Array.isArray((parsed as { args?: unknown[] }).args)) {
      return (parsed as { args: unknown[] }).args;
    }
    throw new KiotVietWebhookError('Request body must be a JSON array or { "args": [...] }', 'INVALID_PAYLOAD');
  }

  async function handleRpc(request: Request, route: string): Promise<Response> {
    const [resourceName, method] = route.split('.');
    if (!resourceName || !method || !RESOURCES.includes(resourceName as ResourceName)) {
      return json({ error: 'NOT_FOUND', message: `Unknown route "${route}"` }, 404);
    }

    const resource = client[resourceName as ResourceName] as unknown as Record<string, unknown>;
    const action = resource[method];
    if (typeof action !== 'function') {
      return json({ error: 'NOT_FOUND', message: `Unknown method "${route}"` }, 404);
    }

    let args: unknown[];
    try {
      args = await readArgs(request, new URL(request.url));
    }
    catch (error) {
      return json({ error: 'BAD_REQUEST', message: (error as Error).message }, 400);
    }

    try {
      const result = await (action as (...callArgs: unknown[]) => unknown).apply(resource, args);
      return json(result ?? null, 200);
    }
    catch (error) {
      if (error instanceof KiotVietApiError) {
        return json(
          { error: error.errorCode ?? 'API_ERROR', message: error.errorMessage },
          error.statusCode ?? 500,
        );
      }
      return json({ error: 'INTERNAL_ERROR', message: (error as Error).message }, 500);
    }
  }

  const handler = async (request: Request): Promise<Response> => {
    if (request.method !== 'POST' && request.method !== 'GET') {
      return json({ error: 'METHOD_NOT_ALLOWED' }, 405);
    }

    // Route on the final path segment so the handler is mount-path agnostic
    const segments = new URL(request.url).pathname.split('/').filter(Boolean);
    const route = segments.at(-1) ?? '';

    if (route === 'webhook') {
      return handleWebhook(request);
    }
    return handleRpc(request, route);
  };

  return Object.assign(client, { handler });
}
