import { afterEach, describe, expect, it } from 'vitest';
import { getSingletonClient, resetSingletonClient } from '../../../src/adapters/core/singleton';
import { KiotVietClient } from '../../../src/client';
import { testClientConfig } from '../../helpers/client';

describe('getSingletonClient', () => {
  afterEach(() => {
    resetSingletonClient();
  });

  it('returns the same instance across calls', () => {
    const first = getSingletonClient(testClientConfig('singleton-retailer'));
    const second = getSingletonClient(testClientConfig('other-retailer-ignored'));

    expect(first).toBeInstanceOf(KiotVietClient);
    expect(second).toBe(first);
  });

  it('recreates the instance after reset', () => {
    const first = getSingletonClient(testClientConfig('singleton-retailer'));
    resetSingletonClient();
    const second = getSingletonClient(testClientConfig('singleton-retailer'));

    expect(second).toBeInstanceOf(KiotVietClient);
    expect(second).not.toBe(first);
  });
});
