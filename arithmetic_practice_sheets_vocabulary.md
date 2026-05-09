# Arithmetic Practice Sheets Vocabulary

This document defines the standard vocabulary used for the arithmetic worksheet generator. It is meant to be readable by both humans and LLMs so that future changes can be discussed precisely.

## Project purpose

The project provides printable arithmetic practice material for children, served as a single static HTML page. The page is structured as two top-level topics, navigable from the tab strip:

- **Multiplication** (active topic), split into two variants:
  - **Single digit** — a fixed printable multiplication table covering products 1×1 through 10×10. Delivered as a downloadable PDF with an embedded preview.
  - **Multi digit** — a generator for line-multiplication worksheets. Problems are rendered as SVG using a visual method where the digits of two numbers are represented by crossing families of lines and the intersections map to a related set of writing boxes.
- **Division** — placeholder for a future exercise type.

The project is implemented as a single static HTML file using JavaScript, SVG, and print CSS. It runs locally in a browser and is deployed to GitHub Pages.

## tabs

The **tabs** are the top-of-page navigation that selects which content the user sees.

The tab strip has two levels:

- **Top tabs** identify the broad topic: `Multiplication`, `Division`.
- **Sub-tabs** appear directly below the top tabs and identify the variant within the active topic: `Single digit`, `Multi digit`.

In the current implementation the sub-tabs are the actual view switcher. The top "Multiplication" tab is the only enabled topic and acts as a passive label; "Division" is disabled.

Each sub-tab corresponds to a **view**, a single panel of content. Switching sub-tabs hides every other view.

## Worksheet

A **worksheet** is the full printable page.

A worksheet contains one or more **problems** arranged in a page grid.

Current layout rules:

- 1–3 problems use portrait orientation.
- 4–12 problems use landscape orientation.
- The page is intended to print on A4 paper.
- The print layout leaves a small margin so that borders and content are not clipped by printer edges.

## Problem

A **problem** is one complete multiplication exercise inside a bordered rectangle.

Each problem has three visual parts:

1. `mathString`
2. `grid`
3. `mathBoxes`

The problem boundary is the thin rectangle around these parts. All visible elements of the problem should fit inside this boundary without clipping.

## mathString

The **mathString** is the written multiplication expression at the top of a problem.

Example:

```text
5787 × 3862
```

It represents the two numbers the child is asked to multiply.

The mathString should be visually clear and should use a font size consistent with the digit labels in the grid.

When the `includeAnswer` toggle is on (Multi digit tab only), the mathString is extended with the final product:

```text
5787 × 3862 = 22349594
```

Related terms:

- `leftNumber`: the number on the left side of the multiplication sign.
- `rightNumber`: the number on the right side of the multiplication sign.
- `leftDigits`: the digits of `leftNumber`.
- `rightDigits`: the digits of `rightNumber`.

## grid

The **grid** is the diagram of crossing diagonal lines with dots at the intersections.

It represents the multiplication visually.

For line multiplication:

- Each digit in `leftNumber` creates one line in one diagonal direction.
- Each digit in `rightNumber` creates one line in the other diagonal direction.
- Every digit creates a line, including `0`.
- Every crossing between a left-number line and a right-number line creates one intersection dot.

If `leftNumber` has `m` digits and `rightNumber` has `n` digits, then:

```text
number of grid lines = m + n
number of intersection dots = m × n
```

## gridDigitLabels

The **gridDigitLabels** are the digit characters placed near the ends of the grid lines.

They show which digit each line represents.

Rules:

- Labels should be close to the end of their corresponding line.
- Labels should not collide with the mathString.
- Labels should not be so far from the line that the relationship becomes unclear.
- The digit label font should be large enough to read when printed.

## intersectionDot

An **intersectionDot** is a dot placed at the exact crossing of one line from the first number and one line from the second number.

All intersection dots in a grid should use the same visual style.

The total number of intersection dots must equal:

```text
len(leftDigits) × len(rightDigits)
```

This count must also match the number of pieces in `mathBoxes`.

## mathBoxes

The **mathBoxes** are the box diagram placed near the grid.

They are used as writing spaces for the child. They correspond to the intersection dots in the grid.

Important rule:

```text
number of mathBox pieces = number of grid intersection dots
```

So for an `m × n` digit problem:

