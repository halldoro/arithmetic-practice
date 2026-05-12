import test from "node:test";
import assert from "node:assert/strict";
import { divideSteps } from "./divide_steps.mjs";
import { longDivisionLayout } from "./long_division_layout.mjs";

test("layout for 5040 ÷ 12 — Phase 2 hard-coded example", () => {
  const layout = longDivisionLayout(divideSteps("5040", "12"));

  // 3 quotient boxes at columns 1, 2, 3 (col 0 was swallowed by initial expansion).
  assert.equal(layout.quotientBoxes.length, 3);
  assert.deepEqual(layout.quotientBoxes.map(b => b.col), [1, 2, 3]);
  assert.deepEqual(layout.quotientBoxes.map(b => b.digit), ["4", "2", "0"]);

  // 4 dividend digits printed.
  assert.deepEqual(layout.dividendDigits.map(d => d.char), ["5", "0", "4", "0"]);

  // 3 step rows.
  assert.equal(layout.stepRows.length, 3);

  // Step 0: sub "48" (2 boxes ending at col 1).
  assert.deepEqual(layout.stepRows[0].subRow.boxes.map(b => b.col), [0, 1]);
  assert.deepEqual(layout.stepRows[0].subRow.boxes.map(b => b.digit), ["4", "8"]);

  // Step 0 post-row = step 1's take ("24") at cols 1, 2.
  assert.deepEqual(layout.stepRows[0].postRow.boxes.map(b => b.col), [1, 2]);

  // Step 1: sub "24" at cols 1, 2.
  assert.deepEqual(layout.stepRows[1].subRow.boxes.map(b => b.col), [1, 2]);

  // Step 1 post-row = step 2's take ("0") at col 3.
  assert.deepEqual(layout.stepRows[1].postRow.boxes.map(b => b.col), [3]);

  // Step 2: sub "0" at col 3.
  assert.deepEqual(layout.stepRows[2].subRow.boxes.map(b => b.col), [3]);

  // Step 2 is the final step; post-row holds the final remainder "0" at col 3.
  assert.equal(layout.stepRows[2].kind, "final");
  assert.deepEqual(layout.stepRows[2].postRow.boxes.map(b => b.col), [3]);
  assert.deepEqual(layout.stepRows[2].postRow.boxes.map(b => b.digit), ["0"]);
});

test("layout for 7836 ÷ 23 — canonical example from doc/001", () => {
  const layout = longDivisionLayout(divideSteps("7836", "23"));

  assert.equal(layout.quotientBoxes.length, 3);
  assert.deepEqual(layout.quotientBoxes.map(b => b.col), [1, 2, 3]);
  assert.deepEqual(layout.quotientBoxes.map(b => b.digit), ["3", "4", "0"]);

  // Final remainder "16" right-aligned to col 3 → cols 2, 3.
  assert.equal(layout.stepRows[2].kind, "final");
  assert.deepEqual(layout.stepRows[2].postRow.boxes.map(b => b.col), [2, 3]);
  assert.deepEqual(layout.stepRows[2].postRow.boxes.map(b => b.digit), ["1", "6"]);
});

test("layout for 12 ÷ 3 — single step, single quotient box", () => {
  const layout = longDivisionLayout(divideSteps("12", "3"));
  assert.equal(layout.quotientBoxes.length, 1);
  assert.equal(layout.quotientBoxes[0].col, 1);
  assert.equal(layout.stepRows.length, 1);
  assert.equal(layout.stepRows[0].kind, "final");
});

test("width and height are positive and grow with problem size", () => {
  const small = longDivisionLayout(divideSteps("12", "3"));
  const big   = longDivisionLayout(divideSteps("99999", "7"));
  assert.ok(small.width > 0 && small.height > 0);
  assert.ok(big.width > small.width);
  assert.ok(big.height > small.height);
});

test("geometry options propagate to box sizes and overall dimensions", () => {
  const stepsObj = divideSteps("5040", "12");
  const a = longDivisionLayout(stepsObj);
  const b = longDivisionLayout(stepsObj, { square: 100, colStep: 110 });
  assert.equal(a.quotientBoxes[0].size, 60);
  assert.equal(b.quotientBoxes[0].size, 100);
  assert.ok(b.width > a.width);
});

test("box rows do not overlap horizontally", () => {
  for (const [dividend, divisor] of [["5040","12"], ["7836","23"], ["99999","7"], ["12345","67"]]) {
    const layout = longDivisionLayout(divideSteps(dividend, divisor));
    for (const stepRow of layout.stepRows) {
      for (const row of [stepRow.subRow, stepRow.postRow]) {
        for (let i = 1; i < row.boxes.length; i++) {
          assert.ok(
            row.boxes[i].x >= row.boxes[i - 1].x + row.boxes[i - 1].size,
            `boxes overlap in ${dividend} ÷ ${divisor} at col ${row.boxes[i].col}`
          );
        }
      }
    }
  }
});

test("bracket top spans the full dividend width", () => {
  const layout = longDivisionLayout(divideSteps("5040", "12"));
  const firstDigit = layout.dividendDigits[0].x;
  const lastDigit  = layout.dividendDigits.at(-1).x;
  assert.ok(layout.bracket.top.x1 <= firstDigit);
  assert.ok(layout.bracket.top.x2 >= lastDigit);
  // Left vertical line shares its top point with the top horizontal line.
  assert.equal(layout.bracket.left.x1, layout.bracket.top.x1);
  assert.equal(layout.bracket.left.y1, layout.bracket.top.y1);
});

test("quotient boxes use the step's column", () => {
  for (const [dividend, divisor] of [["5040","12"], ["7836","23"], ["10000","11"], ["1000","7"]]) {
    const stepsObj = divideSteps(dividend, divisor);
    const layout = longDivisionLayout(stepsObj);
    assert.equal(layout.quotientBoxes.length, stepsObj.steps.length);
    for (let i = 0; i < stepsObj.steps.length; i++) {
      assert.equal(layout.quotientBoxes[i].col, stepsObj.steps[i].column);
    }
  }
});

test("sub-row dividers cover exactly the sub-row boxes", () => {
  const layout = longDivisionLayout(divideSteps("7836", "23"));
  for (const stepRow of layout.stepRows) {
    const leftBox = stepRow.subRow.boxes[0];
    const rightBox = stepRow.subRow.boxes.at(-1);
    assert.equal(stepRow.divider.x1, leftBox.x);
    assert.equal(stepRow.divider.x2, rightBox.x + rightBox.size);
  }
});

test("vertical row order: quotient < bracket top < dividend < first sub", () => {
  const layout = longDivisionLayout(divideSteps("5040", "12"));
  const quotientY = layout.quotientBoxes[0].y;
  const bracketTopY = layout.bracket.top.y1;
  const dividendY = layout.dividendDigits[0].y;
  const firstSubY = layout.stepRows[0].subRow.yTop;
  assert.ok(quotientY < bracketTopY, "quotient row should be above bracket top");
  assert.ok(bracketTopY < dividendY, "bracket top should be above dividend row");
  assert.ok(dividendY < firstSubY, "dividend should be above first subtraction row");
});
