import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/browser',
  // Browser cleanup must not remove profiles used by simultaneous native tests.
  outputDir: '.test-results/browser',
  fullyParallel: false,
  workers: 1,
  timeout: 60000,
  use: {
    baseURL: 'http://127.0.0.1:5173',
    channel: 'chrome',
    launchOptions: { args: ['--autoplay-policy=no-user-gesture-required'] },
    viewport: { width: 1440, height: 1040 },
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run dev -- --port 5173 --strictPort',
    url: 'http://127.0.0.1:5173',
    reuseExistingServer: true,
    timeout: 30000,
  },
});
