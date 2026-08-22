import { describe, expect, it, vi } from 'vitest';
import { KiotVietClient } from '../../src/client';
import { testClientConfig } from '../helpers/client';

describe('new endpoints (KiotViet Public API coverage)', () => {
  it('customers.listAdd posts to /listaddcutomers', async () => {
    const client = new KiotVietClient(testClientConfig());
    const post = vi.fn().mockResolvedValue({ data: { message: 'ok' } });
    client.apiClient.post = post;

    const params = { listCustomers: [{ name: 'John' }, { name: 'Jane' }] };
    const result = await client.customers.listAdd(params);

    expect(post).toHaveBeenCalledWith('/listaddcutomers', params);
    expect(result).toEqual({ message: 'ok' });
  });

  it('customers.listUpdate puts to /listupdatecustomers', async () => {
    const client = new KiotVietClient(testClientConfig());
    const put = vi.fn().mockResolvedValue({ data: { message: 'ok' } });
    client.apiClient.put = put;

    const params = { listCustomers: [{ id: 1, name: 'John' }] };
    await client.customers.listUpdate(params);

    expect(put).toHaveBeenCalledWith('/listupdatecustomers', params);
  });

  it('customers.listGroups gets /customers/group', async () => {
    const client = new KiotVietClient(testClientConfig());
    const groups = { total: 1, data: [{ id: 5, name: 'VIP' }] };
    const get = vi.fn().mockResolvedValue({ data: groups });
    client.apiClient.get = get;

    const result = await client.customers.listGroups();

    expect(get).toHaveBeenCalledWith('/customers/group');
    expect(result.data[0].name).toBe('VIP');
  });

  it('surcharges.setActive posts to /surchages/{id}/activesurchage', async () => {
    const client = new KiotVietClient(testClientConfig());
    const post = vi.fn().mockResolvedValue({ data: { message: 'Cập nhật dữ liệu thành công' } });
    client.apiClient.post = post;

    const result = await client.surcharges.setActive(42, false);

    expect(post).toHaveBeenCalledWith('/surchages/42/activesurchage', { isActive: false });
    expect(result.message).toBe('Cập nhật dữ liệu thành công');
  });

  it('vouchers.release posts to /voucher/release/give', async () => {
    const client = new KiotVietClient(testClientConfig());
    const post = vi.fn().mockResolvedValue({ data: { message: 'Cập nhật voucher thành công' } });
    client.apiClient.post = post;

    const params = { CampaignId: 7, Vouchers: [{ Code: 'VC001' }] };
    const result = await client.vouchers.release(params);

    expect(post).toHaveBeenCalledWith('/voucher/release/give', params);
    expect(result.message).toBe('Cập nhật voucher thành công');
  });

  it('vouchers.cancel deletes /voucher/cancel with a body', async () => {
    const client = new KiotVietClient(testClientConfig());
    const del = vi.fn().mockResolvedValue({ data: { message: 'Cập nhật voucher thành công' } });
    client.apiClient.delete = del;

    const params = { CampaignId: 7, Vouchers: [{ Code: 'VC001' }] };
    await client.vouchers.cancel(params);

    expect(del).toHaveBeenCalledWith('/voucher/cancel', { data: params });
  });

  it('locations.list gets /locations', async () => {
    const client = new KiotVietClient(testClientConfig());
    const locations = { total: 1, pageSize: 20, data: [{ id: 1, name: 'Hà Nội', normalName: 'Ha Noi' }] };
    const get = vi.fn().mockResolvedValue({ data: locations });
    client.apiClient.get = get;

    const result = await client.locations.list();

    expect(get).toHaveBeenCalledWith('/locations');
    expect(result.data).toHaveLength(1);
  });

  it('coupons.setUsed posts to /coupons/setused', async () => {
    const client = new KiotVietClient(testClientConfig());
    const post = vi.fn().mockResolvedValue({ data: { message: 'done', dataError: [] } });
    client.apiClient.post = post;

    const params = { coupons: [{ code: 'SALE10' }] };
    const result = await client.coupons.setUsed(params);

    expect(post).toHaveBeenCalledWith('/coupons/setused', params);
    expect(result.message).toBe('done');
  });
});
