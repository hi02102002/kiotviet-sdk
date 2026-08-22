// @ts-check
import antfu from '@antfu/eslint-config';

export default antfu(
  {
    type: 'lib',
    stylistic: {
      semi: true,
      quotes: 'single',
    },
    // Keep the lint surface focused on source code; skip docs/lockfiles
    markdown: false,
    yaml: false,
    ignores: [
      'dist/**',
      'node_modules/**',
      'docs/**',
      'coverage/**',
      '.mimosa/**',
      '.zcode/**',
      'package-lock.json',
      'pnpm-lock.yaml',
      '.github/**',
    ],
  },
  {
    files: ['src/**/*.ts', 'tests/**/*.ts'],
    rules: {
      // `interface X extends Y {}` is used as a naming idiom across the SDK types
      'ts/no-empty-object-type': 'off',
      // The SDK intentionally accepts loosely typed API payloads
      'ts/no-explicit-any': 'off',
    },
  },
  {
    files: ['**/*.ts', '**/*.mts', '**/*.cts'],
    rules: {
      // Node globals (Buffer/process) are used intentionally; the SDK targets Node directly
      'node/prefer-global/buffer': 'off',
      'node/prefer-global/process': 'off',
    },
  },
);
