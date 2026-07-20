"use client";

// Client-side layer for the runner API (/api/status, /api/signals,
// /api/positions, /api/decisions). The runner and engine are built by sibling
// agents, so every normalizer is tolerant of field spellings the same way
// txline/normalizeOddsMessage is: pick the first field that parses, leave null
// for the rest, and let the UI render a dash. If /api/status is unreachable the
// dashboard falls back to the seeded demo feed so it always renders.

import { useEffect, useRef, useState } from "react";

export type Source = "live" | "replay" | "demo";

export interface StatusView {
  mode: Source;
  running: boolean;
  bankroll: number | null;
  pnl: number | null;
  pnl24h: number | null;
  roi: number | null; // percent
  hitRate: number | null; // percent
  openPositions: number | null;
  tick: number | null;
  series: number[] | null; // P&L history when the runner exposes one
}

export interface SignalView {
  id: string;
  time: string;
  match: string;
  selection: string;
  price: number | null;
  edgePct: number | null;
  stakePct: number | null;
  stakeUsd: number | null;
  sharp: boolean;
  /** Sharp-move extras when the engine sends them. */
  prevPrice: number | null;
  deltaProbPct: number | null;
}

export interface PositionView {
  id: string;
  time: string;
  match: string;
  selection: string;
  stake: number | null;
  price: number | null;
  pnl: number | null;
  status: string;
}

export interface DecisionView {
  id: string;
  /** Runner log cursor when present; used to order the stream. */
  seq: number | null;
  time: string;
  match: string;
  selection: string | null;
  prob: number | null; // 0..1
  price: number | null;
  edgePct: number | null;
  stakePct: number | null;
  stakeUsd: number | null;
  action: string;
  signed: boolean;
  reason: string | null;
  sharp: boolean;
}

export interface AlertView {
  id: string;
  time: string;
  match: string;
  text: string;
}

// ---------------------------------------------------------------------------
// Field pickers

type Obj = Record<string, unknown>;

const asObj = (v: unknown): Obj => (v && typeof v === "object" ? (v as Obj) : {});

const num = (v: unknown): number | null => {
  const n = typeof v === "string" ? Number(v) : (v as number);
  return typeof n === "number" && Number.isFinite(n) ? n : null;
};

const str = (v: unknown): string | null =>
  typeof v === "string" && v.length > 0 ? v : null;

/** Engine math returns fractions (edge(), kellyFraction()); a pre-formatted API
 * sends percents. Values with |v| <= 1 are treated as fractions. */
const pct = (v: unknown): number | null => {
  const n = num(v);
  if (n === null) return null;
  return Math.abs(n) <= 1 ? n * 100 : n;
};

/** Probability in 0..1 regardless of whether the API sends 0.62 or 62. */
const prob01 = (v: unknown): number | null => {
  const n = num(v);
  if (n === null) return null;
  return n > 1 ? n / 100 : n;
};

/** HH:MM:SS from an epoch (s or ms) or ISO string. */
const clock = (v: unknown): string => {
  const n = num(v);
  const d =
    n !== null
      ? new Date(n > 1e12 ? n : n > 1e9 ? n * 1000 : NaN)
      : typeof v === "string"
        ? new Date(v)
        : null;
  if (!d || Number.isNaN(d.getTime())) return "--:--:--";
  return d.toTimeString().slice(0, 8);
};

const first = (o: Obj, ...keys: string[]): unknown => {
  for (const k of keys) if (o[k] !== undefined && o[k] !== null) return o[k];
  return undefined;
};

const matchLabel = (o: Obj): string => {
  const direct = str(first(o, "match", "fixture", "label", "matchName", "event"));
  if (direct) return direct;
  const home = str(first(o, "home", "homeTeam"));
  const away = str(first(o, "away", "awayTeam"));
  if (home && away) return `${home} vs ${away}`;
  const id = num(first(o, "fixtureId", "fixture_id"));
  return id !== null ? `Fixture #${id}` : "Unknown fixture";
};

