"use client";

// Maps the seeded demo feed (src/lib/mock.ts) into the same view models the
// live API produces, so every panel has exactly one render path. Used only
// when /api/status is unreachable (runner not started yet).

import { mulberry32, type Decision as MockDecision } from "@/lib/mock";
import type { AlertView, DecisionView, PositionView, SignalView } from "@/components/live";

const round2 = (n: number) => Math.round(n * 100) / 100;
const label = (d: MockDecision) => `${d.home} vs ${d.away}`;
// Mirrors MIN_EDGE_TO_SIGN in mock.ts; edges below 1 point are never signed.
const SIGN_THRESHOLD = 1;
// Demo stand-in for detectSharpMove: a very large edge implies the consensus
// price just moved hard against the model.
const SHARP_EDGE = 8;

export function demoDecision(d: MockDecision): DecisionView {
  return {
    id: `demo-${d.id}`,
    seq: d.id, // demo ids are monotonic, so they work as the stream cursor
    time: d.time,
    match: label(d),
    selection: "Home",
    prob: d.prob,
    price: d.price,
    edgePct: d.edgePct,
    stakePct: d.stakePct,
    stakeUsd: d.stakeUsd,
    action: d.signed ? "SIGNED" : "SKIPPED",
    signed: d.signed,
    reason: d.signed
      ? null
      : d.edgePct < SIGN_THRESHOLD
        ? "Edge below 1% threshold"
        : "Skipped by exposure cap",
    sharp: d.edgePct >= SHARP_EDGE,
  };
}

export const demoSignals = (ds: MockDecision[]): SignalView[] =>
  ds
    .filter((d) => d.edgePct > 0)
    .slice(0, 6)
    .map((d) => ({
      id: `demo-sig-${d.id}`,
      time: d.time,
      match: label(d),
      selection: "Home",
      price: d.price,
      edgePct: d.edgePct,
      stakePct: d.stakePct,
      stakeUsd: d.stakeUsd,
      sharp: d.edgePct >= SHARP_EDGE,
      prevPrice: null,
      deltaProbPct: null,
    }));

export const demoPositions = (ds: MockDecision[]): PositionView[] =>
  ds
    .filter((d) => d.signed)
    .slice(0, 6)
    .map((d) => {
      const rng = mulberry32(d.id * 13 + 5); // deterministic per position
      return {
        id: `demo-pos-${d.id}`,
        time: d.time,
        match: label(d),
        selection: "Home",
        stake: d.stakeUsd,
        price: d.price,
        pnl: round2((rng() - 0.35) * 80),
        status: "OPEN",
      };
    });

export const demoAlerts = (ds: MockDecision[]): AlertView[] =>
  ds
    .filter((d) => d.edgePct >= SHARP_EDGE)
    .slice(0, 5)
    .map((d) => ({
      id: `demo-al-${d.id}`,
      time: d.time,
      match: label(d),
      text: `Consensus odds shifted hard on ${label(d)} (+${d.edgePct.toFixed(2)}% edge)`,
    }));
