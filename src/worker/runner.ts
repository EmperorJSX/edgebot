import { runStrategyTick } from "@/engine";
import type { Decision } from "@/engine";
import { getStore } from "@/server/store";

// ---------------------------------------------------------------------------
// The autonomous loop. instrumentation.ts calls startRunner() once per server
// boot; from then on the agent ticks itself with no human input: every 60s
// live, every ~2s in DEMO/replay mode. POST /api/replay calls tickOnce()
// directly to let a judge single-step the same code path.
// ---------------------------------------------------------------------------

export interface TickOutcome {
  ok: boolean;
  tick: number;
  skipped: boolean;
  /** Decisions the tick appended to the engine's rolling log. */
  appended: Decision[];
  error: string | null;
}

/**
 * Run exactly one strategy tick against the shared store. The engine mutates
 * store.state in place (bankroll, positions, signals, decision log) and
 * returns just this tick's additions. Errors are captured, never thrown: a
 * bad tick must not stop the loop.
 */
export async function tickOnce(trigger: "auto" | "manual"): Promise<TickOutcome> {
  const store = getStore();
  if (store.inFlight) {
    // A manual /api/replay poke landed mid-tick; the running tick covers it.
    return { ok: true, tick: store.state.tickCount, skipped: true, appended: [], error: null };
  }
  store.inFlight = true;
  try {
    const result = await runStrategyTick(store.state);
    store.lastTickAt = Date.now();
    store.lastError = null;
    return {
      ok: true,
      tick: store.state.tickCount,
      skipped: false,
      appended: result.decisions,
      error: null,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    store.lastError = message;
    store.lastTickAt = Date.now();
    console.error(`[runner] tick ${store.state.tickCount} (${trigger}) failed: ${message}`);
    return {
      ok: false,
      tick: store.state.tickCount,
      skipped: false,
      appended: [],
      error: message,
    };
  } finally {
    store.inFlight = false;
  }
}

const STARTED_KEY = Symbol.for("edgebot.runner.started");

/**
 * Start the self-scheduling loop. Idempotent: the globalThis guard makes
 * double calls (HMR reloads, instrumentation plus a route safety net) no-ops.
 * setTimeout chaining instead of setInterval so slow ticks never overlap.
 */
export function startRunner(): void {
  const g = globalThis as Record<symbol, unknown>;
  if (g[STARTED_KEY]) return;
  g[STARTED_KEY] = true;

  const store = getStore();
  store.running = true;

  const loop = async () => {
    await tickOnce("auto");
    const timer = setTimeout(loop, store.intervalMs);
    // Let the process exit when Next itself shuts down (and during build).
    if (typeof timer === "object") timer.unref();
  };
  void loop();

  console.log(
    `[runner] autonomous loop started: mode=${store.state.mode} demo=${store.demo} every ${store.intervalMs}ms`,
  );
}
