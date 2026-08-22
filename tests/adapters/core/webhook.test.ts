import { describe, expect, it } from 'vitest';
import {
  KiotVietWebhookError,
  parseKiotVietWebhook,
  verifyKiotVietWebRequest,
  verifyWebhookSignature,
} from '../../../src/adapters/core/webhook';
import { SAMPLE_BODY, SECRET, sign } from '../../helpers/webhook';

describe('verifyWebhookSignature', () => {
  it('accepts a valid signature', () => {
    expect(verifyWebhookSignature(SAMPLE_BODY, sign(SAMPLE_BODY), SECRET)).toBe(true);
  });

  it('accepts a sha256= prefixed signature', () => {
    expect(verifyWebhookSignature(SAMPLE_BODY, `sha256=${sign(SAMPLE_BODY)}`, SECRET)).toBe(true);
  });

  it('accepts an uppercase hex signature', () => {
    expect(verifyWebhookSignature(SAMPLE_BODY, sign(SAMPLE_BODY).toUpperCase(), SECRET)).toBe(true);
  });

  it('rejects a signature computed over different content', () => {
    expect(verifyWebhookSignature('{"tampered":true}', sign(SAMPLE_BODY), SECRET)).toBe(false);
  });

  it('rejects a signature computed with a different secret', () => {
    expect(verifyWebhookSignature(SAMPLE_BODY, sign(SAMPLE_BODY, 'other-secret'), SECRET)).toBe(false);
  });

  it('rejects a signature of different length', () => {
    expect(verifyWebhookSignature(SAMPLE_BODY, 'deadbeef', SECRET)).toBe(false);
  });

  it('verifies Buffer bodies identically', () => {
    expect(verifyWebhookSignature(Buffer.from(SAMPLE_BODY), sign(SAMPLE_BODY), SECRET)).toBe(true);
  });
});

describe('parseKiotVietWebhook', () => {
  it('returns the parsed body, raw string and event', () => {
    const payload = JSON.stringify({ event: 'product.update', hello: 'world' });
    const result = parseKiotVietWebhook(payload, sign(payload), SECRET);

    expect(result.body).toEqual({ event: 'product.update', hello: 'world' });
    expect(result.raw).toBe(payload);
    expect(result.event).toBe('product.update');
  });

  it('falls back to body.type for the event name', () => {
    const payload = JSON.stringify({ type: 'order.update' });
    const result = parseKiotVietWebhook(payload, sign(payload), SECRET);

    expect(result.event).toBe('order.update');
  });

  it('throws MISSING_SIGNATURE when the header is absent', () => {
    expect(() => parseKiotVietWebhook(SAMPLE_BODY, undefined, SECRET)).toThrowError(KiotVietWebhookError);
    expect(() => parseKiotVietWebhook(SAMPLE_BODY, undefined, SECRET)).toThrowError(
      expect.objectContaining({ code: 'MISSING_SIGNATURE' }),
    );
  });

  it('throws INVALID_SIGNATURE for a tampered body', () => {
    const signature = sign(SAMPLE_BODY);
    expect(() => parseKiotVietWebhook('{"tampered":true}', signature, SECRET)).toThrowError(
      expect.objectContaining({ code: 'INVALID_SIGNATURE' }),
    );
  });

  it('throws INVALID_PAYLOAD when the signed body is not valid JSON', () => {
    const malformed = '{"not json';
    expect(() => parseKiotVietWebhook(malformed, sign(malformed), SECRET)).toThrowError(
      expect.objectContaining({ code: 'INVALID_PAYLOAD' }),
    );
  });
});

describe('verifyKiotVietWebRequest', () => {
  const url = 'http://localhost/webhooks/kiotviet';

  function buildRequest(body: string, signature?: string): Request {
    const headers: Record<string, string> = { 'content-type': 'application/json' };
    if (signature !== undefined) {
      headers['X-Hub-Signature'] = signature;
    }
    return new Request(url, { method: 'POST', headers, body });
  }

  it('verifies and parses a signed request', async () => {
    const result = await verifyKiotVietWebRequest(buildRequest(SAMPLE_BODY, sign(SAMPLE_BODY)), SECRET);

    expect(result.raw).toBe(SAMPLE_BODY);
    expect(result.body.Notifications).toHaveLength(1);
  });

  it('resolves the secret through the per-request function', async () => {
    const result = await verifyKiotVietWebRequest(buildRequest(SAMPLE_BODY, sign(SAMPLE_BODY)), () => SECRET);

    expect(result.raw).toBe(SAMPLE_BODY);
  });

  it('rejects an unsigned request', async () => {
    await expect(verifyKiotVietWebRequest(buildRequest(SAMPLE_BODY), SECRET)).rejects.toThrowError(
      KiotVietWebhookError,
    );
  });

  it('rejects a tampered request', async () => {
    await expect(
      verifyKiotVietWebRequest(buildRequest('{"tampered":true}', sign(SAMPLE_BODY)), SECRET),
    ).rejects.toThrowError(KiotVietWebhookError);
  });
});
