import { defineConfig, devices } from '@playwright/test';

// Runs against a deployed console (staging) or a local `npm run dev` with the API running.
//   E2E_BASE_URL=https://admin.staging.example E2E_API_URL=https://api.staging.example/api/v1 \
//   E2E_ADMIN_PASSWORD=... npm run test:e2e
// The order flows pay through the backend's mock provider, so the API must run without a
// live Stripe key (any non-production environment). PLAYWRIGHT_CHROMIUM_EXECUTABLE lets the
// suite use an existing Chromium binary.
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined;

export default defineConfig({
  testDir: './e2e',
  timeout: 60000,
  fullyParallel: false, // flows share real stock and the support queue
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:5174',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], launchOptions: { executablePath } },
    },
    {
      name: 'mobile',
      use: { ...devices['Pixel 5'], launchOptions: { executablePath } },
      testMatch: /auth\.spec\.js/,
    },
  ],
});
