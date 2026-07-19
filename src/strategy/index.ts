// ---------------------------------------------------------------------------
// Strategy math. Pure, deterministic, dependency-free. This is the part a judge
// (or a real trading desk) should be able to audit line by line.
//
// Pipeline: decimal odds -> implied prob -> de-vig to a fair prob distribution
// -> edge vs the venue price -> fractional Kelly stake -> risk caps.
// ---------------------------------------------------------------------------

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
  /** Fair probabilities, one per input selection. Sum to 1 (vig removed). */
  fair: number[];
  /** The book's margin: sum(1/decimal) - 1. >= 0 for a normal priced book. */
  overround: number;
}

/**
 * Remove the bookmaker margin from a set of decimal prices covering a full
 * market (e.g. home/draw/away). Uses the proportional (normalization) method:
 * each fair prob is its raw implied prob divided by the booksum. Simple,
 * standard, and guarantees the output is a valid distribution summing to 1.
 *
 * ponytail: proportional de-vig, not Shin or power. Swap the normalization if a
 * favourite-longshot correction is ever needed; the interface stays the same.
 */
export function devig(decimalOdds: number[]): DevigResult {
  if (decimalOdds.length === 0) throw new Error("devig needs >= 1 selection");
  const raw = decimalOdds.map(impliedProbability);
  const booksum = raw.reduce((a, b) => a + b, 0);
  return {
    fair: raw.map((p) => p / booksum),
    overround: booksum - 1,
  };
}

/** Fair decimal price for a probability. Inverse of impliedProbability. */
export function fairDecimal(prob: number): number {
  if (prob <= 0 || prob >= 1) throw new Error(`prob must be in (0,1), got ${prob}`);
  return 1 / prob;
}

/**
 * Edge = expected value per unit staked on a back bet at `marketDecimal`, given
 * our fair probability. edge = fairProb * marketDecimal - 1. Positive means the
 * venue is offering better-than-fair odds (a value bet). Bet when edge >= min.
 */
export function edge(fairProb: number, marketDecimal: number): number {
  if (marketDecimal <= 1) throw new Error(`marketDecimal must be > 1, got ${marketDecimal}`);
  return fairProb * marketDecimal - 1;
}

/**
 * Full Kelly fraction of bankroll for a back bet, scaled by `fraction`
 * (fractional Kelly, e.g. 0.25 = quarter Kelly for lower variance). Clamped to
 * [0, 1]; returns 0 when there is no edge.
 *
 * Full Kelly f* = (b*p - q) / b, with b = marketDecimal - 1, p = fairProb,
 * q = 1 - p. Note the identity f* = edge / b, so kellyFraction * b === edge when
 * fraction = 1; the self-check asserts this.
 */
export function kellyFraction(
  fairProb: number,
  marketDecimal: number,
  fraction: number,
): number {
  const b = marketDecimal - 1;
  const p = fairProb;
  const q = 1 - p;
  const full = (b * p - q) / b;
  if (full <= 0) return 0;
  return clamp(full * fraction, 0, 1);
}

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

/**
 * Turn a Kelly fraction into an actual stake and apply risk caps in order:
 * per-match cap, then remaining total-exposure cap, then a min-stake floor.
 * Deterministic; never returns more than the caps allow.
 */
export function sizeBet(input: SizeInput): SizeResult {
  const {
    bankroll,
    fairProb,
    marketDecimal,
    kelly,
    perMatchCap,
    totalCap,
    openExposure,
    minStake,
  } = input;

  const f = kellyFraction(fairProb, marketDecimal, kelly);
  let stake = f * bankroll;
  let cappedBy: SizeResult["cappedBy"] = "kelly";

  const perMatchLimit = perMatchCap * bankroll;
  if (stake > perMatchLimit) {
    stake = perMatchLimit;
    cappedBy = "per-match";
  }

  const remainingTotal = Math.max(0, totalCap * bankroll - openExposure);
  if (stake > remainingTotal) {
    stake = remainingTotal;
    cappedBy = "total";
  }

  if (stake < minStake) {
    return { stake: 0, cappedBy: "min-stake" };
  }
  return { stake, cappedBy };
}

export function clamp(x: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, x));
}
