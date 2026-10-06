const { BasePage } = require('./BasePage');
const { parseRupees } = require('../utils/parse');

class CalculatorPage extends BasePage {
  constructor(page, config) {
    super(page, config);
    this.title = this.heading('EMI Calculator');
    this.amountInput = page.getByRole('spinbutton', { name: /loan amount/i });
    this.rateInput = page.getByRole('spinbutton', { name: /interest rate/i });
    this.tenureInput = page.getByRole('spinbutton', { name: /loan tenure/i });
    this.amountSlider = page.getByRole('slider', { name: 'Loan amount slider' });
    this.rateSlider = page.getByRole('slider', { name: 'Interest rate slider' });
    this.tenureSlider = page.getByRole('slider', { name: 'Loan tenure slider' });
    this.calculateButton = page.getByRole('button', { name: 'Calculate EMI' });
    this.formError = page.getByRole('alert');

    this.emiValue = page.getByTestId('result-emi');
    this.totalInterestValue = page.getByTestId('result-total-interest');
    this.totalPaymentValue = page.getByTestId('result-total-payment');

    this.pieChart = page.getByRole('img', { name: 'EMI breakdown pie chart' });
    this.pieSlices = this.pieChart.getByTestId('pie-slice');
    this.barChart = page.getByRole('img', { name: 'Yearly repayment bar chart' });
    this.bars = this.barChart.getByTestId('schedule-bar');
    this.tooltip = page.getByRole('tooltip');
    this.scheduleRows = page.getByRole('table', { name: 'Yearly amortisation schedule' }).locator('tbody').getByRole('row');
  }

  async open() {
    await this.goto('/#/calculator');
    await this.title.waitFor();
  }

  async enterLoan({ amount, rate, tenure }) {
    await this.amountInput.fill(String(amount));
    await this.rateInput.fill(String(rate));
    await this.tenureInput.fill(String(tenure));
  }

  async useSliders({ amount, rate, tenure }) {
    await this.amountSlider.fill(String(amount));
    await this.rateSlider.fill(String(rate));
    await this.tenureSlider.fill(String(tenure));
  }

  async calculate() {
    await this.calculateButton.click();
  }

  async results() {
    await this.emiValue.waitFor();
    const read = async (loc) => parseRupees(await loc.locator('span').last().innerText());
    return {
      emi: await read(this.emiValue),
      totalInterest: await read(this.totalInterestValue),
      totalPayment: await read(this.totalPaymentValue),
    };
  }

  /** Numeric values behind each pie slice plus its rendered angle-derived share. */
  async pieSliceValues() {
    await this.pieSlices.first().waitFor();
    return this.pieSlices.evaluateAll((slices) =>
      slices.map((s) => ({
        label: s.dataset.label,
        value: Number(s.dataset.value),
        tooltip: s.querySelector('title')?.textContent || '',
        area: s.getBBox().width * s.getBBox().height,
      })));
  }

  async hoverBar(year) {
    const bar = this.bars.and(this.page.locator(`[data-year="${year}"]`));
    await bar.hover();
    await this.tooltip.waitFor({ state: 'visible' });
    return this.tooltip.innerText();
  }
}

module.exports = { CalculatorPage };
