import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@todo/api-spec/client': path.resolve(__dirname, '../api-spec/generated/client.ts'),
      '@todo/api-spec/schemas': path.resolve(__dirname, '../api-spec/generated/schemas.ts'),
      '@todo/api-spec/types': path.resolve(__dirname, '../api-spec/generated/types.ts'),
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