const isSharp = (o: Obj): boolean => {
  if (o.sharp === true || o.sharpMove === true) return true;
  const kind = str(first(o, "kind", "type", "event", "action", "category"));
  return kind !== null && kind.toLowerCase().includes("sharp");
};

const unwrapList = (j: unknown, ...keys: string[]): Obj[] => {
  if (Array.isArray(j)) return j.map(asObj);
  const o = asObj(j);
  for (const k of [...keys, "data", "items"]) {
    const v = o[k];
    if (Array.isArray(v)) return v.map(asObj);
  }
  return [];
};

const findSeries = (o: Obj): number[] | null => {
  for (const k of ["pnlSeries", "pnlHistory", "series", "equity", "history"]) {
    const v = o[k];
    if (!Array.isArray(v) || v.length < 2) continue;
    const nums = v
      .map((p) => (typeof p === "number" ? p : num(first(asObj(p), "pnl", "value", "v", "y"))))
      .filter((n): n is number => n !== null);
    if (nums.length >= 2) return nums;
  }
  return null;
};

// ---------------------------------------------------------------------------
// Normalizers, one per endpoint

export function normStatus(j: unknown): StatusView {
  const o = asObj(j);
  const mode = str(first(o, "mode", "source"))?.toLowerCase();
  const pnl = num(first(o, "pnl", "totalPnl", "pnlTotal", "profit"));
  const startBankroll = num(first(o, "startBankroll", "initialBankroll"));
  const roi = pct(first(o, "roi", "roiPct", "returnPct"));
  return {
    mode: mode === "replay" || mode === "demo" ? "replay" : "live",
    running: first(o, "running", "autonomous", "active") !== false,
    bankroll: num(first(o, "bankroll", "bankrollUsd", "balance")),
    pnl,
    pnl24h: num(first(o, "pnl24h", "pnlDay", "dailyPnl")) ?? pnl,
    // Derive ROI from running P&L over starting bankroll when not sent.
    roi:
      roi ??
      (pnl !== null && startBankroll !== null && startBankroll > 0
        ? (pnl / startBankroll) * 100
        : null),
    hitRate: pct(first(o, "hitRate", "winRate", "hitRatePct")),
    openPositions: num(first(o, "openPositions", "openCount", "positionCount")),
    tick: num(first(o, "tick", "ticks", "tickCount")),
    series: findSeries(o),
  };
}

export function normSignals(j: unknown): SignalView[] {
  return unwrapList(j, "signals").map((o, i) => {
    const price = num(first(o, "offered", "price", "decimal", "odds", "marketDecimal"));
    const fairProb = prob01(first(o, "fairProb", "prob", "probability"));
    let stakePct = pct(first(o, "kelly", "kellyFraction", "stakePct", "stakeFraction"));
    // The engine's Signal carries fairProb + offered but no stake; show the
    // full-Kelly optimum f* = (bp - q) / b for the signal.
    if (stakePct === null && fairProb !== null && price !== null && price > 1) {
      const b = price - 1;
      stakePct = Math.max(0, ((b * fairProb - (1 - fairProb)) / b) * 100);
    }
    return {
      id: str(first(o, "id", "signalId")) ?? `sig-${num(first(o, "ts", "time")) ?? i}-${i}`,
      time: clock(first(o, "ts", "time", "timestamp", "createdAt")),
      match: matchLabel(o),
      selection: str(first(o, "selection", "outcome", "side", "pick", "name")) ?? "Home",
      price,
      edgePct: pct(first(o, "edge", "edgePct", "ev")),
      stakePct,
      stakeUsd: num(first(o, "stake", "stakeUsd", "size")),
      sharp: isSharp(o),
      prevPrice: num(first(o, "prevDecimal", "prevPrice")),
      deltaProbPct: pct(first(o, "deltaProb", "probShift")),
    };
  });
}

