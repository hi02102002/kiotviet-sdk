// Mark coupons as used, POST /coupons/setused
export interface SetUsedCouponParams {
  coupons: Array<{
    /** Coupon code (required) */
    code: string;
  }>;
}

export interface SetUsedCouponResponse {
  message: string;
  dataError?: Array<{
    code: string;
  }>;
}
