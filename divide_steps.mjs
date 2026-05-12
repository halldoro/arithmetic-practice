// Long-division calculator. Pure logic, no rendering. The renderer reads
// the returned object so layout and answer-fill share one source of truth.
//
// See doc/001 - Division Tab.md for the data-model contract.

/**
 * Compute the work an elementary long-division procedure performs.
 *
 * @param {string|number} dividend - non-negative integer.
 * @param {string|number} divisor  - positive integer.
 * @returns {{
 *   dividend: string,
 *   divisor: string,
 *   steps: Array<{ column: number, take: string, q: number, sub: string, remainder: string }>,
 *   quotient: string,
 *   remainder: string
 * }}
 *
 * Each step records one "decide quotient digit → subtract → bring down" cycle:
 *   - column:    dividend column index this step's quotient digit aligns to (0 = leftmost).
 *   - take:      partial dividend examined (e.g. "78" or "93").
 *   - q:         quotient digit produced for this step (0..9).
 *   - sub:       q * divisor as a string.
 *   - remainder: take - sub as a string (no leading zeros except "0").
 *
 * For the canonical example `7836 ÷ 23`:
 *   steps = [
 *     { column: 1, take: "78", q: 3, sub: "69", remainder:  "9" },
 *     { column: 2, take: "93", q: 4, sub: "92", remainder:  "1" },
 *     { column: 3, take: "16", q: 0, sub:  "0", remainder: "16" }
 *   ]
 *   quotient  = "340"
 *   remainder = "16"
 *
 * Edge case: when `dividend < divisor`, `steps` is empty, `quotient = "0"`,
 * and `remainder = dividend`. The renderer should treat this as "nothing to do".
 */
export function divideSteps(dividend, divisor) {
  const dividendStr = String(dividend);
  const divisorStr = String(divisor);

  if (!/^\d+$/.test(dividendStr)) {
    throw new Error(`divideSteps: dividend must be a non-negative integer, got ${JSON.stringify(dividend)}`);
  }
  if (!/^\d+$/.test(divisorStr)) {
    throw new Error(`divideSteps: divisor must be a non-negative integer, got ${JSON.stringify(divisor)}`);
  }
  const divisorBig = BigInt(divisorStr);
  if (divisorBig === 0n) {
    throw new Error("divideSteps: divisor must be non-zero");
  }

  const steps = [];
  let running = 0n;
  let i = 0;

  // Initial expansion: grow `take` until it's at least the divisor.
  while (i < dividendStr.length && running < divisorBig) {
    running = running * 10n + BigInt(dividendStr[i]);
    i++;
  }

  if (running < divisorBig) {
    // dividend < divisor — no work to do.
    return {
      dividend: dividendStr,
      divisor: divisorStr,
      steps: [],
      quotient: "0",
      remainder: dividendStr
    };
  }

  let quotient = "";
  while (true) {
    const take = String(running);
    const qBig = running / divisorBig;
    const q = Number(qBig);
    const subBig = qBig * divisorBig;
    const remainderBig = running - subBig;
    steps.push({
      column: i - 1,
      take,
      q,
      sub: String(subBig),
      remainder: String(remainderBig)
    });
    quotient += String(q);

    if (i >= dividendStr.length) {
      return {
        dividend: dividendStr,
        divisor: divisorStr,
        steps,
        quotient,
        remainder: String(remainderBig)
      };
    }

    running = remainderBig * 10n + BigInt(dividendStr[i]);
    i++;
  }
}
