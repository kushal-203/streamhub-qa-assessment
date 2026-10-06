const { BasePage } = require('./BasePage');
const { parseRupees } = require('../utils/parse');

class ReportsPage extends BasePage {
  constructor(page, config) {
    super(page, config);
    this.title = this.heading('Loan Reports');
    this.typeFilter = page.getByRole('combobox', { name: 'Loan type' });
    this.statusFilter = page.getByRole('combobox', { name: 'Status' });
    this.applyButton = page.getByRole('button', { name: 'Apply filters' });
    this.table = page.getByRole('table', { name: 'Loan report' });
    this.rows = this.table.locator('tbody').getByRole('row');
    this.resultCount = page.getByTestId('report-count');
    this.totalPrincipal = page.getByTestId('report-total-principal');
    this.totalEmi = page.getByTestId('report-total-emi');
  }

  async open() {
    await this.goto('/#/reports');
    await this.title.waitFor();
  }

  async filter({ type = '', status = '' }) {
    await this.typeFilter.selectOption(type === 'All' ? '' : type);
    await this.statusFilter.selectOption(status === 'All' ? '' : status);
    const response = this.page.waitForResponse((r) => r.url().includes('/api/loans'));
    await this.applyButton.click();
    await response;
    await this.resultCount.filter({ hasText: 'found' }).waitFor();
  }

  /** Table rows as objects keyed by column header text. */
  async tableData() {
    const headers = await this.table.locator('thead').getByRole('columnheader').allInnerTexts();
    const rows = await this.rows.all();
    return Promise.all(rows.map(async (row) => {
      const cells = await row.getByRole('cell').allInnerTexts();
      return Object.fromEntries(headers.map((h, i) => [h, cells[i]]));
    }));
  }

  async totals() {
    return {
      principal: parseRupees(await this.totalPrincipal.innerText()),
      emi: parseRupees(await this.totalEmi.innerText()),
    };
  }
}

module.exports = { ReportsPage };
