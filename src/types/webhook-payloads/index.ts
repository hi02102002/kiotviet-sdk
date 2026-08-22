import type { CategoryBranchWebhookEventTypes } from './category-branch';
// Export các type helpers cho tất cả các event type
import type { CustomerWebhookEventTypes } from './customer';
import type { OrderInvoiceWebhookEventTypes } from './order';
import type { PriceBookWebhookEventTypes } from './pricebook';
import type { ProductWebhookEventTypes } from './product';

export * from './category-branch';
export * from './customer';
export * from './order';
export * from './pricebook';
export * from './product';

export type WebhookEventDataMapping = CustomerWebhookEventTypes
  & ProductWebhookEventTypes
  & OrderInvoiceWebhookEventTypes
  & CategoryBranchWebhookEventTypes
  & PriceBookWebhookEventTypes;
