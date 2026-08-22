import { createFileRoute } from '@tanstack/react-router';
import { toWebHandler } from 'kiotvietsdk/adapters/tanstack-start';
import { kv } from '~/lib/kiotviet';

// Single catch-all mount: every SDK endpoint + verified webhooks.
// POST /api/kiotviet/products.list  {"args":[{"pageSize":5}]}
// POST /api/kiotviet/webhook        (signed with X-Hub-Signature)
//
// Protect this route with your own auth middleware in production!
const handler = toWebHandler(kv);

export const Route = createFileRoute('/api/kiotviet/$')({
  server: {
    handlers: {
      POST: ({ request }) => handler(request),
      GET: ({ request }) => handler(request),
    },
  },
});
