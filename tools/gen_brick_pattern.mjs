#!/usr/bin/env node
// Re-runs visualRows + drawMathBoxes from practice.html in a tiny in-memory
// DOM shim and writes the resulting brick-layer pattern to
// doc/brick_layer_pattern.svg.
//
// Run after touching the worksheet renderer in practice.html:
//   node tools/gen_brick_pattern.mjs
//
// Zero npm dependencies on purpose.

import { writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, "..");

// ---------- minimal SVG-element shim (just enough for svgEl) ------------

class El {
  constructor(tag) {
    this.tag = tag;
    this.attrs = {};
    this.children = [];
    this._text = null;
  }
  setAttribute(k, v) { this.attrs[k] = String(v); }
  appendChild(c) { this.children.push(c); return c; }
  toString() {
    const escAttr = (s) => s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/"/g, "&quot;");
    const a = Object.entries(this.attrs)
      .map(([k, v]) => ` ${k}="${escAttr(v)}"`)
      .join("");
    if (this._text != null) return `<${this.tag}${a}>${this._text}</${this.tag}>`;
    if (this.children.length === 0) return `<${this.tag}${a}/>`;
    return `<${this.tag}${a}>${this.children.map((c) => c.toString()).join("")}</${this.tag}>`;
  }
}

const SVG_NS = "http://www.w3.org/2000/svg";

function svgEl(tag, attrs = {}, parent = null) {
  const el = new El(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null) continue;
    el.setAttribute(k, v);
  }
  if (parent) parent.appendChild(el);
  return el;
}

// ---------- copied verbatim from practice.html --------------------------

function visualRows(m, n) {
  const rows = [];
  for (let d = m - 1; d >= -n + 1; d--) {
    const row = [];
    for (let i = 0; i < m; i++) {
      for (let j = 0; j < n; j++) {
        if (i - j === d) {
          row.push([i, j]);
        }
      }
    }
    row.sort((a, b) => (a[0] + a[1]) - (b[0] + b[1]));
    rows.push(row);
  }
  return rows;
}

function drawMathBoxes(parent, m, n, ink, precomputed = null) {
  const data = precomputed || (() => {
    const rows = visualRows(m, n);
    const square = 86;
    const gap = 10;
    const squareStep = square + gap / 2;
    const rowStep = square + gap;
    const allX = [];
    for (const row of rows) {
      for (const [i, j] of row) allX.push(i + j);
    }
    const minXIndex = Math.min(...allX);
    const maxXIndex = Math.max(...allX);
    const width = (maxXIndex - minXIndex) * squareStep + 2 * square;
    const height = (rows.length - 1) * rowStep + square;
    return { rows, square, gap, squareStep, rowStep, minXIndex, maxXIndex, width, height };
  })();

  const { rows, square, squareStep, rowStep, minXIndex, maxXIndex, width, height } = data;

  const offsetX = -width / 2;
  const offsetY = -height / 2;

  function pieceAt(x, y) {
    svgEl("rect", {
      x, y,
      width: 2 * square,
      height: square,
      fill: "white",
      stroke: ink,
      "stroke-width": 4.9
    }, parent);

    svgEl("line", {
      x1: x + square,
      y1: y,
      x2: x + square,
      y2: y + square,
      stroke: ink,
      "stroke-width": 4.9
    }, parent);
  }

  for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
    const y = offsetY + rowIndex * rowStep;
    for (const [i, j] of rows[rowIndex]) {
      const xIndex = maxXIndex - (i + j);
      const x = offsetX + (xIndex - minXIndex) * squareStep;
      pieceAt(x, y);
    }
  }

  return data;
}

// ---------- generate ----------------------------------------------------

// 3 × 3 produces the classic 5-row diamond (1, 2, 3, 2, 1 pieces) — the
// "typical" brick-layer pattern shape from the docs.
const m = 3;
const n = 3;
const padding = 24;

const tempG = new El("g");
const data = drawMathBoxes(tempG, m, n, "currentColor");
const { width, height } = data;

const svg = svgEl("svg", {
  xmlns: SVG_NS,
  viewBox: `${-width / 2 - padding} ${-height / 2 - padding} ${width + 2 * padding} ${height + 2 * padding}`,
  width: 360,
  role: "img",
  "aria-label": `Brick-layer pattern of mathBoxes for a ${m}-digit by ${n}-digit problem`
});

// CSS class selectors override the inline fill="white" / stroke=currentColor
// presentation attributes (presentation attrs have lower specificity than
// any CSS rule). currentColor resolves to the svg element's color, which
// the @media query flips for dark mode.
const style = new El("style");
style._text = `
    svg { color: #1f2937; }
    rect { fill: #ffffff; }
    @media (prefers-color-scheme: dark) {
      svg { color: #d4d4d8; }
      rect { fill: #18181b; }
    }
  `;
svg.appendChild(style);
for (const child of tempG.children) svg.appendChild(child);

const xml = `<?xml version="1.0" encoding="UTF-8"?>\n` + svg.toString() + "\n";
const outPath = join(repoRoot, "doc/brick_layer_pattern.svg");
writeFileSync(outPath, xml);
console.log(`Wrote ${outPath} (${data.rows.length} rows, ${m}x${n} digits)`);
