import type { KiotVietClient } from '../client';
import type { SetUsedCouponParams, SetUsedCouponResponse } from '../types/coupon';

export class CouponHandler {
  constructor(private client: KiotVietClient) {}

  /**
   * Mark coupons as used
   * Documentation: POST /coupons/setused (2.23)
   */
  async setUsed(params: SetUsedCouponParams): Promise<SetUsedCouponResponse> {
    const response = await this.client.apiClient.post<SetUsedCouponResponse>('/coupons/setused', params);
    return response.data;
  }
}
