// Runnable proof of the strategy math. No test framework: `bun run
// src/strategy/selfcheck.ts` (or `bun run strategy:check`). Exits non-zero on
// any failed assertion.
import assert from "node:assert/strict";
import { devig, edge, impliedProbability, kellyFraction, sizeBet } from "./index";

const approx = (a: number, b: number, eps = 1e-9) =>
  assert.ok(Math.abs(a - b) < eps, `${a} !~= ${b}`);

// 1. Implied probability is the inverse of decimal odds.
approx(impliedProbability(2), 0.5);
approx(impliedProbability(4), 0.25);

// 2. De-vig of a vigged 1X2 book: fair probs sum to exactly 1, overround > 0.
const book = [2.1, 3.4, 3.6]; // home / draw / away, priced with margin
const { fair, overround } = devig(book);
approx(fair.reduce((a, b) => a + b, 0), 1);
assert.ok(overround > 0, "a real book has positive overround");
assert.ok(overround < 0.15, "sanity: overround under 15%");

// 3. A fair (zero-margin) book de-vigs to itself and reports ~0 overround.
const fairBook = devig([2, 2]);
approx(fairBook.fair[0], 0.5);
approx(fairBook.overround, 0);

// 4. Kelly identity: full Kelly (fraction=1) * b === edge.
const p = 0.55;
const priceD = 2.0;
const b = priceD - 1;
approx(kellyFraction(p, priceD, 1) * b, edge(p, priceD));

// 5. No edge -> no bet. Fair prob 0.5 at even money has zero edge.
approx(edge(0.5, 2.0), 0);
approx(kellyFraction(0.5, 2.0, 1), 0);
approx(kellyFraction(0.4, 2.0, 1), 0); // negative edge clamps to 0

// 6. Fractional Kelly is exactly the fraction of full Kelly.
approx(kellyFraction(p, priceD, 0.25), kellyFraction(p, priceD, 1) * 0.25);

// 7. Per-match cap binds: quarter-Kelly on a big edge is clipped to 10% bankroll.
//    fair 0.8 @ 2.0 -> full Kelly 0.6, quarter 0.15 -> wants 150, capped to 100.
const capped = sizeBet({
  bankroll: 1000,
  fairProb: 0.8,
  marketDecimal: 2.0, // huge edge -> Kelly wants a lot
  kelly: 0.25,
  perMatchCap: 0.1,
  totalCap: 0.5,
  openExposure: 0,
  minStake: 1,
});
assert.equal(capped.stake, 100, "per-match cap = 10% of 1000");
assert.equal(capped.cappedBy, "per-match");

// 8. Total-exposure cap binds: with 480 already open and a 500 total cap, only
//    20 of headroom remains regardless of Kelly / per-match.
const tight = sizeBet({
  bankroll: 1000,
  fairProb: 0.8,
  marketDecimal: 2.0,
  kelly: 0.25,
  perMatchCap: 0.1,
  totalCap: 0.5,
  openExposure: 480,
  minStake: 1,
});
assert.equal(tight.stake, 20, "only 500 - 480 = 20 headroom");
assert.equal(tight.cappedBy, "total");

// 9. Min-stake floor: a tiny edge that sizes below MIN_STAKE returns 0.
const dust = sizeBet({
  bankroll: 100,
  fairProb: 0.5005,
  marketDecimal: 2.0,
  kelly: 0.25,
  perMatchCap: 0.1,
  totalCap: 0.5,
  openExposure: 0,
  minStake: 1,
});
assert.equal(dust.stake, 0);
assert.equal(dust.cappedBy, "min-stake");

console.log("strategy selfcheck: all assertions passed");
