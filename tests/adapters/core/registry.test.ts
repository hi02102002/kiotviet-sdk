import { describe, expect, it } from 'vitest';
import { KiotVietClientRegistry } from '../../../src/adapters/core/registry';
import { KiotVietClient } from '../../../src/client';
import { testClientConfig } from '../../helpers/client';

describe('kiotVietClientRegistry', () => {
  it('creates a client on first use and caches it per retailer', () => {
    const registry = new KiotVietClientRegistry();

    const first = registry.getOrCreate(testClientConfig('retailer-a'));
    const second = registry.getOrCreate(testClientConfig('retailer-a'));

    expect(first).toBeInstanceOf(KiotVietClient);
    expect(second).toBe(first);
  });

  it('keeps separate clients per retailer', () => {
    const registry = new KiotVietClientRegistry();

    const retailerA = registry.getOrCreate(testClientConfig('retailer-a'));
    const retailerB = registry.getOrCreate(testClientConfig('retailer-b'));

    expect(retailerA).not.toBe(retailerB);
  });

  it('supports has/get/delete/clear', () => {
    const registry = new KiotVietClientRegistry();

    expect(registry.has('retailer-a')).toBe(false);
    const client = registry.getOrCreate(testClientConfig('retailer-a'));

    expect(registry.has('retailer-a')).toBe(true);
    expect(registry.get('retailer-a')).toBe(client);

    expect(registry.delete('retailer-a')).toBe(true);
    expect(registry.has('retailer-a')).toBe(false);

    registry.getOrCreate(testClientConfig('retailer-a'));
    registry.clear();
    expect(registry.has('retailer-a')).toBe(false);
  });
});
