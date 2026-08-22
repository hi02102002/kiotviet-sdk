'use client';

import { useState } from 'react';
import { createKiotvietClient } from 'kiotvietsdk/client';
import type { kv } from '../lib/kiotviet';

// Type-safe browser client — same methods, same types as the SDK.
// Types are inferred from the server instance via `typeof kv`.
const api = createKiotvietClient<typeof kv>({ baseURL: '/api/kiotviet' });

export default function Home() {
  const [result, setResult] = useState<string>('(chưa gọi)');
  const [loading, setLoading] = useState(false);

  async function run(label: string, call: () => Promise<unknown>) {
    setLoading(true);
    try {
      setResult(`${label} →\n${JSON.stringify(await call(), null, 2).slice(0, 3000)}`);
    } catch (error) {
      setResult(`${label} → LỖI\n${String(error)}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main>
      <h1>kiotvietsdk — client browser type-safe</h1>
      <p>
        Trang này dùng <code>createKiotvietClient&lt;typeof kv&gt;</code> gọi thẳng handler đã mount ở{' '}
        <code>/api/kiotviet/*</code>. Với demo credentials, lời gọi resource sẽ lỗi xác thực —
        đó cũng là cách bạn thấy lỗi được ánh xạ về client.
      </p>

      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', margin: '1rem 0' }}>
        <button disabled={loading} onClick={() => run('api.products.list', () => api.products.list({ pageSize: 5 }))}>
          products.list
        </button>
        <button disabled={loading} onClick={() => run('api.locations.list', () => api.locations.list())}>
          locations.list
        </button>
        <button disabled={loading} onClick={() => run('api.settings.get', () => api.settings.get())}>
          settings.get
        </button>
      </div>

      <pre
        style={{
          background: '#0b0b0b',
          color: '#eaeaea',
          padding: '1rem',
          borderRadius: 8,
          overflow: 'auto',
          minHeight: '8rem',
        }}
      >
        {loading ? 'Đang gọi...' : result}
      </pre>
    </main>
  );
}
