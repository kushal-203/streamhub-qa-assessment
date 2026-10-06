// Runs both SQL scenarios on an in-memory SQLite DB, checks the output against the expected
// result designed into the seed data, and saves text + PNG screenshots to results/sql.
// Requires Node >= 22.13 (built-in node:sqlite). Alternatively paste the .sql files into any
// SQLite tool / online compiler (e.g. sqliteonline.com) in the order 01 -> 02 -> 03.
const fs = require('fs');
const path = require('path');
const assert = require('assert');

let DatabaseSync;
try { ({ DatabaseSync } = require('node:sqlite')); } catch {
  console.error('node:sqlite not available – use Node >= 22.13, or run the .sql files in any SQLite client.');
  process.exit(1);
}

const OUT = path.resolve(__dirname, '..', 'results', 'sql');
fs.mkdirSync(OUT, { recursive: true });

const SCENARIOS = [
  {
    dir: 'scenario1-round-trip',
    title: 'Scenario 1 – Round-trip transfers (within 10%, within 24h)',
    expected: [[1, 2], [3, 4], [5, 6], [15, 16], [17, 18], [17, 19]],
    key: (r) => [r.original_txn, r.return_txn],
  },
  {
    dir: 'scenario2-ipl-streaks',
    title: 'Scenario 2 – IPL 2024: 30+ runs in 3+ consecutive matches',
    expected: [
      ['Faf du Plessis', '2024-03-22', 4], ['Travis Head', '2024-03-23', 3], ['Abhishek Sharma', '2024-03-25', 3],
      ['Virat Kohli', '2024-03-25', 4], ['Sanju Samson', '2024-03-29', 4], ['Ruturaj Gaikwad', '2024-04-02', 3],
      ['Shivam Dube', '2024-04-02', 3],
    ],
    key: (r) => [r.player_name, r.streak_start_date, r.matches_in_streak],
  },
];

function toText(rows) {
  if (!rows.length) return '(no rows)';
  const cols = Object.keys(rows[0]);
  const w = cols.map((c) => Math.max(c.length, ...rows.map((r) => String(r[c] ?? 'NULL').length)));
  const line = (vals) => vals.map((v, i) => String(v ?? 'NULL').padEnd(w[i])).join(' | ');
  return [line(cols), w.map((n) => '-'.repeat(n)).join('-+-'), ...rows.map((r) => line(cols.map((c) => r[c])))].join('\n');
}

function toHtml(title, sql, rows, status) {
  const esc = (s) => String(s ?? 'NULL').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  const cols = rows.length ? Object.keys(rows[0]) : [];
  return `<!doctype html><meta charset="utf-8"><style>
    body{font:14px system-ui,sans-serif;margin:24px;color:#1d2433} h1{font-size:18px}
    pre{background:#0f172a;color:#e2e8f0;padding:12px;border-radius:8px;font-size:12px;white-space:pre-wrap}
    table{border-collapse:collapse;margin-top:12px} th,td{border:1px solid #d0d5dd;padding:6px 10px;text-align:left}
    th{background:#f1f5f9} .ok{color:#067647;font-weight:700}</style>
    <h1>${esc(title)}</h1><pre>${esc(sql)}</pre>
    <p>Result: ${rows.length} row(s) — <span class="ok">${esc(status)}</span> · SQLite ${esc(process.versions.sqlite || '')}</p>
    <table><tr>${cols.map((c) => `<th>${esc(c)}</th>`).join('')}</tr>
    ${rows.map((r) => `<tr>${cols.map((c) => `<td>${esc(r[c])}</td>`).join('')}</tr>`).join('')}</table>`;
}

(async () => {
  const pages = [];
  for (const s of SCENARIOS) {
    const dir = path.join(__dirname, s.dir);
    const db = new DatabaseSync(':memory:');
    db.exec(fs.readFileSync(path.join(dir, '01_schema.sql'), 'utf8'));
    db.exec(fs.readFileSync(path.join(dir, '02_seed.sql'), 'utf8'));
    const query = fs.readFileSync(path.join(dir, '03_query.sql'), 'utf8');
    const rows = db.prepare(query).all().map((r) => ({ ...r }));
    const actualKeys = rows.map(s.key);
    assert.deepStrictEqual(actualKeys, s.expected, `${s.title}: result differs from expected`);
    const status = 'matches the expected result designed into the seed data';
    const text = `${s.title}\n\n${toText(rows)}\n\n✔ ${rows.length} rows – ${status}\n`;
    console.log(text);
    fs.writeFileSync(path.join(OUT, `${s.dir}.txt`), text);
    pages.push({ name: s.dir, html: toHtml(s.title, query, rows, status) });
  }

  try {
    const { chromium } = require('playwright');
    const browser = await chromium.launch({ executablePath: process.env.BROWSER_EXECUTABLE_PATH || undefined });
    const page = await browser.newPage({ viewport: { width: 1100, height: 800 } });
    for (const p of pages) {
      await page.setContent(p.html);
      await page.screenshot({ path: path.join(OUT, `${p.name}.png`), fullPage: true });
    }
    await browser.close();
    console.log(`Screenshots saved to ${OUT}`);
  } catch (e) {
    console.warn(`Skipped screenshots: ${e.message.split('\n')[0]}`);
  }
})();
