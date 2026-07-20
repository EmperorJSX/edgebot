// Runnable proof of the strategy math. No test framework: `bun run
// src/strategy/selfcheck.ts` (or `bun run strategy:check`). Exits non-zero on
// any failed assertion.
import assert from "node:assert/strict";
import type { OddsSet } from "@/types";
import {
  detectSharpMove,
  devig,
  edge,
  fairProb,
  impliedProbability,
  kelly,
  kellyFraction,
  sizeBet,
} from "./index";

const approx = (a: number, b: number, eps = 1e-9) =>
  assert.ok(Math.abs(a - b) < eps, `${a} !~= ${b}`);

const market = (decimals: number[], ts = 0): OddsSet => ({
  fixtureId: 1,
  ts,
  marketId: 1,
  market: "1X2",
  selections: decimals.map((decimal, i) => ({ name: ["Home", "Draw", "Away"][i], decimal })),
});

// 1. Implied probability is the inverse of decimal odds.
approx(impliedProbability(2), 0.5);
approx(impliedProbability(4), 0.25);

// 2. De-vig of a vigged 1X2 book: fair probs sum to exactly 1, overround > 0.
//    Works identically on an OddsSet and a bare decimals array.
const book = [2.1, 3.4, 3.6]; // home / draw / away, priced with margin
const { fair, overround } = devig(market(book));
approx(fair.reduce((a, b) => a + b, 0), 1);
assert.ok(overround > 0, "a real book has positive overround");
assert.ok(overround < 0.15, "sanity: overround under 15%");
assert.deepEqual(fairProb(book), fair);

// 3. A fair (zero-margin) book de-vigs to itself and reports ~0 overround.
const fairBook = devig([2, 2]);
approx(fairBook.fair[0], 0.5);
approx(fairBook.overround, 0);

// 4. Kelly identity: full Kelly fraction * b === edge. Stake = fraction * bankroll.
const p = 0.55;
const priceD = 2.0;
approx(kellyFraction(p, priceD, 1) * (priceD - 1), edge(p, priceD));
approx(kelly(p, priceD, 1000, 1), kellyFraction(p, priceD, 1) * 1000);

// 5. Kelly bounds: no edge -> 0; negative edge -> 0; never above the bankroll.
approx(edge(0.5, 2.0), 0);
approx(kelly(0.5, 2.0, 1000, 1), 0);
approx(kelly(0.4, 2.0, 1000, 1), 0);
assert.ok(kelly(0.99, 100, 1000, 1) <= 1000, "kelly never exceeds bankroll");

// 6. Fractional Kelly is exactly the fraction of full Kelly.
approx(kelly(p, priceD, 1000, 0.25), kelly(p, priceD, 1000, 1) * 0.25);

// 7. Sharp-move detection: a 2.10 -> 1.80 crash (7.9 prob points, 14% price
//    move, crosses even money) triggers; a 2.10 -> 2.08 wobble does not.
const crash = detectSharpMove(market([2.1, 3.4, 3.6], 0), market([1.8, 3.9, 4.4], 1));
assert.equal(crash[0]?.selection, "Home");
assert.ok(crash[0].deltaProb > 0.07, "prob shifted toward Home");
assert.ok(crash[0].crossedEvenMoney, "2.10 -> 1.80 crosses 2.00");
const wobble = detectSharpMove(market([2.1, 3.4, 3.6], 0), market([2.08, 3.4, 3.6], 1));
assert.equal(wobble.length, 0, "noise must not trigger");

// 8. Risk caps bind in order: per-match, then total headroom, then min-stake.
const caps = { kelly: 0.25, perMatchCap: 0.1, totalCap: 0.5, minStake: 1 };
const capped = sizeBet({ bankroll: 1000, fairProb: 0.8, marketDecimal: 2.0, openExposure: 0, ...caps });
assert.equal(capped.stake, 100, "per-match cap = 10% of 1000");
assert.equal(capped.cappedBy, "per-match");
const tight = sizeBet({ bankroll: 1000, fairProb: 0.8, marketDecimal: 2.0, openExposure: 480, ...caps });
assert.equal(tight.stake, 20, "only 500 - 480 = 20 headroom");
assert.equal(tight.cappedBy, "total");
const dust = sizeBet({ bankroll: 100, fairProb: 0.5005, marketDecimal: 2.0, openExposure: 0, ...caps });
assert.equal(dust.stake, 0);
assert.equal(dust.cappedBy, "min-stake");

console.log("strategy selfcheck: all assertions passed");
