// ---------------------------------------------------------------------------
// Canonical domain types shared by txline (ingestion), strategy (math) and
// engine (decisions). Runner and UI import these through src/engine.
// All timestamps are milliseconds since epoch. All prices are decimal odds.
// ---------------------------------------------------------------------------

/** A scheduled or finished match, normalized from TxLINE /fixtures/snapshot. */
export interface Fixture {
  id: number;
  home: string;
  away: string;
  competitionId?: number;
  /** Kickoff, ms epoch. */
  startTs: number;
  /** TxLINE GameState: 1 = scheduled, 6 = cancelled. */
  gameState?: number;
}

/** One outcome of a market and its decimal price. */
export interface SelectionOdds {
  /** Outcome label, e.g. "Home" | "Draw" | "Away". */
  name: string;
  /** Decimal (European) price, always > 1. */
  decimal: number;
}

/**
 * A full market quote at one moment: every selection of one market of one
 * fixture. This is the unit the strategy de-vigs; it needs the whole market
 * to strip the bookmaker margin.
 */
export interface OddsSet {
  fixtureId: number;
  ts: number;
  /** TxLINE market id. 1 = match result (1X2). */
  marketId: number;
  /** Human label for the market. */
  market: string;
  /** "Home v Away" label when the feed carries team names. */
  match?: string;
  selections: SelectionOdds[];
  /** Where this quote came from, for the status API and decision log. */
  source?: "live" | "replay";
  /** Original wire payload, kept when recording replay fixtures. */
  raw?: unknown;
}

export type SignalKind = "value" | "sharp-move";

/** Something the strategy noticed and may act on. */
export interface Signal {
  id: string;
  ts: number;
  kind: SignalKind;
  fixtureId: number;
  match?: string;
  selection: string;
  /** De-vigged consensus probability of the selection. */
  fairProb: number;
  /** Decimal price offered by the venue (value) or now quoted (sharp-move). */
  offered: number;
  /** Expected value per unit staked, e.g. 0.04 = +4%. Value signals only. */
  edge?: number;
  /** Sharp-move only: previous decimal price and implied-prob shift. */
  prevDecimal?: number;
  deltaProb?: number;
  /** Sharp-move only: the price crossed even money (2.00). */
  crossedEvenMoney?: boolean;
}

export type PositionStatus = "open" | "won" | "lost" | "void";

/** A stake the agent has placed and is tracking to settlement. */
export interface Position {
  id: string;
  fixtureId: number;
  match?: string;
  selection: string;
  /** Amount staked, bankroll units. */
  stake: number;
  /** Decimal price taken at entry. */
  decimal: number;
  /** De-vigged probability at entry, for audit. */
  fairProbAtEntry: number;
  openedTs: number;
  status: PositionStatus;
  /**
   * Realized profit once settled (won: stake*(decimal-1), lost: -stake).
   * While open this holds the mark-to-market expected value against the
   * latest consensus fair probability: stake * (fairProbNow * decimal - 1).
   */
  pnl: number;
  settledTs?: number;
}

export type DecisionAction = "BET" | "SKIP" | "ALERT" | "SETTLE" | "INFO";

/** One timestamped entry in the autonomous decision log. Append-only. */
export interface Decision {
  /** Monotonic sequence number within a run. */
  id: number;
  ts: number;
  action: DecisionAction;
  fixtureId?: number;
  match?: string;
  selection?: string;
  /** Decimal price involved, when relevant. */
  price?: number;
  /** Expected value per unit at act time. */
  edge?: number;
  /** Model fair probability (0..1) for the selection at act time. */
  fairProb?: number;
  stake?: number;
  /** Human-readable why, always present. This is the audit trail. */
  reason: string;
}
