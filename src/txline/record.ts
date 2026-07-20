// Record a REAL TxLINE replay dataset:
//
//   bun run src/txline/record.ts            (or bun run txline:record)
//
// Pulls the World Cup knockout fixtures from devnet, samples each fixture's
// pre-match 1X2 odds history via /odds/snapshot/{id}?asOf=ms (every 2h from
// T-48h, tightening to every 20min inside T-12h), fetches the final score,
// and writes everything as timestamp-ordered JSONL frames to REPLAY_FILE
// (fixtures/sample-worldcup.jsonl). The engine replays this after matches end,
// which is how judges test the agent once the live feed has nothing to say.
//
// Frame types:
//   {"type":"fixture", ...Fixture}
//   {"type":"odds",    ...OddsSet}          (raw payload stripped, source set on load)
//   {"type":"result",  fixtureId, winner, homeGoals, awayGoals, ts}

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import env from "@/config/env";
import type { OddsSet } from "@/types";
import { TxlineAuth } from "./auth";
import { finalScore, fixturesSnapshot, snapshotOdds } from "./client";
import type { ReplayFrame } from "./replay";

const WORLD_CUP_COMPETITION_ID = 72;
// Quarterfinals onward: ~8 fixtures keeps the recording under a few minutes
// while still spanning multiple match days. Earlier days work too, they are
// just many more snapshot calls.
const START_EPOCH_DAY = 20640;
const TWO_HOURS = 2 * 3600_000;
const TWENTY_MIN = 20 * 60_000;

async function record() {
  const auth = new TxlineAuth();
  await auth.ensure();

  const fixtures = await fixturesSnapshot(auth, {
    competitionId: WORLD_CUP_COMPETITION_ID,
    startEpochDay: START_EPOCH_DAY,
  });
  console.log(`[record] ${fixtures.length} fixtures`);

  const frames: ReplayFrame[] = [];
  for (const f of fixtures) {
    frames.push({ type: "fixture", ...f });
    const match = `${f.home} v ${f.away}`;

    // Sample the pre-match odds history, coarse far out, fine near kickoff.
    const sampleTimes: number[] = [];
    for (let t = f.startTs - 48 * 3600_000; t < f.startTs - 12 * 3600_000; t += TWO_HOURS) {
      sampleTimes.push(t);
    }
    for (let t = f.startTs - 12 * 3600_000; t <= f.startTs; t += TWENTY_MIN) {
      sampleTimes.push(t);
    }

    let lastKey = "";
    let kept = 0;
    for (const asOf of sampleTimes) {
      let sets: OddsSet[] = [];
      try {
        sets = await snapshotOdds(auth, f.id, asOf);
      } catch (err) {
        console.warn(`[record] snapshot ${f.id} asOf=${asOf} failed:`, err);
        continue;
      }
      for (const set of sets) {
        // Consecutive identical prices carry no information; keep changes only.
        const key = set.selections.map((s) => `${s.name}:${s.decimal}`).join("|");
        if (key === lastKey) continue;
        lastKey = key;
        kept++;
        frames.push({
          type: "odds",
          fixtureId: set.fixtureId,
          ts: set.ts,
          marketId: set.marketId,
          market: set.market,
          match,
          selections: set.selections,
        });
      }
    }
    console.log(`[record] ${match}: ${kept} odds frames`);

    // The result frame lets the replay settle positions. Placed a beat after
    // the last odds so open bets always resolve during the demo.
    try {
      const score = await finalScore(auth, f.id);
      if (score) {
        const winner =
          score.home > score.away ? "Home" : score.away > score.home ? "Away" : "Draw";
        frames.push({
          type: "result",
          fixtureId: f.id,
          winner,
          homeGoals: score.home,
          awayGoals: score.away,
          ts: f.startTs + 3 * 3600_000,
        });
        console.log(`[record] ${match}: ${score.home}-${score.away} (${winner})`);
      }
    } catch (err) {
      console.warn(`[record] score ${f.id} failed:`, err);
    }
  }

  // Deterministic replay order: strictly by timestamp, fixtures first on ties.
  const rank = { fixture: 0, odds: 1, result: 2 } as const;
  frames.sort((a, b) => {
    const ta = a.type === "fixture" ? 0 : a.ts;
    const tb = b.type === "fixture" ? 0 : b.ts;
    return ta - tb || rank[a.type] - rank[b.type];
  });

  const file = join(process.cwd(), env.REPLAY_FILE);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, frames.map((f) => JSON.stringify(f)).join("\n") + "\n");
  console.log(`[record] wrote ${frames.length} frames to ${file}`);
}

record().catch((err) => {
  console.error("[record] failed:", err);
  process.exit(1);
});
