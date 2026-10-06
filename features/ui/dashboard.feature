@ui @dashboard
Feature: Portfolio dashboard
  As a loan officer
  I want a dashboard that summarises the loan portfolio
  So that I can see total exposure and monthly inflow at a glance

  Background:
    Given I open the LoanLens application

  Scenario: Dashboard loads with all summary tiles
    Then the "Portfolio Dashboard" page should be displayed
    And the "Dashboard" navigation link should be active
    And the dashboard should show the following summary tiles:
      | Loans                     |
      | Total principal           |
      | Monthly EMI inflow        |
      | Total interest receivable |

  Scenario: Dashboard figures match an independent calculation of the portfolio data
    Then the dashboard summary should match my own calculation from the loan data

  Scenario: Principal-by-type bar chart is visible and renders valid non-zero data
    Then the principal by loan type chart should be visible
    And every loan type bar should have a value greater than zero
    And the bar values should add up to the "Total principal" tile
