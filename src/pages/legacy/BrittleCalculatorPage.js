// ⚠️  INTENTIONALLY BROKEN – AI self-healing exercise. DO NOT FIX BY HAND.
// These are the kind of brittle locators that break when markup changes. Each one carries the
// metadata the self-healing POC (self-healing/heal.js) needs: what the element is FOR (intent),
// what it should be (expected role), and how to prove a replacement is correct (validate).

const BROKEN_LOCATORS = {
  calculateButton: {
    selector: '#calc-btn',                                              // id never existed / was renamed
    why: 'Hard-coded id; the button only has visible text',
    intent: 'Primary submit button that calculates the EMI',
    expectedRole: 'button',
    route: '/#/calculator',
    validate: 'click-shows-results',
  },
  loanAmountInput: {
    selector: 'xpath=/html/body/div[1]/main/section[2]/form/div[1]/input[1]', // absolute positional XPath
    why: 'Absolute XPath assumed a wrapper <div> that was removed from the layout',
    intent: 'Numeric input for the loan amount in rupees',
    expectedRole: 'spinbutton',
    route: '/#/calculator',
    validate: 'fill-number',
  },
  emiResultValue: {
    selector: '.kpis > div:nth-child(1) > span.value',                  // positional CSS + renamed class
    why: 'Depends on child position and an old class name ("value" is now "kpi-value")',
    intent: 'Tile that displays the calculated monthly EMI result',
    expectedRole: null,
    route: '/#/calculator',
    requiresCalculation: true,
    validate: 'contains-rupee-amount',
  },
  pieChart: {
    selector: '[data-test="pie"]',                                      // wrong attribute name and value
    why: 'Uses data-test instead of data-testid, and an outdated value',
    intent: 'Pie chart showing the EMI breakdown of principal vs interest',
    expectedRole: 'img',
    route: '/#/calculator',
    requiresCalculation: true,
    validate: 'visible-chart',
  },
  reportsNavLink: {
    selector: 'nav > a:nth-of-type(4)',                                 // positional, off-by-one
    why: 'Positional nav selector; there are only 3 links so this matches nothing',
    intent: 'Main navigation link that opens the Reports page',
    expectedRole: 'link',
    route: '/#/dashboard',
    validate: 'click-navigates-reports',
  },
};

class BrittleCalculatorPage {
  constructor(page) {
    this.page = page;
    for (const [name, def] of Object.entries(BROKEN_LOCATORS)) this[name] = page.locator(def.selector);
  }
}

module.exports = { BrittleCalculatorPage, BROKEN_LOCATORS };
