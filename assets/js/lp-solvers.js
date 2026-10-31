// Figures for the "The future of optimization solvers is instance-specific specialization" post.
// Adapted from the "Agent-Built LP Solvers" report (figures 1, 2, 3D, 4A and 5B there).
// Each <figure class="lps-fig" data-chart="..."> is filled from /assets/data/lp-solvers.json.
(function () {
"use strict";
if (window.lpSolversCharts) return;  // the script tag is repeated by every figure include
window.lpSolversCharts = true;

const DATA_URL = "/assets/data/lp-solvers.json";
let DATA, SUM;

const FAMS = ['storm', 'setcover', 'pmedian', 'cflp', 'qap'];
const AGENTS = ['opus55-max', 'astra-high'];
const FAM_NAME = { storm: 'Stochastic STORM', setcover: 'Set covering', pmedian: 'p-median', cflp: 'Facility location', qap: 'QAP relaxation' };
const FAM_SHORT = { storm: 'STORM', setcover: 'Set cover', pmedian: 'p-median', cflp: 'CFLP', qap: 'QAP' };
const AG = {
  'opus55-max': { label: 'Opus 5.5 (max)', short: 'Opus', color: 'var(--opus)', cls: 'opus' },
  'astra-high': { label: 'GPT-6-Astra (high)', short: 'Astra', color: 'var(--astra)', cls: 'astra' },
};
function solverMeta(key, fam) {
  const gpu = DATA.families[fam] && DATA.families[fam].target === 'gpu';
  const M = {
    'mosek-ipm-nocross': { label: 'MOSEK IPM', color: 'var(--gp1)', shape: 'square' },
    'hprlp': { label: 'HPR-LP', color: 'var(--gp1)', shape: 'square' },
    'copt': { label: gpu ? 'COPT PDLP' : 'COPT barrier', color: 'var(--gp2)', shape: 'diamond' },
    'highs-hipo': { label: 'HiGHS HiPO', color: 'var(--gp3)', shape: 'triangle' },
    'cuopt-highs': { label: 'cuOpt PDLP', color: 'var(--gp3)', shape: 'triangle' },
  };
  if (AG[key]) return { label: AG[key].label, color: AG[key].color, shape: 'circle', agent: true };
  return M[key];
}
const gpKeys = fam => Object.keys(DATA.families[fam].solvers).filter(k => !AG[k]);

// ---------- numbers ----------
// Benchmark score: shifted geometric mean of solve seconds, failures counted at the time limit.
const SHIFT = 0.1;
function score(ts, limit) {
  const v = ts.map(t => (t == null || t > limit) ? limit : t);
  return Math.exp(v.reduce((a, x) => a + Math.log(x + SHIFT), 0) / v.length) - SHIFT;
}
function times(fam, key, split, limit = 300) {
  const f = DATA.families[fam], rec = f.solvers[key][split] || {};
  return f[split].map(i => { const r = rec[i]; return r && r.t != null && r.t <= limit ? r.t : null; });
}
const solverScore = (fam, key, split, limit = 300) => score(times(fam, key, split, limit), limit);
function bestGP(fam, split, limit = 300) {
  let best = null;
  for (const k of gpKeys(fam)) { const s = solverScore(fam, k, split, limit); if (!best || s < best.score) best = { key: k, score: s }; }
  return best;
}
function bestGPInst(fam, split, inst) {
  let best = null;
  for (const k of gpKeys(fam)) { const r = DATA.families[fam].solvers[k][split][inst]; if (r && r.t != null && (!best || r.t < best.t)) best = { key: k, t: r.t }; }
  return best;
}
const solvedCount = (fam, key, split) => times(fam, key, split).filter(t => t != null).length;
function crossRec(own, ag, other) {
  if (own === other) return DATA.families[own].solvers[ag].heldout;
  return DATA.cross[`${own}/${ag}/${other}`] || null;
}

// ---------- formatting ----------
function fmtS(v) {
  if (v == null) return '—';
  if (v < 0.01) return (v * 1000).toFixed(v < 0.001 ? 2 : 1) + ' ms';
  if (v < 1) return v.toFixed(v < 0.1 ? 3 : 2) + ' s';
  if (v < 10) return v.toFixed(2) + ' s';
  if (v < 100) return v.toFixed(1) + ' s';
  return v.toFixed(0) + ' s';
}
function fmtX(v) {
  if (v == null || !isFinite(v)) return '—';
  if (v >= 100) return Math.round(v) + '×';
  if (v >= 10) return v.toFixed(0) + '×';
  if (v >= 1) return v.toFixed(1) + '×';
  return v.toFixed(2) + '×';
}
function fmtTok(v) {
  if (v == null) return '—';
  if (v >= 1e6) return (v / 1e6).toFixed(v >= 1e7 ? 1 : 2) + 'M';
  if (v >= 1e3) return (v / 1e3).toFixed(0) + 'k';
  return String(v);
}
const STATUS = {
  optimal: { cat: 'ok', label: 'verified' },
  time_limit: { cat: 'time', label: 'time limit' }, iteration_limit: { cat: 'time', label: 'gave up (iteration limit)' },
  memory_limit: { cat: 'mem', label: 'out of memory' },
  error: { cat: 'err', label: 'error / rejected input' },
  verification_failed: { cat: 'wrong', label: 'failed verification' }, not_optimal: { cat: 'wrong', label: 'not optimal' }, failed: { cat: 'wrong', label: 'failed (no verified answer)' },
  highs_status_15: { cat: 'wrong', label: 'solver failure (HiGHS status 15)' },
};
const statusOf = s => STATUS[s] || { cat: 'err', label: s || 'missing' };
const CAT = {
  ok: { color: 'var(--good)', glyph: '✓', label: 'Verified' },
  time: { color: 'var(--warn)', glyph: 'T', label: 'Time or iteration limit' },
  mem: { color: 'var(--serious)', glyph: 'M', label: 'Out of memory' },
  err: { color: 'var(--gp2)', glyph: '!', label: 'Error / input rejected' },
  wrong: { color: 'var(--critical)', glyph: '✕', label: 'Wrong or unverified answer' },
};
const trunc = (s, n) => s.length > n ? s.slice(0, n - 1) + '…' : s;
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// ---------- DOM + SVG helpers ----------
const NS = 'http://www.w3.org/2000/svg';
function S(tag, attrs, parent) {
  const e = document.createElementNS(NS, tag);
  for (const k in attrs || {}) if (attrs[k] != null) e.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(e);
  return e;
}
function H(tag, attrs, html) {
  const e = document.createElement(tag);
  for (const k in attrs || {}) if (attrs[k] != null) e.setAttribute(k, attrs[k]);
  if (html != null) e.innerHTML = html;
  return e;
}
function T(parent, x, y, text, cls, extra) { const t = S('text', Object.assign({ x, y, class: cls }, extra || {}), parent); t.textContent = text; return t; }
const logS = (d0, d1, r0, r1) => { const a = Math.log(d0), b = Math.log(d1); const f = v => r0 + (Math.log(v) - a) / (b - a) * (r1 - r0); f.d = [d0, d1]; return f; };
const linS = (d0, d1, r0, r1) => v => r0 + (v - d0) / (d1 - d0) * (r1 - r0);
function logTicks(d0, d1) {
  const out = [], span = Math.log10(d1 / d0);
  const mult = span <= 2.2 ? [1, 2, 5] : span <= 3.6 ? [1, 3] : [1];
  for (let e = Math.floor(Math.log10(d0)); e <= Math.ceil(Math.log10(d1)); e++)
    for (const m of mult) { const v = m * Math.pow(10, e); if (v >= d0 * 0.999 && v <= d1 * 1.001) out.push(v); }
  return out;
}
const tickS = v => v >= 1 ? (v >= 1000 ? (v / 1000) + 'k' : String(+v.toPrecision(3))) + ' s' : (v >= 0.01 ? +v.toPrecision(2) + ' s' : +(v * 1000).toPrecision(2) + ' ms');
const tickX = v => (v >= 1 ? String(+v.toPrecision(3)) : String(+v.toPrecision(2))) + '×';
function marker(g, shape, x, y, r, attrs) {
  let e;
  if (shape === 'square') e = S('rect', { x: x - r * 0.88, y: y - r * 0.88, width: r * 1.76, height: r * 1.76, rx: 1.5 }, g);
  else if (shape === 'diamond') e = S('path', { d: `M${x} ${y - r * 1.2}L${x + r * 1.2} ${y}L${x} ${y + r * 1.2}L${x - r * 1.2} ${y}Z` }, g);
  else if (shape === 'triangle') e = S('path', { d: `M${x} ${y - r * 1.15}L${x + r * 1.1} ${y + r * 0.8}L${x - r * 1.1} ${y + r * 0.8}Z` }, g);
  else e = S('circle', { cx: x, cy: y, r }, g);
  for (const k in attrs || {}) e.setAttribute(k, attrs[k]);
  return e;
}
function crossMark(g, x, y, r, color, attrs) {
  return S('path', Object.assign({ d: `M${x - r} ${y - r}L${x + r} ${y + r}M${x + r} ${y - r}L${x - r} ${y + r}`, style: `stroke:${color};stroke-width:2.2;stroke-linecap:round;fill:none` }, attrs || {}), g);
}
function legendHTML(items) {
  return '<div class="legend">' + items.map(it => {
    let sw;
    if (it.line) sw = `<svg width="18" height="10"><line x1="0" y1="5" x2="18" y2="5" style="stroke:${it.color};stroke-width:${it.w || 2};${it.dash ? 'stroke-dasharray:4 3' : ''}"/></svg>`;
    else if (it.glyph) sw = `<svg width="14" height="14"><circle cx="7" cy="7" r="6.5" style="fill:${it.color}"/><text x="7" y="10.5" text-anchor="middle" style="fill:${it.ink || '#fff'};font-size:9px;font-weight:700">${it.glyph}</text></svg>`;
    else if (it.cross) sw = `<svg width="12" height="12"><path d="M2 2L10 10M10 2L2 10" style="stroke:${it.color};stroke-width:2;stroke-linecap:round"/></svg>`;
    else {
      const sv = document.createElementNS(NS, 'svg'); sv.setAttribute('width', 14); sv.setAttribute('height', 14);
      marker(sv, it.shape || 'circle', 7, 7, it.small ? 4 : 4.6, { style: it.hollow ? `fill:var(--surface);stroke:${it.color};stroke-width:2` : `fill:${it.color}` });
      sw = sv.outerHTML;
    }
    return `<span>${sw}${esc(it.label)}</span>`;
  }).join('') + '</div>';
}

// ---------- tooltip ----------
let tip;
function showTip(evt, html) {
  if (!tip) { tip = H('div', { id: 'lps-tip', role: 'tooltip' }); document.body.appendChild(tip); }
  tip.innerHTML = html; tip.hidden = false;
  const pad = 14, w = tip.offsetWidth, h = tip.offsetHeight;
  let x = evt.clientX + pad, y = evt.clientY + pad;
  if (x + w > window.innerWidth - 8) x = evt.clientX - w - pad;
  if (y + h > window.innerHeight - 8) y = evt.clientY - h - pad;
  tip.style.left = Math.max(8, x) + 'px'; tip.style.top = Math.max(8, y) + 'px';
}
const hideTip = () => { if (tip) tip.hidden = true; };
function hover(el, fn) {
  el.style.cursor = 'default';
  el.addEventListener('pointerenter', e => showTip(e, fn()));
  el.addEventListener('pointermove', e => showTip(e, fn()));
  el.addEventListener('pointerleave', hideTip);
}
const ttRow = (k, v) => `<div class="tt-r"><span>${k}</span><b>${v}</b></div>`;

// ---------- charts: drawn when visible, redrawn when their width changes ----------
function chart(el, render) {
  const c = { el, render, w: 0 };
  new ResizeObserver(() => { if (el.clientWidth && el.clientWidth !== c.w) draw(c); }).observe(el);
  return c;
}
function draw(c) {
  const w = c.el.clientWidth;
  if (!w) { c.w = 0; return; }  // hidden: drawn once its tab is shown
  c.w = w; c.el.innerHTML = ''; c.render(c.el, w);
}

// ---------- figure frame and controls ----------
function frame(fig, { title, sub, legend, caption }) {
  const body = H('div', { class: 'lps-body' });
  fig.replaceChildren();
  if (title) fig.appendChild(H('div', { class: 'lps-title' }, title));
  if (sub) fig.appendChild(H('p', { class: 'lps-sub' }, sub));
  if (legend) fig.appendChild(H('div', {}, legend));
  fig.appendChild(body);
  if (caption) fig.appendChild(H('figcaption', {}, caption));
  return body;
}
// Tab bars in the same group (the family tabs of the first two figures) switch together.
const tabGroups = {};
function tabs(container, items, group) {
  const bar = H('div', { class: 'tabs', role: 'tablist' });
  const panes = [];
  items.forEach((it, i) => {
    const b = H('button', { type: 'button', role: 'tab', 'aria-selected': i === 0 ? 'true' : 'false', id: `${it.id}-tab` }, it.label);
    const p = H('div', { role: 'tabpanel', 'aria-labelledby': `${it.id}-tab` });
    if (i) p.hidden = true;
    b.addEventListener('click', () => pick(i));
    b.addEventListener('keydown', e => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { const j = (i + (e.key === 'ArrowRight' ? 1 : items.length - 1)) % items.length; pick(j); bar.children[j].focus(); }
    });
    bar.appendChild(b); panes.push(p);
  });
  function select(i) {
    [...bar.children].forEach((b, j) => b.setAttribute('aria-selected', j === i ? 'true' : 'false'));
    panes.forEach((p, j) => p.hidden = j !== i);
  }
  const pick = i => (group ? tabGroups[group] : [select]).forEach(fn => fn(i));
  if (group) (tabGroups[group] = tabGroups[group] || []).push(select);
  container.appendChild(bar); panes.forEach(p => container.appendChild(p));
  return panes;
}
// <details data-sync="key">: opening or closing one opens or closes every other with the same key,
// so a fold stays as the reader left it when they switch family tabs.
function syncDetails(root) {
  root.querySelectorAll('details[data-sync]').forEach(d => d.addEventListener('toggle', () => {
    const k = d.getAttribute('data-sync');
    root.querySelectorAll(`details[data-sync="${k}"]`).forEach(o => { if (o !== d && o.open !== d.open) o.open = d.open; });
  }));
}
function segmented(items, initial, onPick) {
  const seg = H('div', { class: 'seg', role: 'group' });
  items.forEach((it, i) => {
    const b = H('button', { 'aria-pressed': i === initial ? 'true' : 'false', type: 'button' }, esc(it));
    b.addEventListener('click', () => { [...seg.children].forEach((x, j) => x.setAttribute('aria-pressed', j === i ? 'true' : 'false')); onPick(i); });
    seg.appendChild(b);
  });
  return seg;
}
const familyTabs = prefix => FAMS.map(f => ({ id: prefix + f, label: `${FAM_NAME[f]}<span class="tg">${DATA.families[f].target.toUpperCase()}</span>` }));

// ---------- Figure 1: tasks ----------
const TASKS = {
  storm: {
    app: 'Two-stage stochastic cargo-flight scheduling (Mulvey–Ruszczyński stormG2), deterministic equivalent over S sampled scenarios.',
    tex: String.raw`\[\begin{aligned}\min_{x,\,y_s}\;& c^\top x + \sum_{s=1}^{S} p_s\, q^\top y_s\\ \text{s.t. }\;& A x = b \quad(185\text{ rows},\ 121\text{ cols})\\ & T x + W y_s = h_s,\quad s = 1,\dots,S\\ & \ell \le x \le u,\quad \ell_s \le y_s \le u_s\end{aligned}\]`,
    facts: [['Per scenario', '528 rows × 1,259 columns'], ['What varies', 'only the right-hand side h_s (T, W, q identical)'], ['Shape', 'dual block-angular: 121 linking columns']],
    exploit: [
      'Dual block-angular: removing the 121 first-stage columns leaves S independent scenario blocks.',
      'IPM normal equations become block-diagonal plus a small dense Schur complement, so blocks factor in parallel.',
      'Every block has the same sparsity pattern: one symbolic analysis, batched numeric factorization.'
    ],
    rows: [['dev', 'storm-s100', '52,985', '126,021', 'sampled, S = 100'], ['dev', 'storm-s125', '66,185', '157,496', 'S = 125'], ['dev', 'storm-s150', '79,385', '188,971', 'S = 150'], ['dev', 'storm-s200', '105,785', '251,921', 'S = 200'],
      ['heldout', 'stormG2_1000', '528,185', '1,259,121', 'Mittelmann LP test set', true], ['heldout', 'storm-s300', '158,585', '377,821', 'S = 300'], ['heldout', 'storm-s500', '264,185', '629,621', 'S = 500'], ['heldout', 'storm-s700', '369,785', '881,421', 'S = 700']],
  },
  setcover: {
    app: 'LP relaxation of random weighted set covering, built like OR-Library / Mittelmann scpm1.',
    tex: String.raw`\[\begin{aligned}\min_{x}\;& c^\top x\\ \text{s.t. }\;& A x \ge \mathbf 1,\qquad A\in\{0,1\}^{m\times n}\\ & 0 \le x \le 1,\qquad c_j \in \{1,\dots,100\}\end{aligned}\]`,
    facts: [['Shape', 'm ≪ n (2,000 × 150,000 on dev)'], ['Density', '0.25%, about 12.5 rows per column'], ['Costs', 'independent of column counts']],
    exploit: [
      'Few rows, many columns: the m × m normal matrix is small but dense, so dense (mixed-precision) Cholesky wins.',
      'Most columns are zero at the optimum. Cost domination or covering dual bounds remove 90–95% of them up front.',
      'Working sets with exact pricing, plus a covering dual start, give a certified early stop.'
    ],
    rows: [['dev', 'scp-2000x150k', '2,000', '150,000', 'generated'], ['dev', 'scp-2000x200k', '2,000', '200,000', 'generated'], ['dev', 'scp-2500x200k', '2,500', '200,000', 'generated'], ['dev', 'scp-2500x250k', '2,500', '250,000', 'generated'],
      ['heldout', 'scpm1', '5,000', '500,000', 'Mittelmann LP test set', true], ['heldout', 'scp-4000x400k', '4,000', '400,000', 'generated'], ['heldout', 'scp-3500x600k', '3,500', '600,000', 'generated'], ['heldout', 'scp-5000x500k', '5,000', '500,000', 'scpm1 shape']],
  },
  pmedian: {
    app: 'Strong LP relaxation of uncapacitated p-median on OR-Library-style random graphs (Beasley 1985), shortest-path costs.',
    tex: String.raw`\[\begin{aligned}\min_{x,y}\;& \textstyle\sum_{i,j} d_{ij}\, x_{ij}\\ \text{s.t. }\;& \textstyle\sum_j x_{ij} = 1 \quad \forall i\\ & x_{ij} \le y_j \quad \forall i,j \qquad (n^2\text{ rows})\\ & \textstyle\sum_j y_j = p,\qquad 0\le y\le 1,\ x \ge 0\end{aligned}\]`,
    facts: [['Size', 'n² + n columns, n² + n + 1 rows'], ['Dominant rows', 'n² two-entry links x_ij ≤ y_j'], ['p', 'n/10 and n/5 on dev; n/3 and 10 held-out']],
    exploit: [
      'The n² two-entry link rows, grouped by y_j, are diagonal plus rank one and can be eliminated in closed form.',
      'What remains is a dense Schur complement of only n + 1 rows.',
      'Only the ~n/p cheapest assignments per customer matter: solve a restricted master and price the rest.'
    ],
    rows: [['dev', 'pmedian-200-p20', '40,201', '40,200', 'generated'], ['dev', 'pmedian-200-p40', '40,201', '40,200', 'generated'], ['dev', 'pmedian-250-p25', '62,751', '62,750', 'generated'], ['dev', 'pmedian-250-p50', '62,751', '62,750', 'generated'],
      ['heldout', 'pmed30', '360,601', '360,600', 'OR-Library graph', true], ['heldout', 'pmed39', '810,901', '810,900', 'OR-Library graph', true], ['heldout', 'pmedian-500-p50', '250,501', '250,500', 'generated'], ['heldout', 'pmedian-700-p140', '490,701', '490,700', 'generated']],
  },
  cflp: {
    app: 'Strong LP relaxation of capacitated facility location in the style of TBED1 (Avella–Boccia 2009).',
    tex: String.raw`\[\begin{aligned}\min_{x,y}\;& \textstyle\sum_j f_j y_j + \sum_{j,i} c_{ji} d_i\, x_{ji}\\ \text{s.t. }\;& \textstyle\sum_j x_{ji} = 1 \quad \forall i\\ & \textstyle\sum_i d_i x_{ji} \le s_j y_j \quad \forall j\\ & x_{ji} \le y_j \quad \forall j,i,\qquad 0\le y\le 1,\ x\ge 0\end{aligned}\]`,
    facts: [['Size', 'm·n + m columns, m·n + m + n rows'], ['Capacity ratio', 'total capacity = r × demand, r ∈ {5,10,15,20}'], ['Note', 'aggregate capacity row omitted (v1)']],
    exploit: [
      "Each facility's links and capacity row form a diagonal + arrow + rank-one block that inverts analytically.",
      'What remains is one dense customers × customers Cholesky per iteration, which suits a GPU.',
      'Narrow coefficient ranges make FP32 assembly with FP64 correction safe early on.'
    ],
    rows: [['dev', 'cflp-400-r5', '160,800', '160,400', '400 × 400, r = 5'], ['dev', 'cflp-450-r10', '203,400', '202,950', '450 × 450, r = 10'], ['dev', 'cflp-500-r15', '251,000', '250,500', '500 × 500, r = 15'], ['dev', 'cflp-450-r20', '203,400', '202,950', '450 × 450, r = 20'],
      ['heldout', 'tbed1-i500-11', '251,000', '250,500', 'TBED1 data', true], ['heldout', 'tbed1-i1000-06', '1,002,000', '1,001,000', 'TBED1 data', true], ['heldout', 'cflp-700-r10', '491,400', '490,700', 'generated'], ['heldout', 'cflp-400x1000-r15', '401,400', '400,400', 'rectangular']],
  },
  qap: {
    app: 'Adams–Johnson LP relaxation of Nugent-type quadratic assignment problems (Manhattan grids, nug30 flow subsets).',
    tex: String.raw`\[\begin{aligned}\min_{x,y}\;& \textstyle\sum_{i<k}\sum_{j\ne l} 2F_{ik}D_{jl}\, y_{ijkl}\\ \text{s.t. }\;& \textstyle\sum_i x_{ij} = 1,\quad \sum_j x_{ij} = 1\\ & \textstyle\sum_{l\ne j} y_{ijkl} = x_{ij}\quad \forall\, i,j,k\ne i\\ & y_{ijkl} = y_{klij} \ge 0,\quad x \ge 0\end{aligned}\]`,
    facts: [['Size (n = 20)', '15,240 rows × 72,600 columns'], ['Columns', 'n² assignment x plus ~n⁴/2 merged y, 4 entries each'], ['Coefficients', 'all ±1, all equality rows']],
    exploit: [
      'Rigid sparsity: every y column has four ±1 entries, so matrix-free PDHG kernels can use a coalesced pair grid.',
      'Manhattan-grid distances are symmetric, and an exact orbit (equitable-partition) quotient shrinks the LP 4–9×.',
      'Integer coefficients and equality rows allow FP32/int8 storage with FP64 correction (consumer GPUs run FP64 at 1/64 rate).'
    ],
    rows: [['dev', 'qap-4x5', '15,240', '72,600', '4 × 5 grid, n = 20'], ['dev', 'qap-3x7', '17,682', '88,641', '3 × 7, n = 21'], ['dev', 'qap-4x6', '26,544', '152,928', '4 × 6, n = 24'], ['dev', 'qap-5x5', '30,050', '180,625', '5 × 5, n = 25'],
      ['heldout', 'nug30', '52,260', '379,350', 'Mittelmann LP test set', true], ['heldout', 'nug20', '15,240', '72,600', 'Mittelmann LP test set', true], ['heldout', 'qap-4x7', '42,392', '286,552', '4 × 7, n = 28'], ['heldout', 'qap-3x9', '37,962', '247,131', '3 × 9, n = 27']],
  },
};

// Schematic sparsity sketches (not to scale).
function schematic(kind) {
  const W = 360, Hh = 200;
  const svg = S('svg', { viewBox: `-46 0 ${W + 46} ${Hh}`, class: 'schem', role: 'img', 'aria-label': 'Schematic sparsity pattern' });
  const blk = (x, y, w, h, tone, label) => {
    S('rect', { x, y, width: w, height: h, rx: 2, style: `fill:${tone};stroke:var(--surface);stroke-width:1` }, svg);
    if (label) T(svg, x + w / 2, y + h / 2 + 4, label, 'ax', { 'text-anchor': 'middle', style: 'fill:var(--surface);font-weight:600;font-size:10px' });
  };
  const frm = (x, y, w, h) => S('rect', { x, y, width: w, height: h, style: 'fill:none;stroke:var(--axis);stroke-width:1' }, svg);
  const lab = (x, y, t, anchor) => T(svg, x, y, t, 'ax', { 'text-anchor': anchor || 'start' });
  if (kind === 'storm') {
    frm(40, 14, 300, 172);
    blk(40, 14, 34, 22, 'var(--accent)', 'A');
    for (let k = 0; k < 6; k++) {
      const y = 40 + k * 24;
      blk(40, y, 34, 20, 'var(--astra)', k === 0 ? 'T' : '');
      blk(80 + k * 42, y, 38, 20, 'var(--opus)', k === 0 ? 'W' : '');
    }
    lab(57, 10, 'x (121)', 'middle'); lab(210, 10, 'y₁ … y_S (1,259 each)', 'middle');
    lab(34, 29, 'first stage', 'end'); lab(34, 112, 'scenario rows', 'end');
  } else if (kind === 'setcover') {
    frm(20, 60, 330, 60);
    let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 520; i++) S('rect', { x: 21 + rnd() * 327, y: 61 + rnd() * 57, width: 1.6, height: 1.6, style: 'fill:var(--opus)' }, svg);
    lab(185, 52, 'n columns (150k – 600k)', 'middle'); lab(14, 94, 'm', 'end');
    lab(185, 140, 'A ∈ {0,1}, ~12.5 ones per column, rows ≥ 1', 'middle');
  } else if (kind === 'pmedian' || kind === 'cflp') {
    const cf = kind === 'cflp';
    frm(40, 14, 300, 172);
    // x columns grouped by facility j, assignment rows on top
    const bw = 50;
    for (let j = 0; j < 5; j++) {
      const x0 = 40 + j * (bw + 2);
      for (let r = 0; r < 5; r++) S('rect', { x: x0 + r * 10, y: 16 + r * 5, width: 8, height: 3.5, style: 'fill:var(--accent)' }, svg);
      if (cf) S('rect', { x: x0, y: 44, width: bw, height: 6, style: 'fill:var(--astra)' }, svg);
      for (let r = 0; r < 5; r++) S('rect', { x: x0 + r * 10, y: (cf ? 56 : 46) + j * 26 + r * 4.6, width: 8, height: 3.5, style: 'fill:var(--opus)' }, svg);
      S('rect', { x: 312 + j * 5, y: (cf ? 56 : 46) + j * 26, width: 4, height: 23, style: 'fill:var(--gp2)' }, svg);
      if (cf) S('rect', { x: 312 + j * 5, y: 44, width: 4, height: 6, style: 'fill:var(--gp2)' }, svg);
    }
    if (!cf) S('rect', { x: 312, y: 176, width: 24, height: 5, style: 'fill:var(--gp2)' }, svg);
    lab(170, 10, cf ? 'x_ji grouped by facility j' : 'x_ij grouped by median j', 'middle'); lab(324, 10, 'y', 'middle');
    lab(34, 30, 'Σ x = 1', 'end'); if (cf) lab(34, 51, 'capacity', 'end');
    lab(34, 110, 'x ≤ y links', 'end'); if (!cf) lab(34, 182, 'Σ y = p', 'end');
  } else if (kind === 'qap') {
    frm(40, 14, 300, 172);
    S('rect', { x: 40, y: 14, width: 40, height: 16, style: 'fill:var(--accent)' }, svg);
    for (let r = 0; r < 12; r++) {
      const y = 34 + r * 12.5;
      S('rect', { x: 42 + (r % 6) * 6, y, width: 5, height: 9, style: 'fill:var(--astra)' }, svg);
      for (let c = 0; c < 9; c++) S('rect', { x: 86 + ((r * 7 + c * 29) % 250), y: y + 2, width: 2.5, height: 5, style: 'fill:var(--opus)' }, svg);
    }
    lab(60, 10, 'x (n²)', 'middle'); lab(210, 10, 'y_ijkl (~n⁴/2, four ±1 entries each)', 'middle');
    lab(34, 25, 'assign', 'end'); lab(34, 112, 'linking', 'end');
  }
  return svg;
}

