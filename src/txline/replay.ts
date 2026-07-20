// Bundled replay stream: re-emits the recorded TxLINE dataset (REPLAY_FILE,
// default fixtures/sample-worldcup.jsonl, real World Cup 2026 knockout data
// captured from devnet by src/txline/record.ts) in its original timestamp
// order. Fully deterministic: the same file always yields the same frames in
// the same batches, which keeps demo runs repeatable.

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import env from "@/config/env";
import type { Fixture, OddsSet } from "@/types";

export type ReplayFrame =
  | ({ type: "fixture" } & Fixture)
  | ({ type: "odds" } & Omit<OddsSet, "source" | "raw">)
  | {
      type: "result";
      fixtureId: number;
      winner: "Home" | "Draw" | "Away";
      homeGoals: number;
      awayGoals: number;
      ts: number;
    };

export type ReplayEvent = Exclude<ReplayFrame, { type: "fixture" }>;

export class ReplayFeed {
  private fixtureFrames: Fixture[] = [];
  private events: ReplayEvent[] = [];
  private cursor = 0;

  constructor(file = env.REPLAY_FILE) {
    const path = join(process.cwd(), file);
    if (!existsSync(path)) {
      throw new Error(`replay dataset missing: ${path} (run bun run txline:record)`);
    }
    for (const line of readFileSync(path, "utf8").split("\n")) {
      if (!line.trim()) continue;
      const frame = JSON.parse(line) as ReplayFrame;
      if (frame.type === "fixture") {
        const { type: _t, ...fixture } = frame;
        this.fixtureFrames.push(fixture);
      } else {
        if (frame.type === "odds") (frame as OddsSet).source = "replay";
        this.events.push(frame);
      }
    }
    // The recorder already writes ts order; sort defensively anyway.
    this.events.sort((a, b) => a.ts - b.ts);
  }

  fixtures(): Fixture[] {
    return this.fixtureFrames;
  }

  /** All odds frames of one fixture, oldest first. */
  oddsFor(fixtureId: number): OddsSet[] {
    return this.events.filter(
      (e): e is Extract<ReplayEvent, { type: "odds" }> =>
        e.type === "odds" && e.fixtureId === fixtureId,
    );
  }

  /**
   * Pull the next batch of frames, at most `max`. Advances the cursor.
   * Returns [] once the recording is exhausted (loop() to restart).
   */
  pull(max: number): ReplayEvent[] {
    const batch = this.events.slice(this.cursor, this.cursor + max);
    this.cursor += batch.length;
    return batch;
  }

  get done(): boolean {
    return this.cursor >= this.events.length;
  }

  /** 0..1 fraction of the recording consumed. */
  get progress(): number {
    return this.events.length ? this.cursor / this.events.length : 1;
  }

  get total(): number {
    return this.events.length;
  }

  reset(): void {
    this.cursor = 0;
  }
}
