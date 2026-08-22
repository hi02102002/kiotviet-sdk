import { createFileRoute, Link } from '@tanstack/react-router';
import type { ReactNode } from 'react';

export const Route = createFileRoute('/')({
  component: Home,
});

function Home(): ReactNode {
  return (
    <main>
      <h1>kiotvietsdk — TanStack Start example</h1>
      <p>
        Handler đã mount ở <code>/api/kiotviet/*</code> (xem <code>src/routes/api/kiotviet.$.ts</code>). Trang demo
        browser client type-safe: <Link to="/demo">/demo</Link>.
      </p>
      <ul>
        <li>
          <code>POST /api/kiotviet/products.list</code> với body <code>{'{"args":[{"pageSize":5}]}'}</code>
        </li>
        <li>
          <code>POST /api/kiotviet/webhook</code> — webhook đã ký (xem <code>examples/send-webhook.mjs</code> ở repo SDK)
        </li>
      </ul>
    </main>
  );
}
