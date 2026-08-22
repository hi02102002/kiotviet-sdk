import type { KiotVietClientConfig } from '../../types/common';
import { KiotVietClient } from '../../client';

/**
 * Marker interface attached to `globalThis` so the cached client survives
 * dev-server hot reloads (Next.js, TanStack Start, Vite SSR).
 */
interface KiotVietGlobalCache {
  __kiotvietClient?: KiotVietClient;
}

/**
 * Return a process-wide singleton {@link KiotVietClient}, creating it on first use.
 *
 * The instance is cached on `globalThis`, so it survives module reloads during
 * development and keeps the access-token cache warm between requests.
 *
 * @param config Client credentials; required only on the first call, ignored afterwards
 */
export function getSingletonClient(config: KiotVietClientConfig): KiotVietClient {
  const globalCache = globalThis as typeof globalThis & KiotVietGlobalCache;
  if (!globalCache.__kiotvietClient) {
    globalCache.__kiotvietClient = new KiotVietClient(config);
  }
  return globalCache.__kiotvietClient;
}

/**
 * Discard the singleton client (e.g. in tests or after credentials rotate).
 */
export function resetSingletonClient(): void {
  const globalCache = globalThis as typeof globalThis & KiotVietGlobalCache;
  delete globalCache.__kiotvietClient;
}
