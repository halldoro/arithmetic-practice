// Test sidecar — Node-importable copy of the longDivisionLayout function
// from practice.html. Mirror any change to the function body verbatim
// in both places. Same convention as tools/gen_brick_pattern.mjs.
// practice.html is the source of truth; this file exists so
// `make test` can exercise the layout math from Node.
//
// See doc/001 - Division Tab.md.
//
// Vertical sequence of rows in the returned layout:
//
//   quotient row    one box per step, at the step's quotient column
//   bracket top     horizontal line above the dividend
//   dividend row    digits of the dividend (printed text)
//   per step k:
//     sub row       boxes for q_k * divisor, right-aligned to step.column
//     divider line  underline beneath the sub row
//     post row      boxes for either step[k+1].take (non-final step) or
//                   the final remainder (last step), right-aligned likewise

export function longDivisionLayout(stepsObj, opts = {}) {
  const square        = opts.square        ?? 60;
  const colStep       = opts.colStep       ?? 70;
  const rowStep       = opts.rowStep       ?? 70;
  const dividerHeight = opts.dividerHeight ?? 8;
  const bracketStroke = opts.bracketStroke ?? 4;
  const bracketGap    = opts.bracketGap    ?? 6;
  const divisorPad    = opts.divisorPad    ?? 24;
  const margin        = opts.margin        ?? 24;
  const digitFontSize = opts.digitFontSize ?? 44;

  const { dividend, divisor, steps, remainder } = stepsObj;
  const N = dividend.length;
  const K = steps.length;

  // Reserve room on the left for the divisor text + bracket.
  const divisorDigitWidth = digitFontSize * 0.6;
  const divisorWidth = divisor.length * divisorDigitWidth;
  const bracketX = margin + divisorWidth + divisorPad;
  const xColStart = bracketX + bracketStroke + colStep / 2;

  const colCenter = c => xColStart + c * colStep;
  const colLeft   = c => colCenter(c) - square / 2;
  const colRight  = c => colCenter(c) + square / 2;

  function boxRow(rightCol, length, yTop, digits) {
    const boxes = [];
    for (let i = 0; i < length; i++) {
      const col = rightCol - length + 1 + i;
      boxes.push({
        col,
        x: colLeft(col),
        y: yTop,
        size: square,
        digit: digits ? digits[i] : null
      });
    }
    return boxes;
  }

  let y = margin;

  const quotientRowYTop = y;
  const quotientRowYCenter = y + square / 2;
  y += square;

  y += bracketGap;
  const bracketTopY = y;
  y += bracketStroke + bracketGap;

  const dividendYTop = y;
  const dividendYCenter = y + square / 2;
  y += square;

  const stepRowGap = Math.max(0, rowStep - square);

  const stepRows = [];
  for (let k = 0; k < K; k++) {
    y += stepRowGap;
    const subYTop = y;
    const subYCenter = y + square / 2;
    y += square;

    y += stepRowGap / 2;
    const dividerY = y + dividerHeight / 2;
    y += dividerHeight + stepRowGap / 2;

    const postYTop = y;
    const postYCenter = y + square / 2;
    y += square;

    const step = steps[k];
    const isLast = (k === K - 1);

    const subBoxes = boxRow(step.column, step.sub.length, subYTop, step.sub);
    const subLeftEdge = colLeft(step.column - step.sub.length + 1);
    const subRightEdge = colRight(step.column);

    const postRightCol = isLast ? step.column          : steps[k + 1].column;
    const postContent  = isLast ? remainder            : steps[k + 1].take;
    const postBoxes = boxRow(postRightCol, postContent.length, postYTop, postContent);

    stepRows.push({
      kind: isLast ? "final" : "intermediate",
      step,
      subRow: {
        yTop: subYTop,
        yCenter: subYCenter,
        boxes: subBoxes,
        sign: { text: "−", x: subLeftEdge - 18, y: subYCenter }
      },
      divider: {
        y: dividerY,
        x1: subLeftEdge,
        x2: subRightEdge
      },
      postRow: {
        yTop: postYTop,
        yCenter: postYCenter,
        boxes: postBoxes
      }
    });
  }

  // Left side of the "house" only extends down past the dividend row,
  // not the full work area — keeps the bracket a tidy frame around the
  // divisor/dividend rather than a long fence next to every step.
  const bracketBottomY = dividendYTop + square;
  const height = y + margin;
  const width = colRight(N - 1) + margin;

  const quotientBoxes = steps.map(step => ({
    col: step.column,
    x: colLeft(step.column),
    y: quotientRowYTop,
    size: square,
    digit: String(step.q)
  }));

  const dividendDigits = [...dividend].map((char, col) => ({
    col,
    char,
    x: colCenter(col),
    y: dividendYCenter
  }));

  const bracket = {
    top:  { x1: bracketX, y1: bracketTopY, x2: colRight(N - 1) + bracketGap, y2: bracketTopY },
    left: { x1: bracketX, y1: bracketTopY, x2: bracketX, y2: bracketBottomY }
  };

  const divisorEl = {
    text: divisor,
    x: bracketX - divisorPad,
    y: dividendYCenter,
    anchor: "end"
  };

  return {
    width,
    height,
    geometry: { square, colStep, rowStep, bracketStroke, digitFontSize },
    bracket,
    divisor: divisorEl,
    dividendDigits,
    quotientRowYCenter,
    quotientBoxes,
    stepRows
  };
}
