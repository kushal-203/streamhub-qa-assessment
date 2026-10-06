const { Given, When, Then } = require('@cucumber/cucumber');
const { expect } = require('@playwright/test');

Given('I open the LoanLens application', async function () {
  await this.dashboard.goto('/');
});

When('I navigate to the {string} page', async function (linkName) {
  await this.dashboard.navigateTo(linkName);
});

Then('the {string} page should be displayed', async function (title) {
  await expect(this.dashboard.heading(title)).toBeVisible();
});

Then('the {string} navigation link should be active', async function (linkName) {
  await expect(this.dashboard.activeNavLink()).toHaveText(linkName);
});
