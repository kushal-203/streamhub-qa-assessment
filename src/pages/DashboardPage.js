const { BasePage } = require('./BasePage');
const { parseRupees } = require('../utils/parse');

class DashboardPage extends BasePage {
  constructor(page, config) {
    super(page, config);
    this.title = this.heading('Portfolio Dashboard');
    this.summary = page.getByRole('list', { name: 'Portfolio summary' });
    this.typeChart = page.getByRole('img', { name: 'Principal by loan type bar chart' });
    this.typeBars = this.typeChart.getByTestId('type-bar');
  }

  async open() {
    await this.goto('/#/dashboard');
    await this.title.waitFor();
  }

  /** KPI tile located by its visible label, e.g. "Total principal". */
  kpi(label) {
    return this.summary.getByRole('listitem').filter({ hasText: label });
  }

  async kpiValue(label) {
    const text = await this.kpi(label).locator('span').last().innerText();
    return label === 'Loans' ? Number(text) : parseRupees(text);
  }

  async barValues() {
    await this.typeBars.first().waitFor();
    return this.typeBars.evaluateAll((bars) =>
      bars.map((b) => ({ type: b.dataset.type, value: Number(b.dataset.value), height: b.getBBox().height })));
  }
}

module.exports = { DashboardPage };
