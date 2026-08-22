import type {
  CanActivate,
  ExecutionContext,
} from '@nestjs/common';
import type { ParsedKiotVietWebhook } from '../core/webhook';
import {
  Inject,
  Injectable,
  InternalServerErrorException,
  Optional,
  UnauthorizedException,
} from '@nestjs/common';
import { KiotVietWebhookError, parseKiotVietWebhook } from '../core/webhook';
import { KIOTVIET_WEBHOOK_OPTIONS } from './tokens';

/** Minimal structural type of the NestJS underlying request (platform-agnostic). */
interface WebhookCarrierRequest {
  headers: Record<string, unknown>;
  rawBody?: Buffer;
  kiotvietWebhook?: ParsedKiotVietWebhook;
}

/** Options for {@link KiotVietWebhookGuard}. */
export interface KiotVietWebhookGuardConfig {
  /** The webhook secret, or a function resolving it per request (multi tenant). */
  secret: string | ((req: WebhookCarrierRequest) => string | Promise<string>);
}

const RAW_BODY_GUIDANCE
  = 'Raw request body not available. Create the app with NestFactory.create(AppModule, { rawBody: true }) '
    + 'so the webhook signature can be verified.';

/**
 * Route guard verifying the `X-Hub-Signature` header of an incoming KiotViet
 * webhook before the controller runs. On success the parsed payload is attached
 * to the request; read it in the controller with {@link KiotVietWebhookPayload}.
 *
 * Use it either as an instance (config inline):
 *
 * ```typescript
 * @Post('webhooks/kiotviet')
 * @UseGuards(new KiotVietWebhookGuard({ secret: process.env.KIOTVIET_WEBHOOK_SECRET! }))
 * handle(@KiotVietWebhookPayload() webhook: ParsedKiotVietWebhook) { ... }
 * ```
 *
 * or as a class, providing `{ provide: KIOTVIET_WEBHOOK_OPTIONS, useValue: { secret } }`.
 *
 * Rejects the request with 401 on a missing/invalid signature and 500 when the
 * raw body was not captured (`rawBody: true` missing on bootstrap).
 */
@Injectable()
export class KiotVietWebhookGuard implements CanActivate {
  constructor(
    @Optional()
    @Inject(KIOTVIET_WEBHOOK_OPTIONS)
    private readonly config?: KiotVietWebhookGuardConfig,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const guardConfig = this.config;
    if (!guardConfig || (typeof guardConfig.secret !== 'string' && typeof guardConfig.secret !== 'function')) {
      throw new InternalServerErrorException(
        'KiotVietWebhookGuard needs a secret. Pass it via `new KiotVietWebhookGuard({ secret })` '
        + 'or provide KIOTVIET_WEBHOOK_OPTIONS.',
      );
    }

    const request = context.switchToHttp().getRequest<WebhookCarrierRequest>();
    const raw = request.rawBody;
    if (!raw) {
      throw new InternalServerErrorException(RAW_BODY_GUIDANCE);
    }

    const secret = typeof guardConfig.secret === 'function' ? await guardConfig.secret(request) : guardConfig.secret;
    const signature = request.headers['x-hub-signature'];

    try {
      request.kiotvietWebhook = parseKiotVietWebhook(
        raw,
        Array.isArray(signature) ? signature[0] : (signature as string | undefined),
        secret,
      );
      return true;
    }
    catch (error) {
      if (error instanceof KiotVietWebhookError) {
        throw new UnauthorizedException(error.message);
      }
      throw error;
    }
  }
}
