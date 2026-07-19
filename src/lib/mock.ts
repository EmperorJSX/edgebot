// Seeded mock data for the autonomous-agent demo. Front-end only: nothing here
// touches TxLINE, Solana, or a backend, but every number is derived the same
// way the real pipeline derives it from the TxLINE consensus odds stream:
//
//   TxLINE consensus stream field  -> mock field
//   ------------------------------------------------------------------
//   consensus decimal odds         -> price      (payout multiple on a win)
//   1 / price                      -> implied    (market prob, vig included)
//   implied / market overround     -> fair prob  (de-vigged consensus baseline)
//   fair prob + model delta        -> prob       (edgebot's model probability)
//   prob - implied                 -> edgePct    (model minus market, in points)
//   fractional Kelly on (price-1)  -> stakePct   (percent of bankroll to stake)
//   stakePct * bankroll            -> stakeUsd

export type TeamCode =
  | "br" | "de" | "fr" | "ar" | "es" | "pt" | "en" | "nl" | "be"
  | "hr" | "uy" | "us" | "ma" | "jp" | "it" | "mx" | "dk" | "sn";

export type Decision = {
  id: number;
  time: string;
  home: string;
  homeCode: TeamCode;
  away: string;
  awayCode: TeamCode;
  prob: number; // model probability, 0..1
  price: number; // decimal odds (TxLINE consensus)
  edgePct: number; // (prob - 1/price) * 100, signed
  stakePct: number | null; // fractional Kelly, percent of bankroll; null when Kelly <= 0
  stakeUsd: number | null;
  signed: boolean; // false = skipped (thin/negative edge, or risk filter)
};

export type Stats = {
  bankroll: number;
  pnl24h: number;
  roi: number;
  hitRate: number;
  openPositions: number;
};

export const TEAMS: { code: TeamCode; name: string }[] = [
  { code: "br", name: "Brazil" },
  { code: "de", name: "Germany" },
  { code: "fr", name: "France" },
  { code: "ar", name: "Argentina" },
  { code: "es", name: "Spain" },
  { code: "pt", name: "Portugal" },
  { code: "en", name: "England" },
  { code: "nl", name: "Netherlands" },
  { code: "be", name: "Belgium" },
  { code: "hr", name: "Croatia" },
  { code: "uy", name: "Uruguay" },
  { code: "us", name: "USA" },
  { code: "ma", name: "Morocco" },
  { code: "jp", name: "Japan" },
  { code: "it", name: "Italy" },
  { code: "mx", name: "Mexico" },
  { code: "dk", name: "Denmark" },
  { code: "sn", name: "Senegal" },
];

// Two-outcome market overround: the book's implied probs sum to ~1.05, so the
// de-vigged fair prob is implied / OVERROUND. TxLINE's consensus feed carries
// both sides; the mock only models the side we quote.
const OVERROUND = 1.05;
// Tenth Kelly: full Kelly is too volatile for an autonomous bankroll, the real
// agent stakes a fixed fraction of the Kelly optimum.
const KELLY_FRACTION = 0.1;
const MAX_STAKE_PCT = 3.5;
// Below this edge (in points) the agent never signs; above it, a risk filter
// (exposure caps, correlated positions) can still skip.
const MIN_EDGE_TO_SIGN = 1;

const round2 = (n: number) => Math.round(n * 100) / 100;
const round3 = (n: number) => Math.round(n * 1000) / 1000;

/** Derive edge and Kelly stake from price + model prob, exactly one way. */
export function decide(price: number, prob: number, bankroll: number) {
  const implied = 1 / price; // market prob, vig included
  const edgePct = round2((prob - implied) * 100); // model minus market
  const b = price - 1;
  const fullKelly = (b * prob - (1 - prob)) / b; // f* = (bp - q) / b
  const stakePct =
    fullKelly > 0 ? round2(Math.min(MAX_STAKE_PCT, fullKelly * KELLY_FRACTION * 100)) : null;
  const stakeUsd = stakePct !== null ? round2((stakePct / 100) * bankroll) : null;
  return { edgePct, stakePct, stakeUsd };
}

// First paint mirrors context/designs/dashboard.png (same matches, times,
// prices, signed/skipped pattern); edge and stake are recomputed through
// decide() so every row is internally consistent.
export const INITIAL_STATS: Stats = {
  bankroll: 12842.63,
  pnl24h: 1842.63,
  roi: 16.77,
  hitRate: 58.62,
  openPositions: 7,
};

function seedRow(
  id: number,
  time: string,
  homeCode: TeamCode,
  awayCode: TeamCode,
  price: number,
  prob: number,
  signed: boolean
): Decision {
  const home = TEAMS.find((t) => t.code === homeCode)!;
  const away = TEAMS.find((t) => t.code === awayCode)!;
  return {
    id,
    time,
    home: home.name,
    homeCode,
    away: away.name,
    awayCode,
    prob,
    price,
    signed,
    ...decide(price, prob, INITIAL_STATS.bankroll),
  };
}