function tasksFigure(fig) {
  const root = frame(fig, {
  });
  const panes = tabs(root, familyTabs('lps-t-'), 'family');
  FAMS.forEach((f, i) => {
    const t = TASKS[f], body = H('div', { class: 'panel-body' });
    body.appendChild(H('p', {}, esc(t.app)));
    const top = H('div', { class: 'task-top' });
    top.appendChild(H('div', { class: 'formula' }, esc(t.tex)));
    const sk = H('div', { class: 'sk' });
    sk.appendChild(schematic(f));
    sk.appendChild(H('div', { class: 'schem-cap' }, 'Sparsity sketch, not to scale'));
    top.appendChild(sk);
    body.appendChild(top);
    body.appendChild(H('div', { class: 'facts-inline' }, t.facts.map(([k, v]) => `<span><span class="muted">${esc(k)}:</span> ${esc(v)}</span>`).join('')));
    body.appendChild(H('div', {}, `<div class="lbl">Structure to exploit</div><ul class="tight">${t.exploit.map(x => `<li>${esc(x)}</li>`).join('')}</ul>`));
    const pub = t.rows.filter(r => r[5]).map(r => r[1]).join(', ');
    body.appendChild(H('details', { class: 'more', 'data-sync': 'task-instances' }, `<summary>Instances: 4 dev, 4 held-out (public: <span class="mono">${esc(pub)}</span>)</summary><div class="tbl-wrap"><table class="t"><thead><tr><th>Split</th><th>Instance</th><th class="r">Rows</th><th class="r">Columns</th><th>Source</th></tr></thead><tbody>${t.rows.map(r => `<tr><td class="muted">${r[0]}</td><td class="mono">${r[1]}</td><td class="r">${r[2]}</td><td class="r">${r[3]}</td><td>${r[5] ? `<span class="pill pub">public</span> ` : ''}${esc(r[4])}</td></tr>`).join('')}</tbody></table></div>`));
    panes[i].appendChild(body);
  });
  syncDetails(root);
  // The site loads MathJax asynchronously: if it has started, typeset the formulas now,
  // otherwise its startup pass picks them up.
  if (window.MathJax && MathJax.startup && MathJax.startup.promise) MathJax.startup.promise.then(() => MathJax.typesetPromise([fig]));
}

