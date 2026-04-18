import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    env: {
      DATABASE_URL: 'postgres://todo:todo@localhost:5432/todo',
      FRONTEND_URL: 'http://localhost:5173',
      LOG_LEVEL: 'silent',
    },
    coverage: {
      provider: 'v8',
      exclude: [
        '**/generated/**',
        '**/*.config.ts',
        '**/migrations/**',
        '**/seed.ts',
      ],
    },
  },
});
