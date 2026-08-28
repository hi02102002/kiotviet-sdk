import type { KiotVietClient } from '../client';
import type { TaxListResponse } from '../types';

export class TaxHandler {
  constructor(private client: KiotVietClient) {}

  /**
   * List the tax rates supported by KiotViet
   * Documentation: GET /tax/detail (2.27.1)
   */
  async list(): Promise<TaxListResponse> {
    const response = await this.client.apiClient.get<TaxListResponse>('/tax/detail');
    return response.data;
  }
}
