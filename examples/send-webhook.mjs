#!/usr/bin/env node
/**
 * Send a signed KiotViet webhook to a running example server.
 *
 * Usage:
 *   node examples/send-webhook.mjs [url] [--tamper]
 *
 *   node examples/send-webhook.mjs                              # Express example
 *   node examples/send-webhook.mjs http://localhost:3002/...    # any URL
 *   node examples/send-webhook.mjs --tamper                     # invalid signature -> 401
 */
import { createHmac } from 'node:crypto';

const args = process.argv.slice(2);
const tamper = args.includes('--tamper');
const url =
  args.find((arg) => arg.startsWith('http')) ?? 'http://localhost:3001/api/kiotviet/webhook';

const SECRET = process.env.KIOTVIET_WEBHOOK_SECRET ?? 'demo-webhook-secret';

const body = JSON.stringify({
  Id: '6f9d3a00-0000-4c1b-9b7a-08dbbbd80000',
  Attempt: 1,
  Notifications: [
    {
      Action: 'update',
      Data: [{ Id: 123456, Code: 'SP001', Name: 'Sản phẩm demo', CategoryId: 10 }],
    },
  ],
});

const signature = createHmac('sha256', SECRET).update(body).digest('hex');

const response = await fetch(url, {
  method: 'POST',
  headers: {
    'content-type': 'application/json',
    // KiotViet signs the exact raw body and sends it here
    'X-Hub-Signature': tamper ? signature.replace(/^./, 'f') : signature,
  },
  body,
});

console.log(`${tamper ? '[tampered]' : '[signed]'} POST ${url} -> ${response.status}`);
console.log(await response.text());
