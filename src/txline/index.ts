// Public TxLINE facade: getFixtures / getOdds / subscribeOdds.
//
// Every call tries the REAL devnet API first and falls back to the bundled
// replay dataset (real recorded World Cup 2026 odds) on ANY failure: no
// credentials, network down, empty responses, matches finished. MODE=replay
// skips the live attempt entirely. This is what makes the agent judge-testable
// after the tournament ends while still being a genuine live integration.

import env from "@/config/env";
import type { Fixture, OddsSet } from "@/types";
import { TxlineAuth } from "./auth";
import { fixturesSnapshot, snapshotOdds, streamOdds } from "./client";
import { ReplayFeed } from "./replay";

export type { ReplayEvent, ReplayFrame } from "./replay";
export { ReplayFeed } from "./replay";
export { TxlineAuth } from "./auth";

let auth: TxlineAuth | null = null;
let replay: ReplayFeed | null = null;
let source: "live" | "replay" = env.MODE === "replay" ? "replay" : "live";

/** Which source answered most recently; the status API reports this. */
export function activeSource(): "live" | "replay" {
  return source;
}

/** The shared replay feed (loads the bundled dataset once, lazily). */
export function getReplayFeed(): ReplayFeed {
  if (!replay) replay = new ReplayFeed();
  return replay;
}

async function ensureAuth(): Promise<TxlineAuth> {
  if (!auth) auth = new TxlineAuth();
  await auth.ensure();
  return auth;
}

const liveAllowed = () => env.MODE !== "replay";

/** All fixtures the subscription permits (live), or the recorded ones. */
export async function getFixtures(): Promise<Fixture[]> {
  if (liveAllowed()) {
    try {
      const fixtures = await fixturesSnapshot(await ensureAuth());
      if (fixtures.length > 0) {
        source = "live";
        return fixtures.map((f) => f);
      }
    } catch (err) {
      warnOnce("getFixtures", err);
    }
  }
  source = "replay";
  return getReplayFeed().fixtures();
}

/** Current quotes for a fixture (live), or its recorded quote history. */
export async function getOdds(fixtureId: number): Promise<OddsSet[]> {
  if (liveAllowed()) {
    try {
      const sets = await snapshotOdds(await ensureAuth(), fixtureId);
      if (sets.length > 0) {
        source = "live";
        return sets.map((s) => ({ ...s, source: "live" as const }));
      }
    } catch (err) {
      warnOnce("getOdds", err);
    }
  }
  source = "replay";
  return getReplayFeed().oddsFor(fixtureId);
}

/**
 * Continuous odds: live SSE stream when reachable, otherwise the replay
 * dataset re-emitted every REPLAY_SPEED_MS. Returns an unsubscribe function.
 * The engine passes fallback:false because it drives the replay feed itself
 * (batched, including result frames); everyone else gets the automatic pump.
 */
export function subscribeOdds(
  cb: (set: OddsSet) => void,
  opts: { fallback?: boolean } = {},
): () => void {
  const fallback = opts.fallback !== false;
  let stopped = false;
  let timer: ReturnType<typeof setInterval> | null = null;

  const startReplayPump = () => {
    if (stopped || timer) return;
    source = "replay";
    // Own instance: the engine drives the shared feed's cursor; a second
    // consumer must not race it.
    const feed = new ReplayFeed();
    timer = setInterval(() => {
      // Emit odds frames only; result frames are an engine concern.
      let event = feed.pull(1)[0];
      while (event && event.type !== "odds") event = feed.pull(1)[0];
      if (!event) {
        feed.reset();
        return;
      }
      cb({ ...event, source: "replay" });
    }, env.REPLAY_SPEED_MS);
  };

  if (!liveAllowed()) {
    if (fallback) startReplayPump();
  } else {
    (async () => {
      try {
        const a = await ensureAuth();
        source = "live";
        for await (const set of streamOdds(a)) {
          if (stopped) return;
          cb({ ...set, source: "live" });
        }
      } catch (err) {
        warnOnce("subscribeOdds", err);
        source = "replay";
        if (fallback) startReplayPump();
      }
    })();
  }

  return () => {
    stopped = true;
    if (timer) clearInterval(timer);
  };
}

const warned = new Set<string>();
function warnOnce(where: string, err: unknown) {
  if (warned.has(where)) return;
  warned.add(where);
  const msg = err instanceof Error ? err.message : String(err);
  console.warn(`[txline] ${where}: live failed (${msg}); replay fallback active`);
}
