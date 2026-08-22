import type { ParsedKiotVietWebhook } from '../core/webhook';
import { getSingletonClient, resetSingletonClient } from '../core/singleton';
import { verifyKiotVietWebRequest } from '../core/webhook';

/**
 * Return the process-wide singleton KiotViet client, creating it on first use.
 * Cached on `globalThis`, so it survives Next.js dev hot-reload and keeps the
 * access-token cache warm between requests.
 */
export const getKiotVietClient = getSingletonClient;
export { resetSingletonClient };

/** Options for {@link verifyNextWebhook}. */
export interface KiotVietNextWebhookOptions {
  /** The webhook secret, or a function resolving it per request. */
  secret: string | ((request: Request) => string | Promise<string>);
}

/**
 * Verify and parse a KiotViet webhook inside a Next.js App Router route handler.
 * Uses the web-standard `Request`, so it also works in middleware and route handlers
 * of any Fetch-style runtime. Requires the Node.js runtime (not Edge) for HMAC.
 *
 * @example
 * ```typescript
 * // app/api/kiotviet/webhook/route.ts
 * import { verifyNextWebhook } from 'kiotvietsdk/adapters/next';
 *
 * export async function POST(request: Request) {
 *   try {
 *     const webhook = await verifyNextWebhook(request, process.env.KIOTVIET_WEBHOOK_SECRET!);
 *     console.log(webhook.event, webhook.body);
 *     return Response.json({ received: true });
 *   } catch (error: any) {
 *     return Response.json({ error: error.code ?? 'UNKNOWN' }, { status: 401 });
 *   }
 * }
 * ```
 */
export async function verifyNextWebhook(
  request: Request,
  secret: string | ((request: Request) => string | Promise<string>),
): Promise<ParsedKiotVietWebhook> {
  return verifyKiotVietWebRequest(request, secret);
}

/**
 * Mount a `kiotviet()` instance's handler (all SDK endpoints + webhooks) on
 * the Next.js App Router:
 *
 * ```typescript
 * // app/api/kiotviet/[...route]/route.ts
 * export const { GET, POST } = toNextJsHandler(kv);
 * ```
 */
export function toNextJsHandler(kv: import('../../kiotviet').KiotvietInstance): {
  GET: (request: Request) => Promise<Response>;
  POST: (request: Request) => Promise<Response>;
} {
  return {
    GET: request => kv.handler(request),
    POST: request => kv.handler(request),
  };
}
