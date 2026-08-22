import type { Request, RequestHandler, Response } from 'express';
import type { KiotVietClient } from '../../client';
import type { KiotvietInstance } from '../../kiotviet';
import type { ParsedKiotVietWebhook } from '../core/webhook';
import { nodeToWebRequest, webResponseToNode } from '../core/node-bridge';
import { KiotVietWebhookError, parseKiotVietWebhook } from '../core/webhook';

declare module 'express-serve-static-core' {
  interface Request {
    /** KiotViet client attached by `kiotvietExpressMiddleware` */
    kiotviet?: KiotVietClient;
    /** Raw request body, populated by `express.json({ verify })` */
    rawBody?: Buffer;
  }
}

/** Options for {@link kiotvietExpressMiddleware}. */
export interface KiotVietExpressMiddlewareOptions {
  /** A pre-built client shared by every request. */
  client?: KiotVietClient;
  /** Resolve the client per request (e.g. multi-tenant by retailer). */
  getClient?: (req: Request) => KiotVietClient | Promise<KiotVietClient>;
}

/**
 * Express middleware that attaches a {@link KiotVietClient} to `req.kiotviet`.
 *
 * Provide exactly one of `client` (single tenant) or `getClient` (multi tenant).
 *
 * @example
 * ```typescript
 * import express from 'express';
 * import { KiotVietClient } from 'kiotvietsdk';
 * import { kiotvietExpressMiddleware } from 'kiotvietsdk/adapters/express';
 *
 * const app = express();
 * app.use(kiotvietExpressMiddleware({
 *   client: new KiotVietClient({
 *     clientId: process.env.KIOTVIET_CLIENT_ID!,
 *     clientSecret: process.env.KIOTVIET_CLIENT_SECRET!,
 *     retailerName: 'my-retailer',
 *   }),
 * }));
 *
 * app.get('/products', async (req, res) => {
 *   const products = await req.kiotviet!.products.list({ pageSize: 10 });
 *   res.json(products);
 * });
 * ```
 */
export function kiotvietExpressMiddleware(options: KiotVietExpressMiddlewareOptions): RequestHandler {
  if (!options.client && !options.getClient) {
    throw new Error('kiotvietExpressMiddleware requires either `client` or `getClient`');
  }

  return async (req, _res, next) => {
    try {
      const client = options.getClient ? await options.getClient(req) : options.client!;
      if (!client) {
        throw new Error('kiotvietExpressMiddleware: `getClient` returned no client');
      }
      (req as Request).kiotviet = client;
      next();
    }
    catch (error) {
      next(error);
    }
  };
}

/** Options for {@link kiotvietExpressWebhook}. */
export interface KiotVietExpressWebhookOptions {
  /** The webhook secret, or a function resolving it per request (multi tenant). */
  secret: string | ((req: Request) => string | Promise<string>);
  /**
   * Called with the verified webhook. Respond inside the callback or let the
   * middleware answer `200 { "received": true }` after it returns.
   */
  onEvent: (webhook: ParsedKiotVietWebhook, req: Request, res: Response) => void | Promise<void>;
}

/**
 * Express handler for KiotViet webhooks: verifies the `X-Hub-Signature` header
 * against the raw body, parses the payload and forwards it to `onEvent`.
 *
 * The app must capture the raw body for signature verification:
 *
 * ```typescript
 * app.use(express.json({
 *   verify: (req, _res, buf) => { (req as Request).rawBody = buf; },
 * }));
 * app.post('/webhooks/kiotviet', kiotvietExpressWebhook({ secret, onEvent }));
 * ```
 *
 * Responds 401 for a missing/invalid signature, 500 when the raw body was not
 * captured, and 200 after `onEvent` completes (unless it already responded).
 */
export function kiotvietExpressWebhook(options: KiotVietExpressWebhookOptions): RequestHandler {
  return async (req, res, next) => {
    try {
      const raw = req.rawBody;
      if (!raw) {
        throw new KiotVietWebhookError(
          'Raw request body not available. Configure express.json({ verify: (req, _res, buf) => { req.rawBody = buf; } }) '
          + 'before this route so the webhook signature can be verified.',
          'RAW_BODY_REQUIRED',
        );
      }

      const secret = typeof options.secret === 'function' ? await options.secret(req) : options.secret;
      const webhook = parseKiotVietWebhook(raw, req.header('x-hub-signature'), secret);

      await options.onEvent(webhook, req, res);
      if (!res.headersSent) {
        res.status(200).json({ received: true });
      }
    }
    catch (error) {
      if (error instanceof KiotVietWebhookError) {
        const status = error.code === 'RAW_BODY_REQUIRED' ? 500 : 401;
        res.status(status).json({ error: error.code, message: error.message });
        return;
      }
      next(error);
    }
  };
}

/**
 * Mount a `kiotviet()` instance's handler (all SDK endpoints + webhooks) on Express:
 *
 * ```typescript
 * app.all("/api/kiotviet/*", toExpressHandler(kv));
 * ```
 *
 * Capture the raw body first (`express.json({ verify })`) if you receive
 * webhooks so signatures verify against the exact bytes.
 */
export function toExpressHandler(kv: KiotvietInstance): RequestHandler {
  return async (req, res, next) => {
    try {
      const response = await kv.handler(nodeToWebRequest(req));
      await webResponseToNode(response, res);
    }
    catch (error) {
      next(error);
    }
  };
}
