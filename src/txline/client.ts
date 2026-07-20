import { EventSource } from "eventsource";
import env from "@/config/env";
import type { Fixture, OddsSet } from "@/types";
import { TxlineAuth } from "./auth";
import { normalizeFixture, normalizeOddsMessage } from "./types";

// Raw LIVE TxLINE access: fixtures, one-shot odds snapshots, scores and the
// continuous SSE odds stream, all normalized to canonical types. Every helper
// throws on failure; src/txline/index.ts wraps them with the replay fallback.

/** GET /fixtures/snapshot, optionally scoped to one competition / start day. */
export async function fixturesSnapshot(
  auth: TxlineAuth,
  opts: { competitionId?: number; startEpochDay?: number } = {},
): Promise<Fixture[]> {
  const params = new URLSearchParams();
  if (opts.competitionId != null) params.set("competitionId", String(opts.competitionId));
  if (opts.startEpochDay != null) params.set("startEpochDay", String(opts.startEpochDay));
  const qs = params.size ? `?${params}` : "";
  const res = await auth.apiGet(`/fixtures/snapshot${qs}`);
  if (!res.ok) throw new Error(`fixtures/snapshot failed: ${res.status}`);
  const rows = (await res.json()) as unknown[];
  return rows.map(normalizeFixture).filter((f): f is Fixture => f !== null);
}

/** GET /odds/snapshot/{fixtureId}[?asOf=ms]: current (or historical) quotes. */
export async function snapshotOdds(
  auth: TxlineAuth,
  fixtureId: number,
  asOf?: number,
): Promise<OddsSet[]> {
  const qs = asOf != null ? `?asOf=${asOf}` : "";
  const res = await auth.apiGet(`/odds/snapshot/${fixtureId}${qs}`);
  if (!res.ok) throw new Error(`odds/snapshot ${fixtureId} failed: ${res.status}`);
  const rows = (await res.json()) as unknown[];
  return rows.map(normalizeOddsMessage).filter((t): t is OddsSet => t !== null);
}

/** Final score of a fixture: [homeGoals, awayGoals], or null when unknown. */
export async function finalScore(
  auth: TxlineAuth,
  fixtureId: number,
): Promise<{ home: number; away: number } | null> {
  const res = await auth.apiGet(`/scores/snapshot/${fixtureId}`);
  if (!res.ok) throw new Error(`scores/snapshot ${fixtureId} failed: ${res.status}`);
  const rows = (await res.json()) as Record<string, any>[];
  if (!Array.isArray(rows) || rows.length === 0) return null;
  const row = rows[rows.length - 1];
  const score = row?.Score;
  if (!score?.Participant1 || !score?.Participant2) return null;
  // Total includes extra time when played. Participant1IsHome maps sides.
  const p1 = Number(score.Participant1?.Total?.Goals ?? 0);
  const p2 = Number(score.Participant2?.Total?.Goals ?? 0);
  const p1Home = row.Participant1IsHome !== false;
  return p1Home ? { home: p1, away: p2 } : { home: p2, away: p1 };
}

/**
 * Subscribe to the permitted odds stream and yield each normalized full-match
 * 1X2 quote. Runs until the consumer stops iterating; on connection error it
 * lets EventSource retry (mirrors examples/devnet/subscription_free_tier.ts:
 * custom fetch injects auth headers and renews the JWT on 401/403).
 */
export async function* streamOdds(auth: TxlineAuth): AsyncGenerator<OddsSet> {
  const queue = new AsyncQueue<OddsSet>();
  const streamUrl = `${env.TXLINE_API_ORIGIN}/api/odds/stream`;

  const es = new EventSource(streamUrl, {
    fetch: async (input, init) => {
      const attempt = (jwt: string) =>
        fetch(input, {
          ...init,
          headers: {
            ...init?.headers,
            "Accept-Encoding": "deflate",
            Authorization: `Bearer ${jwt}`,
            "X-Api-Token": auth.apiToken,
          },
        });
      let res = await attempt(auth.jwt);
      if (res.status === 401 || res.status === 403) {
        await auth.renewJwt();
        res = await attempt(auth.jwt);
      }
      return res;
    },
  });

  es.onmessage = (event: MessageEvent) => {
    try {
      const tick = normalizeOddsMessage(JSON.parse(event.data));
      if (tick) queue.push(tick);
    } catch {
      // ignore malformed frames
    }
  };
  es.onerror = (err: unknown) => console.error("[txline] stream error:", err);

  try {
    yield* queue.drain();
  } finally {
    es.close();
  }
}

/** Minimal single-consumer async queue bridging callbacks to a generator. */
class AsyncQueue<T> {
  private items: T[] = [];
  private waiting: ((v: T) => void) | null = null;

  push(item: T) {
    if (this.waiting) {
      this.waiting(item);
      this.waiting = null;
    } else {
      this.items.push(item);
    }
  }

  async *drain(): AsyncGenerator<T> {
    while (true) {
      if (this.items.length) yield this.items.shift() as T;
      else yield await new Promise<T>((resolve) => (this.waiting = resolve));
    }
  }
}
