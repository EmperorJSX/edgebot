// The venue edgebot bets into. VENUE=mock (default): a self-contained
// in-memory book whose quotes are derived deterministically from the TxLINE
// consensus, so the whole agent is demoable standalone with zero external
// dependencies. This mirrors a real setup where TxLINE consensus is the fair
// baseline and a slower retail venue misprices around it.
//
// Quote model: venueDecimal_i = fairDecimal_i * (1 + jitter_i) with jitter_i
// drawn uniformly from [-MOCK_EDGE, +MOCK_EDGE], seeded by (fixtureId, ts).
// Because edge = fairProb * venueDecimal - 1, the jitter IS the edge, so with
// MOCK_EDGE=0.05 and MIN_EDGE=0.03 roughly one in five selections is a
// playable value bet. Same frame in, same quote out, every run.
//
// ponytail: VENUE=proofsettle (on-chain markets) is a config value only; the
// upgrade path is a second quote/settle implementation behind these two
// functions.

import env from "@/config/env";
import { clamp, fairDecimal } from "@/strategy";
import { mulberry32 } from "@/lib/mock";
import type { OddsSet, SelectionOdds } from "@/types";

const round3 = (n: number) => Math.round(n * 1000) / 1000;

/** Deterministic venue prices for one consensus quote. */
export function quoteVenue(set: OddsSet, fair: number[]): SelectionOdds[] {
  // Knuth multiplicative hash mixes fixtureId and ts into one 32-bit seed.
  const seed = (Math.imul(set.fixtureId, 2654435761) ^ (set.ts & 0xffffffff)) >>> 0;
  const rng = mulberry32(seed);
  return set.selections.map((sel, i) => {
    const jitter = (rng() * 2 - 1) * env.MOCK_EDGE;
    const prob = clamp(fair[i] ?? 0.5, 0.001, 0.999);
    return { name: sel.name, decimal: round3(fairDecimal(prob) * (1 + jitter)) };
  });
}
