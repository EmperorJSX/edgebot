import { getStore } from "@/server/store";
import { tickOnce } from "@/worker/runner";

export const dynamic = "force-dynamic";

/**
 * Judge control: advance the agent by exactly one tick, on demand. Runs the
 * same code path as the autonomous loop, so a judge can single-step the replay
 * and watch decisions appear without waiting for the timer.
 */
export async function POST(): Promise<Response> {
  const outcome = await tickOnce("manual");
  const store = getStore();
  return Response.json(
    {
      ok: outcome.ok,
      skipped: outcome.skipped,
      tick: outcome.tick,
      mode: store.state.mode,
      appended: outcome.appended,
      bankroll: store.state.bankroll,
      error: outcome.error,
    },
    { status: outcome.ok ? 200 : 500 },
  );
}
