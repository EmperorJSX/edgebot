import { openExposure, totalPnl } from "@/engine";
import { getStore } from "@/server/store";
import { startRunner } from "@/worker/runner";

export const dynamic = "force-dynamic";

/** Agent health: is the autonomous loop up, in what mode, with what bankroll. */
export async function GET(): Promise<Response> {
  // Idempotent safety net: instrumentation starts the loop at boot; this
  // covers deployments where the instrumentation hook is disabled.
  startRunner();

  const store = getStore();
  const s = store.state;
  const pnl = totalPnl(s);
  const settled = s.positions.filter((p) => p.status === "won" || p.status === "lost");
  const hitRate = settled.length
    ? settled.filter((p) => p.status === "won").length / settled.length
    : null;
  return Response.json({
    agent: "edgebot",
    up: true,
    autonomous: store.running,
    mode: s.mode,
    demo: store.demo,
    intervalMs: store.intervalMs,
    startedAt: new Date(store.startedAt).toISOString(),
    uptimeSec: Math.floor((Date.now() - store.startedAt) / 1000),
    tickCount: s.tickCount,
    lastTickAt: store.lastTickAt ? new Date(store.lastTickAt).toISOString() : null,
    lastError: store.lastError,
    startBankroll: s.startBankroll,
    bankroll: s.bankroll,
    realizedPnl: s.realizedPnl,
    unrealizedPnl: pnl - s.realizedPnl,
    // Headline running P&L: realized plus mark-to-market on open positions.
    pnl,
    openExposure: openExposure(s),
    openPositions: s.positions.filter((p) => p.status === "open").length,
    // Fraction 0..1 of settled positions won; null until the first settle.
    hitRate,
    replayLoops: s.replayLoops,
    signalCount: s.signals.length,
    decisionCount: s.nextDecisionId - 1,
  });
}
