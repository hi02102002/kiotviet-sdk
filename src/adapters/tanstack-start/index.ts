import type { ParsedKiotVietWebhook } from '../core/webhook';
import { getSingletonClient, resetSingletonClient } from '../core/singleton';
import { verifyKiotVietWebRequest } from '../core/webhook';

/**
 * Return the process-wide singleton KiotViet client, creating it on first use.
 * Cached on `globalThis`, so it survives TanStack Start dev hot-reload and keeps
 * the access-token cache warm between requests.
 */
export const getKiotVietClient = getSingletonClient;
export { resetSingletonClient };

/**
 * Verify and parse a KiotViet webhook inside a TanStack Start API route or server
 * function. Uses the web-standard `Request` available in TanStack's server handlers.
 *
 * @example
 * ```typescript
 * // src/routes/api/kiotviet/webhook.ts
 * import { createAPIFileRoute } from '@tanstack/react-start/api';
 * import { verifyTanStackWebhook } from 'kiotvietsdk/adapters/tanstack-start';
 *
 * export const APIRoute = createAPIFileRoute('/api/kiotviet/webhook')({
 *   POST: async (request: Request) => {
 *     try {
 *       const webhook = await verifyTanStackWebhook(request, process.env.KIOTVIET_WEBHOOK_SECRET!);
 *       console.log(webhook.event, webhook.body);
 *       return new Response(JSON.stringify({ received: true }), {
 *         headers: { 'content-type': 'application/json' },
 *       });
 *     } catch (error: any) {
 *       return new Response(JSON.stringify({ error: error.code ?? 'UNKNOWN' }), { status: 401 });
 *     }
 *   },
 * });
 * ```
 */
export async function verifyTanStackWebhook(
  request: Request,
  secret: string | ((request: Request) => string | Promise<string>),
): Promise<ParsedKiotVietWebhook> {
  return verifyKiotVietWebRequest(request, secret);
}

/**
 * Mount a `kiotviet()` instance's handler (all SDK endpoints + webhooks) in a
 * TanStack Start API route — the raw web-standard handler:
 *
 * ```typescript
 * export const APIRoute = createAPIFileRoute('/api/kiotviet/$')({
 *   POST: (request: Request) => toWebHandler(kv)(request),
 * });
 * ```
 */
export { toWebHandler } from '../core/web-handler';
