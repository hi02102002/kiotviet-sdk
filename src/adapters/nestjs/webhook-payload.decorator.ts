import type { ExecutionContext } from '@nestjs/common';
import type { ParsedKiotVietWebhook } from '../core/webhook';
import { createParamDecorator } from '@nestjs/common';

/**
 * Route parameter decorator returning the verified KiotViet webhook payload.
 * Requires {@link KiotVietWebhookGuard} to have run for the route.
 *
 * @example
 * ```typescript
 * @Post('webhooks/kiotviet')
 * @UseGuards(new KiotVietWebhookGuard({ secret: process.env.KIOTVIET_WEBHOOK_SECRET! }))
 * handleWebhook(@KiotVietWebhookPayload() webhook: ParsedKiotVietWebhook) {
 *   return { received: true };
 * }
 * ```
 */
export function KiotVietWebhookPayload(): ParameterDecorator {
  return createParamDecorator((_data: unknown, ctx: ExecutionContext): ParsedKiotVietWebhook => {
    const request = ctx.switchToHttp().getRequest<{ kiotvietWebhook?: ParsedKiotVietWebhook }>();
    if (!request.kiotvietWebhook) {
      throw new Error('KiotVietWebhookPayload requires the KiotVietWebhookGuard on the same route');
    }
    return request.kiotvietWebhook;
  })();
}
