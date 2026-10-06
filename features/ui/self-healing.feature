# Uses deliberately broken locators (src/pages/legacy/BrittleCalculatorPage.js).
# Excluded from the normal run; execute with `npm run test:broken` – these scenarios are EXPECTED TO FAIL.
# See SELF_HEALING.md and run `npm run heal` for the AI self-healing proof of concept.
@ui @broken-locators
Feature: Brittle locators (self-healing exercise)

  Background:
    Given I open the LoanLens application with the legacy page object

  Scenario: Calculate using brittle locators
    When I navigate with the legacy Reports link
    And I enter 2500000 into the legacy loan amount field
    And I click the legacy calculate button
    Then the legacy EMI result should be visible
    And the legacy pie chart should be visible
