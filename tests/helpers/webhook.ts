import { createHmac } from 'node:crypto';

export const SECRET = 'test-webhook-secret';

/** Produce a valid X-Hub-Signature header value for the given raw body. */
export function sign(body: string, secret: string = SECRET): string {
  return createHmac('sha256', secret).update(body).digest('hex');
}

/** A sample KiotViet-style webhook body (product.update notification). */
export const SAMPLE_BODY = JSON.stringify({
  Id: '6f9d3a00-0000-4c1b-9b7a-08dbbbd80000',
  Attempt: 1,
  Notifications: [
    {
      Action: 'update',
      Data: [{ Id: 123456, Code: 'SP001', Name: 'Sản phẩm 1', CategoryId: 10 }],
    },
  ],
});
