// ---------------------------------------------------------------------------
// Strategy math. Pure, deterministic, dependency-free. This is the part a
// judge (or a real trading desk) should be able to audit line by line.
//
// Pipeline: TxLINE consensus decimal odds -> implied prob -> de-vig to a fair
// distribution -> edge vs the venue's offered price -> fractional Kelly stake
// -> risk caps. Sharp-move detection watches consecutive quotes of the same
// market for significant shifts.
// ---------------------------------------------------------------------------

import type { OddsSet } from "@/types";

/**
 * Implied probability of a decimal price. A 2.00 price implies 50%.
 * This is the book's price INCLUDING its margin, so a full book's implied
 * probabilities sum to more than 1 (the overround / vig).
 */
export function impliedProbability(decimalOdds: number): number {
  if (decimalOdds <= 1) {
    throw new Error(`decimal odds must be > 1, got ${decimalOdds}`);
  }
  return 1 / decimalOdds;
}

export interface DevigResult {
  /** Fair probabilities, one per input selection, in input order. Sum to 1. */
  fair: number[];
  /** The book's margin: sum(1/decimal) - 1. >= 0 for a normally priced book. */
  overround: number;
}

/**
 * Remove the bookmaker margin from a full market (e.g. home/draw/away).
 * Accepts either an OddsSet or a bare array of decimal prices.
 *
 * Uses the proportional (normalization) method: each fair probability is its
 * raw implied probability divided by the booksum. Simple, standard, and
 * guarantees the output is a valid distribution summing to exactly 1.
 *
 * ponytail: proportional de-vig, not Shin or power. Swap the normalization if
 * a favourite-longshot correction is ever needed; the interface stays put.
 */
export function devig(oddsSet: OddsSet | number[]): DevigResult {
  const decimals = Array.isArray(oddsSet)
    ? oddsSet
    : oddsSet.selections.map((s) => s.decimal);
  if (decimals.length === 0) throw new Error("devig needs >= 1 selection");
  const raw = decimals.map(impliedProbability);
  const booksum = raw.reduce((a, b) => a + b, 0);
  return {
    fair: raw.map((p) => p / booksum),
    overround: booksum - 1,
  };
}

/**
 * Fair (de-vigged) probability per selection of a market, in selection order.
 * Convenience over devig() for callers that only need the distribution.
 */
export function fairProb(oddsSet: OddsSet | number[]): number[] {
  return devig(oddsSet).fair;
}

/** Fair decimal price for a probability. Inverse of impliedProbability. */
export function fairDecimal(prob: number): number {
  if (prob <= 0 || prob >= 1) throw new Error(`prob must be in (0,1), got ${prob}`);
  return 1 / prob;
}

/**
 * Edge = expected value per unit staked on a back bet at `offered`, given our
 * fair probability. edge = fair * offered - 1. Positive means the venue is
 * offering better-than-fair odds (a value bet). Bet when edge >= MIN_EDGE.
 */
export function edge(fair: number, offered: number): number {
  if (offered <= 1) throw new Error(`offered decimal must be > 1, got ${offered}`);
  return fair * offered - 1;
}

/**
 * Kelly stake in bankroll units.
 *
 * Full Kelly fraction f* = (b*p - q) / b with b = decimalOdds - 1, p = prob,
 * q = 1 - p. Note the identity f* * b === edge, which the self-check asserts.
 * The result is scaled by `fraction` (e.g. 0.25 = quarter Kelly, the standard
 * variance-reduction practice), clamped to [0, 1] as a fraction of bankroll,
 * and returns 0 whenever there is no positive edge. Never negative, never
 * more than the whole bankroll.
 */
export function kelly(
  prob: number,
  decimalOdds: number,
  bankroll: number,
  fraction: number,
): number {
  return kellyFraction(prob, decimalOdds, fraction) * bankroll;
}

/** The bankroll-fraction form of kelly(); see kelly() for the math. */
export function kellyFraction(
  prob: number,
  decimalOdds: number,
  fraction: number,
): number {
  if (decimalOdds <= 1) throw new Error(`decimal odds must be > 1, got ${decimalOdds}`);
  const b = decimalOdds - 1;
  const full = (b * prob - (1 - prob)) / b;
  if (full <= 0) return 0;
  return clamp(full * fraction, 0, 1);
}

