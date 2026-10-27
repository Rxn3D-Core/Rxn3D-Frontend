import { defineConfig, devices } from '@playwright/test';

// The target app URL is required and has no default on purpose. A default of
// http://localhost:3000 would hit a developer's own `next dev` server, so the
// caller must name the app copy it started for this run.
const baseURL = process.env.E2E_BASE_URL;
if (!baseURL) {
  throw new Error(
    'Set E2E_BASE_URL, for example http://localhost:3190 (the port of the app copy you started for this task). ' +
      'Never point it at :3000 (the developer dev server) or :8080 (the Docker backend).',
  );
}

// Tests tagged @smoke in the title run on every project. The full suite runs
// on chromium only.
const smokeOnly = /@smoke/;

export default defineConfig({
  testDir: './e2e/tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    // open: 'never' stops the html reporter from starting a blocking server on failure.
    ['html', { outputFolder: 'e2e/reports/html', open: 'never' }],
    ['junit', { outputFile: 'e2e/reports/junit.xml' }],
  ],
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  // No webServer block: the app is started separately, on the task's own port.
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
      grep: smokeOnly,
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
      grep: smokeOnly,
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 7'] },
      grep: smokeOnly,
    },
    {
      name: 'mobile-safari',
      use: { ...devices['iPhone 14'] },
      grep: smokeOnly,
    },
    {
      name: 'tablet',
      use: { ...devices['iPad (gen 7)'] },
      grep: smokeOnly,
    },
  ],
});
