// Cucumber profiles. Run with: npx cucumber-js --profile <name>
const common = {
  require: ['src/support/**/*.js', 'src/steps/**/*.js'],
  format: ['progress-bar', 'summary'],
  formatOptions: { snippetInterface: 'async-await' },
};

module.exports = {
  default: { ...common, paths: ['features/**/*.feature'], tags: 'not @broken-locators' },
  ui: {
    ...common,
    paths: ['features/ui/**/*.feature'],
    tags: 'not @broken-locators',
    format: [...common.format, 'html:results/ui/cucumber-report.html', 'json:results/ui/cucumber-report.json'],
  },
  api: {
    ...common,
    paths: ['features/api/**/*.feature'],
    format: [...common.format, 'html:results/api/cucumber-report.html', 'json:results/api/cucumber-report.json'],
  },
  // Intentionally broken locators for the AI self-healing exercise (expected to FAIL).
  broken: {
    ...common,
    paths: ['features/ui/**/*.feature'],
    tags: '@broken-locators',
    format: [...common.format, 'html:results/broken/cucumber-report.html', 'json:results/broken/cucumber-report.json'],
  },
};
