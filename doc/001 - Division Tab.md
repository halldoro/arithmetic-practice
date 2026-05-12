# Division tab — implementation proposal

This is a design sketch, not yet implemented. Goal: turn the disabled `Division` top-level tab into a real exercise area that reuses as much of the existing infrastructure as possible (`sidebarLayout`, `problemCountGrid`, problem-size mode, seed, ink colour, `includeAnswer`, print).

The Division tab is a single exercise generator: long-division problems drawn in the standard "house" layout, with empty square boxes everywhere the child writes a digit — quotient, subtractions, bring-downs, and final remainder.

## UI structure

Unlike Multiplication, Division has a single variant, so the top-level **Division** tab acts directly as the view — no sub-tab strip. The right pane shows the live worksheet preview; the left pane reuses the multi-digit sidebar layout.

If a second variant is ever added later, reintroduce a sub-tab strip in the same shape as Multiplication's.

## Long-division generator

Generate problems where the dividend has 3–5 digits and the divisor 1–3 digits, drawn in standard long-division layout with empty work boxes.

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

Add a second entry to `exerciseTypes`:

```js
const exerciseTypes = {
  lineMultiplication: { ... },
  longDivision: {
    label: "Long division",
    makeProblems: makeDivisionProblems,
    renderProblem: renderLongDivision
  }
};
```

Each problem carries the precomputed steps, so layout and answer-fill share one source of truth:

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

Mirror the Multi digit Multiplication sidebar one-for-one — same two-column shape, same cards, same hidden-input pattern, same regeneration behaviour. Reuse the existing CSS classes (`line-sidebar`, `line-right-col`, `control-card`, `compact-card`, `mode-toggle`, `switch`, etc.) and the existing JS plumbing (`mulberry32`, `resolveSeedText`, `scheduleRegeneration`, the `exerciseTypes` dispatch).

**Left sidebar.** Two stacked cards, in this order:

- **Number of problems** — unchanged from multiplication. Hidden `#problemCount`, a 4×3 `#problemCountGrid` of buttons numbered 1–12. Clicking a number regenerates the worksheet immediately.
- **Number of digits** — same shape as the multiplication size card, with three differences:
  - `#digitGrid` is repurposed as a 4-row × 3-column grid. **Rows** = dividend digit count (2 through 5). **Columns** = divisor digit count (1 through 3). Axis labels become "digits in dividend" and "digits in divisor".
  - Cells where the divisor has as many or more digits than the dividend (`2×2`, `3×3`, etc.) are disabled — same convention as `1×1` being disabled in multiplication, since those produce quotients of 0 or 1 and aren't useful for long-division practice. Default selection: `4×2`.
  - A new **Allow remainder** switch row sits at the bottom of the card, below the Range/Fixed helper text. Off by default. When off, the generator only emits `dividend = divisor × q` so every problem divides evenly. It lives in the size card (not in Answers) because it constrains *which problems get generated*, not how answers display.

  The header keeps the live summary line (`#problemTypeSummary`, e.g. `Range: up to 4×2 digits`) and the Range/Fixed `mode-toggle`. Hidden inputs `#problemType` (e.g. `4x2`) and `#problemMode` (`range` | `fixed`) match the multiplication tab.

**Right column.** Same three compact cards in a row above the worksheet preview, in this order:

- **Randomness** — `#seed` text input (`inputmode="numeric"`, placeholder `blank = random`), current-seed badge `#currentSeed` (click to copy), and a `New set` button that is disabled while a seed is set. Identical to multiplication.
- **Answers** — single `#includeAnswer` switch. When on, fill in every empty box per the `divideSteps` data (quotient digits, each `q_k × divisor` subtraction row, partial remainders, final remainder).
- **Print style** — `#inkColor` select with the same four colour options (blue, black, green, red-brown) and a `Print` button. Same print-CSS hiding rules so only the worksheet area prints.

**Regeneration triggers.** Every input change regenerates the worksheet: count-grid click, mode toggle, digit-grid cell click, **Allow remainder** toggle, ink colour, **Include answer**, and seed input (via the existing debounced `scheduleRegeneration`). The seed-stamp in the worksheet's lower-right corner carries over as-is.

## Rendering challenges, in order of risk

1. **Vertical space.** Long division is taller than line multiplication. 12 problems on landscape may force a smaller `square`. Mitigation: cap the digit-count grid so 12-problem layouts still fit, or auto-shrink based on `count × steps`.
2. **Column alignment.** Every subtraction row and bring-down must align to the right column. Drive every text element's `x` from a single `colStep × columnIndex`.
3. **Variable step count.** Two problems of the same digit size can need different step counts because of the `q = 0` bring-down case. Compute step count up-front; never assume `n − d + 1`.
4. **Answer-key correctness.** Easy to get wrong if the layout calc and the answer calc drift apart. Keep one `divideSteps` function as the single source of both.

## Phased implementation

1. **Phase 1** — `divideSteps` data model with unit tests. Pure logic, no rendering — proves the math is right and gives the renderer a stable contract.
2. **Phase 2** — Enable the Division top tab and render a single hard-coded problem in the house layout. No remainder support yet, fixed `4×2` size. One commit per concern: tab routing, layout calculator, SVG renderer.
3. **Phase 3** — Sidebar wiring: `digitCountGrid` (with Range/Fixed), `problemCountGrid`, seed, ink color, `New set`, `Allow remainder` toggle, `includeAnswer` fill.
4. **Phase 4** — Polish: per-problem auto-shrink based on step count, mobile-aware sizing, print verification.

## Open questions

- Do we want decimal-extension long division (`13 ÷ 4 = 3.25`)? Out of scope for the first cut; would change the layout (bring-down zeros after a decimal point) and the algorithm termination condition.
- Bracket style: the modern "long division house" with explicit angle reads better than the typewriter `divisor)dividend` form, but the rendering is fiddlier. Recommend the modern bracket.