// ---------- Figure 2: development ----------
// Estimated list-price API cost, USD per million tokens. Opus 5.5: Anthropic API rates, cache writes at the
// 5-minute rate (1.25x input). GPT-6-Astra: published third-party summaries of OpenAI's standard tier.
// Codex reports input_tokens including cache reads, so fresh input = input - cached.
const PRICE = {
  'opus55-max': { inp: 4, cw: 5, cache: 0.2, out: 20 },
  'astra-high': { inp: 10, cw: 10, cache: 1, out: 50 },
};
function apiCost(a, u) {
  if (!u || u.out == null) return null;
  const p = PRICE[a], cache = u.cache || 0;
  const fresh = a === 'astra-high' ? Math.max(0, (u.inp || 0) - cache) : (u.inp || 0);
  return (fresh * p.inp + cache * p.cache + (u.cw || 0) * p.cw + u.out * p.out) / 1e6;
}
const usageN = u => ({ inp: u.input_tokens, cache: u.cached_input_tokens, cw: u.cache_creation_input_tokens, out: u.output_tokens });
const runCost = (fam, a) => apiCost(a, usageN(DATA.runs[`${fam}/${a}`].usage));
const fmtUSD = v => v == null ? '—' : '$' + (v >= 100 ? v.toFixed(0) : v.toFixed(v >= 10 ? 1 : 2));
// The run explorer on Hugging Face, opened at the code of one submission of a v1 run.
const SPACE = 'https://huggingface.co/spaces/yuanchenyang/lp-benchmark-results';
const codeUrl = (fam, a, id) => `${SPACE}#/results?${new URLSearchParams({ run: `${fam}-v1-${a}-20261028`, tab: 'code', rev: id })}`;
// The two development charts of a family share one hover: the pointer snaps to the nearest
// submission, and both charts mark it with a vertical line and a ring around its point.
function devLink(fam) {
  const events = AGENTS.flatMap(a => { const r = DATA.runs[`${fam}/${a}`]; return r.timeline.map(e => ({ a, e, sel: e.id === r.selected })); });
  const views = {};
  const tip = ({ a, e, sel }) => `<div class="tt-h">${AG[a].label} · ${e.id}${sel ? ' · selected' : ''}</div>${ttRow('Minute', e.min.toFixed(0))}${ttRow('Dev score', e.eligible ? fmtS(e.score) : 'ineligible')}${ttRow('Solved', e.solved + '/' + DATA.families[fam].dev.length)}${e.out != null ? ttRow('Output tokens so far', fmtTok(e.out)) + ttRow('All tokens processed', fmtTok(e.total)) + ttRow('Est. API cost so far', fmtUSD(apiCost(a, e))) : ''}<div class="tt-n">${esc(e.note || '')}</div>`;
  return { events, views, tip, show: hit => Object.values(views).forEach(fn => fn(hit)) };
}
// Adds a chart's view of the shared hover: `pointY(a, e)` is the y of that submission's point here, or null.
function snapOverlay(svg, link, name, x, box, pointY) {
  const cross = S('line', { y1: box.y0, y2: box.y1, class: 'cross', visibility: 'hidden' }, svg);
  const ring = S('circle', { r: 7.5, class: 'ring', visibility: 'hidden' }, svg);
  link.views[name] = hit => {
    const py = hit && pointY(hit.a, hit.e);
    cross.setAttribute('visibility', hit ? 'visible' : 'hidden');
    ring.setAttribute('visibility', py != null && hit ? 'visible' : 'hidden');
    if (!hit) return;
    const px = x(hit.e.min);
    cross.setAttribute('x1', px); cross.setAttribute('x2', px);
    if (py != null) { ring.setAttribute('cx', px); ring.setAttribute('cy', py); ring.style.stroke = AG[hit.a].color; }
  };
  const area = S('rect', { x: box.x0 - 8, y: box.y0, width: box.x1 - box.x0 + 16, height: box.y1 - box.y0, style: 'fill:transparent' }, svg);
  // Nearest in time; the pointer's height picks between the agents when their submissions are close.
  const nearest = ev => {
    const b = svg.getBoundingClientRect(), qx = ev.clientX - b.left, qy = ev.clientY - b.top;
    let best = null, bd = Infinity;
    for (const it of link.events) {
      const py = pointY(it.a, it.e), d = Math.abs(x(it.e.min) - qx) + 0.3 * (py == null ? 0 : Math.abs(py - qy));
      if (d < bd) { bd = d; best = it; }
    }
    return best;
  };
  area.addEventListener('pointermove', ev => { const hit = nearest(ev); link.show(hit); showTip(ev, link.tip(hit)); });
  area.addEventListener('pointerleave', () => { link.show(null); hideTip(); });}
