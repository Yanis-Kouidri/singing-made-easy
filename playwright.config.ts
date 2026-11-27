import { defineConfig, devices } from '@playwright/test';
import { TONE_G2, fakeMicArgs } from './e2e/audio';

const PORT = 4173;
const BASE_URL = `http://localhost:${PORT}/singing-made-easy/`;
const CI = !!process.env.CI;

export default defineConfig({
  testDir: 'e2e',
  globalSetup: './e2e/global-setup.ts',
  fullyParallel: true,
  forbidOnly: CI,
  // The tests sing in real time, so give CI one retry against timing hiccups.
  retries: CI ? 1 : 0,
  reporter: CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
  },
  projects: [
    {
      // The fake microphone flags are Chromium-only.
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], launchOptions: { args: fakeMicArgs(TONE_G2) } },
    },
  ],
  // Test the production build, served under the GitHub Pages base path.
  // Always rebuild: reusing a running server would test a stale build.
  webServer: {
    command: `npm run build && npm run preview -- --port ${PORT} --strictPort`,
    url: BASE_URL,
    reuseExistingServer: false,
  },
});