```text
number of mathBox pieces = m × n
```

Each mathBox piece corresponds to one grid intersection.

## mathBoxPiece

A **mathBoxPiece** is one horizontal domino-shaped box made from two adjacent squares.

It looks like this:

```text
[ ][ ]
```

Rules:

- Every mathBoxPiece is made from exactly two adjacent squares.
- The squares should be large enough for a child to handwrite numbers inside.
- Pieces should be arranged in a brick-layer pattern.
- Pieces should be separated by a narrow visible gap.
- Pieces should remain snapped to an underlying square grid.

## brickLayerPattern

The **brickLayerPattern** is the arrangement used for `mathBoxes`.

The pieces form staggered horizontal rows, similar to brickwork.

Example shape for a larger problem:

```text
      [ ][ ]
   [ ][ ] [ ][ ]
[ ][ ] [ ][ ] [ ][ ]
   [ ][ ] [ ][ ]
      [ ][ ]
```

The exact number of rows and pieces per row depends on the digit counts of the problem.

The brickLayerPattern is not a plain rectangular table. It is derived from the same lattice structure as the grid intersections.

## latticeCoordinates

The **latticeCoordinates** are the abstract coordinates used to relate the grid and mathBoxes.

For a problem with:

- `m = len(leftDigits)`
- `n = len(rightDigits)`

Each intersection is identified by a pair:

```text
(i, j)
```

where:

```text
i = index of a digit/line from leftNumber
j = index of a digit/line from rightNumber
```

The same `(i, j)` pair is used to create:

1. one intersection dot in the grid
2. one mathBoxPiece in the mathBoxes

This shared coordinate system is essential.

## visualRows

The **visualRows** are the rows of intersections as they visually appear in the diagonal grid.

They are grouped using the relationship:

```text
i - j = constant
```

This grouping is used to create the horizontal rows of the mathBoxes.

The horizontal placement within each row is based on:

```text
i + j
```

This is what makes the mathBoxes line up with the visual structure of the grid.

## problemType

A **problemType** describes the digit counts used in generated multiplication problems.

Examples:

```text
2×3
4×4
1×4
3×1
```

Here `2×3` means:

```text
2-digit number × 3-digit number
```

This does not mean the arithmetic expression `2 times 3`.

## problemSizeMode

The **problemSizeMode** determines how the selected problemType is interpreted.

There are two modes:

### Range mode

In **Range** mode, selecting `4×4` means:

```text
generate problems using any valid digit size up to 4×4
```

So a `4×4` range may include:

```text
1×2, 1×3, 1×4
2×1, 2×2, 2×3, 2×4
3×1, 3×2, 3×3, 3×4
4×1, 4×2, 4×3, 4×4
```

but it must not include `1×1`.

### Fixed mode

In **Fixed** mode, selecting `4×4` means:

```text
generate only 4-digit number × 4-digit number problems
```

Only the chosen square is active.

## digitCountGrid

The **digitCountGrid** is the UI control used to select the problemType.

It is a 4-by-4 grid of squares.

Rows represent the number of digits in the first number.

Columns represent the number of digits in the second number.

The `1×1` cell is disabled.

In Range mode, the highlighted area is a rectangle from the top-left to the selected cell, excluding `1×1`.

In Fixed mode, only the selected cell is highlighted.

## problemCountGrid

The **problemCountGrid** is the UI control used to select how many problems appear on the worksheet. It lives in the Multi digit sidebar under the heading **Number of problems**.

It is a 4-by-3 grid of buttons numbered 1 through 12.

Selecting a number immediately regenerates the worksheet.

## randomSet

A **randomSet** is a generated worksheet where the problems are chosen randomly.

The **New set** button generates a new random worksheet using the current settings.

If a seed is set, the random set button is disabled because the result is deterministic.

## seed

A **seed** is an optional value used to make the random worksheet repeatable.

If the same seed and the same settings are used, the same worksheet should be generated again.

If the seed field is empty, the worksheet is random and can be regenerated with **New random set**.

## inkColor

The **inkColor** is the color used for the worksheet graphics.

It applies to:

- mathString
- grid lines
- gridDigitLabels
- intersectionDots
- mathBoxes outlines
- problem boundaries

## includeAnswer

