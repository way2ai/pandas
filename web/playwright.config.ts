import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  use: {
    baseURL: "http://localhost:3000",
    channel: "chrome",
    headless: true,
  },
  webServer: {
    command: ".\\node_modules\\.bin\\next.cmd dev --hostname 0.0.0.0 --port 3000",
    url: "http://localhost:3000/login",
    reuseExistingServer: true,
    timeout: 120000,
  },
});
