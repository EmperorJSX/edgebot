// Wire-format mappers: raw TxLINE payloads -> canonical types (src/types).
// TxLINE publishes "StablePrice" messages on the odds stream and snapshot
// endpoints; the mappers are tolerant of the field spellings seen in the
// official examples (FixtureId, Ts, MarketId confirmed) plus likely variants,
// because the rest of the pipeline is agnostic to the raw schema.

import type { Fixture, OddsSet, SelectionOdds } from "@/types";

export type { Fixture, OddsSet, SelectionOdds };

/** Back-compat alias: an OddsTick is one OddsSet observed at a moment. */
export type OddsTick = OddsSet;

/**
 * Map a raw TxLINE odds message to an OddsSet, or null if it is not a usable
 * quote. The strategy trades the full-match result market only, so rows for
 * other markets (handicaps, totals) or sub-periods (half=1) return null.
 *
 * Real StablePrice row (captured from devnet):
 *   { FixtureId, Ts, Bookmaker: "TXLineStablePriceDemargined",
 *     SuperOddsType: "1X2_PARTICIPANT_RESULT", MarketPeriod: null,
 *     PriceNames: ["part1","draw","part2"], Prices: [3187, 2084, 4845] }
 * Prices are milli-odds: 3187 = 3.187 decimal.
 */
export function normalizeOddsMessage(raw: unknown): OddsSet | null {
  if (!raw || typeof raw !== "object") return null;
  const m = raw as Record<string, any>;

  const fixtureId = num(m.FixtureId ?? m.fixtureId);
  if (fixtureId == null) return null;

  // Only the full-match result market; MarketPeriod (e.g. "half=1") means a
  // sub-period market.
  if (m.SuperOddsType && (m.SuperOddsType !== "1X2_PARTICIPANT_RESULT" || m.MarketPeriod)) {
    return null;
  }

  const selections = readSelections(m);
  if (selections.length < 2) return null;

  return {
    fixtureId,
    ts: num(m.Ts ?? m.ts) ?? Date.now(),
    marketId: num(m.MarketId ?? m.marketId) ?? 1,
    market: "1X2",
    match: m.Match ?? m.match ?? undefined,
    selections,
    raw,
  };
}

/** Map a raw /fixtures/snapshot row to a Fixture, or null when unusable. */
export function normalizeFixture(raw: unknown): Fixture | null {
  if (!raw || typeof raw !== "object") return null;
  const m = raw as Record<string, any>;
  const id = num(m.FixtureId ?? m.fixtureId ?? m.Id ?? m.id);
  if (id == null) return null;

  // Participant1IsHome is the feed's home/away designation (see TxLINE docs).
  const p1 = String(m.Participant1 ?? m.participant1 ?? m.Home ?? "?");
  const p2 = String(m.Participant2 ?? m.participant2 ?? m.Away ?? "?");
  const p1Home = m.Participant1IsHome !== false;

  const start = m.StartTime ?? m.startTime ?? m.StartTs ?? m.startTs;
  const startTs =
    typeof start === "string" ? Date.parse(start) : (num(start) ?? 0);

  return {
    id,
    home: p1Home ? p1 : p2,
    away: p1Home ? p2 : p1,
    competitionId: num(m.CompetitionId ?? m.competitionId) ?? undefined,
    startTs: Number.isFinite(startTs) ? startTs : 0,
    gameState: num(m.GameState ?? m.gameState) ?? undefined,
  };
}

function readSelections(m: Record<string, any>): SelectionOdds[] {
  // Real feed shape: parallel PriceNames + Prices arrays, milli-odds integers.
  // part1/part2 are the feed's home/away designation (Participant1IsHome is
  // true for every fixture we record; normalizeFixture applies the same flag,
  // so the labels stay consistent).
  if (Array.isArray(m.PriceNames) && Array.isArray(m.Prices)) {
    const labels: Record<string, string> = { part1: "Home", draw: "Draw", part2: "Away" };
    return m.PriceNames.map((n: unknown, i: number) => ({
      name: labels[String(n)] ?? String(n),
      decimal: (num(m.Prices[i]) ?? NaN) / 1000,
    })).filter((s: SelectionOdds) => Number.isFinite(s.decimal) && s.decimal > 1);
  }
  // Tolerant fallback: an explicit array of { name/decimal | Odds | Price }.
  const arr = m.Selections ?? m.selections ?? m.Prices ?? m.prices;
  if (Array.isArray(arr)) {
    return arr
      .map((s: any) => ({
        name: String(s.name ?? s.Name ?? s.Selection ?? s.Outcome ?? s.outcome ?? "?"),
        decimal: num(s.decimal ?? s.Decimal ?? s.Odds ?? s.Price ?? s.price) ?? NaN,
      }))
      .filter((s) => Number.isFinite(s.decimal) && s.decimal > 1);
  }
  // Fallback: flat 1X2 fields.
  const flat: SelectionOdds[] = [];
  const home = num(m.Home ?? m.home ?? m.HomeOdds);
  const draw = num(m.Draw ?? m.draw ?? m.DrawOdds);
  const away = num(m.Away ?? m.away ?? m.AwayOdds);
  if (home && home > 1) flat.push({ name: "Home", decimal: home });
  if (draw && draw > 1) flat.push({ name: "Draw", decimal: draw });
  if (away && away > 1) flat.push({ name: "Away", decimal: away });
  return flat;
}

function num(v: unknown): number | null {
  const n = typeof v === "string" ? Number(v) : (v as number);
  return typeof n === "number" && Number.isFinite(n) ? n : null;
}
