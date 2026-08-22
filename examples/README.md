# Examples

Ví dụ tích hợp `kiotvietsdk` với từng backend framework + client browser.

## Chạy nhanh

```bash
npm install && npm run build   # examples import package qua self-reference -> cần dist/

npm run example:express        # http://localhost:3001
npm run example:hono           # http://localhost:3002
npm run example:nestjs         # http://localhost:3003
npm run example:nextjs         # http://localhost:3004 (Next.js dev server)
```

Với mỗi server đang chạy:

```bash
# RPC: gọi bất kỳ endpoint nào của SDK (cần credentials thật để gọi KiotViet)
curl -X POST http://localhost:3001/api/kiotviet/products.list \
  -H 'content-type: application/json' -d '{"args":[{"pageSize":5}]}'

# Webhook đã ký bằng HMAC-SHA256 (không cần credentials)
node examples/send-webhook.mjs              # -> 200 {received: true}
node examples/send-webhook.mjs --tamper     # -> 401 INVALID_SIGNATURE

# Middleware/DI truyền thống
curl http://localhost:3001/api/me/products  # Express: req.kiotviet
curl http://localhost:3002/api/me/products  # Hono: c.get('kiotviet')
curl http://localhost:3003/api/me/products  # NestJS: @InjectKiotViet()
```

## Bảng ví dụ

| Thư mục | Framework | Kiểu | Nội dung |
| --- | --- | --- | --- |
| `express/server.mjs` | Express | Chạy được | `toExpressHandler` catch-all + `kiotvietExpressMiddleware` (`req.kiotviet`) |
| `hono/server.mjs` | Hono | Chạy được | `toHonoHandler` catch-all + `kiotvietHonoMiddleware` (`c.get('kiotviet')`) |
| `nestjs/main.ts` | NestJS | Chạy được (`tsx`) | `toNestHandler` trong controller + `KiotVietModule` / `@InjectKiotViet()` DI |
| `nextjs/` | Next.js 16 | Chạy được | App Router thật: `toNextJsHandler` catch-all + trang demo browser client (`app/page.tsx`) |
| `tanstack-start/` | TanStack Start | Scaffold standalone | `toWebHandler` trong API route (`src/routes/api/kiotviet.$.ts`) + trang demo browser client |
| `client-sdk/index.html` | Browser | Chạy được | Trang RPC explorer gọi handler đã mount (serve kèm `example:express` tại `http://localhost:3001/`) |

## Browser client type-safe

- **Next.js**: mở `http://localhost:3004/` sau khi chạy `npm run example:nextjs` — `app/page.tsx` dùng `createKiotvietClient<typeof kv>` gọi trực tiếp `/api/kiotviet/*`.
- **TanStack Start**: scaffold có trang `/demo` tương tự (`src/routes/demo.tsx`).
- **Không bundler**: mở `http://localhost:3001/` sau khi chạy `npm run example:express` — trang `client-sdk/index.html` demo đúng giao thức RPC (`POST /{resource}.{method}` + `{"args":[...]}`) mà client type-safe sử dụng.

## TanStack Start (chạy scaffold)

```bash
cd examples/tanstack-start
npm install
npm run dev     # http://localhost:3005
```

Scaffold là app standalone với `package.json` riêng — copy vào dự án thật của bạn cũng dùng được.

## Biến môi trường

Resource calls thật (products.list, ...) gọi thẳng KiotViet Public API — cần credentials thật trong `.env`:

```
KIOTVIET_CLIENT_ID=...
KIOTVIET_CLIENT_SECRET=...
KIOTVIET_RETAILER=...
KIOTVIET_WEBHOOK_SECRET=...   # chỉ dùng cho demo webhook
```

Không có credentials, server vẫn boot bình thường: webhook verification và
phản hồi lỗi (401/404/500) hoạt động đầy đủ vì không cần gọi KiotViet.

> ⚠️ Trong production, hãy bảo vệ điểm mount bằng auth middleware của riêng bạn —
> handler tiết lộ toàn bộ API KiotViet của cửa hàng.
