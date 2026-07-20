// ---------------------------------------------------------------------------
// The autonomous engine: one deterministic step of ingest -> strategy -> act.
//
//   runStrategyTick(state) -> { signals, positions, decisions }
//
// Per tick the engine drains a batch of TxLINE frames (live SSE buffer, or
// the next slice of the recorded replay), and for every full-market quote:
//   1. compares against the previous quote of the same market -> sharp-move
//      alerts (informed money detection),
//   2. de-vigs the consensus -> fair probabilities,
//   3. asks the venue for its prices -> edge per selection,
//   4. sizes the best positive-edge selection with fractional Kelly + risk
//      caps -> opens a position or logs why not,
//   5. marks open positions to market against the latest fair probability.
// Result frames settle positions and realize P&L.
//
// Everything the agent does lands in the append-capped decision log with a
// timestamp and a human-readable reason: that log IS the autonomy proof.
//
// Determinism: given the same state and the same frames, the tick produces
// the same signals, positions and decisions. Wall-clock only enters through
// the injectable `now` parameter (defaults to Date.now()).
// ---------------------------------------------------------------------------

import env from "@/config/env";
import { quoteVenue } from "@/lib/venue";
import { detectSharpMove, devig, edge, sizeBet } from "@/strategy";
import { getFixtures, getReplayFeed, subscribeOdds } from "@/txline";
import type { ReplayEvent } from "@/txline/replay";
import type { Decision, Fixture, OddsSet, Position, Signal } from "@/types";

// Contract barrel: runner and UI import everything through src/engine.
export * from "@/types";
export {
  clamp,
  detectSharpMove,
  devig,
  edge,
  fairDecimal,
  fairProb,
  impliedProbability,
  kelly,
  kellyFraction,
  sizeBet,
} from "@/strategy";
export { activeSource, getFixtures, getOdds, subscribeOdds } from "@/txline";

/** Frames consumed per replay tick: fast enough to feel live, slow enough to read. */
const FRAMES_PER_TICK = 4;
/** Live ticks with an empty buffer before the engine falls back to replay. */
const EMPTY_TICKS_BEFORE_FALLBACK = 5;
/** Rolling caps so a long-running agent does not grow without bound. */
const MAX_DECISIONS = 500;
const MAX_SIGNALS = 200;

export interface EngineState {
  mode: "live" | "replay";
  startedTs: number;
  tickCount: number;
  lastTickTs: number;
  startBankroll: number;
  /** Cash not currently staked. */
  bankroll: number;
  realizedPnl: number;
  positions: Position[];
  /** Rolling recent signals, newest last (capped). */
  signals: Signal[];
  /** Rolling decision log, newest last (capped, ids stay monotonic). */
  decisions: Decision[];
  /** Last quote per market, keyed fixtureId:marketId, for sharp-move detection. */
  lastOdds: Record<string, OddsSet>;
  fixtures: Record<number, Fixture>;
  nextDecisionId: number;
  nextPositionSeq: number;
  /** Consecutive live ticks that produced no frames. */
  emptyLiveTicks: number;
  /** Times the replay dataset has been re-run (autonomous restart). */
  replayLoops: number;
}

export interface TickResult {
  /** Signals created by THIS tick. */
  signals: Signal[];
  /** All positions (open and settled), current view. */
  positions: Position[];
  /** Decisions appended by THIS tick; the runner appends these to its log. */
  decisions: Decision[];
}

/** Running P&L = realized + mark-to-market of open positions. */
export function totalPnl(state: EngineState): number {
  const open = state.positions
    .filter((p) => p.status === "open")
    .reduce((sum, p) => sum + p.pnl, 0);
  return state.realizedPnl + open;
}

export function openExposure(state: EngineState): number {
  return state.positions
    .filter((p) => p.status === "open")
    .reduce((sum, p) => sum + p.stake, 0);
}

