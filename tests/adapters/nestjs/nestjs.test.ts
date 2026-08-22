import type {
  ExecutionContext,
} from '@nestjs/common';
import type { AddressInfo } from 'node:net';
import type { ParsedKiotVietWebhook } from '../../../src/adapters/core/webhook';
import {
  Controller,
  HttpCode,
  HttpStatus,
  Injectable,
  InternalServerErrorException,
  Module,
  Post,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  InjectKiotViet,
  KIOTVIET_CLIENT,
  KiotVietModule,
  KiotVietWebhookGuard,
  KiotVietWebhookPayload,
} from '../../../src/adapters/nestjs';
import { KiotVietClient } from '../../../src/client';
import { testClientConfig } from '../../helpers/client';
import { SAMPLE_BODY, SECRET, sign } from '../../helpers/webhook';
import 'reflect-metadata';

function fakeContext(request: Record<string, unknown>): ExecutionContext {
  return { switchToHttp: () => ({ getRequest: () => request }) } as unknown as ExecutionContext;
}

@Injectable()
class KiotVietConsumerService {
  constructor(@InjectKiotViet() private readonly kiotviet: KiotVietClient) {}

  get client(): KiotVietClient {
    return this.kiotviet;
  }
}

describe('kiotVietModule', () => {
  it('provides the client and its alias token', async () => {
    const testingModule = await Test.createTestingModule({
      imports: [KiotVietModule.register(testClientConfig('di-retailer'))],
      providers: [KiotVietConsumerService],
    }).compile();

    const client = testingModule.get(KiotVietClient);
    expect(client).toBeInstanceOf(KiotVietClient);

    const alias = testingModule.get(KIOTVIET_CLIENT, { strict: false });
    expect(alias).toBe(client);

    expect(testingModule.get(KiotVietConsumerService).client).toBe(client);
  });

  it('supports registerAsync with useFactory', async () => {
    const testingModule = await Test.createTestingModule({
      imports: [
        KiotVietModule.registerAsync({
          useFactory: () => testClientConfig('async-retailer'),
        }),
      ],
    }).compile();

    expect(testingModule.get(KiotVietClient)).toBeInstanceOf(KiotVietClient);
  });

  it('rejects registerAsync without a factory', () => {
    expect(() => KiotVietModule.registerAsync({})).toThrowError(/useFactory|useExisting|useClass/);
  });
});

describe('kiotVietWebhookGuard', () => {
  const guard = new KiotVietWebhookGuard({ secret: SECRET });

  it('passes a signed request and attaches the parsed payload', async () => {
    const request: Record<string, unknown> = {
      headers: { 'x-hub-signature': sign(SAMPLE_BODY) },
      rawBody: Buffer.from(SAMPLE_BODY),
    };

    await expect(guard.canActivate(fakeContext(request))).resolves.toBe(true);
    expect((request.kiotvietWebhook as ParsedKiotVietWebhook).raw).toBe(SAMPLE_BODY);
  });

  it('rejects a tampered signature with UnauthorizedException', async () => {
    const request: Record<string, unknown> = {
      headers: { 'x-hub-signature': sign('{"tampered":true}') },
      rawBody: Buffer.from(SAMPLE_BODY),
    };

    await expect(guard.canActivate(fakeContext(request))).rejects.toThrowError(UnauthorizedException);
  });

  it('rejects a missing signature with UnauthorizedException', async () => {
    const request: Record<string, unknown> = {
      headers: {},
      rawBody: Buffer.from(SAMPLE_BODY),
    };

    await expect(guard.canActivate(fakeContext(request))).rejects.toThrowError(UnauthorizedException);
  });

  it('fails with InternalServerErrorException when rawBody is missing', async () => {
    const request: Record<string, unknown> = { headers: {} };

    await expect(guard.canActivate(fakeContext(request))).rejects.toThrowError(InternalServerErrorException);
  });

  it('fails with InternalServerErrorException when no secret is configured', async () => {
    const unconfiguredGuard = new KiotVietWebhookGuard();
    const request: Record<string, unknown> = {
      headers: { 'x-hub-signature': sign(SAMPLE_BODY) },
      rawBody: Buffer.from(SAMPLE_BODY),
    };

    await expect(unconfiguredGuard.canActivate(fakeContext(request))).rejects.toThrowError(/secret/);
  });
});

describe('kiotViet webhook HTTP integration', () => {
  const received: ParsedKiotVietWebhook[] = [];
  let baseUrl: string;
  let app: { close: () => Promise<void> };

  @Controller('webhooks')
  class WebhookController {
    @Post('kiotviet')
    @HttpCode(HttpStatus.OK)
    @UseGuards(new KiotVietWebhookGuard({ secret: SECRET }))
    handle(@KiotVietWebhookPayload() webhook: ParsedKiotVietWebhook) {
      received.push(webhook);
      return { received: true };
    }
  }

  @Module({ controllers: [WebhookController] })
  class IntegrationAppModule {}

  beforeAll(async () => {
    const nestApp = await NestFactory.create(IntegrationAppModule, { rawBody: true });
    await nestApp.listen(0);
    const { port } = nestApp.getHttpServer().address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${port}`;
    app = nestApp;
  });

  afterAll(async () => {
    await app.close();
  });

  it('accepts a signed webhook with 200', async () => {
    const response = await fetch(`${baseUrl}/webhooks/kiotviet`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'X-Hub-Signature': sign(SAMPLE_BODY) },
      body: SAMPLE_BODY,
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ received: true });
    expect(received.at(-1)?.raw).toBe(SAMPLE_BODY);
  });

  it('rejects a tampered webhook with 401', async () => {
    const response = await fetch(`${baseUrl}/webhooks/kiotviet`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'X-Hub-Signature': sign('{"tampered":true}') },
      body: SAMPLE_BODY,
    });

    expect(response.status).toBe(401);
  });
});
