/**
 * Canonical list of resource handler names exposed by `KiotVietClient` and
 * served through the `kiotviet()` handler's `/{resource}.{method}` routes.
 * Kept dependency-free so the browser client subpath can import it without
 * pulling axios.
 */
export const RESOURCES = [
  'products',
  'categories',
  'customers',
  'orders',
  'invoices',
  'webhooks',
  'users',
  'purchaseOrders',
  'branches',
  'bankAccounts',
  'priceBooks',
  'suppliers',
  'transfers',
  'surcharges',
  'cashFlow',
  'returns',
  'vouchers',
  'salesChannels',
  'trademarks',
  'settings',
  'orderSuppliers',
  'locations',
  'coupons',
] as const;

export type KiotvietResourceName = (typeof RESOURCES)[number];
