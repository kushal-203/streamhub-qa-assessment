// Independent EMI oracle used by the tests. Deliberately does NOT import any app code,
// so a bug in the app's maths cannot also hide in the expected value.
//
//   EMI = P * r * (1 + r)^n / ((1 + r)^n - 1)
//   P = principal, r = monthly rate (annual% / 12 / 100), n = months

function calculateEmi(principal, annualRatePct, tenureYears) {
  if (principal <= 0 || tenureYears <= 0) throw new Error('principal and tenure must be positive');
  const r = annualRatePct / 1200;
  const n = Math.round(tenureYears * 12);
  const emiExact = r === 0 ? principal / n : (principal * r * (1 + r) ** n) / ((1 + r) ** n - 1);
  const totalPayment = Math.round(emiExact * n);
  return {
    emiExact,
    emi: Math.round(emiExact),
    totalPayment,
    totalInterest: totalPayment - principal,
  };
}

// Year-by-year split of principal and interest (loan years, not calendar years).
function yearlySchedule(principal, annualRatePct, tenureYears) {
  const r = annualRatePct / 1200;
  const { emiExact } = calculateEmi(principal, annualRatePct, tenureYears);
  const rows = [];
  let balance = principal;
  for (let year = 1; year <= tenureYears; year += 1) {
    let principalPaid = 0;
    let interestPaid = 0;
    for (let m = 0; m < 12; m += 1) {
      const interest = balance * r;
      principalPaid += emiExact - interest;
      interestPaid += interest;
      balance -= emiExact - interest;
    }
    rows.push({ year, principal: principalPaid, interest: interestPaid, balance: Math.max(0, balance) });
  }
  return rows;
}

module.exports = { calculateEmi, yearlySchedule };