function devScoreChart(fam, link) {
  return (el, W) => {
    const Hh = 280, m = { l: 58, r: 120, t: 18, b: 36 };
    const svg = S('svg', { width: W, height: Hh }, el);
    const runs = AGENTS.map(a => ({ a, r: DATA.runs[`${fam}/${a}`] }));
    const gps = gpKeys(fam).map(k => ({ k, s: solverScore(fam, k, 'dev') })).sort((x, y) => x.s - y.s);
    const vals = [];
    runs.forEach(({ r }) => r.timeline.forEach(e => { if (e.eligible && e.score) vals.push(e.score); }));
    gps.forEach(g => vals.push(g.s));
    const lo = Math.min(...vals) / 1.6, hi = Math.max(...vals) * 1.6;
    const failY = m.t + 6;
    const x = linS(0, 120, m.l, W - m.r), y = logS(hi, lo, m.t + 22, Hh - m.b);
    const ax = S('g', { class: 'ax' }, svg);
    logTicks(lo, hi).forEach(v => { S('line', { x1: m.l, x2: W - m.r, y1: y(v), y2: y(v), class: 'grid-line' }, ax); T(ax, m.l - 6, y(v) + 4, tickS(v), '', { 'text-anchor': 'end' }); });
    [0, 30, 60, 90, 120].forEach(v => T(ax, x(v), Hh - m.b + 16, v + ' min', '', { 'text-anchor': 'middle' }));
    S('line', { x1: m.l, x2: W - m.r, y1: Hh - m.b, y2: Hh - m.b, class: 'base-line' }, ax);
    T(ax, m.l - 6, failY + 4, 'ineligible', '', { 'text-anchor': 'end' });
    S('line', { x1: m.l, x2: W - m.r, y1: failY + 11, y2: failY + 11, class: 'grid-line', 'stroke-dasharray': '2 3' }, ax);
    // general-purpose dev scores
    let lastY = -99;
    gps.slice().sort((a, b) => y(a.s) - y(b.s)).forEach(g => {
      const meta = solverMeta(g.k, fam), yy = y(g.s);
      S('line', { x1: m.l, x2: W - m.r, y1: yy, y2: yy, style: `stroke:${meta.color};stroke-width:1.2;stroke-dasharray:5 4` }, svg);
      const ly = Math.max(yy + 4, lastY + 13); lastY = ly;
      marker(svg, meta.shape, W - m.r + 9, ly - 4, 4, { style: `fill:${meta.color}` });
      T(svg, W - m.r + 17, ly, `${meta.label} ${fmtS(g.s)}`, 'lab');
    });
    runs.forEach(({ a, r }) => {
      const col = AG[a].color;
      let best = Infinity; const pts = [];
      r.timeline.forEach(e => { if (e.eligible && e.score < best) { if (pts.length) pts.push([e.min, best]); best = e.score; pts.push([e.min, best]); } });
      if (pts.length) {
        pts.push([120, best]);
        S('path', { d: 'M' + pts.map(([mi, s]) => `${x(mi)} ${y(s)}`).join('L'), style: `fill:none;stroke:${col};stroke-width:2;stroke-linejoin:round` }, svg);
      }
      r.timeline.forEach(e => {
        const sel = e.id === r.selected;
        const g = S('g', {}, svg);
        if (e.eligible && e.score) S('circle', { cx: x(e.min), cy: y(e.score), r: sel ? 6 : 3.8, 'data-ev': `${fam}:${a}:${e.id}`, style: `fill:${sel ? 'var(--surface)' : col};stroke:${sel ? col : 'var(--surface)'};stroke-width:${sel ? 3 : 1.5}` }, g);
        else crossMark(g, x(e.min), failY, 3.5, col, { 'data-ev': `${fam}:${a}:${e.id}` });
      });
    });
    snapOverlay(svg, link, 'score', x, { x0: m.l, x1: W - m.r, y0: failY - 8, y1: Hh - m.b }, (a, e) => e.eligible && e.score ? y(e.score) : failY);
  };
}
function tokenChart(fam, modeRef, link) {
  return (el, W) => {
    const Hh = 220, m = { l: 58, r: 20, t: 14, b: 36 };
    const svg = S('svg', { width: W, height: Hh }, el);
    const mode = modeRef.mode;
    const val = (u, a) => {
      if (!u || u.out == null) return null;
      if (mode === 'out') return u.out;
      if (mode === 'cost') return apiCost(a, u);
      return u.total;
    };
    const fmtV = mode === 'cost' ? fmtUSD : fmtTok;
    const series = AGENTS.map(a => {
      const r = DATA.runs[`${fam}/${a}`];
      const pts = r.timeline.map(e => ({ m: e.min, v: val(e, a), id: e.id })).filter(p => p.v != null);
      const u = r.usage; pts.push({ m: Math.min(120, r.dev_wall / 60), v: mode === 'out' ? u.output_tokens : mode === 'cost' ? runCost(fam, a) : u.total_tokens, id: 'end of budget' });
      return { a, pts: [{ m: 0, v: 0, id: 'start' }, ...pts] };
    });
    const hi = Math.max(...series.flatMap(s => s.pts.map(p => p.v))) * 1.08;
    const x = linS(0, 120, m.l, W - m.r), y = linS(0, hi, Hh - m.b, m.t);
    const ax = S('g', { class: 'ax' }, svg);
    const step = Math.pow(10, Math.floor(Math.log10(hi))) * (hi / Math.pow(10, Math.floor(Math.log10(hi))) > 4 ? 1 : 0.5);
    for (let v = 0; v <= hi; v += step) { S('line', { x1: m.l, x2: W - m.r, y1: y(v), y2: y(v), class: v ? 'grid-line' : 'base-line' }, ax); T(ax, m.l - 6, y(v) + 4, mode === 'cost' ? '$' + +v.toPrecision(3) : fmtTok(v), '', { 'text-anchor': 'end' }); }
    [0, 30, 60, 90, 120].forEach(v => T(ax, x(v), Hh - m.b + 16, v + ' min', '', { 'text-anchor': 'middle' }));
    let prevLabelY = -99;
    series.forEach(({ a, pts }) => {
      const col = AG[a].color;
      S('path', { d: 'M' + pts.map(p => `${x(p.m)} ${y(p.v)}`).join('L'), style: `fill:none;stroke:${col};stroke-width:2;stroke-linejoin:round` }, svg);
      pts.slice(1).forEach((p, i) => {
        const last = i === pts.length - 2;
        S('circle', { cx: x(p.m), cy: y(p.v), r: last ? 4.5 : 2.6, style: `fill:${col};stroke:var(--surface);stroke-width:1.5` }, svg);
      });
      // End labels sit above their point, or below it when that would collide with the first label.
      const lp = pts[pts.length - 1];
      let ly = y(lp.v) - 8;
      if (Math.abs(ly - prevLabelY) < 13) ly = y(lp.v) + 18;
      prevLabelY = ly;
      T(svg, x(lp.m) - 8, ly, fmtV(lp.v), 'val', { 'text-anchor': 'end' });
    });
    snapOverlay(svg, link, 'tokens', x, { x0: m.l, x1: W - m.r, y0: m.t, y1: Hh - m.b }, (a, e) => { const v = val(e, a); return v == null ? null : y(v); });
  };
}
const LANG = {
  'storm/opus55-max': 'C++ · OpenMP', 'storm/astra-high': 'C++ · OpenMP · SuiteSparse',
  'setcover/opus55-max': 'C++ · OpenBLAS', 'setcover/astra-high': 'C++ · OpenBLAS · CHOLMOD',
  'pmedian/opus55-max': 'C++ · OpenMP', 'pmedian/astra-high': 'C++ · LAPACK',
  'cflp/opus55-max': 'Python · CuPy kernels', 'cflp/astra-high': 'CUDA C++',
  'qap/opus55-max': 'CUDA C++', 'qap/astra-high': 'CuPy kernels · C++',
};
function agentCard(root, fam, a) {
  const r = DATA.runs[`${fam}/${a}`], s = SUM[fam][a], u = r.usage;
  const hoS = solverScore(fam, a, 'heldout'), gpH = bestGP(fam, 'heldout');
  const elig = r.timeline.filter(e => e.eligible).length;
  const sessions = u.sessions || 1;
  const evs = Object.fromEntries(r.timeline.map(e => [e.id, e]));
  const card = H('div', { class: 'agent-card' });
  card.innerHTML = `
    <div class="who"><span class="sw ${AG[a].cls}"></span><h3>${AG[a].label}</h3><span class="pill">${esc(LANG[`${fam}/${a}`])}</span></div>
    <p>${esc(s.headline)}</p>
    <div class="stats">
      <div class="stat"><div class="v">${fmtX(gpH.score / hoS)}</div><div class="l">held-out speedup<br>${fmtS(hoS)} vs ${fmtS(gpH.score)}</div></div>
      <div class="stat"><div class="v">${r.timeline.length}</div><div class="l">submissions<br>${elig} eligible</div></div>
      <div class="stat"><div class="v">${fmtUSD(runCost(fam, a))}</div><div class="l">est. API cost<br>${sessions} session${sessions > 1 ? 's' : ''}</div></div>
      <div class="stat"><div class="v">${fmtTok(u.output_tokens)}</div><div class="l">output tokens<br>${fmtTok(u.total_tokens)} processed</div></div>
    </div>
    <div class="folds">
    <a class="code-btn" href="${esc(codeUrl(fam, a, r.selected))}" target="_blank" rel="noopener" title="Code of the selected submission (${esc(r.selected)}) on Hugging Face">View code ↗</a>
    <details class="fold" data-sync="dev-structure"><summary>Structure exploited</summary><ul class="tight small">${s.structure.map(x => `<li>${esc(x)}</li>`).join('')}</ul></details>
    <details class="fold" data-sync="dev-log"><summary>Dev log</summary><ol class="devlog">${s.log.map(([mi, id, text]) => { const e = evs[id]; return `<li data-ev="${fam}:${a}:${id}"><span class="t">${mi} min</span><span class="lt">${esc(text)}</span><span class="sc">${e ? (e.eligible ? fmtS(e.score) : 'ineligible') : ''}</span><a class="cl" href="${esc(codeUrl(fam, a, id))}" target="_blank" rel="noopener" title="Code of ${esc(id)} on Hugging Face">code ↗</a></li>`; }).join('')}</ol></details>
    <details class="fold" data-sync="dev-method"><summary>Method, fallbacks and dead ends</summary>
      <div class="small" style="display:grid;gap:8px">
        <p>${esc(s.approach)}</p>
        <p><span class="muted">Off-pattern inputs:</span> ${esc(s.fallback)}</p>
        <p><span class="muted">Tried and dropped:</span> ${s.deadends.map(esc).join('; ')}.</p>
      </div>
    </details>
    </div>`;
  // Hovering a dev-log entry highlights its submission in the score chart.
  card.querySelectorAll('.devlog li[data-ev]').forEach(li => {
    const k = li.getAttribute('data-ev');
    li.addEventListener('pointerenter', () => root.querySelectorAll(`[data-ev="${k}"]`).forEach(e => e.classList.add(e.tagName === 'LI' ? 'on' : 'hl')));
    li.addEventListener('pointerleave', () => root.querySelectorAll(`[data-ev="${k}"]`).forEach(e => e.classList.remove('hl', 'on')));
  });
  return card;
}
function instTable(fam) {
  const f = DATA.families[fam];
  const rows = [];
  for (const split of ['dev', 'heldout']) f[split].forEach(i => {
    const b = bestGPInst(fam, split, i);
    const cell = a => { const r = f.solvers[a][split][i]; return r && r.t != null ? fmtS(r.t) : `<span style="color:var(--critical)">✕ ${esc(statusOf(r && r.status).label)}</span>`; };
    rows.push(`<tr><td class="muted">${split}</td><td class="mono">${i}</td><td class="r">${cell('opus55-max')}</td><td class="r">${cell('astra-high')}</td><td class="r">${b ? fmtS(b.t) : '—'}</td><td>${b ? solverMeta(b.key, fam).label : ''}</td></tr>`);
  });
  return `<div class="tbl-wrap"><table class="t"><thead><tr><th>Split</th><th>Instance</th><th class="r">Opus</th><th class="r">Astra</th><th class="r">Best GP</th><th>GP solver</th></tr></thead><tbody>${rows.join('')}</tbody></table></div>`;
}
function developmentFigure(fig) {
  const root = frame(fig, {
  });
  const modeSegs = [], tokenRefs = [], tokenCharts = [];
  function setMode(md) {
    tokenRefs.forEach(r => r.mode = md);
    modeSegs.forEach(sg => [...sg.children].forEach((b, j) => b.setAttribute('aria-pressed', ['out', 'all', 'cost'][j] === md ? 'true' : 'false')));
    tokenCharts.forEach(draw);
  }
  const panes = tabs(root, familyTabs('lps-d-'), 'family');
  FAMS.forEach((f, i) => {
    const body = H('div', { class: 'panel-body' }), link = devLink(f);
    const g = H('div', { class: 'grid2' });
    const c1 = H('div', { class: 'cell' });
    c1.innerHTML = `<div class="chart-title"><h4>Dev score over the 2-hour budget</h4>${legendHTML([{ label: 'Opus', color: 'var(--opus)' }, { label: 'Astra', color: 'var(--astra)' }, { label: 'selected', color: 'var(--ink-2)', hollow: true }])}</div>`;
    const e1 = H('div', { class: 'chart' }); c1.appendChild(e1);
    chart(e1, devScoreChart(f, link));
    const c2 = H('div', { class: 'cell' });
    const modeRef = { mode: 'out' };
    const e2 = H('div', { class: 'chart' });
    const head = H('div', { class: 'chart-title' }, '<h4>Cumulative tokens</h4>');
    const modeSeg = segmented(['Output', 'All processed', 'API cost'], 0, j => setMode(['out', 'all', 'cost'][j]));
    modeSegs.push(modeSeg); tokenRefs.push(modeRef);
    head.appendChild(modeSeg);
    c2.appendChild(head); c2.appendChild(e2);
    c2.appendChild(H('p', { class: 'caption' }, 'Cost is an estimate at list API prices.'));
    tokenCharts.push(chart(e2, tokenChart(f, modeRef, link)));
    g.appendChild(c1); g.appendChild(c2); body.appendChild(g);
    const ag = H('div', { class: 'agents' });
    AGENTS.forEach(a => ag.appendChild(agentCard(root, f, a)));
    body.appendChild(ag);
    body.appendChild(H('details', { class: 'fold', 'data-sync': 'dev-instances' }, `<summary>Per-instance times for the selected revisions</summary>${instTable(f)}`));
    panes[i].appendChild(body);
  });
  syncDetails(root);
}