export const INITIAL_DECISIONS: Decision[] = [
  seedRow(7, "14:32:18", "br", "de", 1.72, 0.673, true),
  seedRow(6, "14:31:07", "fr", "ar", 1.95, 0.581, true),
  seedRow(5, "14:29:54", "es", "pt", 2.1, 0.612, true),
  seedRow(4, "14:28:33", "en", "nl", 1.88, 0.568, true),
  seedRow(3, "14:27:15", "be", "hr", 1.76, 0.602, false), // positive edge, skipped by exposure cap
  seedRow(2, "14:26:02", "uy", "us", 2.05, 0.477, false), // negative edge
  seedRow(1, "14:24:48", "ma", "jp", 1.9, 0.541, true),
];

// ---------------------------------------------------------------------------
// PnL chart: one master series, sliced per time range.

export type Range = "1H" | "6H" | "24H" | "7D" | "30D" | "ALL";
export const RANGES: Range[] = ["1H", "6H", "24H", "7D", "30D", "ALL"];

/** Points = how much of the master series tail each range shows. */
export const RANGE_WINDOWS: Record<Range, { points: number; labels: string[] }> = {
  "1H": { points: 12, labels: ["13:35", "13:45", "13:55", "14:05", "14:15", "14:25"] },
  "6H": { points: 24, labels: ["09:00", "10:00", "11:00", "12:00", "13:00", "14:00"] },
  "24H": { points: 40, labels: ["15:00", "19:00", "23:00", "03:00", "07:00", "11:00"] },
  "7D": { points: 56, labels: ["Jun 19", "Jun 20", "Jun 21", "Jun 22", "Jun 23", "Jun 24", "Jun 25"] },
  "30D": { points: 90, labels: ["May 26", "May 31", "Jun 5", "Jun 10", "Jun 15", "Jun 20", "Jun 25"] },
  "ALL": { points: 240, labels: ["Apr 6", "Apr 19", "May 2", "May 15", "May 28", "Jun 10", "Jun 25"] },
};

// ponytail: mulberry32, plenty for a demo and keeps SSR/client markup identical
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Master PnL walk since inception (240 points = ALL). The last 90 points keep
 * the design's 30D shape: early dip below zero, then a climb. */
export function buildPnlSeries(points = 240, seed = 11): number[] {
  const anchors: [number, number][] = [
    [0, 0], [30, 160], [55, -120], [85, 340], [115, 120], [150, -60],
    [158, 260], [166, -80], [173, -680], [182, 250], [195, 1050],
    [208, 1480], [218, 1850], [228, 2150], [points - 1, 2760],
  ];
  const rng = mulberry32(seed);
  const at = (i: number) => {
    let k = 0;
    while (k < anchors.length - 2 && anchors[k + 1][0] < i) k++;
    const [x0, y0] = anchors[k];
    const [x1, y1] = anchors[k + 1];
    return y0 + ((i - x0) / (x1 - x0)) * (y1 - y0);
  };
  return Array.from({ length: points }, (_, i) => Math.round(at(i) + (rng() - 0.5) * 190));
}

export function buildSparkline(seed: number, points: number, drift: number): number[] {
  const rng = mulberry32(seed);
  let v = 0;
  return Array.from({ length: points }, () => (v += drift + (rng() - 0.5) * 3));
}

const fmtClock = (s: number) =>
  [Math.floor(s / 3600) % 24, Math.floor(s / 60) % 60, s % 60]
    .map((n) => String(n).padStart(2, "0"))
    .join(":");

export type Tick = {
  decision: Decision;
  pnlDelta: number;
  hitDelta: number;
  posDelta: number;
};

/** Deterministic decision stream. Same seed -> identical demo run every time,
 * which makes video takes reproducible. Every appended row goes through the
 * same de-vig -> model prob -> edge -> Kelly derivation as the seed rows. */
export function createDemoFeed(seed = 7) {
  const rng = mulberry32(seed);
  let clock = 14 * 3600 + 32 * 60 + 18; // continues from the last design row
  let id = 100;

  return function next(bankroll: number): Tick {
    clock += 35 + Math.floor(rng() * 55);
    const hi = Math.floor(rng() * TEAMS.length);
    const aj = Math.floor(rng() * (TEAMS.length - 1));
    const home = TEAMS[hi];
    const away = TEAMS[(hi + 1 + aj) % TEAMS.length];

    // TxLINE consensus decimal odds for the home side.
    const price = round2(1.55 + rng() * 1.1);
    // De-vig the quote, then let the model disagree with the fair baseline by
    // a small delta. Positive delta -> value on this side.
    const fair = 1 / price / OVERROUND;
    const prob = round3(Math.min(0.92, Math.max(0.08, fair + (rng() * 0.16 - 0.045))));
    const { edgePct, stakePct, stakeUsd } = decide(price, prob, bankroll);
    // Risk filter: even a positive edge is occasionally skipped (exposure cap).
    const signed = edgePct >= MIN_EDGE_TO_SIGN && rng() > 0.15;

    const decision: Decision = {
      id: id++,
      time: fmtClock(clock),
      home: home.name,
      homeCode: home.code,
      away: away.name,
      awayCode: away.code,
      prob,
      price,
      edgePct,
      stakePct,
      stakeUsd,
      signed,
    };

    return {
      decision,
      pnlDelta: round2(signed ? rng() * 120 - 25 : rng() * 42 - 18),
      hitDelta: round2((rng() - 0.45) * 0.3),
      posDelta: signed ? (rng() < 0.6 ? 1 : 0) : rng() < 0.3 ? -1 : 0,
    };
  };
}
