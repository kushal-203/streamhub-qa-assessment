const { When, Then } = require('@cucumber/cucumber');
const { expect } = require('@playwright/test');
const { calculateEmi } = require('../utils/emiCalculator');

When('I filter the report by loan type {string} and status {string}', async function (type, status) {
  this.ctx.filter = { type, status };
  await this.reports.filter({ type, status });
});

Then('every row in the report should have type {string} and status {string}', async function (type, status) {
  const rows = await this.reports.tableData();
  this.ctx.rows = rows;
  expect(rows.length).toBeGreaterThan(0);
  for (const row of rows) {
    if (type !== 'All') expect(row.Type).toBe(type);
    if (status !== 'All') expect(row.Status).toBe(status);
  }
});

Then('the report should contain the same loans as the data source for that filter', async function () {
  const all = await (await this.page.request.get('/api/loans')).json();
  const { type, status } = this.ctx.filter;
  this.ctx.expectedLoans = all.filter((l) => (type === 'All' || l.type === type) && (status === 'All' || l.status === status));
  const shownIds = this.ctx.rows.map((r) => r['Loan ID']).sort();
  expect(shownIds).toEqual(this.ctx.expectedLoans.map((l) => l.id).sort());
  await expect(this.reports.resultCount).toHaveText(`${this.ctx.expectedLoans.length} loan(s) found`);
});

Then('the report totals should match my own calculation', async function () {
  const loans = this.ctx.expectedLoans;
  const expected = {
    principal: loans.reduce((s, l) => s + l.principal, 0),
    emi: loans.reduce((s, l) => s + calculateEmi(l.principal, l.annualRate, l.tenureYears).emi, 0),
  };
  expect(await this.reports.totals()).toEqual(expected);
});