// ---------- Figure 3: every solver, per task ----------
function speedupFigure(fig) {
  const splitD = { split: 'heldout' };
  const root = frame(fig, {
    sub: 'Compared with the best general-purpose solver for each family: MOSEK, COPT barrier and HiGHS HiPO on CPU; HPR-LP, cuOpt and COPT PDLP on GPU.',
    legend: legendHTML([{ label: 'Opus', color: 'var(--opus)', shape: 'square' }, { label: 'Astra', color: 'var(--astra)', shape: 'square' }, { label: 'general-purpose', color: 'var(--gp2)', shape: 'square' }, { label: 'one instance', color: 'var(--ink)' }, { label: 'failed (counts as 300 s)', color: 'var(--critical)', cross: true }]),
    caption: 'Bars are the benchmark score, the shifted geometric mean of solve times. The right column gives the score and its speedup over the best general-purpose solver.',
  });
  const ctl = H('div', { class: 'toolbar' });
  const el = H('div', { class: 'chart' });
  let c;
  ctl.appendChild(segmented(['Held-out set', 'Dev set', 'OOD set'], 0, j => { splitD.split = ['heldout', 'dev', 'ood'][j]; draw(c); }));
  root.appendChild(ctl); root.appendChild(el);
  c = chart(el, (el, W) => {
    const split = splitD.split;
    const cols = W >= 900 ? 2 : 1, gapX = 32;
    const pw = (W - gapX * (cols - 1)) / cols;
    const narrow = pw < 460;
    // Phone-width panels put each solver's name above its bar, giving the axis the full width.
    const stack = pw < 400;
    const lw = stack ? 18 : 104, rv = narrow ? 92 : 112, rh = stack ? 34 : 21, head = 26, foot = 22;
    const nRows = f => Object.keys(DATA.families[f].solvers).length;
    const ph = f => head + nRows(f) * rh + foot;
    let lo = Infinity;
    FAMS.forEach(f => Object.values(DATA.families[f].solvers).forEach(v => Object.values(v[split]).forEach(r => { if (r.t != null) lo = Math.min(lo, r.t); })));
    lo = Math.pow(10, Math.floor(Math.log10(lo)));
    const slots = FAMS.length + (cols === 2 && FAMS.length % 2 ? 1 : 0);
    const rowH = []; for (let k = 0; k < slots; k += cols) rowH.push(Math.max(...FAMS.slice(k, k + cols).map(ph), ph(FAMS[0])));
    const Hh = rowH.reduce((a, b) => a + b + 18, 0);
    const svg = S('svg', { width: W, height: Hh }, el);
    const failX = pw - rv - 12;
    const x = logS(lo, 300, lw, failX - 16);
    // Under 36 px per decade, keep every other decade so tick labels do not collide.
    const sparse = (failX - 16 - lw) / Math.log10(300 / lo) < 36;
    const ticks = logTicks(lo, 300).filter(v => !sparse || Math.round(Math.log10(v)) % 2 === 0);
    const slot = k => ({ ox: (k % cols) * (pw + gapX), oy: rowH.slice(0, Math.floor(k / cols)).reduce((a, b) => a + b + 18, 0) });
    FAMS.forEach((f, k) => {
      const { ox, oy } = slot(k);
      const g = S('g', { transform: `translate(${ox},${oy})` }, svg);
      const fd = DATA.families[f], n = fd[split].length;
      const gp = bestGP(f, split);
      const rows = Object.keys(fd.solvers).map(key => ({ key, s: solverScore(f, key, split), ts: times(f, key, split) })).sort((p, q) => p.s - q.s);
      T(g, 0, 16, FAM_NAME[f], 'grp');
      T(g, pw, 16, `${fd.target.toUpperCase()} · ${n} ${split === 'dev' ? 'dev' : split === 'ood' ? 'OOD' : 'held-out'} instances`, 'ax', { 'text-anchor': 'end' });
      const top = head, bot = head + rows.length * rh;
      ticks.forEach(v => { S('line', { x1: x(v), x2: x(v), y1: top, y2: bot, class: 'grid-line' }, g); T(g, x(v), bot + 14, tickS(v), 'ax', { 'text-anchor': 'middle' }); });
      S('line', { x1: failX - 7, x2: failX - 7, y1: top, y2: bot, class: 'base-line', 'stroke-dasharray': '2 3' }, g);
      T(g, failX, bot + 14, 'fail', 'ax', { 'text-anchor': 'middle' });
      rows.forEach((r, j) => {
        const meta = solverMeta(r.key, f), agent = !!AG[r.key];
        const cy = top + j * rh + (stack ? 25 : rh / 2), ly = stack ? cy - 14 : cy;
        const rg = S('g', {}, g);
        marker(rg, agent ? 'circle' : meta.shape, 6, ly, 4.2, { style: `fill:${meta.color}` });
        T(rg, 16, ly + 4, agent ? AG[r.key].short : meta.label, agent ? 'lab-strong' : 'lab');
        const bar = S('rect', { x: lw, y: cy - 5, width: Math.max(2, x(r.s) - lw), height: 10, rx: 2, style: `fill:${meta.color};opacity:${agent ? 1 : 0.85}` }, rg);
        let nfail = 0;
        r.ts.forEach((t, q) => {
          const inst = fd[split][q], rec = fd.solvers[r.key][split][inst];
          const dg = S('g', {}, rg);
          let px;
          if (t != null) { px = x(t); S('circle', { cx: px, cy, r: 2.8, style: 'fill:var(--ink);stroke:var(--surface);stroke-width:1.2' }, dg); }
          else { px = failX + (nfail++ - 0.5) * 6; crossMark(dg, px, cy, 3, 'var(--critical)'); }
          const hit = S('circle', { cx: px, cy, r: 6, style: 'fill:transparent' }, dg);
          hover(hit, () => `<div class="tt-h">${esc(meta.label)} · ${esc(inst)}</div>${t != null ? ttRow('Solve time', fmtS(t)) : ttRow('Result', esc(statusOf(rec && rec.status).label))}${split === 'ood' ? `<div class="tt-n">${esc(OOD_SHIFT[f][inst])}</div>` : ''}`);
        });
        const sp = gp.score / r.s, solved = r.ts.filter(t => t != null).length;
        T(rg, pw - rv + 4, cy + 4, fmtS(r.s), 'val');
        T(rg, pw, cy + 4, r.key === gp.key ? '1×' : fmtX(sp), agent ? 'lab-strong' : 'ax', { 'text-anchor': 'end', style: agent ? '' : 'font-size:11.5px' });
        const hitRow = S('rect', stack ? { x: 0, y: ly - 9, width: 120, height: 16, style: 'fill:transparent' } : { x: 0, y: cy - rh / 2, width: lw - 4, height: rh, style: 'fill:transparent' }, rg);
        const tipRow = () => `<div class="tt-h">${esc(meta.label)} on ${FAM_NAME[f]}</div>${fd[split].map((inst, q) => ttRow(esc(inst), r.ts[q] != null ? fmtS(r.ts[q]) : esc(statusOf((fd.solvers[r.key][split][inst] || {}).status).label))).join('')}${ttRow('Score', fmtS(r.s))}${ttRow('Verified', `${solved}/${n}`)}${r.key === gp.key ? '<div class="tt-n">Best general-purpose solver on this set</div>' : ttRow('vs ' + solverMeta(gp.key, f).label, fmtX(sp))}`;
        hover(hitRow, tipRow);
        hover(bar, tipRow);
      });
    });
    if (slots > FAMS.length) {
      const { ox, oy } = slot(FAMS.length);
      const g = S('g', { transform: `translate(${ox},${oy})` }, svg);
      T(g, 0, 16, 'How to read a row', 'grp');
      const cy = head + 22, bx = 24, bx1 = Math.min(pw - 40, 220);
      S('rect', { x: bx, y: cy - 5, width: bx1 - bx, height: 10, rx: 2, style: 'fill:var(--gp2)' }, g);
      [bx + 30, bx + 90, bx1 + 40].forEach(px => S('circle', { cx: px, cy, r: 2.8, style: 'fill:var(--ink);stroke:var(--surface);stroke-width:1.2' }, g));
      crossMark(g, bx1 + 90, cy, 3, 'var(--critical)');
      const note = (y, t) => T(g, bx, y, t, 'lab');
      note(cy + 24, 'Bar length: benchmark score, the shifted geometric');
      note(cy + 39, 'mean of solve seconds over the set.');
      note(cy + 56, 'Dots: individual instances. Crosses: failed or');
      note(cy + 71, 'unverified, scored as 300 s.');
      note(cy + 88, 'Right column: score, then speedup vs the best');
      note(cy + 103, 'general-purpose solver on that set.');
    }
  });
}

