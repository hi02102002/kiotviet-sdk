import type { KiotVietClient } from '../client';
import type { TrademarkListResponse } from '../types';

export class TrademarksHandler {
  constructor(private client: KiotVietClient) {}

  /**
   * Get list of trademarks
   * @returns TrademarkListResponse
   */
  async list(): Promise<TrademarkListResponse> {
    return this.client.get('/trademark');
  }
}
