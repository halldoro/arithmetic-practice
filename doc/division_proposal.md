# Division tab — implementation proposal

This is a design sketch, not yet implemented. Goal: turn the disabled `Division` top-level tab into a real exercise area that parallels `Multiplication` and reuses as much of the existing infrastructure as possible (`sidebarLayout`, `problemCountGrid`, problem-size mode, seed, ink colour, `includeAnswer`, print).

## UI structure

Mirror Multiplication:

- Top tab: **Division** (enable).
- Sub-tabs:
  - **Single digit** — generator for direct division facts (`48 ÷ 6 = ?`).
  - **Multi digit** — generator for the standard long-division algorithm (`7836 ÷ 23` rendered in the "house" layout, with empty work boxes).

One intentional asymmetry vs. Multiplication: the Multiplication > Single digit tab is a static reference PDF (the times table). The corresponding reference for division is *the same multiplication table*, read in reverse — so a separate division reference PDF would just duplicate what's already on the Multiplication tab. Use the slot for a practice generator instead.

## Single digit Division — practice generator

Generate problems of the form `dividend ÷ divisor = ?` where:

- `divisor` ∈ 2–9 (skip 1, since it's trivial).
- `dividend = divisor × k` for `k` ∈ 1–12 — always exact, no remainders at this level.

Layout is the simplest possible — one expression per cell with a writing box for the answer:

```
  48 ÷ 6 = [   ]
```

Sidebar controls (all reuse existing components):

- **Number of problems** — 4×3 grid (1–12).
- **Divisor range** — multi-select chips for divisors 2–9.
- **Seed**, **New set**, **Ink color**, **Include answer**, **Print**.

`includeAnswer` simply prints the result inside the box. Cheap to implement and a good first wiring exercise to confirm Division-tab routing works end-to-end.

## Multi digit Division — long-division generator

The interesting one. Generate problems where the dividend has 3–5 digits and the divisor 1–3 digits, drawn in standard long-division layout with empty work boxes.

### Algorithm recap

For `7836 ÷ 23`:

1. Take the leftmost digits of the dividend that are ≥ divisor (`78`).
2. Find largest `q` with `q × divisor ≤ take`. That `q` is the next quotient digit.
3. Subtract `q × divisor` from `take`. The remainder is the running carry.
4. Bring down the next dividend digit and repeat.
5. The accumulated `q` digits are the quotient; the final running remainder is the remainder.

The worksheet renders an empty version of this work — divisor and dividend printed, every quotient/subtraction/bring-down digit as an empty box.

### Proposed visual layout

```
            ┌ □ □ □ □              <- quotient row (one box per column)
            │
   2 3 ───→ │   7  8  3  6         <- divisor outside; dividend printed inside
            │ - □  □               <- subtraction row 1 (q₁ × divisor)
            │ ───────
            │   □  □  3            <- bring down + new partial
            │ - □  □
            │ ───────
            │      □  □  6
            │   -  □  □
            │   ───────
            │      □  □            <- remainder
```

The SVG renderer needs to draw:

1. The "house" bracket — a horizontal line above the dividend and a vertical line down its left side.
2. Divisor text outside the bracket, left.
3. Dividend digits printed inside, top row.
4. An empty quotient row above the bracket, one square box per dividend column (skip leading-zero columns).
5. For each algorithm step: a subtraction row with empty boxes, a horizontal divider line, and a partial-remainder row beneath.
6. Final remainder boxes at the bottom.

### Geometry (mirror the line-multiplication conventions)

- `square = 60` (smaller than multiplication's 86 because rows stack vertically and the worksheet is taller).
- `colStep = 70` (column width; matches dividend digit spacing).
- `bracketStroke = 4`.
- Every box is `square × square`.

### Step count

For an `n`-digit dividend ÷ `d`-digit divisor, expect roughly `n − d + 1` subtraction/remainder pairs plus a final remainder row. Compute it once when the problem is generated and use the result to drive both vertical sizing and answer-fill.

### `includeAnswer` behaviour

When the toggle is on, fill in the previously-empty boxes:

- Quotient boxes: the actual quotient digits.
- Each subtraction row: `q_k × divisor`, right-aligned to the relevant column block.
- Each partial-remainder row: the running remainder after subtraction + bring-down.
- Final remainder box: the leftover.

This is more arithmetic than the multiplication answer-fill ever did (which currently only puts `= product` after the title). Worth doing here because long division *naturally produces* these intermediate digits — they fall out of the same step-by-step computation that drives the layout.

## Data model

Add a third entry to `exerciseTypes`:

```js
const exerciseTypes = {
  lineMultiplication: { ... },
  singleDigitDivision: {
    label: "Single digit division",
    makeProblems: makeDivisionProblems,
    renderProblem: renderSingleDigitDivision
  },
  longDivision: {
    label: "Long division",
    makeProblems: makeDivisionProblems,
    renderProblem: renderLongDivision
  }
};
```

Each long-division problem carries the precomputed steps, so layout and answer-fill share one source of truth:

```js
{
  divisor: "23",
  dividend: "7836",
  steps: [
    { take: "78", q: 3, sub: "69", remainder:  "9" },
    { take: "93", q: 4, sub: "92", remainder:  "1" },
    { take: "16", q: 0, sub:  "0", remainder: "16" },
    ...
  ],
  quotient:  "340",
  remainder: "16"
}
```

A separate, unit-testable `divideSteps(dividend, divisor)` produces this object. The renderer reads only from it.

## Sidebar controls

Reuse the existing layout. New for division:

- **Allow remainder** toggle: when off, the generator only emits `dividend = divisor × q` so results are exact. Default off — kids learning long division usually start with exact problems.

Repurpose `digitCountGrid` for picking `dividend × divisor` digit counts (e.g. up to 5×3). Range mode behaves the same way as multiplication.

## Rendering challenges, in order of risk

1. **Vertical space.** Long division is taller than line multiplication. 12 problems on landscape may force a smaller `square`. Mitigation: cap the digit-count grid so 12-problem layouts still fit, or auto-shrink based on `count × steps`.
2. **Column alignment.** Every subtraction row and bring-down must align to the right column. Drive every text element's `x` from a single `colStep × columnIndex`.
3. **Variable step count.** Two problems of the same digit size can need different step counts because of the `q = 0` bring-down case. Compute step count up-front; never assume `n − d + 1`.
4. **Answer-key correctness.** Easy to get wrong if the layout calc and the answer calc drift apart. Keep one `divideSteps` function as the single source of both.

## Phased implementation

1. **Phase 1** — Single digit Division (horizontal form, exact only, includeAnswer fills the answer box). Cheapest; proves the Division-tab routing.
2. **Phase 2** — `divideSteps` data model + long-division layout. No remainder support yet, fixed `4×2` size. One commit per concern: data model, layout calculator, SVG renderer, sidebar wiring.
3. **Phase 3** — Range/Fixed digit grid, `Allow remainder` toggle, `includeAnswer` fill for long division.
4. **Phase 4** — Polish: per-problem auto-shrink based on step count, mobile-aware sizing, print verification.

## Open questions

- Should Single digit Division also have a static reference PDF (a "division facts" sheet)? Probably not — the multiplication table covers the same facts. Defer until a user asks.
- Do we want decimal-extension long division (`13 ÷ 4 = 3.25`)? Out of scope for the first cut; would change the layout (bring-down zeros after a decimal point) and the algorithm termination condition.
- Bracket style: the modern "long division house" with explicit angle reads better than the typewriter `divisor)dividend` form, but the rendering is fiddlier. Recommend the modern bracket.
