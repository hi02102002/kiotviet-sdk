export { KiotVietClientRegistry } from './registry';
export { getSingletonClient, resetSingletonClient } from './singleton';
export { toWebHandler } from './web-handler';

// Framework-agnostic building blocks shared by all backend adapters
export {
  KiotVietWebhookError,
  parseKiotVietWebhook,
  verifyKiotVietWebRequest,
  verifyWebhookSignature,
} from './webhook';
export type { KiotVietWebhookErrorCode, ParsedKiotVietWebhook } from './webhook';
