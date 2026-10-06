#!/usr/bin/env node
/*
 * AI self-healing locator POC
 * ---------------------------
 *   1. DETECT   – resolve every registered locator; 0 or >1 matches = broken.
 *   2. CONTEXT  – snapshot the live page: ARIA tree + a compact list of candidate elements.
 *   3. PROPOSE  – ask an LLM (Claude, if ANTHROPIC_API_KEY is set) for a resilient replacement,
 *                 constrained to role/label/test-id strategies and a strict JSON answer.
 *                 Without a key, a deterministic similarity engine produces the proposal so the
 *                 POC still runs offline / in CI.
 *   4. VALIDATE – a proposal is only accepted if it (a) resolves to exactly 1 element, (b) is
 *                 visible, (c) has the expected role, and (d) passes a behavioural check
 *                 (click → results appear, fill → value sticks, …).
 *   5. REPORT   – writes healing-report.json/.md and a reviewable patch. Nothing is auto-committed.
 *
 * Usage:  npm run heal              (heuristic engine)
 *         ANTHROPIC_API_KEY=... npm run heal   (Claude engine)
 */
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const config = require('../config/config');
const { BROKEN_LOCATORS } = require('../src/pages/legacy/BrittleCalculatorPage');
const { buildPrompt } = require('./prompt');

const OUT_DIR = path.join(__dirname, 'output');
const MIN_CONFIDENCE = 0.6;

// ---------- 1. Detect ----------
async function detect(page, selector) {
  try {
    const count = await page.locator(selector).count();
    if (count === 1 && (await page.locator(selector).isVisible())) return { broken: false, count };
    return { broken: true, count, reason: count === 0 ? 'no element matched' : `${count} elements matched (ambiguous)` };
  } catch (e) {
    return { broken: true, count: 0, reason: `invalid selector: ${e.message.split('\n')[0]}` };
  }
}

// ---------- 2. Context ----------
async function collectCandidates(page) {
  return page.evaluate(() => {
    const implicitRole = (el) => {
      const tag = el.tagName.toLowerCase();
      const type = (el.getAttribute('type') || '').toLowerCase();
      if (el.getAttribute('role')) return el.getAttribute('role');
      if (tag === 'button') return 'button';
      if (tag === 'a' && el.hasAttribute('href')) return 'link';
      if (tag === 'select') return 'combobox';
      if (tag === 'input' && type === 'number') return 'spinbutton';
      if (tag === 'input' && type === 'range') return 'slider';
      if (tag === 'input') return 'textbox';
      if (/^h[1-6]$/.test(tag)) return 'heading';
      if (tag === 'table') return 'table';
      return null;
    };
    const name = (el) => {
      if (el.getAttribute('aria-label')) return el.getAttribute('aria-label');
      if (el.labels && el.labels[0]) return el.labels[0].innerText.trim();
      return (el.innerText || el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 80);
    };
    const visible = (el) => {
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden';
    };
    const nodes = document.querySelectorAll('button, a[href], input, select, textarea, h1, h2, h3, table, [role], [data-testid]');
    return [...nodes].filter(visible).slice(0, 150).map((el, i) => ({
      idx: i,
      tag: el.tagName.toLowerCase(),
      role: implicitRole(el),
      name: name(el),
      testId: el.getAttribute('data-testid'),
      id: el.id || null,
      classes: typeof el.className === 'string' ? el.className : null,
    }));
  });
}

