import type { KiotVietClientConfig } from '../../src/types/common';

// Dummy placeholder values: unit tests never call the real KiotViet API
// (the client only fetches tokens lazily on the first resource request).
const testClientId = process.env.KIOTVIET_TEST_CLIENT_ID ?? 'test-client-id';
const testClientSecret = process.env.KIOTVIET_TEST_CLIENT_SECRET ?? 'test-client-secret';

export function testClientConfig(retailerName = 'test-retailer'): KiotVietClientConfig {
  return {
    clientId: testClientId,
    clientSecret: testClientSecret,
    retailerName,
  };
}
