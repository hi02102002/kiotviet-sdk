import type { KiotvietInstance } from '../../kiotviet';

/**
 * Raw web-standard handler — for runtimes that pass `Request` natively
 * (TanStack Start API routes, Cloudflare Workers, Bun, ...).
 *
 * ```typescript
 * export const APIRoute = createAPIFileRoute('/api/kiotviet/$route')({
 *   POST: (request: Request) => toWebHandler(kv)(request),
 * });
 * ```
 */
export function toWebHandler(kv: KiotvietInstance): (request: Request) => Promise<Response> {
  return request => kv.handler(request);
}
