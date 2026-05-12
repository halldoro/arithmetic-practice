import test from "node:test";
import assert from "node:assert/strict";
import { divideSteps } from "./divide_steps.mjs";

test("7836 ÷ 23 — canonical example from doc/001", () => {
  const result = divideSteps("7836", "23");
  assert.equal(result.dividend, "7836");
  assert.equal(result.divisor, "23");
  assert.equal(result.quotient, "340");
  assert.equal(result.remainder, "16");
  assert.deepEqual(result.steps, [
    { column: 1, take: "78", q: 3, sub: "69", remainder:  "9" },
    { column: 2, take: "93", q: 4, sub: "92", remainder:  "1" },
    { column: 3, take: "16", q: 0, sub:  "0", remainder: "16" }
  ]);
});

test("100 ÷ 5 — bring-down zero produces a q=0 step", () => {
  const result = divideSteps("100", "5");
  assert.equal(result.quotient, "20");
  assert.equal(result.remainder, "0");
  assert.deepEqual(result.steps, [
    { column: 1, take: "10", q: 2, sub: "10", remainder: "0" },
    { column: 2, take:  "0", q: 0, sub:  "0", remainder: "0" }
  ]);
});

test("12 ÷ 3 — single step, exact", () => {
  const result = divideSteps("12", "3");
  assert.equal(result.quotient, "4");
  assert.equal(result.remainder, "0");
  assert.deepEqual(result.steps, [
    { column: 1, take: "12", q: 4, sub: "12", remainder: "0" }
  ]);
});

test("13 ÷ 4 — single step with remainder", () => {
  const result = divideSteps("13", "4");
  assert.equal(result.quotient, "3");
  assert.equal(result.remainder, "1");
});

test("200 ÷ 3 — repeated quotient digit", () => {
  const result = divideSteps("200", "3");
  assert.equal(result.quotient, "66");
  assert.equal(result.remainder, "2");
});

test("5040 ÷ 12 — multi-step exact division", () => {
  const result = divideSteps("5040", "12");
  assert.equal(result.quotient, "420");
  assert.equal(result.remainder, "0");
});

test("99999 ÷ 7 — five-digit dividend, single-digit divisor", () => {
  const result = divideSteps("99999", "7");
  assert.equal(result.quotient, "14285");
  assert.equal(result.remainder, "4");
  assert.equal(result.steps.length, 5);
});

test("12345 ÷ 678 — three-digit divisor", () => {
  const result = divideSteps("12345", "678");
  assert.equal(result.quotient, "18");
  assert.equal(result.remainder, "141");
});

test("dividend < divisor — empty steps, quotient 0", () => {
  const result = divideSteps("4", "5");
  assert.equal(result.quotient, "0");
  assert.equal(result.remainder, "4");
  assert.deepEqual(result.steps, []);
});

test("0 ÷ 5 — empty steps, quotient 0", () => {
  const result = divideSteps("0", "5");
  assert.equal(result.quotient, "0");
  assert.equal(result.remainder, "0");
  assert.deepEqual(result.steps, []);
});

test("divisor 0 throws", () => {
  assert.throws(() => divideSteps("10", "0"), /non-zero/);
});

test("non-integer inputs throw", () => {
  assert.throws(() => divideSteps("1.5", "2"), /integer/);
  assert.throws(() => divideSteps("10", "-2"), /integer/);
  assert.throws(() => divideSteps("abc", "2"), /integer/);
});

test("accepts numeric arguments as well as strings", () => {
  const result = divideSteps(7836, 23);
  assert.equal(result.quotient, "340");
  assert.equal(result.remainder, "16");
});

// Property checks — every problem the generator might emit should satisfy
// these invariants. If one of these fails, the answer-fill in Phase 3 will
// be wrong too.

const PROPERTY_CASES = [
  ["7836",  "23"],
  ["1000",   "7"],
  ["5040",  "12"],
  ["999",    "9"],
  ["12345", "67"],
  ["10000", "11"],
  ["31416",  "3"],
  ["20304",  "8"]
];

test("invariant: q * divisor == sub for every step", () => {
  for (const [dividend, divisor] of PROPERTY_CASES) {
    const result = divideSteps(dividend, divisor);
    for (const step of result.steps) {
      assert.equal(
        BigInt(step.q) * BigInt(divisor),
        BigInt(step.sub),
        `q * divisor mismatch for ${dividend} ÷ ${divisor} step ${JSON.stringify(step)}`
      );
    }
  }
});

test("invariant: take - sub == remainder for every step", () => {
  for (const [dividend, divisor] of PROPERTY_CASES) {
    const result = divideSteps(dividend, divisor);
    for (const step of result.steps) {
      assert.equal(
        BigInt(step.take) - BigInt(step.sub),
        BigInt(step.remainder),
        `take - sub mismatch for ${dividend} ÷ ${divisor} step ${JSON.stringify(step)}`
      );
    }
  }
});

test("invariant: dividend == quotient * divisor + remainder", () => {
  for (const [dividend, divisor] of PROPERTY_CASES) {
    const result = divideSteps(dividend, divisor);
    assert.equal(
      BigInt(result.quotient) * BigInt(divisor) + BigInt(result.remainder),
      BigInt(dividend),
      `round-trip mismatch for ${dividend} ÷ ${divisor}`
    );
  }
});

test("invariant: step columns are strictly ascending and end at dividend's last column", () => {
  for (const [dividend, divisor] of PROPERTY_CASES) {
    const result = divideSteps(dividend, divisor);
    if (result.steps.length === 0) continue;
    for (let i = 1; i < result.steps.length; i++) {
      assert.ok(
        result.steps[i].column === result.steps[i - 1].column + 1,
        `column gap in ${dividend} ÷ ${divisor}`
      );
    }
    assert.equal(
      result.steps[result.steps.length - 1].column,
      dividend.length - 1,
      `last step does not reach dividend's last column for ${dividend} ÷ ${divisor}`
    );
  }
});

test("invariant: quotient digit count == step count", () => {
  for (const [dividend, divisor] of PROPERTY_CASES) {
    const result = divideSteps(dividend, divisor);
    assert.equal(result.quotient.length, result.steps.length || 1);
  }
});
