@ui @calculator
Feature: EMI calculator
  As a borrower
  I want to enter my loan details
  So that I can see my monthly EMI and how the total payment is split

  Background:
    Given I open the LoanLens application
    When I navigate to the "EMI Calculator" page

  Scenario Outline: Calculated EMI matches an independently computed value – <case>
    When I enter a loan amount of "<amount>", an interest rate of <rate>% and a tenure of <tenure> years
    And I calculate the EMI
    Then the monthly EMI shown should match my own calculation
    And the total interest and total payment shown should match my own calculation

    Examples:
      | case               | amount | rate | tenure |
      | Home loan A        | 25L    | 10   | 10     |
      | Home loan B        | 50L    | 7.5  | 15     |
      | Personal loan      | 10L    | 12   | 5      |
      | Small, short loan  | 50000  | 18   | 1      |

  Scenario: Pie chart is visible and both sections contain values greater than zero
    When I enter a loan amount of "25L", an interest rate of 10% and a tenure of 10 years
    And I calculate the EMI
    Then the EMI breakdown pie chart should be visible
    And the pie chart should have 2 sections with values greater than zero
    And the pie chart sections should equal the principal and total interest

  Scenario: Values can be set with the sliders
    When I set the sliders to a loan amount of "10L", an interest rate of 12% and a tenure of 5 years
    And I calculate the EMI
    Then the monthly EMI shown should match my own calculation

  Scenario: Yearly bar chart shows one bar per year and its tooltip matches the schedule
    When I enter a loan amount of "10L", an interest rate of 12% and a tenure of 5 years
    And I calculate the EMI
    Then the yearly repayment bar chart should be visible
    And the bar chart should contain 5 bars
    When I hover over the bar for year 3
    Then the tooltip should show the principal and interest for year 3 from my own schedule

  Scenario Outline: Invalid input is rejected with a helpful message – <case>
    When I enter a loan amount of "<amount>", an interest rate of <rate>% and a tenure of <tenure> years
    And I calculate the EMI
    Then I should see the validation message "<message>"
    And no EMI result should be displayed

    Examples:
      | case             | amount | rate | tenure | message                                  |
      | zero amount      | 0      | 10   | 10     | Loan amount must be between              |
      | rate too high    | 25L    | 45   | 10     | Interest rate must be between 0.1% and 30% |
      | fractional years | 25L    | 10   | 2.5    | Tenure must be a whole number of years   |