// ---------- Figure 4: v1 → OOD speedup shift ----------
const OOD_SHIFT = {
  storm: { 'storm-split-s300': 'Split-variable form: each scenario gets its own copy of the first-stage columns, chained by x_s − x_{s+1} = 0, so no column links all scenarios.', 'storm-outage-s300': 'Each scenario loses 3% of its routing columns, so scenario blocks no longer share one sparsity pattern.' },
  setcover: { rail4284: 'Real crew scheduling (Mittelmann): 4,284 × 1.09M, costs 1–2, at most ~10 rows per column, highly degenerate.', rail2586: 'Real crew scheduling (OR-Library): 2,586 × 921k, same character as rail4284.', 'scp-multicover-5000x500k': 'scpm1 shape, but rows need 1–3 covers and cost = 10·|S_j| + U{0..9}, so cheap columns cover few rows.' },
  pmedian: { 'pmedian-1000-p5': 'Same generator with very few medians (p = 5): about 200 competitive medians per vertex.', 'pmedian-weighted-1200x300-p15': '1,200 weighted customers and 300 candidate sites, so customers and sites are separate index sets. Planar distances.', 'u1060-p10': 'TSPLIB u1060 point set with rounded Euclidean distances and p = 10.' },
  cflp: { 'cflp-agg-500-r10': 'Adds the aggregate capacity row Σ s_j y_j ≥ Σ d_i found in many published formulations.', 'capb-5000': 'OR-Library capb (Beasley): a different generator, 100 sites × 1,000 customers.', 'cflp-100x10000-r5': '100 sites × 10,000 customers, where v1 had at most 2.5 customers per site.' },
  qap: { 'qap-jitter-3x9': 'Grid cells jittered by U(−0.3, 0.3), which breaks the grid\'s exact symmetries.', kra30a: 'QAPLIB kra30a: hospital layout distances and sparse flows.', tai30a: 'QAPLIB tai30a: uniform random flows and distances, no structure.' },
};
const OOD_TAG = {
  'storm-split-s300': 'split variables, no linking cols', 'storm-outage-s300': '3% column outages per scenario',
  rail4284: 'real crew scheduling, 1.09M cols', rail2586: 'real crew scheduling, 921k cols', 'scp-multicover-5000x500k': '1–3 covers, size-based costs',
  'pmedian-1000-p5': 'very few medians (p = 5)', 'pmedian-weighted-1200x300-p15': 'weighted customers, separate sites', 'u1060-p10': 'TSPLIB points, Euclidean, p = 10',
  'cflp-agg-500-r10': '+ aggregate capacity row', 'capb-5000': 'OR-Library capb generator', 'cflp-100x10000-r5': '100 sites × 10,000 customers',
  'qap-jitter-3x9': 'jittered grid, symmetry broken', kra30a: 'QAPLIB hospital layout', tai30a: 'QAPLIB uniform random',
};
function oodFigure(fig) {
  const root = frame(fig, {
    legend: legendHTML([{ label: 'v1 held-out', color: 'var(--ink-2)', hollow: true }, { label: 'OOD held-out', color: 'var(--ink-2)' }, { label: 'Opus', color: 'var(--opus)' }, { label: 'Astra', color: 'var(--astra)' }, { label: 'one OOD instance', color: 'var(--ink)', small: true }, { label: 'failed instance', color: 'var(--critical)', cross: true }]),
    caption: 'Unverified OOD instances count as 300 s.',
  });
  const el = H('div', { class: 'chart' });
  root.appendChild(el);
  chart(el, (el, W) => {
    const narrow = W < 520;
    // Narrow layouts drop the agent names (the colours tell them apart) and keep decade ticks only.
    const m = { l: narrow ? 40 : 58, r: narrow ? 56 : 100, t: 30, b: 22 }, rh = 24, tagH = 14, gap = 12;
    const right = W - m.r;
    const x = logS(0.1, 300, m.l, right - 4);
    // The OOD shifts follow each family name on its line, wrapping to the plot width.
    const nameW = f => FAM_NAME[f].length * 7.6 + 14;
    const tagLines = f => {
      const lines = []; let cur = '', avail = right - nameW(f);
      DATA.families[f].ood.forEach(i => {
        const next = cur ? `${cur} · ${OOD_TAG[i]}` : OOD_TAG[i];
        if (next.length * 5.9 > avail) { lines.push(cur); cur = OOD_TAG[i]; avail = right; } else cur = next;
      });
      lines.push(cur);
      return lines;
    };
    const headH = f => 20 + (tagLines(f).length - 1) * tagH;
    const gH = f => headH(f) + 2 * rh + gap;
    const Hh = m.t + m.b + FAMS.reduce((a, f) => a + gH(f), 0) - gap;
    const svg = S('svg', { width: W, height: Hh }, el);
    const ax = S('g', { class: 'ax' }, svg);
    logTicks(0.1, 300).filter(v => !narrow || Number.isInteger(Math.log10(v))).forEach(v => { S('line', { x1: x(v), x2: x(v), y1: m.t - 6, y2: Hh - m.b, class: 'grid-line' }, ax); T(ax, x(v), m.t - 12, tickX(v), '', { 'text-anchor': 'middle' }); });
    S('line', { x1: x(1), x2: x(1), y1: m.t - 6, y2: Hh - m.b, style: 'stroke:var(--ink-2);stroke-width:1.2' }, svg);
    T(svg, x(1) - 5, Hh - 4, narrow ? '← slower' : '← slower than best general-purpose', 'ax', { 'text-anchor': 'end' });
    T(svg, x(1) + 5, Hh - 4, 'faster →', 'ax');
    T(svg, W, m.t - 12, narrow ? 'verified' : 'OOD verified', 'ax', { 'text-anchor': 'end' });
    let yy = m.t;
    FAMS.forEach(f => {
      const g1 = bestGP(f, 'heldout'), go = bestGP(f, 'ood'), n = DATA.families[f].ood.length;
      // Family header on a white band, so grid lines do not run through the text.
      const lines = tagLines(f), hh = headH(f);
      S('rect', { x: 0, y: yy, width: W, height: hh - 2, style: 'fill:var(--surface)' }, svg);
      T(svg, 0, yy + 14, FAM_NAME[f], 'lab-strong');
      T(svg, W, yy + 14, DATA.families[f].target.toUpperCase(), 'ax', { 'text-anchor': 'end' });
      const tagG = S('g', {}, svg);
      lines.forEach((line, q) => T(tagG, q ? 0 : nameW(f), yy + 14 + q * tagH, line, 'ax'));
      hover(tagG, () => `<div class="tt-h">${FAM_NAME[f]}: OOD shifts</div>${DATA.families[f].ood.map(i => `<div class="tt-n"><b>${esc(i)}</b>: ${esc(OOD_SHIFT[f][i])}</div>`).join('')}`);
      yy += hh;
      AGENTS.forEach((a, j) => {
        const cy = yy + j * rh + rh / 2;
        const s1 = g1.score / solverScore(f, a, 'heldout'), so = go.score / solverScore(f, a, 'ood');
        const col = AG[a].color;
        if (!narrow) T(svg, m.l - 12, cy + 4, AG[a].short, 'lab', { 'text-anchor': 'end' });
        const x1 = x(s1), x2 = x(so), dir = x2 < x1 ? -1 : 1;
        // shaft starts clear of the hollow v1 dot; the head's tip stops 3 px short of the OOD dot
        const tipX = x2 - dir * 9, base = tipX - dir * 9;
        if (Math.abs(x2 - x1) > 30) {
          S('line', { x1: x1 + dir * 6, x2: base + dir * 1, y1: cy, y2: cy, style: `stroke:${col};stroke-width:2.5` }, svg);
          S('path', { d: `M${base} ${cy - 5.5}L${tipX} ${cy}L${base} ${cy + 5.5}Z`, style: `fill:${col}` }, svg);
        } else if (Math.abs(x2 - x1) > 12) S('line', { x1: x1 + dir * 6, x2: x2 - dir * 6, y1: cy, y2: cy, style: `stroke:${col};stroke-width:2.5` }, svg);
        S('circle', { cx: x1, cy, r: 5, style: `fill:var(--surface);stroke:${col};stroke-width:2` }, svg);
        S('circle', { cx: x2, cy, r: 5.5, style: `fill:${col};stroke:var(--surface);stroke-width:1.5` }, svg);
        const sv = solvedCount(f, a, 'ood');
        T(svg, W, cy + 4, `${sv}/${n}`, sv < n ? 'val short' : 'ax', { 'text-anchor': 'end' });
        const hit = S('rect', { x: Math.min(x1, x2) - 8, y: cy - 10, width: Math.abs(x2 - x1) + 16, height: 20, style: 'fill:transparent' }, svg);
        hover(hit, () => `<div class="tt-h">${AG[a].label} · ${FAM_NAME[f]}</div>${ttRow('v1 held-out', `${fmtS(solverScore(f, a, 'heldout'))} · ${fmtX(s1)} vs ${solverMeta(g1.key, f).label}`)}${ttRow('OOD held-out', `${fmtS(solverScore(f, a, 'ood'))} · ${fmtX(so)} vs ${solverMeta(go.key, f).label}`)}${ttRow('OOD verified', `${sv}/${n}`)}`);
        // One dot per OOD instance at its own speedup over the fastest general-purpose solver
        // on it; failed instances are crosses at the left edge.
        const dots = DATA.families[f].ood.map(i => {
          const rec = DATA.families[f].solvers[a].ood[i], b = bestGPInst(f, 'ood', i), ok = rec && rec.t != null;
          const sp = ok && b ? b.t / rec.t : null;
          return { i, rec, b, ok, sp, px: sp ? x(Math.min(300, Math.max(0.1, sp))) : x(0.1) };
        });
        // Labels sit outside the arrow, v1 behind its tail and OOD beyond its head, moved further
        // out past any dot that would fall under them.
        const place = (x0, d, text) => {
          const w = text.length * 6.6;
          for (let moved = true; moved;) {
            moved = false;
            for (const o of dots) {
              const lo = Math.min(x0, x0 + d * w) - 5, hi = Math.max(x0, x0 + d * w) + 5;
              if (o.px >= lo && o.px <= hi) { x0 = o.px + d * 8; moved = true; }
            }
          }
          return x0;
        };
        T(svg, place(x1 - dir * 10, -dir, fmtX(s1)), cy + 4, fmtX(s1), 'val start-label', { 'text-anchor': dir > 0 ? 'end' : 'start' });
        T(svg, place(x2 + dir * 10, dir, fmtX(so)), cy + 4, fmtX(so), 'val end-label', { 'text-anchor': dir > 0 ? 'start' : 'end' });
        // Dots go on top of everything else in the row, so none is hidden or unhoverable;
        // dots that nearly coincide are nudged above and below the line.
        dots.forEach((o, k) => { const near = dots.slice(0, k).filter(p => Math.abs(p.px - o.px) < 9).length; o.dy = [0, -7, 7][near] || 0; });
        dots.forEach(({ i, rec, b, ok, sp, px, dy }) => {
          const g = S('g', {}, svg), py = cy + dy;
          if (ok) S('circle', { cx: px, cy: py, r: 4, style: 'fill:var(--ink);stroke:var(--surface);stroke-width:1.5' }, g);
          else crossMark(g, px, py, 4, 'var(--critical)');
          const dh = S('circle', { cx: px, cy: py, r: 6, style: 'fill:transparent' }, g);
          hover(dh, () => `<div class="tt-h">${AG[a].label} · ${esc(i)}</div>${ok ? ttRow('Solve time', fmtS(rec.t)) : ttRow('Result', esc(statusOf(rec && rec.status).label))}${b ? ttRow(solverMeta(b.key, f).label, fmtS(b.t)) : ''}${sp ? ttRow('Speedup', fmtX(sp)) : ''}<div class="tt-n">${esc(OOD_SHIFT[f][i])}</div>`);
        });
      });
      yy += 2 * rh + gap;
    });
  });
}