export function normPositions(j: unknown): PositionView[] {
  return unwrapList(j, "positions").map((o, i) => ({
    id: str(first(o, "id", "positionId")) ?? `pos-${num(first(o, "ts", "openedTs")) ?? i}-${i}`,
    time: clock(first(o, "openedTs", "openedAt", "ts", "time", "timestamp")),
    match: matchLabel(o),
    selection: str(first(o, "selection", "outcome", "side", "pick")) ?? "Home",
    stake: num(first(o, "stake", "stakeUsd", "size", "amount")),
    price: num(first(o, "price", "decimal", "odds", "entryPrice")),
    pnl: num(first(o, "pnl", "unrealized", "unrealizedPnl")),
    status: (str(first(o, "status", "state")) ?? "open").toUpperCase(),
  }));
}

export function normDecisions(j: unknown): DecisionView[] {
  return unwrapList(j, "decisions", "log").map((o, i) => {
    const rawAction = str(first(o, "action", "decision", "type", "kind"));
    const signedFlag =
      o.signed === true ||
      (rawAction !== null && /sign|bet|open|buy|back/i.test(rawAction));
    const action = (rawAction ?? (o.signed === true ? "signed" : o.signed === false ? "skipped" : "log")).toUpperCase();
    const seq = num(first(o, "seq", "id"));
    const reason = str(first(o, "reason", "note", "message", "why"));
    return {
      id: seq !== null ? `dec-${seq}` : `dec-${num(first(o, "ts", "time")) ?? i}-${i}`,
      seq,
      time: clock(first(o, "ts", "time", "timestamp", "at")),
      match: matchLabel(o),
      selection: str(first(o, "selection", "outcome", "side", "pick")),
      prob: prob01(first(o, "prob", "fairProb", "modelProb", "probability")),
      price: num(first(o, "price", "decimal", "odds", "marketDecimal")),
      edgePct: pct(first(o, "edge", "edgePct")),
      stakePct: pct(first(o, "kelly", "kellyFraction", "stakePct")),
      stakeUsd: num(first(o, "stake", "stakeUsd", "size")),
      action,
      signed: signedFlag,
      reason,
      // The engine logs sharp odds moves as ALERT entries.
      sharp: isSharp(o) || action === "ALERT" || (reason !== null && /sharp/i.test(reason)),
    };
  });
}

// ---------------------------------------------------------------------------
// Null-safe formatters shared by every panel: missing API fields render "-".

export const fmtUsd = (n: number | null): string =>
  n === null
    ? "-"
    : "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const fmtSignedUsd = (n: number | null): string =>
  n === null ? "-" : (n < 0 ? "-" : "+") + fmtUsd(Math.abs(n));

export const fmtPct = (n: number | null, signed = false): string =>
  n === null ? "-" : (signed && n >= 0 ? "+" : "") + n.toFixed(2) + "%";

// ---------------------------------------------------------------------------
// Polling hook

export interface Poll<T> {
  data: T | null;
  loading: boolean;
  error: boolean;
}

export function usePoll<T>(
  url: string,
  map: (j: unknown) => T,
  intervalMs: number,
  enabled: boolean,
  /** Runs in the fetch callback with each fresh payload; a safe place for
   * callers to accumulate history without effect-driven setState. */
  onData?: (data: T) => void
): Poll<T> {
  const [state, setState] = useState<Poll<T>>({ data: null, loading: true, error: false });
  const mapRef = useRef(map);
  const onDataRef = useRef(onData);
  useEffect(() => {
    mapRef.current = map;
    onDataRef.current = onData;
  });

  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    const tick = async () => {
      try {
        const r = await fetch(url, { cache: "no-store" });
        if (!r.ok) throw new Error(String(r.status));
        const j: unknown = await r.json();
        if (!alive) return;
        const data = mapRef.current(j);
        setState({ data, loading: false, error: false });
        onDataRef.current?.(data);
      } catch {
        if (alive) setState((s) => ({ data: s.data, loading: false, error: true }));
      }
    };
    void tick();
    const t = setInterval(() => void tick(), intervalMs);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [url, intervalMs, enabled]);

  return state;
}
