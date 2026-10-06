const { When, Then } = require('@cucumber/cucumber');
const { expect } = require('@playwright/test');
const { calculateEmi, yearlySchedule } = require('../utils/emiCalculator');
const { parseIndianAmount, parseRupees } = require('../utils/parse');

// Displayed values are rounded to the nearest rupee, so allow ±1 for rounding differences.
const TOLERANCE = 1;

When('I enter a loan amount of {string}, an interest rate of {float}% and a tenure of {float} years',
  async function (amount, rate, tenure) {
    this.ctx.loan = { amount: parseIndianAmount(amount), rate, tenure };
    await this.calculator.enterLoan(this.ctx.loan);
  });

When('I set the sliders to a loan amount of {string}, an interest rate of {float}% and a tenure of {int} years',
  async function (amount, rate, tenure) {
    this.ctx.loan = { amount: parseIndianAmount(amount), rate, tenure };
    await this.calculator.useSliders(this.ctx.loan);
    // The slider must drive the visible number inputs.
    await expect(this.calculator.amountInput).toHaveValue(String(this.ctx.loan.amount));
    await expect(this.calculator.tenureInput).toHaveValue(String(tenure));
  });

When('I calculate the EMI', async function () {
  await this.calculator.calculate();
});

Then('the monthly EMI shown should match my own calculation', async function () {
  const { amount, rate, tenure } = this.ctx.loan;
  const expected = calculateEmi(amount, rate, tenure);
  const actual = await this.calculator.results();
  this.attach(`Input: P=${amount}, R=${rate}%, N=${tenure}y\nExpected EMI: ${expected.emi} (exact ${expected.emiExact.toFixed(4)})\nDisplayed EMI: ${actual.emi}`);
  expect(Math.abs(actual.emi - expected.emi)).toBeLessThanOrEqual(TOLERANCE);
});

Then('the total interest and total payment shown should match my own calculation', async function () {
  const { amount, rate, tenure } = this.ctx.loan;
  const expected = calculateEmi(amount, rate, tenure);
  const actual = await this.calculator.results();
  this.attach(`Expected interest ${expected.totalInterest}, payment ${expected.totalPayment}\nDisplayed interest ${actual.totalInterest}, payment ${actual.totalPayment}`);
  expect(Math.abs(actual.totalInterest - expected.totalInterest)).toBeLessThanOrEqual(TOLERANCE);
  expect(Math.abs(actual.totalPayment - expected.totalPayment)).toBeLessThanOrEqual(TOLERANCE);
  expect(actual.totalPayment).toBe(amount + actual.totalInterest);
});

Then('the EMI breakdown pie chart should be visible', async function () {
  await expect(this.calculator.pieChart).toBeVisible();
});

Then('the pie chart should have {int} sections with values greater than zero', async function (count) {
  await expect(this.calculator.pieSlices).toHaveCount(count);
  const slices = await this.calculator.pieSliceValues();
  this.attach(JSON.stringify(slices, null, 2), 'application/json');
  for (const s of slices) {
    expect(s.value, `pie section "${s.label}"`).toBeGreaterThan(0);
    expect(s.area, `pie section "${s.label}" rendered size`).toBeGreaterThan(0);
  }
});

Then('the pie chart sections should equal the principal and total interest', async function () {
  const { amount, rate, tenure } = this.ctx.loan;
  const expected = calculateEmi(amount, rate, tenure);
  const slices = await this.calculator.pieSliceValues();
  const byLabel = Object.fromEntries(slices.map((s) => [s.label, s.value]));
  expect(byLabel['Principal loan amount']).toBe(amount);
  expect(Math.abs(byLabel['Total interest'] - expected.totalInterest)).toBeLessThanOrEqual(TOLERANCE);
});

Then('the yearly repayment bar chart should be visible', async function () {
  await expect(this.calculator.barChart).toBeVisible();
});

Then('the bar chart should contain {int} bars', async function (count) {
  await expect(this.calculator.bars).toHaveCount(count);
  await expect(this.calculator.scheduleRows).toHaveCount(count);
});

When('I hover over the bar for year {int}', async function (year) {
  this.ctx.tooltip = await this.calculator.hoverBar(year);
  this.attach(`Tooltip text: ${this.ctx.tooltip}`);
});

Then('the tooltip should show the principal and interest for year {int} from my own schedule', async function (year) {
  const { amount, rate, tenure } = this.ctx.loan;
  const row = yearlySchedule(amount, rate, tenure)[year - 1];
  const match = this.ctx.tooltip.match(/Year (\d+).*Principal:\s*([^·]+)·\s*Interest:\s*([^·]+)/);
  expect(match, `tooltip format: "${this.ctx.tooltip}"`).not.toBeNull();
  expect(Number(match[1])).toBe(year);
  expect(Math.abs(parseRupees(match[2]) - row.principal)).toBeLessThanOrEqual(TOLERANCE);
  expect(Math.abs(parseRupees(match[3]) - row.interest)).toBeLessThanOrEqual(TOLERANCE);
});

Then('I should see the validation message {string}', async function (message) {
  await expect(this.calculator.formError).toBeVisible();
  await expect(this.calculator.formError).toContainText(message);
});

Then('no EMI result should be displayed', async function () {
  await expect(this.calculator.emiValue).toBeHidden();
});