// ---------- Figure 5: cross-task outcomes ----------
function crossFigure(fig) {
  const root = frame(fig, {
    legend: legendHTML([...AGENTS.map(a => ({ label: AG[a].short, color: AG[a].color })), ...Object.entries(CAT).map(([k, c]) => ({ label: c.label, color: c.color, glyph: c.glyph, ink: k === 'time' ? '#0b0b0b' : '#fff' }))]),
    caption: 'Outlined cells are each solver\'s own family, run with a 300 s limit.',
  });
  const el = H('div', { class: 'chart' });
  root.appendChild(el);
  chart(el, (el, W) => {
    const narrow = W < 520;
    // Narrow layouts put each family's name on a line of its own and mark the agents by colour only.
    const lw = narrow ? 16 : W < 640 ? 92 : 150, top = 34, rh = narrow ? 24 : 30, hh = narrow ? 18 : 0, fh = hh + 2 * rh;
    const cw = Math.min(130, (W - lw) / 5);
    const svg = S('svg', { width: W, height: top + FAMS.length * fh + 8 }, el);
    if (!narrow) T(svg, 0, top - 12, 'built for ↓  run on →', 'ax');
    FAMS.forEach((t, c) => T(svg, lw + c * cw + cw / 2, top - 12, FAM_SHORT[t], narrow ? 'lab' : 'lab-strong', { 'text-anchor': 'middle', style: narrow ? 'font-size:11px' : null }));
    const rows = FAMS.flatMap((o, k) => AGENTS.map((a, j) => ({ o, a, k, cy: top + k * fh + hh + j * rh + rh / 2 })));
    FAMS.forEach((o, k) => {
      if (k % 2 === 0) S('rect', { x: 0, y: top + k * fh, width: W, height: fh, style: 'fill:var(--sunken);opacity:0.5' }, svg);
      T(svg, 0, narrow ? top + k * fh + 13 : top + k * fh + rh / 2 + 4, FAM_SHORT[o], 'lab-strong');
    });
    rows.forEach(r => {
      const cy = r.cy;
      if (narrow) S('circle', { cx: 5, cy, r: 4.5, style: `fill:${AG[r.a].color}` }, svg);
      else {
        S('circle', { cx: lw - (W < 640 ? 34 : 50), cy, r: 4.5, style: `fill:${AG[r.a].color}` }, svg);
        T(svg, lw - (W < 640 ? 26 : 42), cy + 4, AG[r.a].short, 'lab');
      }
      FAMS.forEach((t, c) => {
        const rec = crossRec(r.o, r.a, t);
        const inst = DATA.families[t].heldout;
        const gs = Math.min(17, (cw - 4) / 4), gr = Math.min(7, gs / 2 - 0.3);
        const gx = lw + c * cw + cw / 2 - 1.5 * gs;
        const oh = Math.min(24, rh - 4);
        if (r.o === t) S('rect', { x: lw + c * cw + 2, y: cy - oh / 2, width: cw - 4, height: oh, rx: oh / 2, style: 'fill:none;stroke:var(--ink-2);stroke-width:1.2' }, svg);
        inst.forEach((i, q) => {
          const px = gx + q * gs;
          if (!rec) { S('circle', { cx: px, cy, r: gr - 0.5, style: 'fill:none;stroke:var(--axis);stroke-dasharray:2 2' }, svg); return; }
          const rr = rec[i];
          const ok = rr && rr.t != null && rr.t <= 60;
          const cat = ok ? 'ok' : statusOf(rr && rr.status).cat === 'ok' ? 'time' : statusOf(rr && rr.status).cat;
          const C = CAT[cat];
          const gl = S('g', {}, svg);
          S('circle', { cx: px, cy, r: gr, style: `fill:${C.color}` }, gl);
          T(gl, px, cy + gr / 2, C.glyph, '', { 'text-anchor': 'middle', style: `fill:${cat === 'time' ? '#0b0b0b' : '#ffffff'};font-size:${gr < 6.5 ? 8 : 9.5}px;font-weight:700` });
          hover(gl, () => `<div class="tt-h">${AG[r.a].short}'s ${FAM_SHORT[r.o]} solver · ${esc(i)}</div>${ttRow('Result', ok ? fmtS(rr.t) : esc(statusOf(rr && rr.status).label))}${r.o === t ? '<div class="tt-n">Own family held-out (300 s limit)</div>' : ''}`);
        });
      });
    });
  });
}

const FIGURES = { tasks: tasksFigure, development: developmentFigure, speedup: speedupFigure, ood: oodFigure, cross: crossFigure };

async function main() {
  const figs = [...document.querySelectorAll('figure.lps-fig[data-chart]')];
  if (!figs.length) return;
  try {
    const D = await (await fetch(DATA_URL)).json();
    DATA = D; SUM = D.summaries;
    if (document.fonts) await Promise.all(["400 12px 'Open Sans'", "700 12px 'Open Sans'"].map(f => document.fonts.load(f).catch(() => null)));
  } catch (err) {
    figs.forEach(fig => fig.replaceChildren(H('p', { class: 'lps-sub' }, 'The figure data could not be loaded.')));
    return;
  }
  for (const fig of figs) FIGURES[fig.dataset.chart]?.(fig);
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', main); else main();
})();
