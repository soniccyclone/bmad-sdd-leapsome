import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: 'html',

  timeout: 30_000,
  expect: { timeout: 10_000 },

  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    actionTimeout: 10_000,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: [
    {
      command: process.env.CI
        ? 'cd ../../packages/backend && npx tsx src/server.ts'
        : 'cd ../../packages/backend && npx tsx --env-file ../../.env src/server.ts',
      port: 3000,
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
      env: {
        // E2E tests use the test database, not the dev database
        DATABASE_URL: 'postgres://todo:todo@localhost:5432/todo_test',
        // Disable rate limiting for E2E tests (default 100/min is too low)
        RATE_LIMIT_MAX: '10000',
      },
    },
    {
      command: 'npx vite --port 5173',
      port: 5173,
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
    },
  ],
});
