// Export framework-agnostic adapter utilities.
// Framework-specific adapters live in subpath exports, e.g.
// 'kiotvietsdk/adapters/express'.
export {
  getSingletonClient,
  KiotVietClientRegistry,
  KiotVietWebhookError,
  parseKiotVietWebhook,
  resetSingletonClient,
  verifyKiotVietWebRequest,
  verifyWebhookSignature,
} from './adapters/core';

export type { KiotVietWebhookErrorCode, ParsedKiotVietWebhook } from './adapters/core';
// Export framework mount helpers for the kiotviet() handler.
// Each helper lives in its framework adapter: 'kiotvietsdk/adapters/<name>'.
export { toWebHandler } from './adapters/core';

export type { NodeBridgeRequest, NodeBridgeResponse } from './adapters/core/node-bridge';
export { toExpressHandler } from './adapters/express';

export { toHonoHandler } from './adapters/hono';

export { toNestHandler } from './adapters/nestjs';
export { toNextJsHandler } from './adapters/next';
// Export the main client
export { KiotVietClient } from './client';
// Export the type-safe browser client (also available from 'kiotvietsdk/client')
export { createKiotvietClient } from './client-sdk';
export type { CreateKiotvietClientOptions, KiotvietBrowserClient } from './client-sdk';
// Export error classes
export {
  AuthenticationError,
  ForbiddenError,
  KiotVietApiError,
  NotFoundError,
  RateLimitError,
  ValidationError,
} from './errors';
// Export the better-auth-style factory
export { kiotviet } from './kiotviet';
export type { KiotvietInstance, KiotvietOptions, KiotvietWebhookConfig } from './kiotviet';
export { BankAccountHandler } from './resources/bank-accounts';
export { BranchHandler } from './resources/branches';
export { CashFlowHandler } from './resources/cash-flow';
export { CategoryHandler } from './resources/categories';
export { CouponHandler } from './resources/coupons';
// Export resource handlers
export { CustomerHandler } from './resources/customers';
export { InvoiceHandler } from './resources/invoices';
export { LocationHandler } from './resources/locations';
export { OrderSuppliersHandler } from './resources/order-suppliers';
export { OrderHandler } from './resources/orders';
export { PriceBookHandler } from './resources/price-books';
export { ProductHandler } from './resources/products';
export { PurchaseOrderHandler } from './resources/purchase-orders';
export { ReturnsHandler } from './resources/returns';
export { SalesChannelsHandler } from './resources/sales-channels';
export { SettingsHandler } from './resources/settings';
export { SupplierHandler } from './resources/suppliers';
export { SurchargeHandler } from './resources/surcharges';
export { TrademarksHandler } from './resources/trademarks';
export { TransferHandler } from './resources/transfers';

export { UserHandler } from './resources/users';

export { VouchersHandler } from './resources/vouchers';

export { WebhookHandler } from './resources/webhooks';

// Export types
export {
  Category,
  CategoryCreateParams,
  CategoryListParams,
  CategoryListResponse,
  CategoryUpdateParams,
  Customer,
  CustomerCreateParams,
  CustomerGroup,
  CustomerGroupListResponse,
  CustomerListAddParams,
  CustomerListUpdateParams,
  CustomerUpdateParams,
  KiotVietClientConfig,
  KiotVietErrorResponse,
  KiotVietErrorStatus,
  KiotVietListResponse,
  KiotVietMessageResponse,
  KiotVietTokenResponse,
  Location,
  LocationListResponse,
  Order,
  OrderCreateParams,
  OrderListParams,
  OrderListResponse,
  OrderProduct,
  OrderStatus,
  OrderUpdateParams,
  Product,
  ProductCreateParams,
  ProductUpdateParams,
  SetUsedCouponParams,
  SetUsedCouponResponse,
  VoucherCancelParams,
  VoucherReleaseParams,
} from './types';
// Export webhook types (referenced by the backend adapters)
export { TypedWebhookPayload, Webhook, WebhookCreateParams, WebhookEvent, WebhookPayload } from './types';
