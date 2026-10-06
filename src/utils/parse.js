// Helpers to turn UI strings into comparable values.

/** "₹33,038" | "₹ 1,23,45,678" | "33038" -> 33038 */
function parseRupees(text) {
  const cleaned = String(text).replace(/[^0-9.-]/g, '');
  if (cleaned === '') throw new Error(`Cannot parse rupee amount from "${text}"`);
  return Number(cleaned);
}

/** "25L" -> 2500000, "1.5Cr" -> 15000000, "50000" -> 50000 (Indian units used in the brief). */
function parseIndianAmount(text) {
  const m = String(text).trim().match(/^([\d.]+)\s*(l|lac|lakh|lakhs|cr|crore)?$/i);
  if (!m) throw new Error(`Unrecognised amount "${text}"`);
  const n = Number(m[1]);
  const unit = (m[2] || '').toLowerCase();
  if (unit.startsWith('l')) return Math.round(n * 1e5);
  if (unit.startsWith('c')) return Math.round(n * 1e7);
  return n;
}

module.exports = { parseRupees, parseIndianAmount };
