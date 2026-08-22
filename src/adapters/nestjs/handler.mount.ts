import type { KiotvietInstance } from '../../kiotviet';
import type { NodeBridgeRequest, NodeBridgeResponse } from '../core/node-bridge';
import { nodeToWebRequest, webResponseToNode } from '../core/node-bridge';

/**
 * Mount a `kiotviet()` instance's handler (all SDK endpoints + webhooks) in a
 * NestJS controller (Express platform):
 *
 * ```typescript
 * @Controller()
 * export class KiotvietController {
 *   @All("api/kiotviet/:route")
 *   handle(@Req() req: Request, @Res() res: Response) {
 *     return toNestHandler(kv)(req, res);
 *   }
 * }
 * ```
 */
export function toNestHandler(kv: KiotvietInstance): (req: NodeBridgeRequest, res: NodeBridgeResponse) => Promise<void> {
  return async (req, res) => {
    const response = await kv.handler(nodeToWebRequest(req));
    await webResponseToNode(response, res);
  };
}
