# Self-healing report

Engine: **heuristic** · Generated: 2026-10-06T06:57:03.475Z · Confidence threshold: 0.6

| Locator | Broken selector | Detected | Suggested replacement | Confidence | Validation | Status |
|---|---|---|---|---|---|---|
| calculateButton | `#calc-btn` | no element matched | `page.getByRole('button', { name: 'Calculate EMI', exact: true })` | 0.99 | ✅ resolves to exactly one element<br>✅ is visible<br>✅ has role "button"<br>✅ click → EMI results appear | HEALED (pending human review) |
| loanAmountInput | `xpath=/html/body/div[1]/main/section[2]/form/div[1]/input[1]` | no element matched | `page.getByRole('spinbutton', { name: 'Loan amount (₹)', exact: true })` | 0.99 | ✅ resolves to exactly one element<br>✅ is visible<br>✅ has role "spinbutton"<br>✅ fill → value is kept | HEALED (pending human review) |
| emiResultValue | `.kpis > div:nth-child(1) > span.value` | no element matched | `page.getByTestId('result-emi')` | 0.8 | ✅ resolves to exactly one element<br>✅ is visible<br>✅ shows a ₹ amount | HEALED (pending human review) |
| pieChart | `[data-test="pie"]` | no element matched | `page.getByRole('img', { name: 'EMI breakdown pie chart', exact: true })` | 0.99 | ✅ resolves to exactly one element<br>✅ is visible<br>✅ has role "img"<br>✅ chart has a rendered size | HEALED (pending human review) |
| reportsNavLink | `nav > a:nth-of-type(4)` | no element matched | `page.getByRole('link', { name: 'Reports', exact: true })` | 0.83 | ✅ resolves to exactly one element<br>✅ is visible<br>✅ has role "link"<br>✅ click → Reports page opens | HEALED (pending human review) |

Nothing was changed in the source. Review suggested-fixes.patch and apply it in a PR.