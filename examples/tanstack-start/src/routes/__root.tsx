import type { ReactNode } from 'react';
import { createRootRoute, Link, Outlet } from '@tanstack/react-router';

export const Route = createRootRoute({
  component: () => (
    <html lang="vi">
      <body style={{ fontFamily: 'system-ui, sans-serif', maxWidth: 720, margin: '2rem auto', padding: '0 1rem' }}>
        <Outlet />
      </body>
    </html>
  ),
  notFoundComponent: () => <Link to="/">Về trang chủ</Link>,
});
