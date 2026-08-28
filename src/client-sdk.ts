import type { KiotvietInstance } from './kiotviet';
import type { KiotvietResourceName } from './resource-names';
import { KiotVietApiError } from './errors';
import { RESOURCES } from './resource-names';

export type { KiotvietInstance } from './kiotviet';

/** Options for {@link createKiotvietClient}. */
export interface CreateKiotvietClientOptions {
  /** Base URL where the `kiotviet()` handler is mounted, e.g. "/api/kiotviet" */
  baseURL: string;
  /** Custom fetch implementation (defaults to global fetch) */
  fetch?: typeof globalThis.fetch;
}

/**
 * The typed shape of a resource on the browser client: every method of the
 * server-side handler, with the same parameters and a Promise return.
 */
type BrowserResource<TResource> = {
  [M in keyof TResource]: TResource[M] extends (...args: infer TArgs) => infer TReturn
    ? (...args: TArgs) => Promise<Awaited<TReturn>>
    : never;
};

/**
 * The typed browser client: every resource of the server instance, fully typed.
 */
export type KiotvietBrowserClient<TInstance extends KiotvietInstance = KiotvietInstance> = {
  [R in keyof TInstance & KiotvietResourceName]: BrowserResource<TInstance[R]>;
};

/**
 * Create a type-safe browser client for a mounted `kiotviet()` handler —
 * the counterpart of better-auth's `createAuthClient`.
 *
 * Point it at your backend (which must protect the mount with its own auth)
 * and call any SDK method; types come straight from the SDK (or from your
 * server instance when passed explicitly).
 *
 * @example
 * ```typescript
 * import { createKiotvietClient } from "kiotvietsdk/client";
 * import type { kv } from "@/lib/kiotviet";
 *
 * export const api = createKiotvietClient<typeof kv>({
 *   baseURL: "/api/kiotviet",
 * });
 *
 * // fully typed, runs in the browser against your backend
 * const products = await api.products.list({ pageSize: 10 });
 * ```
 */
export function createKiotvietClient<TInstance extends KiotvietInstance = KiotvietInstance>(
  options: CreateKiotvietClientOptions,
): KiotvietBrowserClient<TInstance> {
  const base = options.baseURL.replace(/\/+$/, '');
  const doFetch = options.fetch ?? globalThis.fetch.bind(globalThis);
  const resourceProxies = new Map<string, unknown>();

  return new Proxy({} as KiotvietBrowserClient<TInstance>, {
    get(_target, resource: string) {
      if (typeof resource !== 'string' || !RESOURCES.includes(resource as KiotvietResourceName)) {
        return undefined;
      }
      const cached = resourceProxies.get(resource);
      if (cached) {
        return cached;
      }

      const resourceProxy = new Proxy(
        {},
        {
          get(_resTarget, method: string) {
            if (typeof method !== 'string') {
              return undefined;
            }
            return async (...args: unknown[]) => {
              const response = await doFetch(`${base}/${resource}.${method}`, {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ args }),
              });

              const payload = (await response.json().catch(() => null)) as
                | { error?: string; message?: string }
                | null;

              if (!response.ok) {
                throw new KiotVietApiError(
                  payload?.message ?? `Request to ${resource}.${method} failed`,
                  response.status,
                  payload?.error
                    ? { errorCode: payload.error, message: payload.message ?? '' }
                    : undefined,
                  payload,
                );
              }
              return payload;
            };
          },
        },
      );
      resourceProxies.set(resource, resourceProxy);
      return resourceProxy;
    },
  });
}
