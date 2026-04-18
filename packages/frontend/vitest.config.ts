import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
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
