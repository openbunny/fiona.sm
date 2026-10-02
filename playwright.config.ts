import { defineConfig, devices } from "@playwright/test"

const port = 3458
const baseUrl = `http://127.0.0.1:${port}`
const isCi = Boolean(process.env["CI"])

export default defineConfig({
  testDir: "./e2e",

  fullyParallel: true,

  forbidOnly: isCi,

  retries: isCi ? 1 : 0,

  ...(isCi ? { workers: 2 } : {}),

  timeout: 60_000,
  expect: { timeout: 10_000 },

  use: {
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "off",
    baseURL: baseUrl,
  },

  outputDir: "test-results",

  projects: [
    {
      name: "chromium-desktop",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "chromium-mobile",
      use: { ...devices["Pixel 7"] },
    },
  ],

  webServer: {
    command: `bun run start -- --port ${port}`,
    url: baseUrl,
    reuseExistingServer: !isCi,
    timeout: 120_000,
  },
})
