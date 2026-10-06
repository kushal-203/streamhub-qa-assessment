const fs = require('fs');
const path = require('path');
const { BeforeAll, AfterAll, Before, After, Status } = require('@cucumber/cucumber');
const playwright = require('playwright');
const config = require('../../config/config');

let browser;
let appServer;
let mockServer;

const SCREENSHOT_DIR = path.resolve('results', 'screenshots');

BeforeAll(async function () {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  if (config.startApp) {
    const { start } = require('../../app/server');
    appServer = await start(config.appPort);
  }
  if (config.startApiMock) {
    const { startMock } = require('../api/mockJsonPlaceholder');
    mockServer = await startMock(config.apiMockPort);
  }
});

AfterAll(async function () {
  if (browser) await browser.close();
  if (appServer) await new Promise((r) => appServer.close(r));
  if (mockServer) await new Promise((r) => mockServer.close(r));
});

Before({ tags: '@ui' }, async function () {
  browser ||= await playwright[config.browser].launch({ headless: config.headless, executablePath: config.executablePath });
  this.context = await browser.newContext({ baseURL: config.baseUrl, viewport: { width: 1366, height: 900 } });
  this.page = await this.context.newPage();
  this.page.setDefaultTimeout(config.defaultTimeout);
});

Before({ tags: '@api' }, async function () {
  this.api = await playwright.request.newContext({
    baseURL: config.apiBaseUrl,
    extraHTTPHeaders: { 'Content-Type': 'application/json; charset=UTF-8' },
    timeout: config.defaultTimeout,
  });
});

After(async function (scenario) {
  if (this.page) {
    const failed = scenario.result.status === Status.FAILED;
    if (config.screenshotOn === 'always' || (failed && config.screenshotOn === 'failure')) {
      const name = `${failed ? 'FAILED-' : ''}${scenario.pickle.name}`.replace(/[^a-z0-9-]+/gi, '_').slice(0, 120);
      const png = await this.page.screenshot({ path: path.join(SCREENSHOT_DIR, `${name}.png`), fullPage: true });
      this.attach(png, 'image/png');
    }
    await this.context.close();
  }
  if (this.api) await this.api.dispose();
});
