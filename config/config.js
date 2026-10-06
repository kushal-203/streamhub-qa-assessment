// Central configuration. Values come ONLY from config/env/<TEST_ENV>.env (default: local)
// or from real environment variables, so no URL is hard-coded in tests or page objects.
const path = require('path');
const dotenv = require('dotenv');

const envName = process.env.TEST_ENV || 'local';
dotenv.config({ quiet: true, path: path.resolve(__dirname, 'env', `${envName}.env`) });

function required(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required config "${name}" (TEST_ENV=${envName})`);
  return v;
}

module.exports = {
  envName,
  baseUrl: required('BASE_URL'),
  apiBaseUrl: required('API_BASE_URL'),
  startApp: process.env.START_APP === 'true',
  appPort: Number(process.env.APP_PORT || 3000),
  startApiMock: process.env.START_API_MOCK === 'true',
  apiMockPort: Number(process.env.API_MOCK_PORT || 3999),
  headless: process.env.HEADLESS !== 'false',
  browser: process.env.BROWSER || 'chromium',
  // Optional: use a pre-installed browser binary instead of Playwright's managed one.
  executablePath: process.env.BROWSER_EXECUTABLE_PATH || undefined,
  defaultTimeout: Number(process.env.DEFAULT_TIMEOUT_MS || 15000),
  screenshotOn: process.env.SCREENSHOT_ON || 'failure', // always | failure | never
};
