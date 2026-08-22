import { defineConfig } from 'vite';
import tsConfigPaths from 'vite-tsconfig-paths';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import viteReact from '@vitejs/plugin-react';

export default defineConfig({
  server: { port: 3005 },
  // kiotvietsdk is linked locally via file:../.. — Vite would inline its
  // CommonJS dist as ESM in SSR dev. Force Node to load it as CJS instead.
  // (Not needed when installed from npm.)
  ssr: { external: ['kiotvietsdk'] },
  plugins: [tsConfigPaths(), tanstackStart(), viteReact()],
});
