import type { Context, Env, Handler, Hono, MiddlewareHandler } from 'hono';
import type { KiotVietClient } from '../../client';
import type { KiotvietInstance } from '../../kiotviet';
import type { ParsedKiotVietWebhook } from '../core/webhook';
import { KiotVietWebhookError, parseKiotVietWebhook } from '../core/webhook';

/**
 * Hono environment type carrying the KiotViet client.
 * Use it as your app's generic so `c.get('kiotviet')` is fully typed.
 */
export interface KiotVietHonoEnv extends Env {
  Variables: {
    kiotviet: KiotVietClient;
  };
}

/** Options for {@link kiotvietHonoMiddleware}. */
export interface KiotVietHonoMiddlewareOptions {
  /** A pre-built client shared by every request. */
  client?: KiotVietClient;
  /** Resolve the client per context (e.g. multi-tenant by retailer). */
  getClient?: (c: Context) => KiotVietClient | Promise<KiotVietClient>;
}

/**
 * Hono middleware that exposes a {@link KiotVietClient} as `c.get('kiotviet')`.
 * Provide exactly one of `client` (single tenant) or `getClient` (multi tenant).
 *
 * @example
 * ```typescript
 * import { Hono } from 'hono';
 * import { KiotVietClient } from 'kiotvietsdk';
 * import { kiotvietHonoMiddleware, KiotVietHonoEnv } from 'kiotvietsdk/adapters/hono';
 *
 * const app = new Hono<KiotVietHonoEnv>();
 * app.use('*', kiotvietHonoMiddleware({ client: new KiotVietClient({ ... }) }));
 *
 * app.get('/products', async (c) => c.json(await c.get('kiotviet').products.list({ pageSize: 10 })));
 * ```
 */
export function kiotvietHonoMiddleware(options: KiotVietHonoMiddlewareOptions): MiddlewareHandler<KiotVietHonoEnv> {
  if (!options.client && !options.getClient) {
    throw new Error('kiotvietHonoMiddleware requires either `client` or `getClient`');
  }

  return async (c, next) => {
    const client = options.getClient ? await options.getClient(c) : options.client!;
    if (!client) {
      throw new Error('kiotvietHonoMiddleware: `getClient` returned no client');
    }
    c.set('kiotviet', client);
    await next();
  };
}

/** Options for {@link kiotvietWebhookHandler}. */
export interface KiotVietHonoWebhookOptions<E extends KiotVietHonoEnv = KiotVietHonoEnv> {
  /** The webhook secret, or a function resolving it per request (multi tenant). */
  secret: string | ((c: Context) => string | Promise<string>);
  /**
   * Called with the verified webhook. Return a `Response` from the callback or
   * let the handler answer `200 { "received": true }` after it returns.
   */
  onEvent: (webhook: ParsedKiotVietWebhook, c: Context<E>) => Response | Promise<Response> | void | Promise<void>;
}

/**
 * Hono handler for KiotViet webhooks: verifies the `X-Hub-Signature` header
 * against the raw body (always available via `c.req.raw`), parses the payload
 * and forwards it to `onEvent`.
 *
 * Responds 401 for a missing/invalid signature, 500 when `onEvent` throws,
 * and 200 after `onEvent` completes (unless it already returned a Response).
 *
 * @example
 * ```typescript
 * app.post('/webhooks/kiotviet', kiotvietWebhookHandler({
 *   secret: process.env.KIOTVIET_WEBHOOK_SECRET!,
 *   onEvent: (webhook) => console.log(webhook.event, webhook.body),
 * }));
 * ```
 */
export function kiotvietWebhookHandler<E extends KiotVietHonoEnv = KiotVietHonoEnv>(
  options: KiotVietHonoWebhookOptions<E>,
): Handler<E> {
  return async (c) => {
    const raw = await c.req.raw.text();
    const secret = typeof options.secret === 'function' ? await options.secret(c) : options.secret;

    try {
      const webhook = parseKiotVietWebhook(raw, c.req.header('X-Hub-Signature'), secret);
      const response = await options.onEvent(webhook, c);
      return response ?? c.json({ received: true }, 200);
    }
    catch (error) {
      if (error instanceof KiotVietWebhookError) {
        return c.json({ error: error.code, message: error.message }, 401);
      }
      throw error;
    }
  };
}

/**
 * One-liner registration of a KiotViet webhook route on a Hono app.
 *
 * @example
 * ```typescript
 * registerKiotVietWebhook(app, '/webhooks/kiotviet', { secret, onEvent });
 * ```
 */
export function registerKiotVietWebhook<E extends KiotVietHonoEnv = KiotVietHonoEnv>(
  app: Hono<E>,
  path: string,
  options: KiotVietHonoWebhookOptions<E>,
): void {
  app.post(path, kiotvietWebhookHandler(options));
}

/**
 * Mount a `kiotviet()` instance's handler (all SDK endpoints + webhooks) on Hono:
 *
 * ```typescript
 * app.on(["POST", "GET"], "/api/kiotviet/*", toHonoHandler(kv));
 * ```
 */
export function toHonoHandler(kv: KiotvietInstance): MiddlewareHandler {
  return async (c: Context, next) => {
    const response = await kv.handler(c.req.raw);
    if (response) {
      return response;
    }
    return next();
  };
}
