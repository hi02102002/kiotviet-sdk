import type { KiotVietClientConfig } from '../../types/common';
import { KiotVietClient } from '../../client';

/**
 * Cache of {@link KiotVietClient} instances keyed by retailer name.
 *
 * Useful for multi-tenant backends that talk to several KiotViet retailers:
 * each retailer keeps a single client (and therefore a single cached access token)
 * across requests.
 *
 * @example
 * ```typescript
 * const registry = new KiotVietClientRegistry();
 * const client = registry.getOrCreate({
 *   clientId: process.env.KIOTVIET_CLIENT_ID!,
 *   clientSecret: process.env.KIOTVIET_CLIENT_SECRET!,
 *   retailerName: tenant.retailerName,
 * });
 * ```
 */
export class KiotVietClientRegistry {
  private readonly clients = new Map<string, KiotVietClient>();

  /**
   * Get the cached client for a retailer, or create and cache a new one.
   * If a client already exists for the retailer, it is returned and `config` is ignored.
   */
  getOrCreate(config: KiotVietClientConfig): KiotVietClient {
    const existing = this.clients.get(config.retailerName);
    if (existing) {
      return existing;
    }
    const client = new KiotVietClient(config);
    this.clients.set(config.retailerName, client);
    return client;
  }

  /** Get the cached client for a retailer, if any. */
  get(retailerName: string): KiotVietClient | undefined {
    return this.clients.get(retailerName);
  }

  /** Whether a cached client exists for a retailer. */
  has(retailerName: string): boolean {
    return this.clients.has(retailerName);
  }

  /** Drop the cached client for a retailer (e.g. after credentials rotate). */
  delete(retailerName: string): boolean {
    return this.clients.delete(retailerName);
  }

  /** Drop all cached clients. */
  clear(): void {
    this.clients.clear();
  }
}
