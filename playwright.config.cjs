const { defineConfig } = require('@playwright/test');
module.exports = defineConfig({
  testDir: './tests',
  use: { browserName: 'chromium', channel: 'msedge', baseURL: 'http://127.0.0.1:5173', viewport: { width: 390, height: 844 } },
  webServer: { command: 'npm run dev -- --host 0.0.0.0', url: 'http://127.0.0.1:5173', reuseExistingServer: true },
});
