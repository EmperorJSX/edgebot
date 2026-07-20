import env from "@/config/env";
import { createEngineState, type Decision, type EngineState } from "@/engine";

// ---------------------------------------------------------------------------
// In-memory agent state. One store per server process, kept on globalThis so
// dev HMR / duplicate module instances all see the same agent. The worker
// ticker writes it, the API routes read it. The state object itself is the
// engine's EngineState: the engine mutates it in place every tick (bankroll,
// positions, signals, rolling decision log), so there is exactly one source
// of truth and the routes just read it.
// ---------------------------------------------------------------------------

export interface Store {
  startedAt: number;
  demo: boolean;
  intervalMs: number;
  /** True once the autonomous ticker is running. */
  running: boolean;
  /** True while a tick is executing; overlapping ticks are skipped. */
  inFlight: boolean;
  lastTickAt: number | null;
  lastError: string | null;
  state: EngineState;
}

const STORE_KEY = Symbol.for("edgebot.store");

function createStore(): Store {
  const state = createEngineState();
  return {
    startedAt: Date.now(),
    demo: env.DEMO,
    intervalMs: env.TICK_INTERVAL_MS ?? (state.mode === "replay" ? 2_000 : 60_000),
    running: false,
    inFlight: false,
    lastTickAt: null,
    lastError: null,
    state,
  };
}

export function getStore(): Store {
  const g = globalThis as { [STORE_KEY]?: Store };
  if (!g[STORE_KEY]) g[STORE_KEY] = createStore();
  return g[STORE_KEY];
}

/**
 * Decisions with id > after, oldest first, capped at limit. Engine decision
 * ids are monotonic within a run, so they double as the poll cursor for
 * /api/decisions?after=<id>.
 */
export function decisionsSince(after: number, limit: number): Decision[] {
  const out: Decision[] = [];
  for (const d of getStore().state.decisions) {
    if (d.id > after) {
      out.push(d);
      if (out.length >= limit) break;
    }
  }
  return out;
}