// ---------- 3a. Propose with Claude ----------
async function proposeWithClaude(prompt) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: process.env.HEAL_MODEL || 'claude-sonnet-4-5',
      max_tokens: 600,
      temperature: 0,
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  if (!res.ok) throw new Error(`Claude API ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const text = data.content.map((c) => c.text || '').join('');
  const json = text.match(/\{[\s\S]*\}/);
  if (!json) throw new Error(`Model did not return JSON: ${text.slice(0, 200)}`);
  return JSON.parse(json[0]);
}

// ---------- 3b. Propose with deterministic similarity (offline fallback) ----------
const STOP = new Set(['the', 'a', 'an', 'that', 'for', 'of', 'in', 'and', 'vs', 'to', 'opens', 'shows', 'showing', 'displays', 'calculated']);
const tokens = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').split(' ').filter((t) => t.length > 1 && !STOP.has(t));

function proposeHeuristically(def, candidates) {
  const want = new Set([...tokens(def.intent), ...tokens(def.selector)]);
  let best = null;
  for (const c of candidates) {
    const have = new Set([...tokens(c.name), ...tokens(c.testId), ...tokens(c.id)]);
    const overlap = [...have].filter((t) => want.has(t) || [...want].some((w) => w.length > 3 && (t.startsWith(w) || w.startsWith(t))));
    let score = overlap.length / Math.max(3, have.size);
    if (def.expectedRole && c.role === def.expectedRole) score += 0.5;
    if (def.expectedRole && c.role && c.role !== def.expectedRole) score -= 0.3;
    if (!def.expectedRole && c.testId) score += 0.2;
    if (!best || score > best.score) best = { c, score, overlap };
  }
  if (!best) return null;
  const { c } = best;
  // Prefer the most semantic strategy the element supports.
  let locator;
  if (c.role && c.name && ['button', 'link', 'spinbutton', 'slider', 'combobox', 'img', 'heading', 'table'].includes(c.role)) {
    locator = { strategy: 'role', role: c.role, name: c.name };
  } else if (c.testId) {
    locator = { strategy: 'testid', value: c.testId };
  } else {
    locator = { strategy: 'text', value: c.name };
  }
  return {
    locator,
    confidence: Math.max(0, Math.min(0.99, Number(best.score.toFixed(2)))),
    reason: `Best token overlap with intent (${best.overlap.join(', ') || 'none'}), role=${c.role || 'n/a'}`,
  };
}

// ---------- 4. Validate ----------
function toLocator(page, loc) {
  switch (loc.strategy) {
    case 'role': return page.getByRole(loc.role, { name: loc.name, exact: true });
    case 'testid': return page.getByTestId(loc.value);
    case 'label': return page.getByLabel(loc.value, { exact: true });
    case 'text': return page.getByText(loc.value, { exact: true });
    default: throw new Error(`Unsupported strategy "${loc.strategy}" (only role/testid/label/text are allowed)`);
  }
}

function toCode(loc) {
  const q = (s) => `'${String(s).replace(/'/g, "\\'")}'`;
  switch (loc.strategy) {
    case 'role': return `page.getByRole(${q(loc.role)}, { name: ${q(loc.name)}, exact: true })`;
    case 'testid': return `page.getByTestId(${q(loc.value)})`;
    case 'label': return `page.getByLabel(${q(loc.value)}, { exact: true })`;
    default: return `page.getByText(${q(loc.value)}, { exact: true })`;
  }
}

async function validate(page, def, loc) {
  const checks = [];
  const locator = toLocator(page, loc);
  const count = await locator.count();
  checks.push({ check: 'resolves to exactly one element', pass: count === 1, detail: `count=${count}` });
  if (count !== 1) return checks;
  checks.push({ check: 'is visible', pass: await locator.isVisible() });
  if (def.expectedRole) {
    const sameAsRole = await page.getByRole(def.expectedRole).evaluateAll(
      (els, target) => els.includes(target), await locator.elementHandle());
    checks.push({ check: `has role "${def.expectedRole}"`, pass: sameAsRole });
  }
  try {
    switch (def.validate) {
      case 'click-shows-results':
        await locator.click();
        await page.getByTestId('result-emi').waitFor({ state: 'visible', timeout: 3000 });
        checks.push({ check: 'click → EMI results appear', pass: true });
        break;
      case 'fill-number':
        await locator.fill('1234567');
        checks.push({ check: 'fill → value is kept', pass: (await locator.inputValue()) === '1234567' });
        break;
      case 'contains-rupee-amount': {
        const text = await locator.innerText();
        checks.push({ check: 'shows a ₹ amount', pass: /₹\s?[\d,]+/.test(text), detail: text.replace(/\s+/g, ' ') });
        break;
      }
      case 'visible-chart': {
        const box = await locator.boundingBox();
        checks.push({ check: 'chart has a rendered size', pass: !!box && box.width > 50 && box.height > 50 });
        break;
      }
      case 'click-navigates-reports':
        await locator.click();
        await page.getByRole('heading', { level: 1, name: 'Loan Reports' }).waitFor({ timeout: 3000 });
        checks.push({ check: 'click → Reports page opens', pass: true });
        break;
      default:
        break;
    }
  } catch (e) {
    checks.push({ check: `behaviour (${def.validate})`, pass: false, detail: e.message.split('\n')[0] });
  }
  return checks;
}

