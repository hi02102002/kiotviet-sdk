import { createRouter } from '@tanstack/react-router';
import { routeTree } from './routeTree.gen';

// TanStack Start expects the router entry to export getRouter()
export function getRouter() {
  return createRouter({ routeTree });
}

declare module '@tanstack/react-router' {
  interface Register {
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    router: ReturnType<typeof getRouter>;
  }
}
