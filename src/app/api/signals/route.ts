import { getStore } from "@/server/store";

export const dynamic = "force-dynamic";

/** Rolling recent signals from the strategy ticks, newest first. */
export async function GET(): Promise<Response> {
  const s = getStore().state;
  return Response.json({
    tick: s.tickCount,
    signals: [...s.signals].reverse(),
  });
}