// ---------- Orchestration ----------
async function preparePage(page, def) {
  await page.goto(def.route);
  await page.getByRole('heading', { level: 1 }).first().waitFor();
  if (def.requiresCalculation) {
    await page.getByRole('button', { name: 'Calculate EMI' }).click(); // known-good locator from the POM
    await page.getByTestId('result-emi').waitFor();
  }
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const engine = process.env.ANTHROPIC_API_KEY ? 'claude' : 'heuristic';
  let server;
  if (config.startApp) server = await require('../app/server').start(config.appPort);
  const browser = await chromium.launch({ headless: true, executablePath: config.executablePath });
  const results = [];

  try {
    for (const [name, def] of Object.entries(BROKEN_LOCATORS)) {
      const page = await browser.newPage({ baseURL: config.baseUrl });
      await preparePage(page, def);
      const detection = await detect(page, def.selector);
      const entry = { name, brokenSelector: def.selector, why: def.why, detection, engine };

      if (detection.broken) {
        const candidates = await collectCandidates(page);
        const aria = await page.locator('body').ariaSnapshot();
        const prompt = buildPrompt({ def, candidates, aria });
        fs.writeFileSync(path.join(OUT_DIR, `prompt-${name}.txt`), prompt);

        let proposal;
        try {
          proposal = engine === 'claude' ? await proposeWithClaude(prompt) : proposeHeuristically(def, candidates);
        } catch (e) {
          entry.error = e.message;
        }
        entry.proposal = proposal;

        if (proposal && proposal.locator) {
          await preparePage(page, def); // fresh state before behavioural validation
          entry.validation = await validate(page, def, proposal.locator);
          const allPass = entry.validation.every((c) => c.pass);
          entry.accepted = allPass && proposal.confidence >= MIN_CONFIDENCE;
          entry.suggestedCode = toCode(proposal.locator);
          if (!entry.accepted) entry.status = allPass ? 'NEEDS REVIEW (low confidence)' : 'REJECTED (validation failed)';
          else entry.status = 'HEALED (pending human review)';
        } else {
          entry.status = 'NO PROPOSAL';
        }
      } else {
        entry.status = 'OK (not broken)';
      }
      results.push(entry);
      await page.close();
    }
  } finally {
    await browser.close();
    if (server) server.close();
  }

  writeReports(results, engine);
  const healed = results.filter((r) => r.accepted).length;
  console.log(`\nSelf-healing (${engine}): ${healed}/${results.length} broken locators healed & validated.`);
  results.forEach((r) => console.log(` - ${r.name.padEnd(16)} ${r.status}${r.suggestedCode ? `\n     ${r.brokenSelector}\n  -> ${r.suggestedCode}` : ''}`));
}

function writeReports(results, engine) {
  fs.writeFileSync(path.join(OUT_DIR, 'healing-report.json'), JSON.stringify({ engine, generatedAt: new Date().toISOString(), results }, null, 2));
  const md = [
    `# Self-healing report`,
    ``,
    `Engine: **${engine}** · Generated: ${new Date().toISOString()} · Confidence threshold: ${MIN_CONFIDENCE}`,
    ``,
    `| Locator | Broken selector | Detected | Suggested replacement | Confidence | Validation | Status |`,
    `|---|---|---|---|---|---|---|`,
    ...results.map((r) => `| ${r.name} | \`${r.brokenSelector}\` | ${r.detection.reason || 'ok'} | ${r.suggestedCode ? `\`${r.suggestedCode}\`` : '-'} | ${r.proposal?.confidence ?? '-'} | ${(r.validation || []).map((c) => `${c.pass ? '✅' : '❌'} ${c.check}`).join('<br>') || '-'} | ${r.status} |`),
    ``,
    `Nothing was changed in the source. Review suggested-fixes.patch and apply it in a PR.`,
  ].join('\n');
  fs.writeFileSync(path.join(OUT_DIR, 'healing-report.md'), md);

  const patch = results.filter((r) => r.accepted).map((r) => [
    `--- a/src/pages/legacy/BrittleCalculatorPage.js  (${r.name})`,
    `+++ b/src/pages/CalculatorPage.js (suggested)`,
    `- page.locator(${JSON.stringify(r.brokenSelector)})`,
    `+ ${r.suggestedCode}`,
  ].join('\n')).join('\n\n');
  fs.writeFileSync(path.join(OUT_DIR, 'suggested-fixes.patch'), `${patch}\n`);
}

main().catch((e) => { console.error(e); process.exit(1); });
