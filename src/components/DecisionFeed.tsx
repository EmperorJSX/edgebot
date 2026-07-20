"use client";

// Streaming autonomous decision log. One render path for live API rows and
// demo rows (both arrive as DecisionView).

import { Pause, Play, Radio } from "lucide-react";
import MatchCell from "@/components/MatchCell";
import Select from "@/components/Select";
import { fmtPct, fmtUsd, type DecisionView } from "@/components/live";

export type FeedFilter = "all" | "signed" | "skipped";

const FILTER_OPTIONS: { value: FeedFilter; label: string }[] = [
  { value: "all", label: "All decisions" },
  { value: "signed", label: "Signed only" },
  { value: "skipped", label: "Skipped only" },
];

const TH = "px-3 py-2.5 text-[11px] font-semibold tracking-[0.14em] text-muted";

export default function DecisionFeed({
  rows,
  paused,
  onTogglePause,
  filter,
  onFilter,
  isFresh,
}: {
  rows: DecisionView[];
  paused: boolean;
  onTogglePause: () => void;
  filter: FeedFilter;
  onFilter: (f: FeedFilter) => void;
  isFresh: (id: string) => boolean;
}) {
  return (
    <section className="rounded-xl border border-line bg-panel">
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-4 pb-1">
        <div className="flex items-center gap-2.5">
          <span
            className={"h-2.5 w-2.5 rounded-full " + (paused ? "bg-muted" : "pulse-dot bg-accent")}
          />
          <h2 className="text-sm font-bold tracking-[0.08em]">LIVE DECISION FEED</h2>
        </div>
        <div className="flex items-center gap-2.5">
          <Select
            value={filter}
            options={FILTER_OPTIONS}
            onChange={onFilter}
            ariaLabel="Filter decisions"
            className="w-40"
          />
          <button
            onClick={onTogglePause}
            className="flex items-center gap-1.5 rounded-md border border-line px-3 py-1.5 text-xs font-bold tracking-[0.08em] text-muted transition-colors hover:border-accent/60 hover:text-accent"
          >
            {paused ? <Play size={13} /> : <Pause size={13} />}
            {paused ? "RESUME" : "PAUSE"}
          </button>
        </div>
      </div>
      <div className="overflow-x-auto px-3 pb-2">
        <table className="w-full min-w-[860px] border-collapse text-sm">
          <thead>
            <tr>
              <th className={TH + " text-left"}>TIME</th>
              <th className={TH + " text-left"}>MATCH</th>
              <th className={TH + " text-center"}>MODEL PROB</th>
              <th className={TH + " text-center"}>MARKET PRICE</th>
              <th className={TH + " text-center"}>EDGE</th>
              <th className={TH + " text-center"}>KELLY STAKE</th>
              <th className={TH + " pr-4 text-right"}>ACTION</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr className="border-t border-line/60">
                <td colSpan={7} className="px-3 py-6 text-center text-muted">
                  Waiting for the agent&apos;s first decision...
                </td>
              </tr>
            )}
            {rows.map((d, i) => (
              <tr key={d.id} className={"border-t border-line/60" + (isFresh(d.id) ? " row-in" : "")}>
                <td className="px-3 py-3">
                  <span className="tabular flex items-center gap-2 text-fg/80">
                    <Radio
                      size={14}
                      className={i === 0 && isFresh(d.id) ? "text-lime" : "text-muted"}
                    />
                    {d.time}
                  </span>
                </td>
                <td className="px-3 py-2">
                  <MatchCell match={d.match} />
                </td>
                <td className="tabular px-3 py-3 text-center font-semibold text-accent">
                  {d.prob === null ? "-" : (d.prob * 100).toFixed(1) + "%"}
                </td>
                <td className="tabular px-3 py-3 text-center text-fg/90">
                  {d.price === null ? "-" : d.price.toFixed(2)}
                </td>
                <td
                  className={
                    "tabular px-3 py-3 text-center font-semibold " +
                    ((d.edgePct ?? 0) >= 0 ? "text-accent" : "text-loss")
                  }
                >
                  {fmtPct(d.edgePct, true)}
                </td>
                <td className="tabular px-3 py-3 text-center text-fg/90">
                  {d.stakePct === null
                    ? d.stakeUsd === null
                      ? "-"
                      : fmtUsd(d.stakeUsd)
                    : fmtPct(d.stakePct) + (d.stakeUsd === null ? "" : ` (${fmtUsd(d.stakeUsd)})`)}
                </td>
                <td className="px-3 py-2.5 pr-4 text-right">
                  <span
                    title={d.reason ?? undefined}
                    className={
                      "inline-block min-w-[92px] rounded-md border px-3 py-1.5 text-center text-xs font-bold tracking-[0.08em] " +
                      (d.signed ? "border-accent/60 text-accent" : "border-line text-muted")
                    }
                  >
                    {d.action.replace(/_/g, " ")}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
