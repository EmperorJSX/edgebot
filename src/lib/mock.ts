// Seeded mock data for the autonomous-agent demo. Front-end only: the numbers
// mimic the real pipeline (model prob vs market price -> edge -> Kelly stake)
// but nothing here touches TxLINE, Solana, or a backend.

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
  price: number; // decimal odds
  edgePct: number; // signed percent
  stakePct: number | null; // percent of bankroll, null when no stake
  stakeUsd: number | null;
  signed: boolean;
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

// First paint matches context/designs/dashboard.png exactly.
export const INITIAL_STATS: Stats = {
  bankroll: 12842.63,
  pnl24h: 1842.63,
  roi: 16.77,
  hitRate: 58.62,
  openPositions: 7,
};

export const INITIAL_DECISIONS: Decision[] = [
  { id: 7, time: "14:32:18", home: "Brazil", homeCode: "br", away: "Germany", awayCode: "de", prob: 0.673, price: 1.72, edgePct: 12.48, stakePct: 2.31, stakeUsd: 296.7, signed: true },
  { id: 6, time: "14:31:07", home: "France", homeCode: "fr", away: "Argentina", awayCode: "ar", prob: 0.581, price: 1.95, edgePct: 7.35, stakePct: 1.42, stakeUsd: 182.22, signed: true },
  { id: 5, time: "14:29:54", home: "Spain", homeCode: "es", away: "Portugal", awayCode: "pt", prob: 0.612, price: 2.1, edgePct: 10.17, stakePct: 1.85, stakeUsd: 237.9, signed: true },
  { id: 4, time: "14:28:33", home: "England", homeCode: "en", away: "Netherlands", awayCode: "nl", prob: 0.558, price: 1.88, edgePct: 5.63, stakePct: 0.98, stakeUsd: 125.98, signed: true },
  { id: 3, time: "14:27:15", home: "Belgium", homeCode: "be", away: "Croatia", awayCode: "hr", prob: 0.536, price: 1.76, edgePct: 3.42, stakePct: 0.62, stakeUsd: 79.71, signed: false },
  { id: 2, time: "14:26:02", home: "Uruguay", homeCode: "uy", away: "USA", awayCode: "us", prob: 0.492, price: 2.05, edgePct: -1.08, stakePct: null, stakeUsd: null, signed: false },
  { id: 1, time: "14:24:48", home: "Morocco", homeCode: "ma", away: "Japan", awayCode: "jp", prob: 0.513, price: 1.9, edgePct: 1.47, stakePct: 0.28, stakeUsd: 36.02, signed: true },
];

export const CHART_DATES = ["May 26", "May 31", "Jun 5", "Jun 10", "Jun 15", "Jun 20", "Jun 25"];

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

/** 30D PnL walk shaped like the design: early dip below zero, then a climb. */
export function buildPnlSeries(points = 90, seed = 11): number[] {
  const rng = mulberry32(seed);
  const anchors: [number, number][] = [
    [0, -60], [8, 260], [16, -80], [23, -680], [32, 250], [45, 1050],
    [58, 1480], [68, 1850], [78, 2150], [points - 1, 2760],
  ];
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

const round2 = (n: number) => Math.round(n * 100) / 100;
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
 * which makes video takes reproducible. */
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

    const price = round2(1.55 + rng() * 1.1);
    const prob = Math.min(0.78, Math.max(0.42, 1 / price + rng() * 0.17 - 0.05));
    const edge = prob * price - 1;
    const edgePct = round2(edge * 100);
    // ponytail: stake ~ edge scaled to match the design's numbers, not real Kelly
    const stakePct = edge > 0.005 ? round2(Math.min(3.2, edgePct * 0.19 + rng() * 0.12)) : null;
    const stakeUsd = stakePct !== null ? round2((stakePct / 100) * bankroll) : null;
    const signed = edge >= 0.03 && rng() > 0.15;

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
