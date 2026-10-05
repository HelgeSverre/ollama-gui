import { defineConfig } from '@playwright/test'

// Dedicated port so e2e runs alongside a normal `bun run dev` on 5173
const PORT = 5180

export default defineConfig({
  testDir: '.',
  testMatch: '*.spec.ts',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    browserName: 'chromium',
    headless: true,
    viewport: { width: 1280, height: 800 },
    actionTimeout: 10_000,
  },
  webServer: {
    command: `bunx vite --port ${PORT} --strictPort`,
    cwd: '..',
    port: PORT,
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
})