// ---------------------------------------------------------------------------
// Sharp-move detection: compare two consecutive quotes of the SAME market.
// A "sharp move" is a shift big enough that it likely reflects informed money
// rather than noise. Flagged when, for any selection present in both quotes:
//   1. the implied probability shifted by >= probThreshold (default 2 points), or
//   2. the relative decimal change is >= pctThreshold (default 5%), or
//   3. the price crossed even money (2.00), a psychologically and strategically
//      meaningful line (favourite flips side); a noise floor of half a
//      probability point keeps 1.999 <-> 2.001 jitter from alerting.
// ---------------------------------------------------------------------------

export interface SharpMove {
  selection: string;
  prevDecimal: number;
  nextDecimal: number;
  /** Implied-probability shift, signed. +0.03 = 3 points toward this outcome. */
  deltaProb: number;
  /** Relative decimal price change, signed fraction of prev. */
  deltaPct: number;
  crossedEvenMoney: boolean;
}

export interface SharpMoveThresholds {
  /** Min absolute implied-probability shift, in probability points. */
  probThreshold: number;
  /** Min absolute relative price change, as a fraction. */
  pctThreshold: number;
}

export const DEFAULT_SHARP_THRESHOLDS: SharpMoveThresholds = {
  probThreshold: 0.02,
  pctThreshold: 0.05,
};

/**
 * Flag significant odds shifts between two quotes of the same market.
 * Deterministic: same inputs, same flags. Selections are matched by name;
 * ones missing from either side are ignored.
 */
export function detectSharpMove(
  prev: OddsSet,
  next: OddsSet,
  thresholds: SharpMoveThresholds = DEFAULT_SHARP_THRESHOLDS,
): SharpMove[] {
  const moves: SharpMove[] = [];
  for (const sel of next.selections) {
    const before = prev.selections.find((s) => s.name === sel.name);
    if (!before || before.decimal <= 1 || sel.decimal <= 1) continue;
    const deltaProb = impliedProbability(sel.decimal) - impliedProbability(before.decimal);
    const deltaPct = (sel.decimal - before.decimal) / before.decimal;
    const crossedEvenMoney =
      (before.decimal - 2) * (sel.decimal - 2) < 0 && // strictly crossed 2.00
      Math.abs(deltaProb) >= 0.005; // noise floor: half a probability point
    if (
      Math.abs(deltaProb) >= thresholds.probThreshold ||
      Math.abs(deltaPct) >= thresholds.pctThreshold ||
      crossedEvenMoney
    ) {
      moves.push({
        selection: sel.name,
        prevDecimal: before.decimal,
        nextDecimal: sel.decimal,
        deltaProb,
        deltaPct,
        crossedEvenMoney,
      });
    }
  }
  return moves;
}

// ---------------------------------------------------------------------------
// Stake sizing with risk caps, applied in order: Kelly wants X, the per-match
// cap clips it, the remaining total-exposure headroom clips it again, and a
// min-stake floor zeroes dust bets that are not worth the fee.
// ---------------------------------------------------------------------------

export interface SizeInput {
  bankroll: number;
  fairProb: number;
  marketDecimal: number;
  /** Fractional-Kelly multiplier (env KELLY_FRACTION). */
  kelly: number;
  /** Max fraction of bankroll on a single match. */
  perMatchCap: number;
  /** Max fraction of bankroll across all open positions. */
  totalCap: number;
  /** Sum of stakes already open (same units as bankroll). */
  openExposure: number;
  /** Below this the stake rounds to 0 (not worth the fee). */
  minStake: number;
}

export interface SizeResult {
  stake: number;
  /** What limited the stake, for the decision log. */
  cappedBy: "kelly" | "per-match" | "total" | "min-stake";
}

/** Turn a Kelly stake into an actual capped stake. Deterministic. */
export function sizeBet(input: SizeInput): SizeResult {
  const f = kellyFraction(input.fairProb, input.marketDecimal, input.kelly);
  let stake = f * input.bankroll;
  let cappedBy: SizeResult["cappedBy"] = "kelly";

  const perMatchLimit = input.perMatchCap * input.bankroll;
  if (stake > perMatchLimit) {
    stake = perMatchLimit;
    cappedBy = "per-match";
  }

  const remainingTotal = Math.max(0, input.totalCap * input.bankroll - input.openExposure);
  if (stake > remainingTotal) {
    stake = remainingTotal;
    cappedBy = "total";
  }

  if (stake < input.minStake) {
    return { stake: 0, cappedBy: "min-stake" };
  }
  return { stake, cappedBy };
}

export function clamp(x: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, x));
}
