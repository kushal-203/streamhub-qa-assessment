@api @posts
Feature: JSONPlaceholder – POST /posts boundary and invalid data handling
  The API should answer invalid or extreme input with a clear client error (4xx)
  or accept it safely – but it must NEVER fail with a server error (5xx).

  Scenario: Baseline – a valid post is created
    When I create a post with a valid payload
    Then the response status should be 201
    And the response should echo the submitted fields
    And the response should contain a numeric "id"

  Scenario Outline: Excessively long title (<length> characters) does not cause a server failure
    When I create a post whose title is <length> characters long
    Then the API should not fail with a server error
    And the response status should be one of "201, 400, 413"
    And if the post was accepted the title should be stored without truncation
    And the response should arrive within 10000 ms

    Examples:
      | length  |
      | 256     |
      | 10000   |
      | 100000  |
      | 1000000 |

  Scenario Outline: Unsupported / special characters in the title – <case>
    When I create a post whose title contains "<case>"
    Then the API should not fail with a server error
    And the response status should be one of "201, 400, 422"
    And if the post was accepted the title should be returned exactly as sent

    Examples:
      | case                     |
      | emoji                    |
      | multi-language unicode   |
      | SQL injection            |
      | HTML/script injection    |
      | quotes and backslashes   |
      | control characters       |
      | null byte                |
      | zero-width and RTL marks |
      | JSON-breaking characters |

  # Strict expectation from the brief: invalid input should be rejected with a 4xx error.
  # JSONPlaceholder is a fake API with no validation, so these are expected to FAIL and are
  # reported as findings (see README > "API findings").
  @validation
  Scenario Outline: Invalid payload is rejected – <case>
    When I create a post with an invalid payload "<case>"
    Then the API should not fail with a server error
    And the API should reject the request with a 4xx client error and an error message

    Examples:
      | case               |
      | missing userId     |
      | missing title      |
      | missing body       |
      | empty object       |
      | userId as a string |
      | negative userId    |
      | null title         |

  Scenario: Malformed JSON body is rejected with a client error
    When I send a POST request with a malformed JSON body
    Then the API should not fail with a server error
    And the API should reject the request with a 4xx client error and an error message
