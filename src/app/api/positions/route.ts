import { openExposure, totalPnl } from "@/engine";
import { getStore } from "@/server/store";

export const dynamic = "force-dynamic";

/** All positions (open and settled history), newest first, plus the bankroll view. */
export async function GET(): Promise<Response> {
  const s = getStore().state;
  const pnl = totalPnl(s);
  return Response.json({
    tick: s.tickCount,
    bankroll: s.bankroll,
    realizedPnl: s.realizedPnl,
    unrealizedPnl: pnl - s.realizedPnl,
    pnl,
    openExposure: openExposure(s),
    positions: [...s.positions].reverse(),
  });
}
