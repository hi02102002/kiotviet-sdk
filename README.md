# **KiotViet Retail SDK**

SDK TypeScript/JavaScript cho Public API của KiotViet — đầy đủ endpoint, khởi tạo kiểu [better-auth](https://better-auth.com) (`kiotviet()` + `handler`), adapter cho 5 framework backend và client browser type-safe.

![npm version](https://img.shields.io/npm/v/kiotvietsdk)
![license](https://img.shields.io/npm/l/kiotvietsdk)

> 📚 Tài liệu chi tiết từng resource (tham số, cấu trúc dữ liệu) xem tại [API.md](./API.md).

## **Tính năng**

- 📦 Đầy đủ endpoint của [Public API KiotViet](https://www.kiotviet.vn/huong-dan-su-dung-kiotviet/retail-ket-noi-api/public-api) — 24 nhóm resource
- 🔧 Khởi tạo kiểu better-auth: `kiotviet(options)` + `kv.handler` mount một route duy nhất
- 🌐 Adapter chính thức: **Express · Hono · NestJS · Next.js · TanStack Start**
- 🖥️ Client browser type-safe (`createKiotvietClient`) — cùng phương thức, cùng kiểu với server
- 🔐 Quản lý token OAuth2 tự động (làm mới khi hết hạn, dùng chung giữa request)
- 🪝 Webhook: xác thực chữ ký HMAC-SHA256 an toàn thời gian hằng (timing-safe)
- 🛡️ Lỗi phân loại rõ (401/404/429…) kèm mã lỗi từ KiotViet

## Cài đặt

```bash
npm install kiotvietsdk
# cùng với framework bạn đang dùng (tùy chọn): express / hono / @nestjs/common ...
```

## Bắt đầu nhanh (kiểu better-auth)

Khởi tạo instance **một lần** trong module dùng chung (giống `auth.ts` của better-auth):

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

Dùng ở bất kỳ đâu trong backend:

```typescript
import { kv } from "@/lib/kiotviet";

const products = await kv.products.list({ pageSize: 10 });
const customer = await kv.customers.getByCode("KH0001");
```

### Mount trên mọi framework

`kv.handler` là web-standard handler phục vụ **toàn bộ endpoint của SDK** — mỗi adapter có sẵn helper mount:

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
POST: (request: Request) => toWebHandler(kv)(request) // TanStack Start / runtime web chuẩn
```

### Quy ước endpoint

Handler định tuyến theo segment cuối của path (tương thích mọi điểm mount):

| Request | Gọi |
| --- | --- |
| `POST /products.list` — `{"args":[{"pageSize":10}]}` | `kv.products.list({ pageSize: 10 })` |
| `POST /products.getById` — `{"args":[123]}` | `kv.products.getById(123)` |
| `GET /locations.list?args=[]` | `kv.locations.list()` |
| `POST /webhook` (chữ ký `X-Hub-Signature`) | webhook đã xác thực → `onEvent` |

Lỗi `KiotVietApiError` ánh xạ theo mã HTTP, route không tồn tại trả 404, body sai định dạng 400.

> ⚠️ **Bảo vệ điểm mount bằng middleware xác thực của riêng bạn** — handler tiết lộ toàn bộ API KiotViet của cửa hàng.

### Client browser type-safe

Tương ứng `createAuthClient` của better-auth — gọi handler đã mount từ trình duyệt với đầy đủ kiểu:

```typescript
// lib/api.ts
import { createKiotvietClient } from "kiotvietsdk/client";
import type { kv } from "@/lib/kiotviet";

export const api = createKiotvietClient<typeof kv>({ baseURL: "/api/kiotviet" });

// trên browser — cùng signature và kiểu với SDK
const products = await api.products.list({ pageSize: 10 });
```

Kiểu lấy mặc định từ SDK, hoặc chính xác theo instance server qua `typeof kv`. Lỗi ném `KiotVietApiError` kèm mã trạng thái. Subpath `./client` chỉ dùng fetch — không kéo axios vào browser bundle.

## Adapter Backend

Ngoài mount helper, mỗi adapter còn cung cấp middleware/DI và webhook verifier riêng:

| Adapter | Import | Cung cấp |
| --- | --- | --- |
| Express | `kiotvietsdk/adapters/express` | `toExpressHandler`, `kiotvietExpressMiddleware` (`req.kiotviet`), `kiotvietExpressWebhook` |
| Hono | `kiotvietsdk/adapters/hono` | `toHonoHandler`, `kiotvietHonoMiddleware` (`c.get('kiotviet')`), `kiotvietWebhookHandler`, `registerKiotVietWebhook` |
| NestJS | `kiotvietsdk/adapters/nestjs` | `toNestHandler`, `KiotVietModule` (DI), `@InjectKiotViet()`, `KiotVietWebhookGuard`, `@KiotVietWebhookPayload()` |
| Next.js | `kiotvietsdk/adapters/next` | `toNextJsHandler`, `getKiotVietClient` (singleton an toàn hot-reload), `verifyNextWebhook` |
| TanStack Start | `kiotvietsdk/adapters/tanstack-start` | `toWebHandler`, `getKiotVietClient`, `verifyTanStackWebhook` |

Ví dụ middleware truyền thống (Hono):

```typescript
import { Hono } from "hono";
import { kiotvietHonoMiddleware, KiotVietHonoEnv } from "kiotvietsdk/adapters/hono";

const app = new Hono<KiotVietHonoEnv>();
app.use("*", kiotvietHonoMiddleware({ client: kv }));
app.get("/products", async (c) => c.json(await c.get("kiotviet").products.list({ pageSize: 10 })));
```

Ví dụ NestJS (DI):

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

Các thành phần không phụ thuộc framework (`KiotVietClientRegistry`, `parseKiotVietWebhook`, `verifyWebhookSignature`, …) được export từ entry chính.

## Xác thực & Webhook

- **Token**: SDK dùng OAuth2 client credentials, tự lấy và làm mới token khi hết hạn — không cần làm gì thêm.
- **Webhook**: mọi helper xác thực header `X-Hub-Signature` (HMAC-SHA256) trên raw body bằng so sánh timing-safe, chấp nhận tiền tố `sha256=`. Với Express/NestJS cần bật giữ raw body (`express.json({ verify })` / `NestFactory.create(..., { rawBody: true })`).

## Đa tenant

Mỗi retailer một client (mỗi client có riêng bộ nhớ đệm token):

```typescript
import { KiotVietClientRegistry } from "kiotvietsdk";

const registry = new KiotVietClientRegistry();
const client = registry.getOrCreate({ clientId, clientSecret, retailerName: tenant.retailerName });
```

## Class API (không dùng factory)

```typescript
import { KiotVietClient } from "kiotvietsdk";

const client = new KiotVietClient({
  clientId: "your_client_id",
  clientSecret: "your_client_secret",
  retailerName: "your_retailer_name",
});

await client.products.list({ pageSize: 20 });
```

Danh sách đầy đủ 24 resource và mọi phương thức: xem [API.md](./API.md).

## Xử lý lỗi

```typescript
import { KiotVietApiError } from "kiotvietsdk";

try {
  await kv.products.getById(123);
} catch (error) {
  if (error instanceof KiotVietApiError) {
    console.error("Lỗi API:", error.errorMessage, "mã:", error.errorCode, "trạng thái:", error.statusCode);
  }
}
```

## Độ phủ API

SDK bao phủ toàn bộ endpoint được ghi nhận trong [tài liệu Public API chính thức](https://www.kiotviet.vn/huong-dan-su-dung-kiotviet/retail-ket-noi-api/public-api): hàng hóa (CRUD + thuộc tính + theo danh sách + tồn kho), khách hàng (CRUD + theo danh sách + nhóm), đặt hàng, hóa đơn, phiếu nhập, chuyển hàng, trả hàng, nhà cung cấp, thu khác (kích hoạt/tắt), voucher (phát hành/hủy), coupon, khu vực, chi nhánh, người dùng, tài khoản ngân hàng, sổ quỹ (+ thanh toán), bảng giá, kênh bán, thương hiệu, cài đặt và webhook.

## Phát triển & kiểm thử

```bash
npm run build     # biên dịch TypeScript ra dist/
npm test          # bộ test Vitest (core + 5 adapter + factory/handler + browser client)
npm run lint      # ESLint qua @antfu/eslint-config
npm run lint:fix  # ESLint kèm tự động sửa
```

## Đóng góp & Giấy phép

Đóng góp xin gửi Pull Request. MIT — xem [LICENSE](./LICENSE).
