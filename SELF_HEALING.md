# AI Self-Healing Locators

This document covers the self-healing part of the assessment: what the broken locators are, how AI is used to fix them, how a fix is checked before it is used, and the working POC.

## 1. The broken locators (left broken on purpose)

They are in [`src/pages/legacy/BrittleCalculatorPage.js`](src/pages/legacy/BrittleCalculatorPage.js) and are used by [`features/ui/self-healing.feature`](features/ui/self-healing.feature). That feature is tagged `@broken-locators`. It is left out of the normal run and **is expected to fail** (`npm run test:broken`).

| # | Name | Broken selector | Anti-pattern |
|---|------|-----------------|--------------|
| 1 | `calculateButton` | `#calc-btn` | Hard-coded id that does not exist (the button only has visible text) |
| 2 | `loanAmountInput` | `xpath=/html/body/div[1]/main/section[2]/form/div[1]/input[1]` | Absolute positional XPath that assumes a wrapper `<div>` which was removed |
| 3 | `emiResultValue` | `.kpis > div:nth-child(1) > span.value` | Positional CSS plus an old class name |
| 4 | `pieChart` | `[data-test="pie"]` | Wrong attribute (`data-test` vs `data-testid`) and an old value |
| 5 | `reportsNavLink` | `nav > a:nth-of-type(4)` | Positional and off by one, so it matches nothing |

Each locator also stores **intent metadata**: what the element is for, the ARIA role it should have, and a behaviour check. This is what makes healing safe. The AI fixes the locator to match the *intent*, not just whatever element happens to be closest.

## 2. Approach

```
 test step fails ─► DETECT ─► CAPTURE CONTEXT ─► PROMPT LLM ─► VALIDATE ─► REPORT / PR
                     │              │                  │             │            │
           0 or >1 matches   ARIA snapshot +     strict JSON,   1 match, visible,  json + md +
           or invalid        visible candidate   role/testid/   expected role,     patch; never
           selector          elements            label only     behaviour check    auto-merged
```

### 2.1 Detection
* **At runtime:** a locator is broken when it matches **0** elements (removed or renamed), **more than 1** element (ambiguous; this is a silent risk), or the selector itself is invalid. The POC checks this with `locator.count()` before any action, so a real broken locator is not confused with a slow page.
* **Before runtime (prevention):** a lint rule could flag `nth-child`, absolute XPath and class-only selectors in page objects, so brittle locators are caught in review before they break.
* We only heal **locator failures**. Assertion failures (wrong value, wrong text) are never "healed". Those are product bugs and must stay red.

### 2.2 Context capture
For the failing page the POC collects:
* the **ARIA snapshot** of the page (`locator.ariaSnapshot()`), which is the same accessibility tree that `getByRole` works on;
* a compact JSON list of **visible candidate elements**: tag, role, accessible name, `data-testid`, id, classes;
* the locator's **intent**, its expected role, and why it probably broke.

The context is kept small and structured, not a full HTML dump. This cuts token use and gives the model less room to invent elements.

### 2.3 Prompt approach
The template is in [`self-healing/prompt.js`](self-healing/prompt.js). Every generated prompt is saved to `self-healing/output/prompt-*.txt` so it can be audited. Key rules:
1. Choose **one element from the supplied list only**. Inventing an element is forbidden (this targets hallucination).
2. **Strategy order:** role + accessible name > `data-testid` > label > exact text. CSS classes, ids, `nth-child` and XPath are **forbidden**. A healed locator must not be brittle again.
3. Answer with **strict JSON only**: `{locator:{strategy, role, name, value}, confidence, reason}`. Free-form code is never accepted from the model. The POC builds the Playwright call itself from the JSON, so the model cannot inject arbitrary code.
4. If nothing matches the intent, return `locator: null`. "I don't know" is better than a confident guess.
5. `temperature: 0`, so the same input gives the same output.

### 2.4 Validation before a fix is applied
A proposal is **accepted only if all of these pass**:

| Check | Why |
|---|---|
| Resolves to **exactly one** element | Rules out ambiguous locators |
| Element is **visible** | Rules out hidden duplicates or templates |
| Has the **expected ARIA role** | The button must still be a button, and so on |
| **Behaviour check** on a fresh page: click → results appear; fill → value kept; chart → has a rendered size; nav → Reports page opens | Proves it is the *right* element, not just *an* element |
| Confidence ≥ 0.6 | Low-confidence fixes are routed to a human |

After that, nothing is written to the source automatically. The POC writes `healing-report.md/json` and `suggested-fixes.patch`. In CI this would become a **pull request** with the report attached. The full suite then runs on that PR and a human approves it. Healing a locator **in memory** during a run (so a nightly run can continue) is acceptable only when the run is clearly marked as *healed* and a PR is raised, so it never hides drift silently.

**Known limitation found while building the POC.** The behaviour check for `emiResultValue` is "shows a ₹ amount". The *Total interest* tile would pass that check too. So for display-only elements the confidence score and human review carry more weight. A stronger check would compare the value against the independent EMI oracle (`src/utils/emiCalculator.js`).

## 3. Working POC

```bash
npm run heal                         # offline: deterministic similarity engine
ANTHROPIC_API_KEY=sk-... npm run heal   # Claude does the proposal (HEAL_MODEL to override the model)
```

* [`self-healing/heal.js`](self-healing/heal.js): detect → context → propose → validate → report
* Two interchangeable **proposal engines**. The validation step is the same for both:
  * **Claude** (Messages API) when `ANTHROPIC_API_KEY` is set;
  * a **deterministic heuristic** (token similarity between the intent and the candidates' accessible names and test-ids, plus a role bonus). This lets the POC run in CI with no key and gives a baseline to compare the LLM against.
* Output: [`results/self-healing/`](results/self-healing/)

### Result of the committed run (heuristic engine)

| Broken | Healed to | Validation |
|---|---|---|
| `#calc-btn` | `getByRole('button', { name: 'Calculate EMI' })` | ✅ 1 match · visible · role · click shows results |
| absolute XPath | `getByRole('spinbutton', { name: 'Loan amount (₹)' })` | ✅ 1 match · visible · role · fill keeps value |
| `.kpis > div:nth-child(1) > span.value` | `getByTestId('result-emi')` | ✅ 1 match · visible · shows ₹ amount |
| `[data-test="pie"]` | `getByRole('img', { name: 'EMI breakdown pie chart' })` | ✅ 1 match · visible · role · rendered size |
| `nav > a:nth-of-type(4)` | `getByRole('link', { name: 'Reports' })` | ✅ 1 match · visible · role · opens Reports |

## 4. Taking it further
* Wrap `page.locator()` in a fixture that heals on failure, so this works without a separate script.
* Store a **fingerprint** of each element when the test passes (role, name, test-id, a text hash). Healing then compares against the last known-good fingerprint, not only the intent text.
* Keep a history of heals so locators that keep breaking are flagged. That points to an unstable UI area that needs proper `data-testid`s.