The **includeAnswer** toggle is a switch in the Multi digit sidebar.

When on, every problem's `mathString` is appended with `= product`, where `product` is the final result of the multiplication. The rest of the worksheet is unchanged — `mathBoxes` are not filled in.

This turns the worksheet into an answer key for verification while still showing the empty boxes.

## layoutHeuristics

The **layoutHeuristics** are the rules used to place the `grid` and `mathBoxes` inside each problem boundary.

General goals:

- Both grid and mathBoxes should be visible at the same time.
- They should not overlap.
- They should not be clipped by the problem boundary.
- The grid should tend toward the lower-left when space is tight.
- The mathBoxes should tend toward the upper-right when space is tight.
- For small problems, the grid and mathBoxes should be placed closer together near the center.
- For large problems, placement should be based on measured bounding boxes, not fixed offsets.

The layout should be computed per problem, because a `1×2` problem and a `4×4` problem need different placement.

## boundingBox

A **boundingBox** is the calculated rectangular boundary around a visual element.

The program should calculate bounding boxes for:

- the grid
- the mathBoxes

These bounding boxes are used to prevent clipping and overlap.

Even though the visual shapes are not perfect rectangles, bounding boxes are a useful conservative approximation.

## polygonFit

A **polygonFit** is the ideal future version of bounding-box placement.

The grid and mathBoxes are visually closer to diamond or staggered polygon shapes than rectangles. A polygon-based fit would allow more efficient placement than rectangular bounding boxes.

For now, bounding boxes are acceptable, but future layout improvements may use polygon-like footprints.

## printPage

The **printPage** is the browser-rendered page intended for physical printing.

For the **Multi digit** tab, the **Print** button in the sidebar invokes the browser's print dialog. Print CSS hides navigation, sidebar, and header so only the worksheet area prints.

For the **Single digit** tab, the **Print** button next to **Download PDF** triggers the embedded PDF viewer's own print routine, with a fallback that opens the PDF in a new tab if the viewer does not expose `print()`.

Rules for the Multi digit print path:

- Use A4 dimensions.
- Use portrait orientation for 1–3 problems.
- Use landscape orientation for 4–12 problems.
- Leave a small print margin so content is not clipped by printer hardware.
- Hide UI controls when printing.
- Print only the worksheet page.

## sidebarLayout

The **sidebarLayout** is the consistent two-column arrangement used by both Multiplication sub-tabs:

- A narrow left **sidebar** holds either the worksheet configuration controls (Multi digit) or a short explanation plus action buttons (Single digit).
- The main area on the right shows the deliverable: the live worksheet preview (Multi digit) or the embedded PDF preview (Single digit).

On narrow viewports (≤ 900px) the layout collapses to a single column with the sidebar above the main area.

## Standard vocabulary summary

| Term | Meaning |
|---|---|
| `worksheet` | the full printable page |
| `problem` | one bordered multiplication exercise |
| `mathString` | the written expression, e.g. `5787 × 3862` |
| `grid` | the crossing-line diagram |
| `gridDigitLabels` | digits placed near the line ends |
| `intersectionDot` | dot at a crossing of two lines |
| `mathBoxes` | the writing-box diagram |
| `mathBoxPiece` | one two-square domino piece |
| `brickLayerPattern` | staggered row arrangement of mathBoxPieces |
| `latticeCoordinates` | shared `(i, j)` coordinates for dots and pieces |
| `visualRows` | row grouping based on `i - j` |
| `problemType` | digit-count pattern such as `2×4` |
| `problemSizeMode` | `Range` or `Fixed` interpretation of problemType |
| `digitCountGrid` | UI grid for choosing digit counts |
| `problemCountGrid` | UI grid for choosing 1–12 problems |
| `randomSet` | a randomly generated worksheet |
| `seed` | repeatable random input |
| `inkColor` | selected drawing color |
| `layoutHeuristics` | rules for placing grid and mathBoxes |
| `boundingBox` | calculated rectangular bounds of a visual part |
| `polygonFit` | future tighter placement using polygon-like footprints |
| `printPage` | browser page intended for physical printing |
| `tabs` | top + sub-tab navigation; selects the active view |
| `sidebarLayout` | two-column arrangement, controls or info on the left |
| `includeAnswer` | toggle that appends `= product` to each `mathString` |
