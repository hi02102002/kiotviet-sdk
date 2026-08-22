import { toNextJsHandler } from 'kiotvietsdk/adapters/next';
import { kv } from '../../../../lib/kiotviet';

// Single catch-all mount: every SDK endpoint + verified webhooks.
// POST /api/kiotviet/products.list  {"args":[{"pageSize":5}]}
// POST /api/kiotviet/webhook        (signed with X-Hub-Signature)
//
// Protect this route with your own auth middleware in production!
export const { GET, POST } = toNextJsHandler(kv);