export function createEngineState(): EngineState {
  const mode = env.MODE === "replay" ? "replay" : "live";
  return {
    mode,
    startedTs: Date.now(),
    tickCount: 0,
    lastTickTs: 0,
    startBankroll: env.START_BANKROLL,
    bankroll: env.START_BANKROLL,
    realizedPnl: 0,
    positions: [],
    signals: [],
    decisions: [],
    lastOdds: {},
    fixtures: {},
    nextDecisionId: 1,
    nextPositionSeq: 1,
    emptyLiveTicks: 0,
    replayLoops: 0,
  };
}

// --- Live ingestion: one module-level buffer filled by the SSE stream. -----
let liveBuffer: ReplayEvent[] = [];
let liveUnsub: (() => void) | null = null;

function ensureLiveIngestion(): void {
  if (liveUnsub) return;
  // fallback:false: on live failure the buffer just stays empty and the
  // empty-tick counter below switches the engine to its own replay drive
  // (which, unlike the facade pump, includes result frames for settlement).
  liveUnsub = subscribeOdds(
    (set) => {
      liveBuffer.push({ type: "odds", ...set });
      if (liveBuffer.length > 1000) liveBuffer = liveBuffer.slice(-500);
    },
    { fallback: false },
  );
}

/** Stop background ingestion (tests / hot reload). */
export function stopIngestion(): void {
  liveUnsub?.();
  liveUnsub = null;
  liveBuffer = [];
}

// --- The tick. -------------------------------------------------------------

/**
 * One deterministic strategy step. The runner calls this every 60s (live) or
 * fast (replay / DEMO). Returns the NEW signals and decisions of this tick
 * plus the current positions view; the same data stays on `state` for the
 * status APIs.
 */
export async function runStrategyTick(
  state: EngineState,
  now: number = Date.now(),
): Promise<TickResult> {
  state.tickCount++;
  state.lastTickTs = now;
  const fresh: TickResult = { signals: [], positions: state.positions, decisions: [] };

  // Fixture names make every log line readable; fetch once (cheap, cached
  // replay, one HTTP call live).
  if (Object.keys(state.fixtures).length === 0) {
    try {
      for (const f of await getFixtures()) state.fixtures[f.id] = f;
    } catch {
      // names degrade to ids; not fatal
    }
  }

  const frames = pullFrames(state, fresh, now);
  for (const frame of frames) {
    if (frame.type === "odds") handleOdds(state, fresh, frame, now);
    else if (frame.type === "result") handleResult(state, fresh, frame, now);
  }

  trim(state);
  return fresh;
}

/** Drain the tick's frame batch from the active source. */
function pullFrames(state: EngineState, out: TickResult, now: number): ReplayEvent[] {
  if (state.mode === "live") {
    ensureLiveIngestion();
    const batch = liveBuffer;
    liveBuffer = [];
    if (batch.length > 0) {
      state.emptyLiveTicks = 0;
      return batch;
    }
    state.emptyLiveTicks++;
    if (state.emptyLiveTicks < EMPTY_TICKS_BEFORE_FALLBACK) return [];
    // Live is silent (unreachable, no permitted matches, or all ended):
    // switch to the recorded replay and keep trading autonomously.
    state.mode = "replay";
    stopIngestion();
    decide(state, out, now, {
      action: "INFO",
      reason: `no live TxLINE frames for ${EMPTY_TICKS_BEFORE_FALLBACK} ticks; switching to recorded replay`,
    });
  }

  const feed = getReplayFeed();
  const batch = feed.pull(FRAMES_PER_TICK);
  if (batch.length === 0) {
    // Recording exhausted: restart autonomously so the dashboard never dies.
    feed.reset();
    state.lastOdds = {}; // quotes restart in the past; do not compare across loops
    state.replayLoops++;
    decide(state, out, now, {
      action: "INFO",
      reason: `replay pass ${state.replayLoops} complete (P&L ${totalPnl(state).toFixed(2)}); restarting recording`,
    });
    return feed.pull(FRAMES_PER_TICK);
  }
  return batch;
}

