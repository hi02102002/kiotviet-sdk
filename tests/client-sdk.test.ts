import type { KiotvietBrowserClient, KiotvietInstance } from '../src/client-sdk';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { kiotviet } from '../src';
import { createKiotvietClient } from '../src/client-sdk';
import { KiotVietApiError } from '../src/errors';
import { testClientConfig } from './helpers/client';

function jsonResponse(status: number, payload: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => payload,
  } as unknown as Response;
}

describe('createKiotvietClient (browser client)', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('pOSTs {args} to {baseURL}/{resource}.{method}', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { total: 1, data: [] }));
    const api = createKiotvietClient({ baseURL: '/api/kiotviet/', fetch: fetchMock as unknown as typeof fetch });

    const result = await api.products.list({ pageSize: 10 });

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/kiotviet/products.list',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ args: [{ pageSize: 10 }] }),
      }),
    );
    expect(result).toEqual({ total: 1, data: [] });
  });

  it('spreads multiple args', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { id: 123 }));
    const api = createKiotvietClient({ baseURL: '/api', fetch: fetchMock as unknown as typeof fetch });

    await api.products.getById(123);

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/products.getById',
      expect.objectContaining({ body: JSON.stringify({ args: [123] }) }),
    );
  });

  it('throws KiotVietApiError with the server status and code', async () => {
    fetchMock.mockResolvedValue(jsonResponse(404, { error: 'NotFound', message: 'missing' }));
    const api = createKiotvietClient({ baseURL: '/api', fetch: fetchMock as unknown as typeof fetch });

    await expect(api.products.getById(999)).rejects.toThrowError(KiotVietApiError);
    await expect(api.products.getById(999)).rejects.toMatchObject({
      statusCode: 404,
      errorCode: 'NotFound',
    });
  });

  it('is fully typed from the SDK by default', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { message: 'ok' }));
    const api: KiotvietBrowserClient = createKiotvietClient({
      baseURL: '/api',
      fetch: fetchMock as unknown as typeof fetch,
    });

    await api.coupons.setUsed({ coupons: [{ code: 'SALE10' }] });

    expect(fetchMock).toHaveBeenCalledWith('/api/coupons.setUsed', expect.anything());
  });

  it('exposes the tax resource', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { data: [], message: 'success', isSuccess: true }));
    const api = createKiotvietClient({ baseURL: '/api', fetch: fetchMock as unknown as typeof fetch });

    await api.tax.list();

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/tax.list',
      expect.objectContaining({ body: JSON.stringify({ args: [] }) }),
    );
  });

  it('infers types when passed the server instance type', async () => {
    const kv = kiotviet(testClientConfig());
    expect(typeof kv.handler).toBe('function');

    const api: KiotvietBrowserClient<typeof kv> = createKiotvietClient({
      baseURL: '/api',
      fetch: fetchMock as unknown as typeof fetch,
    });
    fetchMock.mockResolvedValue(jsonResponse(200, []));

    await api.customers.listGroups();

    expect(fetchMock).toHaveBeenCalledWith('/api/customers.listGroups', expect.anything());
    // `handler` is not a resource and must not exist on the browser client
    expect((api as unknown as KiotvietInstance).handler).toBeUndefined();
  });
});
