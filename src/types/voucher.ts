import type { KiotVietListResponse } from './common';

export interface VoucherProduct {
  productId: number;
  productCode: string;
  productName: string;
  quantity: number;
  isReward: boolean;
}

export interface VoucherCampaign {
  id: number;
  code: string;
  name: string;
  description?: string;
  startDate: string;
  endDate: string;
  status: number;
  statusValue: string;
  isActive: boolean;
  createdDate: string;
  createdBy: number;
  modifiedDate?: string;
  modifiedBy?: number;
  branchId: number;
  branchIds?: number[];
  customerGroupIds?: number[];
  discountType: number;
  discountValue: number;
  minOrderValue?: number;
  maxDiscountValue?: number;
  quantity: number;
  usedQuantity: number;
  remainingQuantity: number;
  isAutoGenerate: boolean;
  isUnlimited: boolean;
  voucherProducts?: VoucherProduct[];
}

export interface Voucher {
  id: number;
  code: string;
  campaignId: number;
  campaignCode: string;
  campaignName: string;
  startDate: string;
  endDate: string;
  status: number;
  statusValue: string;
  isUsed: boolean;
  usedDate?: string;
  customerId?: number;
  customerCode?: string;
  customerName?: string;
  orderId?: number;
  orderCode?: string;
  discountValue: number;
  createdDate: string;
  createdBy: number;
  modifiedDate?: string;
  modifiedBy?: number;
}

export interface VoucherCampaignListParams {
  status?: number[];
  keyword?: string;
  fromDate?: string;
  toDate?: string;
  pageSize?: number;
  currentItem?: number;
  orderBy?: string;
  orderDirection?: 'ASC' | 'DESC';
}

export interface VoucherListParams {
  campaignId?: number;
  status?: number[];
  keyword?: string;
  fromDate?: string;
  toDate?: string;
  pageSize?: number;
  currentItem?: number;
  orderBy?: string;
  orderDirection?: 'ASC' | 'DESC';
}

export interface VoucherCampaignCreateParams {
  code: string;
  name: string;
  description?: string;
  startDate: string;
  endDate: string;
  branchId: number;
  branchIds?: number[];
  customerGroupIds?: number[];
  discountType: number;
  discountValue: number;
  minOrderValue?: number;
  maxDiscountValue?: number;
  quantity: number;
  isAutoGenerate: boolean;
  isUnlimited: boolean;
  voucherProducts?: VoucherProduct[];
}

export interface VoucherCampaignUpdateParams extends Partial<VoucherCampaignCreateParams> {
  id: number;
}

export interface VoucherListResponse extends KiotVietListResponse<Voucher> {}

export interface VoucherCampaignListResponse extends KiotVietListResponse<VoucherCampaign> {}

export enum VoucherStatus {
  Active = 1,
  Inactive = 0,
  Used = 2,
  Expired = 3,
}

export enum VoucherDiscountType {
  FixedAmount = 1,
  Percentage = 2,
}

// Release (give) vouchers of an active campaign, POST /voucher/release/give
export interface VoucherReleaseParams {
  /** ID of the active voucher campaign */
  CampaignId: number;
  /** Voucher codes to release (only vouchers with status 0 - unused) */
  Vouchers: Array<{ Code: string }>;
  /** Release date */
  ReleaseDate?: string;
}

// Cancel vouchers of a campaign, DELETE /voucher/cancel
export interface VoucherCancelParams {
  /** ID of the active voucher campaign */
  CampaignId: number;
  /** Voucher codes to cancel (only vouchers with status 0 - unused) */
  Vouchers: Array<{ Code: string }>;
}
