// Prompt template for the self-healing LLM call. Kept separate so it can be reviewed and versioned.
function buildPrompt({ def, candidates, aria }) {
  return `You are a senior QA automation engineer repairing a broken Playwright locator.

## Broken locator
- Selector: ${def.selector}
- What it is for (intent): ${def.intent}
- Expected ARIA role: ${def.expectedRole || 'none (non-interactive display element)'}
- Why it probably broke: ${def.why}

## Current page – ARIA snapshot
${aria.slice(0, 6000)}

## Current page – visible candidate elements (JSON)
${JSON.stringify(candidates).slice(0, 12000)}

## Rules
1. Choose the ONE element that best matches the intent. Do not invent elements that are not listed above.
2. Use the most resilient strategy available, in this order of preference:
   role + accessible name  >  data-testid  >  label  >  exact visible text.
   Never return CSS classes, ids, nth-child or XPath.
3. The locator must match exactly one element.
4. If nothing matches the intent, return {"locator": null, "confidence": 0, "reason": "..."}.

## Answer – JSON only, no prose
{"locator": {"strategy": "role|testid|label|text", "role": "<role if strategy=role>", "name": "<accessible name if role>", "value": "<value for testid/label/text>"},
 "confidence": <0..1>,
 "reason": "<one sentence>"}`;
}

module.exports = { buildPrompt };
