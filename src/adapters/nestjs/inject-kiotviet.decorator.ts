import { Inject } from '@nestjs/common';
import { KIOTVIET_CLIENT } from './tokens';

/**
 * Constructor parameter decorator injecting the {@link KiotVietClient}
 * provided by `KiotVietModule`. Equivalent to injecting the class directly.
 *
 * @example
 * ```typescript
 * constructor(@InjectKiotViet() private readonly kiotviet: KiotVietClient) {}
 * ```
 */
export function InjectKiotViet(): ParameterDecorator {
  return Inject(KIOTVIET_CLIENT);
}
