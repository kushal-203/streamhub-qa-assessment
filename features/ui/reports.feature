@ui @reports
Feature: Loan reports
  As a loan officer
  I want to filter the loan book
  So that I can review a subset of loans and their totals

  Background:
    Given I open the LoanLens application
    When I navigate to the "Reports" page

  Scenario Outline: Filtering by <type> / <status> shows only matching loans with correct totals
    When I filter the report by loan type "<type>" and status "<status>"
    Then every row in the report should have type "<type>" and status "<status>"
    And the report should contain the same loans as the data source for that filter
    And the report totals should match my own calculation

    Examples:
      | type     | status  |
      | All      | All     |
      | Home     | All     |
      | Personal | Overdue |
      | Car      | Active  |
