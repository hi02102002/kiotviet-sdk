import axios from 'axios';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthenticationError, kiotviet, KiotVietClient, TokenManager } from '../src';
import { testClientConfig } from './helpers/client';

describe('tokenManager & Client Token Retrieval', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('tokenManager', () => {
    it('fetches a valid access token when none is cached', async () => {
      const config = testClientConfig();
      const manager = new TokenManager(config);

      const spy = vi.spyOn(axios, 'post').mockResolvedValueOnce({
        data: {
          access_token: 'mock-token-123',
          expires_in: 3600,
          token_type: 'Bearer',
        },
      });

      const token = await manager.getValidToken();

      expect(token).toBe('mock-token-123');
      expect(manager.accessToken).toBe('mock-token-123');
      expect(manager.isTokenExpired()).toBe(false);
      expect(spy).toHaveBeenCalledTimes(1);

      const [url, body, options] = spy.mock.calls[0];
      expect(url).toBe('https://id.kiotviet.vn/connect/token');
      expect(body.toString()).toContain('grant_type=client_credentials');
      expect(body.toString()).toContain('client_id=test-client-id');
      expect(body.toString()).toContain('client_secret=test-client-secret');
      expect(body.toString()).toContain('scopes=PublicApi.Access');
      expect(options).toEqual({
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });
    });

    it('supports custom scope, such as F&B (PublicApi.Access.FNB)', async () => {
      const config = {
        ...testClientConfig(),
        scope: 'PublicApi.Access.FNB',
      };
      const manager = new TokenManager(config);

      const spy = vi.spyOn(axios, 'post').mockResolvedValueOnce({
        data: {
          access_token: 'fnb-token',
          expires_in: 3600,
          token_type: 'Bearer',
        },
      });

      const token = await manager.getValidToken();
      expect(token).toBe('fnb-token');
      const [, body] = spy.mock.calls[0];
      expect(body.toString()).toContain('scopes=PublicApi.Access.FNB');
    });

    it('returns the cached token without re-fetching if still valid', async () => {
      const config = testClientConfig();
      const manager = new TokenManager(config);

      const spy = vi.spyOn(axios, 'post').mockResolvedValue({
        data: {
          access_token: 'cached-token',
          expires_in: 3600,
          token_type: 'Bearer',
        },
      });

      const token1 = await manager.getValidToken();
      const token2 = await manager.getValidToken();

      expect(token1).toBe('cached-token');
      expect(token2).toBe('cached-token');
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('refetches when token is expired', async () => {
      const config = testClientConfig();
      const manager = new TokenManager(config);

      const spy = vi.spyOn(axios, 'post')
        .mockResolvedValueOnce({
          data: {
            access_token: 'token-expiring',
            expires_in: 70, // Buffer is 60s, so valid for 10s
            token_type: 'Bearer',
          },
        })
        .mockResolvedValueOnce({
          data: {
            access_token: 'token-fresh',
            expires_in: 3600,
            token_type: 'Bearer',
          },
        });

      const token1 = await manager.getValidToken();
      expect(token1).toBe('token-expiring');

      // Fast-forward time past expiration
      const originalNow = Date.now;
      try {
        Date.now = () => originalNow() + 15000;
        expect(manager.isTokenExpired()).toBe(true);

        const token2 = await manager.getValidToken();
        expect(token2).toBe('token-fresh');
        expect(spy).toHaveBeenCalledTimes(2);
      }
      finally {
        Date.now = originalNow;
      }
    });

    it('deduplicates concurrent calls to getValidToken (single-flight)', async () => {
      const config = testClientConfig();
      const manager = new TokenManager(config);

      const spy = vi.spyOn(axios, 'post').mockImplementation(
        async () =>
          new Promise((resolve) => {
            setTimeout(() => {
              resolve({
                data: {
                  access_token: 'single-flight-token',
                  expires_in: 3600,
                  token_type: 'Bearer',
                },
              });
            }, 10);
          }),
      );

      const [token1, token2, token3] = await Promise.all([
        manager.getValidToken(),
        manager.getValidToken(),
        manager.getValidToken(),
      ]);

      expect(token1).toBe('single-flight-token');
      expect(token2).toBe('single-flight-token');
      expect(token3).toBe('single-flight-token');
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('refreshToken forces a new token fetch', async () => {
      const config = testClientConfig();
      const manager = new TokenManager(config);

      const spy = vi.spyOn(axios, 'post')
        .mockResolvedValueOnce({
          data: { access_token: 'token-1', expires_in: 3600, token_type: 'Bearer' },
        })
        .mockResolvedValueOnce({
          data: { access_token: 'token-2', expires_in: 3600, token_type: 'Bearer' },
        });

      const t1 = await manager.getValidToken();
      expect(t1).toBe('token-1');

      const t2 = await manager.refreshToken();
      expect(t2).toBe('token-2');
      expect(spy).toHaveBeenCalledTimes(2);
    });

    it('throws AuthenticationError when token fetch fails', async () => {
      const config = testClientConfig();
      const manager = new TokenManager(config);

      vi.spyOn(axios, 'post').mockRejectedValueOnce({
        response: {
          data: {
            error: 'invalid_client',
            error_description: 'Client secret is invalid',
          },
        },
      });

      await expect(manager.getValidToken()).rejects.toThrowError(AuthenticationError);
    });
  });

  describe('kiotVietClient token methods', () => {
    it('client.getValidToken() and client.getAccessToken() return valid token', async () => {
      const client = new KiotVietClient(testClientConfig());
      expect(client.tokenManager).toBeDefined();

      const spy = vi.spyOn(axios, 'post').mockResolvedValueOnce({
        data: {
          access_token: 'client-token-abc',
          expires_in: 3600,
          token_type: 'Bearer',
        },
      });

      const token = await client.getValidToken();
      expect(token).toBe('client-token-abc');

      // getAccessToken alias uses cached token
      const aliasToken = await client.getAccessToken();
      expect(aliasToken).toBe('client-token-abc');
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('client.refreshToken() forces refresh', async () => {
      const client = new KiotVietClient(testClientConfig());

      const spy = vi.spyOn(axios, 'post')
        .mockResolvedValueOnce({
          data: { access_token: 'token-a', expires_in: 3600, token_type: 'Bearer' },
        })
        .mockResolvedValueOnce({
          data: { access_token: 'token-b', expires_in: 3600, token_type: 'Bearer' },
        });

      await client.getValidToken();
      const refreshed = await client.refreshToken();
      expect(refreshed).toBe('token-b');
      expect(spy).toHaveBeenCalledTimes(2);
    });
  });

  describe('kiotviet() factory token methods', () => {
    it('kv.getValidToken() and kv.getAccessToken() work on factory instance', async () => {
      const kv = kiotviet(testClientConfig());

      vi.spyOn(axios, 'post').mockResolvedValueOnce({
        data: {
          access_token: 'factory-token-xyz',
          expires_in: 3600,
          token_type: 'Bearer',
        },
      });

      const token = await kv.getValidToken();
      expect(token).toBe('factory-token-xyz');

      const aliasToken = await kv.getAccessToken();
      expect(aliasToken).toBe('factory-token-xyz');
    });
  });
});