/** Steps 1-5 for one consensus quote. */
function handleOdds(
  state: EngineState,
  out: TickResult,
  set: OddsSet,
  now: number,
): void {
  const key = `${set.fixtureId}:${set.marketId}`;
  const match = matchLabel(state, set);

  // 1. Sharp-move detection against the previous quote of this market.
  const prev = state.lastOdds[key];
  if (prev) {
    for (const move of detectSharpMove(prev, set)) {
      const signal: Signal = {
        id: `sm-${set.fixtureId}-${set.ts}-${move.selection}`,
        ts: now,
        kind: "sharp-move",
        fixtureId: set.fixtureId,
        match,
        selection: move.selection,
        fairProb: devig(set).fair[set.selections.findIndex((s) => s.name === move.selection)],
        offered: move.nextDecimal,
        prevDecimal: move.prevDecimal,
        deltaProb: move.deltaProb,
        crossedEvenMoney: move.crossedEvenMoney,
      };
      pushSignal(state, out, signal);
      decide(state, out, now, {
        action: "ALERT",
        fixtureId: set.fixtureId,
        match,
        selection: move.selection,
        price: move.nextDecimal,
        fairProb: signal.fairProb,
        reason:
          `sharp move: ${move.selection} ${move.prevDecimal.toFixed(3)} -> ` +
          `${move.nextDecimal.toFixed(3)} (${(move.deltaProb * 100).toFixed(1)} prob pts` +
          `${move.crossedEvenMoney ? ", crossed even money" : ""})`,
      });
    }
  }
  state.lastOdds[key] = set;

  // 2 + 3. De-vig the consensus, price the venue, find the best edge.
  const { fair } = devig(set);
  const venue = quoteVenue(set, fair);
  let best = -1;
  let bestEv = -Infinity;
  for (let i = 0; i < venue.length; i++) {
    const ev = edge(fair[i], venue[i].decimal);
    if (ev > bestEv) {
      bestEv = ev;
      best = i;
    }
  }
  if (best < 0) return;
  const sel = venue[best];

  // 4. Mark open positions of this fixture to market with the fresh fair probs.
  for (const pos of state.positions) {
    if (pos.status !== "open" || pos.fixtureId !== set.fixtureId) continue;
    const i = set.selections.findIndex((s) => s.name === pos.selection);
    if (i >= 0) pos.pnl = pos.stake * (fair[i] * pos.decimal - 1);
  }

  // 5. Act on the best edge.
  const alreadyOpen = state.positions.some(
    (p) => p.status === "open" && p.fixtureId === set.fixtureId,
  );
  if (alreadyOpen) return; // one position per fixture; silent, not a decision

  if (bestEv < env.MIN_EDGE) {
    decide(state, out, now, {
      action: "SKIP",
      fixtureId: set.fixtureId,
      match,
      selection: sel.name,
      price: sel.decimal,
      edge: bestEv,
      fairProb: fair[best],
      reason:
        bestEv > 0
          ? `edge +${(bestEv * 100).toFixed(2)}% below MIN_EDGE ${(env.MIN_EDGE * 100).toFixed(0)}%`
          : `no value: best edge ${(bestEv * 100).toFixed(2)}%`,
    });
    return;
  }

  const sized = sizeBet({
    bankroll: state.bankroll,
    fairProb: fair[best],
    marketDecimal: sel.decimal,
    kelly: env.KELLY_FRACTION,
    perMatchCap: env.PER_MATCH_CAP,
    totalCap: env.TOTAL_CAP,
    openExposure: openExposure(state),
    minStake: env.MIN_STAKE,
  });

  const signal: Signal = {
    id: `val-${set.fixtureId}-${set.ts}-${sel.name}`,
    ts: now,
    kind: "value",
    fixtureId: set.fixtureId,
    match,
    selection: sel.name,
    fairProb: fair[best],
    offered: sel.decimal,
    edge: bestEv,
  };
  pushSignal(state, out, signal);

  if (sized.stake <= 0) {
    decide(state, out, now, {
      action: "SKIP",
      fixtureId: set.fixtureId,
      match,
      selection: sel.name,
      price: sel.decimal,
      edge: bestEv,
      fairProb: fair[best],
      reason: `edge +${(bestEv * 100).toFixed(2)}% but stake blocked by ${sized.cappedBy} cap`,
    });
    return;
  }

  const stake = Math.round(sized.stake * 100) / 100;
  state.bankroll -= stake;
  state.positions.push({
    id: `pos-${state.nextPositionSeq++}`,
    fixtureId: set.fixtureId,
    match,
    selection: sel.name,
    stake,
    decimal: sel.decimal,
    fairProbAtEntry: fair[best],
    openedTs: now,
    status: "open",
    pnl: stake * (fair[best] * sel.decimal - 1),
  });
  decide(state, out, now, {
    action: "BET",
    fixtureId: set.fixtureId,
    match,
    selection: sel.name,
    price: sel.decimal,
    edge: bestEv,
    fairProb: fair[best],
    stake,
    reason:
      `value: fair ${(fair[best] * 100).toFixed(1)}% vs venue ${sel.decimal.toFixed(3)} ` +
      `= +${(bestEv * 100).toFixed(2)}% EV; ${(env.KELLY_FRACTION * 100).toFixed(0)}% Kelly ` +
      `stakes ${stake} (${sized.cappedBy} bound)`,
  });
}

