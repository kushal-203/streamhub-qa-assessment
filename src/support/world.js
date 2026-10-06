const { setWorldConstructor, World, setDefaultTimeout } = require('@cucumber/cucumber');
const config = require('../../config/config');
const { DashboardPage } = require('../pages/DashboardPage');
const { CalculatorPage } = require('../pages/CalculatorPage');
const { ReportsPage } = require('../pages/ReportsPage');

setDefaultTimeout(config.defaultTimeout * 4);

class CustomWorld extends World {
  constructor(options) {
    super(options);
    this.config = config;
    this.page = null;        // Playwright Page (UI scenarios)
    this.api = null;         // Playwright APIRequestContext (API scenarios)
    this.ctx = {};           // scenario-scoped scratch data shared between steps
  }

  // Page objects are created lazily so API scenarios never touch the browser.
  get dashboard() { return (this._dashboard ||= new DashboardPage(this.page, this.config)); }
  get calculator() { return (this._calculator ||= new CalculatorPage(this.page, this.config)); }
  get reports() { return (this._reports ||= new ReportsPage(this.page, this.config)); }
}

setWorldConstructor(CustomWorld);
