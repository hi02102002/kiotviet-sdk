# KiotViet Retail SDK

A TypeScript/JavaScript SDK for KiotViet's Public API — full endpoint coverage, a [better-auth](https://better-auth.com)-style setup (`kiotviet()` + `handler`), adapters for 5 backend frameworks, and a type-safe browser client.

![npm version](https://img.shields.io/npm/v/kiotvietsdk)
![license](https://img.shields.io/npm/l/kiotvietsdk)

> 📚 Detailed per-resource reference (params, data structures): [API.md](./API.md) (Vietnamese).

## Features

- 📦 Every endpoint of the [KiotViet Public API](https://www.kiotviet.vn/huong-dan-su-dung-kiotviet/retail-ket-noi-api/public-api) — 25 resource groups
- 🔧 better-auth-style setup: `kiotviet(options)` + a single catch-all `kv.handler` mount
- 🌐 Official adapters: **Express · Hono · NestJS · Next.js · TanStack Start**
- 🖥️ Type-safe browser client (`createKiotvietClient`) — same methods, same types as the server
- 🔐 Automatic OAuth2 token management (fetched once, refreshed on expiry)
- 🪝 Webhooks with timing-safe HMAC-SHA256 signature verification
- 🛡️ Typed errors carrying the API status code and error code

## Installation

```bash
npm install kiotvietsdk
# plus the framework you already use (optional peer deps): express / hono / @nestjs/common ...
```

## Quick Start (better-auth style)

Create the instance **once** in a shared module (like better-auth's `auth.ts`):

```typescript
// lib/kiotviet.ts
import { kiotviet } from "kiotvietsdk";

export const kv = kiotviet({
  clientId: process.env.KIOTVIET_CLIENT_ID!,
  clientSecret: process.env.KIOTVIET_CLIENT_SECRET!,
  retailer: "my-shop",
  webhook: {
    secret: process.env.KIOTVIET_WEBHOOK_SECRET!,
    onEvent: (webhook) => console.log(webhook.event, webhook.body),
  },
});
```

Use it anywhere in your backend:

```typescript
import { kv } from "@/lib/kiotviet";

const products = await kv.products.list({ pageSize: 10 });
const customer = await kv.customers.getByCode("KH0001");
```

### Mount on any framework

`kv.handler` is a web-standard handler serving **every SDK endpoint** — each adapter ships a mount helper:

```typescript
import { toHonoHandler } from "kiotvietsdk/adapters/hono";
app.on(["POST", "GET"], "/api/kiotviet/*", toHonoHandler(kv)); // Hono

import { toExpressHandler } from "kiotvietsdk/adapters/express";
app.all("/api/kiotviet/*", toExpressHandler(kv)); // Express

import { toNextJsHandler } from "kiotvietsdk/adapters/next";
export const { GET, POST } = toNextJsHandler(kv); // Next.js app/api/kiotviet/[...route]/route.ts

import { toNestHandler } from "kiotvietsdk/adapters/nestjs";
@All("api/kiotviet/:route")
handle(@Req() req: Request, @Res() res: Response) { return toNestHandler(kv)(req, res); } // NestJS

import { toWebHandler } from "kiotvietsdk/adapters/tanstack-start";
POST: (request: Request) => toWebHandler(kv)(request) // TanStack Start / any web-standard runtime
```

### Endpoint convention

The handler routes on the final path segment (mount-path agnostic):

| Request | Calls |
| --- | --- |
| `POST /products.list` — `{"args":[{"pageSize":10}]}` | `kv.products.list({ pageSize: 10 })` |
| `POST /products.getById` — `{"args":[123]}` | `kv.products.getById(123)` |
| `GET /locations.list?args=[]` | `kv.locations.list()` |
| `POST /webhook` (signed with `X-Hub-Signature`) | verified webhook → `onEvent` |

`KiotVietApiError`s map to their HTTP status codes, unknown routes return 404, malformed bodies 400.

> ⚠️ **Protect the mount point with your own auth middleware** — the handler exposes the full KiotViet API surface of your retailer.

### Type-safe browser client

The counterpart of better-auth's `createAuthClient` — call your mounted handler from the browser with full types:

```typescript
// lib/api.ts
import { createKiotvietClient } from "kiotvietsdk/client";
import type { kv } from "@/lib/kiotviet";

export const api = createKiotvietClient<typeof kv>({ baseURL: "/api/kiotviet" });

// in the browser — same signatures and types as the SDK
const products = await api.products.list({ pageSize: 10 });
```

Types come from the SDK by default, or from your exact server instance via `typeof kv`. Failed calls throw `KiotVietApiError` with the server's status code. The `./client` subpath uses fetch only — no axios in the browser bundle.

## Backend Adapters

Besides the mount helpers, each adapter provides middleware/DI and webhook verifiers:

| Adapter | Import | Provides |
| --- | --- | --- |
| Express | `kiotvietsdk/adapters/express` | `toExpressHandler`, `kiotvietExpressMiddleware` (`req.kiotviet`), `kiotvietExpressWebhook` |
| Hono | `kiotvietsdk/adapters/hono` | `toHonoHandler`, `kiotvietHonoMiddleware` (`c.get('kiotviet')`), `kiotvietWebhookHandler`, `registerKiotVietWebhook` |
| NestJS | `kiotvietsdk/adapters/nestjs` | `toNestHandler`, `KiotVietModule` (DI), `@InjectKiotViet()`, `KiotVietWebhookGuard`, `@KiotVietWebhookPayload()` |
| Next.js | `kiotvietsdk/adapters/next` | `toNextJsHandler`, `getKiotVietClient` (hot-reload-safe singleton), `verifyNextWebhook` |
| TanStack Start | `kiotvietsdk/adapters/tanstack-start` | `toWebHandler`, `getKiotVietClient`, `verifyTanStackWebhook` |

Traditional middleware example (Hono):

```typescript
import { Hono } from "hono";
import { kiotvietHonoMiddleware, KiotVietHonoEnv } from "kiotvietsdk/adapters/hono";

const app = new Hono<KiotVietHonoEnv>();
app.use("*", kiotvietHonoMiddleware({ client: kv }));
app.get("/products", async (c) => c.json(await c.get("kiotviet").products.list({ pageSize: 10 })));
```

NestJS DI example:

```typescript
@Module({
  imports: [KiotVietModule.register({ clientId, clientSecret, retailerName: "my-shop" })],
})
export class AppModule {}

@Injectable()
export class ProductsService {
  constructor(@InjectKiotViet() private readonly kiotviet: KiotVietClient) {}
  list() { return this.kiotviet.products.list({ pageSize: 10 }); }
}
```

Framework-agnostic building blocks (`KiotVietClientRegistry`, `parseKiotVietWebhook`, `verifyWebhookSignature`, …) are exported from the main entry.

## Authentication & Webhooks

- **Tokens**: the SDK uses OAuth2 client credentials and fetches/refreshes access tokens automatically — nothing to do on your side.
- **Webhooks**: every helper verifies the `X-Hub-Signature` header (HMAC-SHA256) against the raw body using a timing-safe comparison and tolerates a `sha256=` prefix. Express/NestJS need the raw body captured (`express.json({ verify })` / `NestFactory.create(..., { rawBody: true })`).

## Multi-tenant

One client per retailer (each keeps its own token cache):

```typescript
import { KiotVietClientRegistry } from "kiotvietsdk";

const registry = new KiotVietClientRegistry();
const client = registry.getOrCreate({ clientId, clientSecret, retailerName: tenant.retailerName });
```

## Class API (without the factory)

```typescript
import { KiotVietClient } from "kiotvietsdk";

const client = new KiotVietClient({
  clientId: "your_client_id",
  clientSecret: "your_client_secret",
  retailerName: "your_retailer_name",
});

await client.products.list({ pageSize: 20 });
```

Full list of the 25 resources and every method: see [API.md](./API.md).

## Error Handling

```typescript
import { KiotVietApiError } from "kiotvietsdk";

try {
  await kv.products.getById(123);
} catch (error) {
  if (error instanceof KiotVietApiError) {
    console.error("API error:", error.errorMessage, "code:", error.errorCode, "status:", error.statusCode);
  }
}
```

## API Coverage

The SDK covers every endpoint documented in the official [KiotViet Public API](https://www.kiotviet.vn/huong-dan-su-dung-kiotviet/retail-ket-noi-api/public-api): products (CRUD + attributes + batch + stock on hand), customers (CRUD + batch + groups), orders, invoices (including detail taxes), purchase orders, transfers, returns, suppliers, surcharges (enable/disable), vouchers (release/cancel), coupons, locations, taxes, branches, users, bank accounts, cash flow (+ payments), price books, sales channels, trademarks, settings and webhooks.

## Development

```bash
npm run build     # compile TypeScript to dist/
npm test          # Vitest suite (core + 5 adapters + factory/handler + browser client)
npm run lint      # ESLint via @antfu/eslint-config
npm run lint:fix  # ESLint with autofix
```

## Contributing & License

Contributions welcome — send a Pull Request. MIT — see [LICENSE](./LICENSE).
