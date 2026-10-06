/* LoanLens front-end: hash router, EMI maths, and dependency-free SVG charts. */
(() => {
  'use strict';

  const SVG_NS = 'http://www.w3.org/2000/svg';
  const COLORS = { principal: '#2563eb', interest: '#f59e0b', Home: '#2563eb', Car: '#10b981', Personal: '#f59e0b' };
  const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
  const fmt = (n) => inr.format(Math.round(n));

  // ---------- EMI maths ----------
  function emiExact(principal, annualRate, years) {
    const r = annualRate / 12 / 100;
    const n = years * 12;
    if (r === 0) return principal / n;
    const f = Math.pow(1 + r, n);
    return (principal * r * f) / (f - 1);
  }

  function summary(principal, annualRate, years) {
    const emi = emiExact(principal, annualRate, years);
    const totalPayment = Math.round(emi * years * 12);
    return { emi: Math.round(emi), totalPayment, totalInterest: totalPayment - principal };
  }

  function yearlySchedule(principal, annualRate, years) {
    const r = annualRate / 12 / 100;
    const emi = emiExact(principal, annualRate, years);
    let balance = principal;
    const rows = [];
    for (let y = 1; y <= years; y++) {
      let p = 0, i = 0;
      for (let m = 0; m < 12; m++) {
        const interest = balance * r;
        const princ = emi - interest;
        balance -= princ;
        p += princ; i += interest;
      }
      rows.push({ year: y, principal: Math.round(p), interest: Math.round(i), balance: Math.max(0, Math.round(balance)) });
    }
    return rows;
  }

  // ---------- SVG helpers ----------
  function el(name, attrs = {}, text) {
    const node = document.createElementNS(SVG_NS, name);
    Object.entries(attrs).forEach(([k, v]) => node.setAttribute(k, v));
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function legend(items) {
    const div = document.createElement('div');
    div.className = 'legend';
    items.forEach(({ label, color, text }) => {
      const span = document.createElement('span');
      span.dataset.testid = 'legend-item';
      span.innerHTML = `<i style="background:${color}"></i>`;
      span.append(`${label}: ${text}`);
      div.append(span);
    });
    return div;
  }

  function renderPie(container, slices, ariaLabel) {
    container.innerHTML = '';
    const total = slices.reduce((s, x) => s + x.value, 0);
    const svg = el('svg', { viewBox: '0 0 220 220', width: '220', height: '220', role: 'img', 'aria-label': ariaLabel, 'data-testid': 'pie-chart' });
    let angle = -Math.PI / 2;
    slices.forEach((s) => {
      const frac = s.value / total;
      const end = angle + frac * 2 * Math.PI;
      const [x1, y1] = [110 + 100 * Math.cos(angle), 110 + 100 * Math.sin(angle)];
      const [x2, y2] = [110 + 100 * Math.cos(end), 110 + 100 * Math.sin(end)];
      const large = frac > 0.5 ? 1 : 0;
      const path = el('path', {
        d: `M110,110 L${x1},${y1} A100,100 0 ${large} 1 ${x2},${y2} Z`,
        fill: s.color,
        'data-testid': 'pie-slice',
        'data-label': s.label,
        'data-value': String(Math.round(s.value)),
      });
      path.append(el('title', {}, `${s.label}: ${fmt(s.value)} (${(frac * 100).toFixed(1)}%)`));
      svg.append(path);
      angle = end;
    });
    container.append(svg);
    container.append(legend(slices.map((s) => ({ label: s.label, color: s.color, text: `${fmt(s.value)} (${((s.value / total) * 100).toFixed(1)}%)` }))));
  }

  function renderScheduleBars(container, rows) {
    container.innerHTML = '';
    const W = 560, H = 260, pad = 36;
    const max = Math.max(...rows.map((r) => r.principal + r.interest));
    const bw = (W - pad * 2) / rows.length;
    const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, width: '100%', role: 'img', 'aria-label': 'Yearly repayment bar chart', 'data-testid': 'schedule-bar-chart' });
    const tooltip = document.getElementById('chart-tooltip');
    rows.forEach((r, idx) => {
      const x = pad + idx * bw + bw * 0.15;
      const w = bw * 0.7;
      const hp = ((H - pad * 2) * r.principal) / max;
      const hi = ((H - pad * 2) * r.interest) / max;
      const g = el('g', {
        'data-testid': 'schedule-bar', 'data-year': String(r.year),
        'data-principal': String(r.principal), 'data-interest': String(r.interest),
        tabindex: '0', 'aria-label': `Year ${r.year}`,
      });
      g.append(el('rect', { x, y: H - pad - hp, width: w, height: hp, fill: COLORS.principal }));
      g.append(el('rect', { x, y: H - pad - hp - hi, width: w, height: hi, fill: COLORS.interest }));
      g.append(el('text', { x: x + w / 2, y: H - pad + 14, 'text-anchor': 'middle', 'font-size': '10', fill: '#667085' }, String(r.year)));
      const show = (evt) => {
        tooltip.textContent = `Year ${r.year} · Principal: ${fmt(r.principal)} · Interest: ${fmt(r.interest)} · Balance: ${fmt(r.balance)}`;
        const box = g.getBoundingClientRect();
        tooltip.style.left = `${(evt && evt.clientX) || box.left + box.width / 2}px`;
        tooltip.style.top = `${box.top - 36}px`;
        tooltip.hidden = false;
      };
      g.addEventListener('mouseenter', show);
      g.addEventListener('focus', () => show());
      g.addEventListener('mouseleave', () => { tooltip.hidden = true; });
      g.addEventListener('blur', () => { tooltip.hidden = true; });
      svg.append(g);
    });
    container.append(svg);
    container.append(legend([
      { label: 'Principal', color: COLORS.principal, text: 'per year' },
      { label: 'Interest', color: COLORS.interest, text: 'per year' },
    ]));
  }

  function renderTypeBars(container, totals) {
    container.innerHTML = '';
    const entries = Object.entries(totals);
    const W = 560, H = 240, pad = 40;
    const max = Math.max(...entries.map(([, v]) => v));
    const bw = (W - pad * 2) / entries.length;
    const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, width: '100%', role: 'img', 'aria-label': 'Principal by loan type bar chart', 'data-testid': 'type-bar-chart' });
    entries.forEach(([type, value], idx) => {
      const h = ((H - pad * 2) * value) / max;
      const x = pad + idx * bw + bw * 0.2;
      const w = bw * 0.6;
      svg.append(el('rect', { x, y: H - pad - h, width: w, height: h, fill: COLORS[type] || '#64748b', 'data-testid': 'type-bar', 'data-type': type, 'data-value': String(value) }));
      svg.append(el('text', { x: x + w / 2, y: H - pad - h - 6, 'text-anchor': 'middle', 'font-size': '12' }, fmt(value)));
      svg.append(el('text', { x: x + w / 2, y: H - pad + 16, 'text-anchor': 'middle', 'font-size': '12', fill: '#667085' }, type));
    });
    container.append(svg);
  }

  // ---------- Data ----------
  let loansCache = null;
  async function getLoans(params = {}) {
    const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v)).toString();
    const res = await fetch(`/api/loans${qs ? `?${qs}` : ''}`);
    if (!res.ok) throw new Error(`Failed to load loans: ${res.status}`);
    return res.json();
  }
  const setKpi = (root, testid, value) => { root.querySelector(`[data-testid="${testid}"] .kpi-value`).textContent = value; };

  // ---------- Views ----------
  async function showDashboard() {
    const view = document.getElementById('view-dashboard');
    loansCache = loansCache || (await getLoans());
    const loans = loansCache;
    const withEmi = loans.map((l) => ({ ...l, ...summary(l.principal, l.annualRate, l.tenureYears) }));
    const active = withEmi.filter((l) => l.status !== 'Closed');
    setKpi(view, 'kpi-loan-count', String(loans.length));
    setKpi(view, 'kpi-total-principal', fmt(loans.reduce((s, l) => s + l.principal, 0)));
    setKpi(view, 'kpi-monthly-emi', fmt(active.reduce((s, l) => s + l.emi, 0)));
    setKpi(view, 'kpi-total-interest', fmt(withEmi.reduce((s, l) => s + l.totalInterest, 0)));
    const byType = {};
    loans.forEach((l) => { byType[l.type] = (byType[l.type] || 0) + l.principal; });
    renderTypeBars(document.getElementById('type-chart'), byType);
    view.dataset.ready = 'true';
  }

  function calculate() {
    const form = document.getElementById('emi-form');
    const err = document.getElementById('form-error');
    const amount = Number(form.amount.value);
    const rate = Number(form.rate.value);
    const tenure = Number(form.tenure.value);
    const problems = [];
    if (!(amount >= 10000 && amount <= 100000000)) problems.push('Loan amount must be between ₹10,000 and ₹10,00,00,000');
    if (!(rate >= 0.1 && rate <= 30)) problems.push('Interest rate must be between 0.1% and 30%');
    if (!(Number.isInteger(tenure) && tenure >= 1 && tenure <= 30)) problems.push('Tenure must be a whole number of years between 1 and 30');
    const results = document.getElementById('calc-results');
    if (problems.length) {
      err.textContent = problems.join('. ');
      err.hidden = false;
      results.hidden = true;
      return;
    }
    err.hidden = true;
    const s = summary(amount, rate, tenure);
    setKpi(results, 'result-emi', fmt(s.emi));
    setKpi(results, 'result-total-interest', fmt(s.totalInterest));
    setKpi(results, 'result-total-payment', fmt(s.totalPayment));
    renderPie(document.getElementById('pie-chart'), [
      { label: 'Principal loan amount', value: amount, color: COLORS.principal },
      { label: 'Total interest', value: s.totalInterest, color: COLORS.interest },
    ], 'EMI breakdown pie chart');
    const rows = yearlySchedule(amount, rate, tenure);
    renderScheduleBars(document.getElementById('schedule-chart'), rows);
    results.querySelector('tbody').innerHTML = rows
      .map((r) => `<tr><td>${r.year}</td><td>${fmt(r.principal)}</td><td>${fmt(r.interest)}</td><td>${fmt(r.balance)}</td></tr>`)
      .join('');
    results.hidden = false;
  }

  async function runReport() {
    const view = document.getElementById('view-reports');
    const type = document.getElementById('filter-type').value;
    const status = document.getElementById('filter-status').value;
    const loans = (await getLoans({ type, status })).map((l) => ({ ...l, ...summary(l.principal, l.annualRate, l.tenureYears) }));
    view.querySelector('tbody').innerHTML = loans
      .map((l) => `<tr><td>${l.id}</td><td>${l.borrower}</td><td>${l.type}</td><td>${fmt(l.principal)}</td><td>${l.annualRate}%</td><td>${l.tenureYears} yrs</td><td>${fmt(l.emi)}</td><td>${l.status}</td></tr>`)
      .join('');
    view.querySelector('[data-testid="report-count"]').textContent = `${loans.length} loan(s) found`;
    view.querySelector('[data-testid="report-total-principal"]').textContent = fmt(loans.reduce((s, l) => s + l.principal, 0));
    view.querySelector('[data-testid="report-total-emi"]').textContent = fmt(loans.reduce((s, l) => s + l.emi, 0));
  }

  // ---------- Wiring ----------
  document.querySelectorAll('input[type=range][data-sync]').forEach((range) => {
    const target = document.getElementById(range.dataset.sync);
    range.addEventListener('input', () => { target.value = range.value; });
    target.addEventListener('input', () => { range.value = target.value; });
  });
  document.getElementById('emi-form').addEventListener('submit', (e) => { e.preventDefault(); calculate(); });
  document.getElementById('apply-filters').addEventListener('click', runReport);

  const ROUTES = { dashboard: showDashboard, calculator: () => {}, reports: runReport };
  function route() {
    const name = (location.hash.replace('#/', '') || 'dashboard').split('?')[0];
    const key = ROUTES[name] ? name : 'dashboard';
    document.querySelectorAll('.view').forEach((v) => { v.hidden = v.id !== `view-${key}`; });
    document.querySelectorAll('nav a').forEach((a) => {
      if (a.dataset.route === key) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    ROUTES[key]();
  }
  window.addEventListener('hashchange', route);
  route();
})();
