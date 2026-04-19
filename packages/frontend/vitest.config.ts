import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const apiSpecGenerated = resolve(__dirname, '../api-spec/generated');

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@todo/api-spec/client': resolve(apiSpecGenerated, 'client.ts'),
      '@todo/api-spec/schemas': resolve(apiSpecGenerated, 'schemas.ts'),
      '@todo/api-spec/types': resolve(apiSpecGenerated, 'types.ts'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    css: {
      modules: {
        classNameStrategy: 'non-scoped',
      },
    },
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        '**/generated/**',
        '**/*.config.ts',
        '**/*.test.{ts,tsx}',
        '**/test-setup.ts',
        '**/main.tsx',
        '**/vite-env.d.ts',
        'e2e/**',
        'dist/**',
      ],
    },
  },
});
