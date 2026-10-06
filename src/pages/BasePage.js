// Shared behaviour for all page objects. Locators prefer role / label / test-id.
class BasePage {
  constructor(page, config) {
    this.page = page;
    this.config = config;
    this.mainNav = page.getByRole('navigation', { name: 'Main' });
  }

  /** Open a route relative to BASE_URL, e.g. "/#/calculator". */
  async goto(route = '/') {
    await this.page.goto(route);
  }

  /** Navigate the way a user would: by clicking the visible nav link. */
  async navigateTo(linkName) {
    await this.mainNav.getByRole('link', { name: linkName, exact: true }).click();
  }

  activeNavLink() {
    return this.mainNav.locator('[aria-current="page"]');
  }

  heading(name) {
    return this.page.getByRole('heading', { level: 1, name });
  }
}

module.exports = { BasePage };
