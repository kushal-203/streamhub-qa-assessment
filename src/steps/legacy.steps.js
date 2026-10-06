// Step definitions bound to the intentionally broken legacy page object.
const { Given, When, Then } = require('@cucumber/cucumber');
const { expect } = require('@playwright/test');
const { BrittleCalculatorPage } = require('../pages/legacy/BrittleCalculatorPage');

const QUICK = { timeout: 3000 }; // fail fast – these locators are known to be broken

Given('I open the LoanLens application with the legacy page object', async function () {
  await this.page.goto('/#/calculator');
  this.legacy = new BrittleCalculatorPage(this.page);
});

When('I navigate with the legacy Reports link', async function () {
  await this.legacy.reportsNavLink.click(QUICK);
  await this.page.goto('/#/calculator');
});

When('I enter {int} into the legacy loan amount field', async function (amount) {
  await this.legacy.loanAmountInput.fill(String(amount), QUICK);
});

When('I click the legacy calculate button', async function () {
  await this.legacy.calculateButton.click(QUICK);
});

Then('the legacy EMI result should be visible', async function () {
  await expect(this.legacy.emiResultValue).toBeVisible(QUICK);
});

Then('the legacy pie chart should be visible', async function () {
  await expect(this.legacy.pieChart).toBeVisible(QUICK);
});
