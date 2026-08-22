/**
 * NestJS example — the kiotvietsdk handler in a controller + classic DI.
 *
 * Run:  npx tsx examples/nestjs/main.ts
 * Try:  curl -X POST http://localhost:3003/api/kiotviet/products.list \
 *         -H 'content-type: application/json' -d '{"args":[{"pageSize":5}]}'
 *       node examples/send-webhook.mjs http://localhost:3003/api/kiotviet/webhook
 */
import 'reflect-metadata';
import { All, Controller, Get, Injectable, Module, Req, Res } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { kiotviet, KiotVietClient } from 'kiotvietsdk';
import { toNestHandler, KiotVietModule, InjectKiotViet } from 'kiotvietsdk/adapters/nestjs';

// 1. Create the instance once (like better-auth's auth.ts)
export const kv = kiotviet({
  clientId: process.env.KIOTVIET_CLIENT_ID ?? 'demo-client-id',
  clientSecret: process.env.KIOTVIET_CLIENT_SECRET ?? 'demo-client-secret',
  retailer: process.env.KIOTVIET_RETAILER ?? 'demo-retailer',
  webhook: {
    secret: process.env.KIOTVIET_WEBHOOK_SECRET ?? 'demo-webhook-secret',
    onEvent: (webhook) => {
      console.log('[webhook]', webhook.event ?? 'event', JSON.stringify(webhook.body).slice(0, 120));
    },
  },
});

// 2. Single mount point: every SDK endpoint + verified webhooks
@Controller()
class KiotvietHandlerController {
  @All('api/kiotviet/:route')
  handle(@Req() req: never, @Res() res: never) {
    return toNestHandler(kv)(req, res);
  }
}

// 3. (Optional) classic DI style — register the module and inject the client
@Injectable()
class ProductsService {
  constructor(@InjectKiotViet() private readonly kiotviet: KiotVietClient) {}

  list() {
    return this.kiotviet.products.list({ pageSize: 5 });
  }
}

@Controller('api/me')
class MeController {
  constructor(private readonly products: ProductsService) {}

  @Get('products')
  list() {
    return this.products.list();
  }
}

@Module({
  imports: [
    KiotVietModule.register({
      clientId: process.env.KIOTVIET_CLIENT_ID ?? 'demo-client-id',
      clientSecret: process.env.KIOTVIET_CLIENT_SECRET ?? 'demo-client-secret',
      retailerName: process.env.KIOTVIET_RETAILER ?? 'demo-retailer',
    }),
  ],
  controllers: [KiotvietHandlerController, MeController],
  providers: [ProductsService],
})
class AppModule {}

async function bootstrap() {
  // rawBody: true — required for webhook signature verification
  const app = await NestFactory.create(AppModule, { rawBody: true });
  await app.listen(3003);
  console.log('NestJS example listening on http://localhost:3003');
  console.log('  POST /api/kiotviet/products.list   {"args":[{"pageSize":5}]}');
  console.log('  GET  /api/me/products              (DI style)');
  console.log('  POST /api/kiotviet/webhook         (signed — see examples/send-webhook.mjs)');
}

void bootstrap();
