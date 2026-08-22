import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Error codes reported by the framework adapters when a webhook cannot be accepted.
 */
export type KiotVietWebhookErrorCode
  = | 'MISSING_SIGNATURE'
    | 'INVALID_SIGNATURE'
    | 'INVALID_PAYLOAD'
    | 'RAW_BODY_REQUIRED';

/**
 * Thrown (or converted to an HTTP error) when an incoming KiotViet webhook
 * fails signature verification or cannot be parsed.
 */
export class KiotVietWebhookError extends Error {
  public readonly code: KiotVietWebhookErrorCode;

  constructor(message: string, code: KiotVietWebhookErrorCode) {
    super(message);
    this.name = 'KiotVietWebhookError';
    this.code = code;
  }
}

/**
 * Result of a successfully verified and parsed KiotViet webhook.
 */
export interface ParsedKiotVietWebhook {
  /** Parsed JSON body of the webhook request */
  body: any;
  /** The exact raw body string the signature was computed over */
  raw: string;
  /** Best-effort event name (e.g. "product.update") when the body exposes one */
  event?: string;
}

/**
 * Normalize a signature value: strip an optional "sha256=" prefix and lowercase the hex digits.
 */
function normalizeSignature(signature: string): string {
  const value = signature.trim();
  return (value.startsWith('sha256=') ? value.slice('sha256='.length) : value).toLowerCase();
}

/**
 * Constant-time comparison of two hex strings.
 */
function safeHexEqual(a: string, b: string): boolean {
  const bufferA = Buffer.from(a, 'utf8');
  const bufferB = Buffer.from(b, 'utf8');
  if (bufferA.length !== bufferB.length) {
    return false;
  }
  return timingSafeEqual(bufferA, bufferB);
}

/**
 * Verify a KiotViet webhook signature (X-Hub-Signature header, HMAC-SHA256 hex digest)
 * using a timing-safe comparison.
 *
 * @param raw The exact raw request body the signature was computed over
 * @param signature The signature header value (an optional "sha256=" prefix is tolerated)
 * @param secret The webhook secret configured when the webhook was registered
 */
export function verifyWebhookSignature(raw: string | Buffer, signature: string, secret: string): boolean {
  const expected = createHmac('sha256', secret).update(raw).digest('hex');
  return safeHexEqual(normalizeSignature(signature), expected);
}

/**
 * Extract the event name from a parsed webhook body. KiotViet payloads may expose
 * the event under different keys depending on the webhook type.
 */
function extractEvent(body: any): string | undefined {
  if (!body || typeof body !== 'object') {
    return undefined;
  }
  const candidate = body.event ?? body.Event ?? body.type ?? body.Type;
  return typeof candidate === 'string' ? candidate : undefined;
}

/**
 * Verify the signature of a raw webhook body and parse it as JSON.
 *
 * Throws a {@link KiotVietWebhookError} when the signature header is missing,
 * the signature does not match, or the body is not valid JSON.
 *
 * @param raw The exact raw request body
 * @param signature The X-Hub-Signature header value (may be null/undefined)
 * @param secret The webhook secret
 */
export function parseKiotVietWebhook(
  raw: string | Buffer,
  signature: string | null | undefined,
  secret: string,
): ParsedKiotVietWebhook {
  if (!signature) {
    throw new KiotVietWebhookError('Missing X-Hub-Signature header', 'MISSING_SIGNATURE');
  }
  if (!verifyWebhookSignature(raw, signature, secret)) {
    throw new KiotVietWebhookError('Webhook signature verification failed', 'INVALID_SIGNATURE');
  }

  const rawString = typeof raw === 'string' ? raw : raw.toString('utf8');
  let body: any;
  try {
    body = JSON.parse(rawString);
  }
  catch {
    throw new KiotVietWebhookError('Webhook body is not valid JSON', 'INVALID_PAYLOAD');
  }

  return { body, raw: rawString, event: extractEvent(body) };
}

/**
 * Verify and parse a KiotViet webhook from a web-standard `Request`
 * (Next.js App Router, TanStack Start API routes, and any Fetch-style runtime).
 *
 * @param request The incoming Request object
 * @param secret The webhook secret, or a function resolving it per request
 */
export async function verifyKiotVietWebRequest(
  request: Request,
  secret: string | ((request: Request) => string | Promise<string>),
): Promise<ParsedKiotVietWebhook> {
  const raw = await request.text();
  const resolvedSecret = typeof secret === 'function' ? await secret(request) : secret;
  return parseKiotVietWebhook(raw, request.headers.get('x-hub-signature'), resolvedSecret);
}
