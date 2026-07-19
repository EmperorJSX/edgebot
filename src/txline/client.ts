import { EventSource } from "eventsource";
import env from "@/config/env";
import { TxlineAuth } from "./auth";
import { normalizeOddsMessage, type OddsTick } from "./types";

// LIVE odds access: a one-shot snapshot and the continuous SSE stream, both
// normalized to OddsTick. Mirrors examples/devnet/subscription_free_tier.ts
// (custom fetch injects auth headers and renews the JWT on 401/403).

export async function snapshotOdds(auth: TxlineAuth, fixtureId: number): Promise<OddsTick[]> {
  const res = await auth.apiGet(`/odds/snapshot/${fixtureId}`);
  if (!res.ok) throw new Error(`snapshot ${fixtureId} failed: ${res.status}`);
  const rows = (await res.json()) as unknown[];
  return rows.map(normalizeOddsMessage).filter((t): t is OddsTick => t !== null);
}

/**
 * Subscribe to the permitted odds stream and yield each normalized tick.
 * Runs until the process ends; on connection error it lets EventSource retry.
 */
export async function* streamOdds(auth: TxlineAuth): AsyncGenerator<OddsTick> {
  const queue = new AsyncQueue<OddsTick>();
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