/** Settle every open position of a finished fixture and realize P&L. */
function handleResult(
  state: EngineState,
  out: TickResult,
  frame: Extract<ReplayEvent, { type: "result" }>,
  now: number,
): void {
  for (const pos of state.positions) {
    if (pos.status !== "open" || pos.fixtureId !== frame.fixtureId) continue;
    const won = pos.selection === frame.winner;
    pos.status = won ? "won" : "lost";
    pos.settledTs = now;
    pos.pnl = won ? pos.stake * (pos.decimal - 1) : -pos.stake;
    if (won) state.bankroll += pos.stake * pos.decimal;
    state.realizedPnl += pos.pnl;
    decide(state, out, now, {
      action: "SETTLE",
      fixtureId: frame.fixtureId,
      match: pos.match,
      selection: pos.selection,
      price: pos.decimal,
      fairProb: pos.fairProbAtEntry,
      stake: pos.stake,
      reason:
        `${frame.homeGoals}-${frame.awayGoals} (${frame.winner}): ${pos.selection} ` +
        `${won ? "WON" : "lost"} ${won ? "+" : ""}${pos.pnl.toFixed(2)}; ` +
        `bankroll ${state.bankroll.toFixed(2)}, realized P&L ${state.realizedPnl.toFixed(2)}`,
    });
  }
}

// --- Small helpers. --------------------------------------------------------

function matchLabel(state: EngineState, set: OddsSet): string | undefined {
  if (set.match) return set.match;
  const f = state.fixtures[set.fixtureId];
  return f ? `${f.home} v ${f.away}` : undefined;
}

function decide(
  state: EngineState,
  out: TickResult,
  now: number,
  entry: Omit<Decision, "id" | "ts">,
): void {
  const decision: Decision = { id: state.nextDecisionId++, ts: now, ...entry };
  state.decisions.push(decision);
  out.decisions.push(decision);
}

function pushSignal(state: EngineState, out: TickResult, signal: Signal): void {
  state.signals.push(signal);
  out.signals.push(signal);
}

function trim(state: EngineState): void {
  if (state.decisions.length > MAX_DECISIONS) {
    state.decisions = state.decisions.slice(-MAX_DECISIONS);
  }
  if (state.signals.length > MAX_SIGNALS) {
    state.signals = state.signals.slice(-MAX_SIGNALS);
  }
  // Settled positions stay for the dashboard but stop growing unboundedly.
  const settled = state.positions.filter((p) => p.status !== "open");
  if (settled.length > 100) {
    const keep = new Set(settled.slice(-100).map((p) => p.id));
    state.positions = state.positions.filter((p) => p.status === "open" || keep.has(p.id));
  }
}
