import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { createKiotvietClient } from 'kiotvietsdk/client';
import type { kv } from '~/lib/kiotviet';

// Type-safe browser client — same methods, same types as the SDK.
const api = createKiotvietClient<typeof kv>({ baseURL: '/api/kiotviet' });

export const Route = createFileRoute('/demo')({
  component: Demo,
});

function Demo(): ReactNode {
  const [result, setResult] = useState<string>('(chưa gọi)');

  async function run(label: string, call: () => Promise<unknown>) {
    try {
      setResult(`${label} →\n${JSON.stringify(await call(), null, 2).slice(0, 3000)}`);
    } catch (error) {
      setResult(`${label} → LỖI\n${String(error)}`);
    }
  }

  return (
    <main>
      <h1>Browser client type-safe</h1>
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', margin: '1rem 0' }}>
        <button onClick={() => run('api.products.list', () => api.products.list({ pageSize: 5 }))}>
          products.list
        </button>
        <button onClick={() => run('api.locations.list', () => api.locations.list())}>locations.list</button>
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
        {result}
      </pre>
    </main>
  );
}
