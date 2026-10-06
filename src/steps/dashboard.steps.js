const { Then } = require('@cucumber/cucumber');
const { expect } = require('@playwright/test');
const { calculateEmi } = require('../utils/emiCalculator');

async function loadLoanData(world) {
  // Pull the raw data straight from the API (not from the UI) and compute expectations ourselves.
  const res = await world.page.request.get('/api/loans');
  expect(res.status()).toBe(200);
  return res.json();
}

Then('the dashboard should show the following summary tiles:', async function (table) {
  for (const [label] of table.raw()) {
    await expect(this.dashboard.kpi(label)).toBeVisible();
    await expect(this.dashboard.kpi(label)).not.toHaveText(new RegExp(`^\\s*${label}\\s*$`)); // has a value too
  }
});

Then('the dashboard summary should match my own calculation from the loan data', async function () {
  const loans = await loadLoanData(this);
  const calc = loans.map((l) => ({ ...l, ...calculateEmi(l.principal, l.annualRate, l.tenureYears) }));
  const expected = {
    Loans: loans.length,
    'Total principal': loans.reduce((s, l) => s + l.principal, 0),
    'Monthly EMI inflow': calc.filter((l) => l.status !== 'Closed').reduce((s, l) => s + l.emi, 0),
    'Total interest receivable': calc.reduce((s, l) => s + l.totalInterest, 0),
  };
  this.attach(JSON.stringify(expected, null, 2), 'application/json');
  await expect(this.dashboard.kpi('Loans')).toContainText(String(loans.length));
  for (const [label, value] of Object.entries(expected)) {
    expect(await this.dashboard.kpiValue(label), `KPI "${label}"`).toBe(value);
  }
});

Then('the principal by loan type chart should be visible', async function () {
  await expect(this.dashboard.typeChart).toBeVisible();
  await expect(this.dashboard.typeBars).not.toHaveCount(0);
});

Then('every loan type bar should have a value greater than zero', async function () {
  const bars = await this.dashboard.barValues();
  this.attach(JSON.stringify(bars, null, 2), 'application/json');
  for (const bar of bars) {
    expect(bar.value, `${bar.type} value`).toBeGreaterThan(0);
    expect(bar.height, `${bar.type} rendered height`).toBeGreaterThan(0);
  }
});

Then('the bar values should add up to the {string} tile', async function (label) {
  const bars = await this.dashboard.barValues();
  const sum = bars.reduce((s, b) => s + b.value, 0);
  expect(sum).toBe(await this.dashboard.kpiValue(label));
});
