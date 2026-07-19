// Internal odds shape edgebot consumes. TxLINE publishes "StablePrice" messages
// on the odds stream; normalizeOddsMessage() maps one into this shape. The exact
// StablePrice field names are only partially documented in the example scripts
// (FixtureId, Ts, MarketId are confirmed), so the mapper is best-effort and
// tolerant. ponytail: adjust the field picks in normalizeOddsMessage against a
// real capture; the rest of the pipeline is agnostic to the raw schema.

export interface Selection {
  /** Outcome label, e.g. "Home" | "Draw" | "Away". */
  name: string;
  /** Decimal (European) price. */
  decimal: number;
}

export interface OddsTick {
  fixtureId: number;
  /** Milliseconds epoch. */
  ts: number;
  /** TxLINE market id. 1 = match result (1X2). */
  marketId: number;
  /** Human label for the market, for logs / dashboard. */
  market: string;
  /** Optional "Home v Away" label if the feed carries team names. */
  match?: string;
  /** One entry per outcome; a full market for de-vig. */
  selections: Selection[];
  /** Original payload, kept for the record/replay fixture. */
  raw?: unknown;
}

/**
 * Map a raw TxLINE odds message to an OddsTick, or null if it is not a usable
 * full-market price. Tolerant of a few likely field spellings.
 */
export function normalizeOddsMessage(raw: unknown): OddsTick | null {
  if (!raw || typeof raw !== "object") return null;
  const m = raw as Record<string, any>;

  const fixtureId = num(m.FixtureId ?? m.fixtureId);
  const ts = num(m.Ts ?? m.ts ?? Date.now());
  const marketId = num(m.MarketId ?? m.marketId ?? 1);
  if (fixtureId == null) return null;

  const selections = readSelections(m);
  if (selections.length < 2) return null; // need a full market to de-vig

  return {
    fixtureId,
    ts: ts ?? Date.now(),
    marketId: marketId ?? 1,
    market: String(m.MarketName ?? m.market ?? "1X2"),
    match: m.Match ?? m.match ?? undefined,
    selections,
    raw,
  };
}

function readSelections(m: Record<string, any>): Selection[] {
  // Preferred: an explicit array of { name/decimal | Odds | Price }.
  const arr = m.Selections ?? m.selections ?? m.Prices ?? m.prices;
  if (Array.isArray(arr)) {
    return arr
      .map((s: any) => ({
        name: String(s.name ?? s.Name ?? s.Selection ?? s.outcome ?? "?"),
        decimal: num(s.decimal ?? s.Decimal ?? s.Odds ?? s.Price ?? s.price) ?? NaN,
      }))
      .filter((s) => Number.isFinite(s.decimal) && s.decimal > 1);
  }
  // Fallback: flat 1X2 fields.
  const flat: Selection[] = [];
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
