import { describe, expect, it } from 'vitest';
import { KiotVietWebhookError } from '../../src/adapters/core/webhook';
import { getKiotVietClient as getNextClient, verifyNextWebhook } from '../../src/adapters/next';
import { getKiotVietClient as getTanStackClient, verifyTanStackWebhook } from '../../src/adapters/tanstack-start';
import { testClientConfig } from '../helpers/client';
import { SAMPLE_BODY, SECRET, sign } from '../helpers/webhook';

function webhookRequest(body: string, signature?: string): Request {
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (signature !== undefined) {
    headers['X-Hub-Signature'] = signature;
  }
  return new Request('http://localhost/api/webhook', { method: 'POST', headers, body });
}

describe('verifyNextWebhook', () => {
  it('verifies and parses a signed request', async () => {
    const webhook = await verifyNextWebhook(webhookRequest(SAMPLE_BODY, sign(SAMPLE_BODY)), SECRET);

    expect(webhook.raw).toBe(SAMPLE_BODY);
    expect(webhook.body.Notifications).toHaveLength(1);
  });

  it('rejects a tampered request', async () => {
    await expect(verifyNextWebhook(webhookRequest(SAMPLE_BODY, 'bad-signature'), SECRET)).rejects.toThrowError(
      KiotVietWebhookError,
    );
  });
});

describe('verifyTanStackWebhook', () => {
  it('verifies and parses a signed request', async () => {
    const webhook = await verifyTanStackWebhook(webhookRequest(SAMPLE_BODY, sign(SAMPLE_BODY)), SECRET);

    expect(webhook.raw).toBe(SAMPLE_BODY);
  });

  it('rejects an unsigned request', async () => {
    await expect(verifyTanStackWebhook(webhookRequest(SAMPLE_BODY), SECRET)).rejects.toThrowError(KiotVietWebhookError);
  });
});

describe('getKiotVietClient (next / tanstack-start)', () => {
  it('both adapters share the same process-wide singleton', () => {
    const config = testClientConfig('webstandard-retailer');
    expect(getNextClient(config)).toBe(getTanStackClient(config));
  });
});
