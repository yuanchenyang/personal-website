// Figures for the "Building a comprehensive dataset of semidefinite programs" post.
// Adapted from the MathOptDataset overview and solver comparison reports
// (tools/sdp_overview_template.html, tools/solution_comparison_template.html).
// Each <figure class="sdp-fig" data-chart="..."> is filled from /assets/data/sdp-dataset.json.
(function () {
"use strict";
if (window.sdpDatasetCharts) return;  // the script tag is repeated by every figure include
window.sdpDatasetCharts = true;

const DATA_URL = "/assets/data/sdp-dataset.json";
const NS = "http://www.w3.org/2000/svg";

// ---------- DOM helpers ----------
function h(tag, props, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (k === "class") e.className = v; else if (k === "style") e.style.cssText = v; else e.setAttribute(k, v);
  }
  for (const kid of kids.flat()) if (kid != null && kid !== false) e.append(kid instanceof Node ? kid : String(kid));
  return e;
}
function sv(tag, attrs, parent) {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs || {})) if (v != null) e.setAttribute(k, v);
  if (parent) parent.append(e);
  return e;
}
function txt(parent, x, y, text, cls, attrs) { const t = sv("text", {x, y, class: cls, ...attrs}, parent); t.textContent = text; return t; }
const svgRoot = (W, H, title) => sv("svg", {width: W, height: H, viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": title});

// ---------- formatting ----------
const nf = new Intl.NumberFormat("en-US");
const int = n => n == null ? "—" : nf.format(n);
const pct = (n, d) => !d ? "—" : `${(100 * n / d).toFixed(n === 0 || n === d ? 0 : 1)}%`;
const SUP = {"-": "⁻", "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹"};
const pow10 = k => k === 0 ? "1" : `10${String(k).replace(/[-0-9]/g, c => SUP[c])}`;
const sci = x => {
  if (x == null) return "—";
  if (x === 0 || (x >= 0.01 && x < 1e4)) return String(+x.toPrecision(2));
  const [mantissa, exponent] = x.toExponential(1).split("e"), power = pow10(+exponent);
  return mantissa === "1.0" ? power : `${mantissa}×${power}`;
};
const secs = t => t == null ? "—" : t < 1e-3 ? "< 1 ms" : t < 1 ? `${+(t * 1e3).toPrecision(3)} ms` : `${+t.toPrecision(3)} s`;
const times = r => r == null ? "—" : `${r.toFixed(r < 10 ? 2 : 1)}×`;
const kib = v => v == null ? "—" : v < 1024 ? `${+v.toPrecision(2)} KiB` : v < 1048576 ? `${+(v / 1024).toPrecision(2)} MiB` : `${+(v / 1048576).toPrecision(2)} GiB`;
function compact(n) {
  for (const [d, u] of [[1e9, "B"], [1e6, "M"], [1e3, "K"]]) if (n >= d) return `${+(n / d).toPrecision(3)}${u}`;
  return int(n);
}

// ---------- colors ----------
const SERIES = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300", "#4a3aa7", "#e34948", "#8c5a2b", "#0f8fa3"];
const SEQ = ["#cde2fb", "#9ec5f4", "#6da7ec", "#3987e5", "#256abf", "#184f95", "#0d366b"];
const DIV = ["#184f95", "#3987e5", "#9ec5f4", "#e8e8e4", "#f4b0a0", "#d95a43", "#951f22"];
const C = {good: "#0ca30c", warning: "#fab219", critical: "#d03b3b", neutral: "#a3a9ac", axis: "#c8ccce", empty: "#f3f4f5", muted: "#869095"};
function inkOn(hex) {
  const c = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255).map(v => v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  const lum = 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  return (lum + 0.05) / 0.0546 >= 1.05 / (lum + 0.05) ? "#0b0b0b" : "#ffffff";
}
const seq = v => Math.min(6, Math.floor(Math.max(0, v) * 7));

// ---------- tooltip ----------
let tip;
function showTip(nodes, x, y) {
  if (!tip) { tip = h("div", {id: "sdp-tip", role: "tooltip"}); document.body.append(tip); }
  tip.replaceChildren(...nodes.filter(Boolean)); tip.hidden = false;
  const r = tip.getBoundingClientRect();
  let left = x + 14, top = y + 14;
  if (left + r.width > innerWidth - 8) left = x - r.width - 14;
  if (top + r.height > innerHeight - 8) top = y - r.height - 14;
  tip.style.left = `${Math.max(8, left)}px`; tip.style.top = `${Math.max(8, top)}px`;
}
const hideTip = () => { if (tip) tip.hidden = true; };
const tipRow = (color, value, label, kind = "line") => h("div", {class: "tip-row"}, h("i", {class: kind, style: `background:${color}`}), h("strong", {}, value), h("span", {}, label));
const tipHead = text => h("div", {class: "tip-head"}, text);
function hoverable(node, mark, content) {
  const at = ev => { mark?.classList.add("hover"); showTip(content(), ev.clientX, ev.clientY); };
  const off = () => { mark?.classList.remove("hover"); hideTip(); };
  node.addEventListener("pointermove", at); node.addEventListener("pointerleave", off);
}

// ---------- figure frame ----------
function frame(fig, {title, sub, caption}) {
  const legend = h("div", {class: "sdp-legend"}), plot = h("div", {class: "sdp-plot"});
  fig.replaceChildren(h("div", {class: "sdp-title"}, title), sub ? h("p", {class: "sdp-sub"}, sub) : null, legend, plot, caption ? h("figcaption", {}, caption) : null);
  return {legend, plot, title};
}
function mount(f, draw) {
  let width = 0;
  const render = () => { width = f.plot.clientWidth; draw(Math.max(280, width)); };
  render();
  new ResizeObserver(() => { if (f.plot.clientWidth !== width) render(); }).observe(f.plot);
}
const legendKeys = (el, items) => el.replaceChildren(...items.map(it => h("span", {class: "key"}, h("i", {class: it.kind || "line", style: `background:${it.color}`}), it.label)));
const roundRight = (x, y, w, hh, r) => `M${x},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + hh - r}Q${x + w},${y + hh} ${x + w - r},${y + hh}H${x}Z`;
const roundTop = (x, y, w, hh, r) => `M${x},${y + hh}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + hh}Z`;
const decadeTicks = (lo, hi, every = 1) => { const out = []; for (let k = Math.ceil(Math.log10(lo) - 1e-9); k <= Math.floor(Math.log10(hi) + 1e-9); k++) if (k % every === 0) out.push({v: 10 ** k, t: pow10(k)}); return out; };

// ---------- line chart (shared log x grid, step curves, crosshair) ----------
function lineChart(f, {xs, series, ticks, xlabel, xfmt, marker}) {
  legendKeys(f.legend, series);
  const fx = Math.log10, a = fx(xs[0]), b = fx(xs[xs.length - 1]);
  mount(f, W => {
    const H = 280, m = {l: 44, r: W < 480 ? 12 : 72, t: 16, b: 42}, iw = W - m.l - m.r, ih = H - m.t - m.b;
    const X = v => m.l + (fx(v) - a) / ((b - a) || 1) * iw, Y = v => m.t + (1 - v) * ih;
    const svg = svgRoot(W, H, f.title);
    for (const v of [0, 0.25, 0.5, 0.75, 1]) {
      sv("line", {x1: m.l, x2: m.l + iw, y1: Y(v), y2: Y(v), class: v ? "grid" : "axis"}, svg);
      txt(svg, m.l - 8, Y(v), `${v * 100}%`, "tick", {"text-anchor": "end", "dominant-baseline": "middle"});
    }
    for (const t of ticks) {
      const x = X(t.v); if (x < m.l - 0.5 || x > m.l + iw + 0.5) continue;
      sv("line", {x1: x, x2: x, y1: m.t + ih, y2: m.t + ih + 4, class: "axis"}, svg);
      txt(svg, x, m.t + ih + 17, t.t, "tick", {"text-anchor": "middle"});
    }
    txt(svg, m.l + iw / 2, H - 4, xlabel, "axis-label", {"text-anchor": "middle"});
    if (marker && marker.x >= xs[0] && marker.x <= xs[xs.length - 1]) {
      const x = X(marker.x);
      sv("line", {x1: x, x2: x, y1: m.t, y2: m.t + ih, class: "marker"}, svg);
      txt(svg, x + 4, m.t - 4, marker.text, "marker-label");
    }
    for (const s of series) {
      let d = "";
      s.ys.forEach((y, i) => { const x = X(xs[i]).toFixed(1), yy = Y(y).toFixed(1); d += i ? `H${x}V${yy}` : `M${x},${yy}`; });
      sv("path", {d, class: "series", style: `stroke:${s.color}`}, svg);
    }
    if (m.r > 20) {
      let previous = -Infinity;
      for (const e of series.map(s => ({s, y: Y(s.ys[s.ys.length - 1])})).sort((p, q) => p.y - q.y)) {
        if (e.y - previous < 12) continue;  // colliding labels fall back to the legend
        txt(svg, m.l + iw + 6, e.y, e.s.label, "end-label", {"dominant-baseline": "middle"}); previous = e.y;
      }
    }
    const cross = sv("line", {y1: m.t, y2: m.t + ih, class: "cross", visibility: "hidden"}, svg);
    const dots = series.map(s => sv("circle", {r: 4, class: "dot", style: `fill:${s.color}`, visibility: "hidden"}, svg));
    const hit = sv("rect", {x: m.l - 8, y: m.t, width: iw + 16, height: ih, class: "hit"}, svg);
    const nearest = px => xs.reduce((best, v, i) => Math.abs(X(v) - px) < Math.abs(X(xs[best]) - px) ? i : best, 0);
    hit.addEventListener("pointermove", ev => {
      const r = svg.getBoundingClientRect(), i = nearest((ev.clientX - r.left) * W / r.width), x = X(xs[i]);
      cross.setAttribute("x1", x); cross.setAttribute("x2", x); cross.setAttribute("visibility", "visible");
      dots.forEach((dot, k) => { dot.setAttribute("cx", x); dot.setAttribute("cy", Y(series[k].ys[i])); dot.setAttribute("visibility", "visible"); });
      const rows = series.map(s => ({s, v: s.ys[i]})).sort((p, q) => q.v - p.v).map(({s, v}) => tipRow(s.color, `${(v * 100).toFixed(1)}%`, s.label));
      showTip([tipHead(xfmt(xs[i])), ...rows], ev.clientX, ev.clientY);
    });
    hit.addEventListener("pointerleave", () => { cross.setAttribute("visibility", "hidden"); dots.forEach(dot => dot.setAttribute("visibility", "hidden")); hideTip(); });
    f.plot.replaceChildren(svg);
  });
}

// ---------- 100% stacked horizontal bars ----------
function stackedBars(f, rows, keys) {
  legendKeys(f.legend, keys.map(k => ({label: k.label, color: k.color, kind: "box"})));
  mount(f, W => {
    const lw = Math.min(84, W * 0.24), bh = 20, rh = 30, H = rows.length * rh + 4, iw = W - lw - 4;
    const svg = svgRoot(W, H, f.title);
    rows.forEach((row, r) => {
      const y = r * rh + (rh - bh) / 2;
      txt(svg, 0, y + bh / 2, row.label, "row-label", {"dominant-baseline": "middle"});
      const parts = row.parts.map((n, k) => ({n, k})).filter(p => p.n > 0);
      let x = lw;
      parts.forEach((p, j) => {
        const w = p.n / row.total * iw, last = j === parts.length - 1, ww = Math.max(0.75, w - (last ? 0 : 2)), color = keys[p.k].color;
        const mark = last ? sv("path", {d: roundRight(x, y, ww, bh, Math.min(4, ww / 2)), class: "mark", style: `fill:${color}`}, svg)
          : sv("rect", {x, y, width: ww, height: bh, class: "mark", style: `fill:${color}`}, svg);
        if (ww > 42) txt(svg, x + ww / 2, y + bh / 2 + 0.5, pct(p.n, row.total), "in-label", {"text-anchor": "middle", "dominant-baseline": "middle", style: `fill:${inkOn(color)}`});
        const hit = sv("rect", {x, y: r * rh, width: Math.max(w, 2), height: rh, class: "hit"}, svg);
        hoverable(hit, mark, () => [tipHead(row.label), tipRow(color, `${int(p.n)} · ${pct(p.n, row.total)}`, keys[p.k].label, "box")]);
        x += w;
      });
    });
    f.plot.replaceChildren(svg);
  });
}

// ---------- heatmap over solver pairs ----------
function heatmap(f, {labels, cell, scale, diverging}) {
  const ramp = diverging ? DIV : SEQ;
  f.legend.replaceChildren(h("span", {class: "muted"}, scale[0]), h("span", {style: "display:inline-flex"}, ramp.map(c => h("i", {class: "box", style: `background:${c};width:16px;border-radius:0`}))), h("span", {class: "muted"}, scale[1]));
  mount(f, W => {
    const lw = Math.min(76, W * 0.2), cw = Math.min(72, (W - lw) / labels.length), ch = 28;
    const longest = Math.max(...labels.map(c => c.length)), slant = longest * 6.6 > cw - 6;
    const top = slant ? 12 + longest * 6.6 : 22, H = top + labels.length * ch + 2;
    const svg = svgRoot(W, H, f.title);
    labels.forEach((c, j) => {
      const x = lw + j * cw + cw / 2;
      if (!slant) txt(svg, x, 14, c, "axis-label", {"text-anchor": "middle"});
      else txt(svg, x, top - 6, c, "axis-label", {"dominant-baseline": "middle", transform: `rotate(-90 ${x} ${top - 6})`});
    });
    labels.forEach((row, i) => {
      const y = top + i * ch;
      txt(svg, lw - 8, y + ch / 2, row, "row-label", {"text-anchor": "end", "dominant-baseline": "middle"});
      labels.forEach((_, j) => {
        const c = cell(i, j), x = lw + j * cw;
        const step = c.v == null ? null : diverging ? 3 + Math.round(3 * Math.max(-1, Math.min(1, c.v))) : seq(c.v);
        const fill = step == null ? C.empty : ramp[step];
        const rect = sv("rect", {x: x + 1, y: y + 1, width: cw - 2, height: ch - 2, rx: 2, class: "mark", style: `fill:${fill}`}, svg);
        if (String(c.text).length * 6.3 <= cw - 4) txt(svg, x + cw / 2, y + ch / 2 + 0.5, c.text, "in-label", {"text-anchor": "middle", "dominant-baseline": "middle", style: `fill:${step == null ? C.muted : inkOn(fill)};font-weight:${step == null ? 400 : 600}`});
        if (c.tip) hoverable(rect, rect, () => [tipHead(`${row} · ${labels[j]}`), ...c.tip]);
      });
    });
    f.plot.replaceChildren(svg);
  });
}

// ---------- column histogram, stacked when a bin has several parts ----------
function histogram(f, {bins, keys, xlabel, head, total}) {
  legendKeys(f.legend, keys.map(k => ({label: k.label, color: k.color, kind: "box"})));
  const sum = b => b.parts.reduce((a, n) => a + n, 0);
  mount(f, W => {
    const H = 250, m = {l: 46, r: 8, t: 18, b: 40}, iw = W - m.l - m.r, ih = H - m.t - m.b;
    const top = Math.max(...bins.map(sum), 1), raw = top / 4, mag = 10 ** Math.floor(Math.log10(raw));
    const step = [1, 2, 5, 10].map(k => k * mag).find(s => s >= raw), ymax = Math.ceil(top / step) * step;
    const Y = v => m.t + (1 - v / ymax) * ih, band = iw / bins.length, bw = Math.min(30, band * 0.7);
    const svg = svgRoot(W, H, f.title);
    for (let v = 0; v <= ymax + 1e-9; v += step) {
      sv("line", {x1: m.l, x2: m.l + iw, y1: Y(v), y2: Y(v), class: v ? "grid" : "axis"}, svg);
      txt(svg, m.l - 8, Y(v), int(v), "tick", {"text-anchor": "end", "dominant-baseline": "middle"});
    }
    bins.forEach((b, i) => {
      const cx = m.l + band * i + band / 2, n = sum(b), shown = b.parts.map((v, k) => [v, k]).filter(([v]) => v > 0);
      const mark = shown.length ? sv("g", {class: "mark"}, svg) : null;
      let base = 0;
      shown.forEach(([v, k], j) => {
        const y0 = Y(base), y1 = Y(base + v), color = keys[k].color;
        // A 2px gap separates stacked parts; only the top part is rounded.
        if (j === shown.length - 1) sv("path", {d: roundTop(cx - bw / 2, y1, bw, y0 - y1, Math.min(4, y0 - y1)), style: `fill:${color}`}, mark);
        else sv("rect", {x: cx - bw / 2, y: y1 + Math.min(2, (y0 - y1) / 2), width: bw, height: Math.max(0, y0 - y1 - 2), style: `fill:${color}`}, mark);
        base += v;
      });
      if (n && band > 26) txt(svg, cx, Y(n) - 5, int(n), "cap-label", {"text-anchor": "middle"});
      txt(svg, cx, m.t + ih + 14, b.label, "tick", {"text-anchor": "middle"});
      const hit = sv("rect", {x: cx - band / 2, y: m.t, width: band, height: ih, class: "hit"}, svg);
      hoverable(hit, mark, () => [tipHead(`${head} ${b.label}`), ...shown.map(([v, k]) => tipRow(keys[k].color, `${int(v)} · ${pct(v, total)}`, keys[k].label.toLowerCase(), "box")),
        h("div", {class: "tip-sub"}, `${int(n)} in all`)]);
    });
    txt(svg, m.l + iw / 2, H - 4, xlabel, "axis-label", {"text-anchor": "middle"});
    f.plot.replaceChildren(svg);
  });
}

// ---------- log–log scatter, one colour per group; a mark may stand for several identical instances ----------
function logScatter(f, {x, y, count, groups, xlabel, ylabel}) {
  const instances = rows => rows.reduce((a, i) => a + count[i], 0);
  legendKeys(f.legend, groups.map(g => ({label: `${g.label} (${int(instances(g.rows))})`, color: g.color, kind: "dot"})));
  const lx = v => Math.log10(Math.max(1, v));
  const xmax = Math.ceil(Math.max(1, ...x.map(lx))), ymax = Math.ceil(Math.max(1, ...y.map(lx)));
  mount(f, W => {
    const H = Math.round(Math.min(440, Math.max(280, W * 0.6))), m = {l: 50, r: 10, t: 10, b: 42}, iw = W - m.l - m.r, ih = H - m.t - m.b;
    const X = v => m.l + lx(v) / xmax * iw, Y = v => m.t + ih - lx(v) / ymax * ih;
    const svg = svgRoot(W, H, f.title);
    for (let i = 0; i <= xmax; i++) {
      const px = X(10 ** i);
      sv("line", {x1: px, x2: px, y1: m.t, y2: m.t + ih, class: i ? "grid" : "axis"}, svg);
      txt(svg, px, m.t + ih + 16, compact(10 ** i), "tick", {"text-anchor": "middle"});
    }
    for (let j = 0; j <= ymax; j++) {
      const py = Y(10 ** j);
      sv("line", {x1: m.l, x2: m.l + iw, y1: py, y2: py, class: j ? "grid" : "axis"}, svg);
      txt(svg, m.l - 8, py, compact(10 ** j), "tick", {"text-anchor": "end", "dominant-baseline": "middle"});
    }
    const hi = 10 ** Math.min(xmax, ymax);
    sv("line", {x1: X(1), y1: Y(1), x2: X(hi), y2: Y(hi), class: "axis", "stroke-dasharray": "4 3"}, svg);
    txt(svg, m.l + iw / 2, H - 4, xlabel, "axis-label", {"text-anchor": "middle"});
    txt(svg, 12, m.t + ih / 2, ylabel, "axis-label", {"text-anchor": "middle", transform: `rotate(-90 12 ${m.t + ih / 2})`});
    const r = W < 480 ? 2.2 : 2.8, pts = [];
    for (const g of groups) {
      // A merged mark is as opaque as that many stacked marks at opacity 0.5 (capped at three).
      const d = [1, 2, 3].map(() => "");
      for (const i of g.rows) {
        const px = X(x[i]), py = Y(y[i]), k = Math.min(3, count[i]) - 1; pts.push({px, py, i, g});
        d[k] += `M${px.toFixed(1)},${py.toFixed(1)}m-${r},0a${r},${r} 0 1,0 ${2 * r},0a${r},${r} 0 1,0 -${2 * r},0`;
      }
      d.forEach((path, k) => { if (path) sv("path", {d: path, style: `fill:${g.color};opacity:${1 - 0.5 ** (k + 1)}`}, svg); });
    }
    const ring = sv("circle", {r: r + 3, class: "ring", visibility: "hidden"}, svg);
    const hit = sv("rect", {x: m.l, y: m.t, width: iw, height: ih, class: "hit"}, svg);
    hit.addEventListener("pointermove", ev => {
      const b = svg.getBoundingClientRect(), qx = (ev.clientX - b.left) * W / b.width, qy = (ev.clientY - b.top) * H / b.height;
      let best = null, bd = 14 * 14;
      for (const p of pts) { const d = (p.px - qx) ** 2 + (p.py - qy) ** 2; if (d < bd) { bd = d; best = p; } }
      if (!best) { ring.setAttribute("visibility", "hidden"); return hideTip(); }
      ring.setAttribute("cx", best.px); ring.setAttribute("cy", best.py); ring.setAttribute("visibility", "visible");
      showTip([tipHead(`${count[best.i] > 1 ? `${int(count[best.i])} instances` : "1 instance"} · ${best.g.label}`),
        tipRow(best.g.color, int(x[best.i]), xlabel, "dot"), tipRow(best.g.color, int(y[best.i]), ylabel, "dot")], ev.clientX, ev.clientY);
    });
    hit.addEventListener("pointerleave", () => { ring.setAttribute("visibility", "hidden"); hideTip(); });
    f.plot.replaceChildren(svg);
  });
}

// ---------- word cloud: words placed largest first along an elliptical spiral ----------
function wordCloud(f, {words, total}) {
  const ctx = document.createElement("canvas").getContext("2d");
  const lo = Math.sqrt(words[words.length - 1][1]), hi = Math.sqrt(words[0][1]);
  const color = s => s > 0.5 ? SEQ[6] : s > 0.25 ? SEQ[5] : s > 0.1 ? SEQ[4] : SEQ[3];
  mount(f, W => {
    const H = Math.round(Math.max(260, Math.min(420, W * 0.55))), aspect = W / H;
    const fmax = Math.max(24, Math.min(48, W / 13)), fmin = W < 480 ? 9.5 : 11;
    const svg = svgRoot(W, H, f.title), placed = [];
    for (const [word, n] of words) {
      const s = (Math.sqrt(n) - lo) / ((hi - lo) || 1), size = fmin + (fmax - fmin) * s, weight = s > 0.25 ? 700 : 400;
      ctx.font = `${weight} ${size}px "Open Sans", sans-serif`;
      const w = ctx.measureText(word).width + 4, hh = size * 1.1;
      for (let t = 0; t < 2400; t++) {
        const a = t * 0.12, rr = 1.6 * a, cx = W / 2 + rr * Math.cos(a) * aspect / 1.6, cy = H / 2 + rr * Math.sin(a) / 1.6;
        const box = {x0: cx - w / 2, x1: cx + w / 2, y0: cy - hh / 2, y1: cy + hh / 2};
        if (box.x0 < 0 || box.x1 > W || box.y0 < 0 || box.y1 > H) { if (rr > W) break; continue; }
        if (placed.some(p => box.x0 < p.x1 && box.x1 > p.x0 && box.y0 < p.y1 && box.y1 > p.y0)) continue;
        placed.push(box);
        const el = txt(svg, cx, cy, word, "word", {"text-anchor": "middle", "dominant-baseline": "central",
          style: `font-size:${size.toFixed(1)}px;font-weight:${weight};fill:${color(s)}`});
        hoverable(el, null, () => [tipHead(word), h("div", {}, `${int(n)} instances · ${pct(n, total)}`)]);
        break;
      }
    }
    f.plot.replaceChildren(svg);
  });
}

// ---------- the figures ----------
// Solvers run in Octave instead of MATLAB, marked with an asterisk explained in the post's footnote.
const OCTAVE = new Set(["sdpt3", "sedumi"]);

function charts(D) {
  const star = l => OCTAVE.has(l) ? `${l}*` : l;
  D.solvers = D.solvers.map(star);
  D.pairs.forEach(p => { p.a = star(p.a); p.b = star(p.b); });
  const L = D.solvers, color = l => SERIES[L.indexOf(l)] || C.neutral, sc = D.scope;
  const pairOf = (a, b) => D.pairs.find(p => (p.a === a && p.b === b) || (p.a === b && p.b === a));
  return {
    "tags": fig => wordCloud(frame(fig, {
      title: "Most-used tags", sub: `The ${D.tags.length} most common of ${int(D.tags_total)} distinct tags, sized by the number of instances carrying them`,
      caption: "The generic tags semidefinite, continuous and sdp, carried by most instances, are left out.",
    }), {words: D.tags, total: D.instances}),

    "variables-constraints": fig => {
      const S = D.scatter, marks = [...S.count.keys()], n = D.instances, labels = {min: "minimise", max: "maximise", feasibility: "feasibility"};
      const groups = D.senses.map((k, i) => ({label: labels[k] || k, color: SERIES[i], rows: marks.filter(r => S.sense[r] === i)})).filter(g => g.rows.length);
      const over = marks.filter(r => S.ncon[r] > S.nvar[r]).reduce((a, r) => a + S.count[r], 0);
      logScatter(frame(fig, {
        title: "Variables against constraints", sub: `One mark per instance (${int(n)}), coloured by objective sense`,
        caption: `Both axes are log scale; the dashed diagonal is one constraint per variable, and a PSD cone counts as one constraint. ${int(over)} instances (${pct(over, n)}) have more constraints than variables.`,
      }), {x: S.nvar, y: S.ncon, count: S.count, groups, xlabel: "scalar variables", ylabel: "constraints"});
    },

    "solved-count": fig => {
      const s = D.solved_count, sum = b => b.reduce((a, n) => a + n, 0);
      const keys = [{label: `Smallest third (≤ ${kib(s.cut[0])})`, color: SEQ[1]}, {label: `Middle third (≤ ${kib(s.cut[1])})`, color: SEQ[3]},
        {label: "Largest third", color: SEQ[5]}, ...(s.unsized ? [{label: "Size not recorded", color: C.axis}] : [])];
      histogram(frame(fig, {
        title: "How many solvers solve each instance?", sub: `The ${int(s.common)} instances every solver attempted, by the number of solvers that solved them`,
        caption: `A solve counts when it is conclusive, does not conflict with the reference, and finishes within the time limit. Thirds split the instances into equal-count classes by uncompressed model size. ${int(sum(s.bins[L.length]))} are solved by every solver and ${int(sum(s.bins[0]))} by none.`,
      }), {bins: s.bins.map((parts, k) => ({label: String(k), parts})), keys, total: s.common, xlabel: "solvers that solved the instance", head: "Solved by"});
    },

    "solved-by-one": fig => {
      const only = (a, b) => { const p = pairOf(a, b); return p.a === a ? p.only_a : p.only_b; };
      const most = Math.max(1, ...D.pairs.flatMap(p => [p.only_a, p.only_b]));
      heatmap(frame(fig, {
        title: "Solved by one, not the other", sub: "Common instances the row solver solved and the column solver did not",
        caption: "Shading follows the square root of the count, relative to the largest cell.",
      }), {labels: L, scale: ["0", int(most)], cell: (i, j) => {
        if (i === j) return {v: null, text: "—"};
        const n = only(L[i], L[j]);
        return {v: Math.sqrt(n / most), text: int(n), tip: [tipRow(color(L[i]), int(n), `solved by ${L[i]}, not by ${L[j]}`)]};
      }});
    },

    "checked-error": fig => {
      const E = D.checked_error;
      lineChart(frame(fig, {
        title: "Independently checked error", sub: "Share of checked optimal results with an error at most x",
        caption: "The largest of the primal residual, the dual residual, and the relative gap, computed from each returned solution on the loaded model with the same formulas for every solver. Higher and further left is better.",
      }), {xs: E.grid, series: L.map((l, k) => ({label: l, color: color(l), ys: E.curves[k]})), ticks: decadeTicks(E.grid[0], E.grid[E.grid.length - 1], 2),
        xlabel: "checked error (log scale)", xfmt: x => `error ≤ ${sci(x)}`, marker: {x: D.tolerance, text: `tolerance ${sci(D.tolerance)}`}});
    },

    "consensus": fig => {
      const keys = [["Agrees with the consensus", SEQ[4]], ["Outlier", C.critical], ["No consensus", C.warning], ["No optimal objective", C.axis]].map(([label, c]) => ({label, color: c}));
      const total = D.consensus.instances;
      stackedBars(frame(fig, {
        title: "Who agrees with the consensus?", sub: `Instances with two or more optimal objectives (${int(total)})`,
        caption: "Each instance's optimal objectives are chained into clusters of neighbours that agree within the comparison tolerance. The largest cluster is the consensus when it is unique and holds two or more solvers; a solver outside it is an outlier.",
      }), L.map((l, k) => ({label: l, total, parts: D.consensus.rows[k]})).sort((p, q) => q.parts[0] - p.parts[0]), keys);
    },

    "head-to-head": fig => heatmap(frame(fig, {
      title: "Head-to-head speed", sub: "Geometric mean of row time ÷ column time, on instances both solved",
      caption: "Blue: the row solver is faster; red: it is slower. Shading saturates at 16×.",
    }), {labels: L, scale: ["row 16× faster", "row 16× slower"], diverging: true, cell: (i, j) => {
      const p = i === j ? null : pairOf(L[i], L[j]);
      if (!p?.both_timed) return {v: null, text: "—"};
      const ratio = p.a === L[i] ? p.time_ratio : 1 / p.time_ratio;
      return {v: Math.log2(ratio) / 4, text: times(ratio), tip: [tipRow(color(L[i]), times(ratio), `the time of ${L[j]}`), h("div", {class: "tip-sub"}, `over ${int(p.both_timed)} instances both solved`)]};
    }}),

    "performance-profile": fig => {
      const P = D.profile, last = P.grid[P.grid.length - 1];
      lineChart(frame(fig, {
        title: "Performance profile", sub: "Share solved within τ × the fastest solver's time",
        caption: `Dolan–Moré profile over the ${int(sc.profiled)} instances some solver solved. The left end is the share where a solver was fastest (ties count for each); the right end is the share it solved at all. Times below ${secs(D.min_time)} count as ${secs(D.min_time)}.`,
      }), {xs: P.grid, series: L.map((l, k) => ({label: l, color: color(l), ys: P.curves[k]})),
        ticks: [1, 4, 16, 64, 256, 1024, 4096].filter(v => v <= last).map(v => ({v, t: String(v)})),
        xlabel: "τ, time relative to the fastest (log scale)", xfmt: x => `τ = ${+x.toPrecision(3)}`});
    },

    "rank": fig => {
      const keys = ["Fastest", "Second", "Third", "Fourth or later", "Not solved"].map((label, k) => ({label, color: [SEQ[6], SEQ[4], SEQ[2], SEQ[1], C.axis][k]}));
      stackedBars(frame(fig, {
        title: "Rank among the solvers", sub: `Where each solver's time ranks on each of the ${int(sc.common)} instances`,
        caption: "Ranks count the solvers that solved the instance faster; ties share the better rank.",
      }), L.map((l, k) => ({label: l, total: sc.common, parts: D.ranks[k]})).sort((p, q) => q.parts[0] - p.parts[0]), keys);
    },
  };
}

async function main() {
  const figs = [...document.querySelectorAll("figure.sdp-fig[data-chart]")];
  if (!figs.length) return;
  let D;
  try {
    D = await (await fetch(DATA_URL)).json();
    if (document.fonts) await Promise.all(["400 12px 'Open Sans'", "700 12px 'Open Sans'"].map(f => document.fonts.load(f).catch(() => null)));
  } catch (err) {
    figs.forEach(fig => fig.replaceChildren(h("p", {class: "sdp-sub"}, "The figure data could not be loaded.")));
    return;
  }
  const draw = charts(D);
  for (const fig of figs) draw[fig.dataset.chart]?.(fig);
}
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", main); else main();
})();
