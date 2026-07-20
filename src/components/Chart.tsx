"use client";

// PnL chart with functional range controls, plus the stat tiles and
// sparklines. All strokes use theme CSS vars so the chart flips with dark
// mode.

import { useState, type ReactNode } from "react";
import { RANGE_WINDOWS, RANGES, type Range } from "@/lib/mock";

export function PnlPanel({
  series,
  showDates,
}: {
  series: number[] | null;
  /** Demo mode has a known timeline; live mode hides the made-up date axis. */
  showDates: boolean;
}) {
  const [range, setRange] = useState<Range>("30D");
  const win = RANGE_WINDOWS[range];
  const slice = series?.slice(-win.points) ?? [];
  return (
    <div className="rounded-xl border border-line bg-panel p-5 md:col-span-3 lg:col-span-1">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-bold tracking-[0.08em]">PNL OVER TIME</h2>
        <div className="flex items-center gap-4">
          {RANGES.map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={
                "border-b-2 pb-0.5 text-xs font-semibold tracking-wider transition-colors " +
                (r === range
                  ? "border-accent text-accent"
                  : "border-transparent text-muted hover:text-fg")
              }
            >
              {r}
            </button>
          ))}
        </div>
      </div>
      {slice.length >= 2 ? (
        <PnlChart series={slice} labels={showDates ? win.labels : []} />
      ) : (
        <div className="mt-3 grid h-[220px] place-items-center text-sm text-muted">
          Collecting P&L history from the agent...
        </div>
      )}
    </div>
  );
}

/** Round gridline steps so every zoom level gets 3-6 clean ticks. */
function niceTicks(lo: number, hi: number): number[] {
  const span = Math.max(hi - lo, 10);
  const step = [25, 50, 100, 200, 250, 500, 1000, 2000].find((s) => span / s <= 5) ?? 2000;
  const first = Math.floor(lo / step) * step;
  const ticks: number[] = [];
  for (let v = first; v < hi + step; v += step) ticks.push(v);
  return ticks;
}

function PnlChart({ series, labels }: { series: number[]; labels: string[] }) {
  const W = 900;
  const H = 268;
  const L = 58;
  const R = 14;
  const T = 14;
  const B = 30;
  const ticks = niceTicks(Math.min(...series), Math.max(...series));
  const MIN = ticks[0];
  const MAX = ticks[ticks.length - 1];
  const x = (i: number) => L + (i / (series.length - 1)) * (W - L - R);
  const y = (v: number) => T + (1 - (v - MIN) / (MAX - MIN)) * (H - T - B);
  const pts = series.map((v, i) => x(i).toFixed(1) + "," + y(v).toFixed(1)).join(" ");
  const label = (v: number) => (v < 0 ? "-$" : "$") + Math.abs(v).toLocaleString("en-US");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="mt-3 w-full">
      {ticks.map((v) => (
        <g key={v}>
          <text x={L - 10} y={y(v) + 3.5} textAnchor="end" className="fill-muted" fontSize={11}>
            {label(v)}
          </text>
          <line
            x1={L}
            x2={W - R}
            y1={y(v)}
            y2={y(v)}
            stroke={v === 0 ? "var(--chart-zero)" : "var(--chart-grid)"}
            strokeDasharray={v === 0 ? "5 5" : undefined}
          />
        </g>
      ))}
      {labels.map((d, i) => (
        <text
          key={d}
          x={L + (i / (labels.length - 1)) * (W - L - R)}
          y={H - 8}
          textAnchor="middle"
          className="fill-muted"
          fontSize={11}
        >
          {d}
        </text>
      ))}
      <polyline
        points={pts}
        fill="none"
        stroke="var(--accent)"
        strokeWidth={2}
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function StatTile({
  label,
  value,
  icon,
  spark,
}: {
  label: string;
  value: string;
  icon: ReactNode;
  spark: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-line bg-panel p-5">
      <div className="text-xs font-semibold tracking-[0.14em] text-muted">{label}</div>
      <div className="mt-1 grid h-14 w-14 place-items-center rounded-full border border-accent/50 text-accent">
        {icon}
      </div>
      <div className="tabular text-3xl font-bold text-accent">{value}</div>
      <div className="mt-auto w-full pt-1">{spark}</div>
    </div>
  );
}

export function Spark({ data }: { data: number[] }) {
  const W = 130;
  const H = 34;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const pts = data
    .map(
      (v, i) =>
        `${((i / (data.length - 1)) * W).toFixed(1)},${(H - 3 - ((v - min) / (max - min || 1)) * (H - 6)).toFixed(1)}`
    )
    .join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      <polyline points={pts} fill="none" stroke="var(--accent)" strokeWidth={1.5} />
    </svg>
  );
}

export function SparkBars({ data }: { data: number[] }) {
  const W = 130;
  const H = 34;
  const max = Math.max(...data.map(Math.abs)) || 1;
  const bw = W / data.length;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      {data.map((v, i) => {
        const h = 4 + (Math.abs(v) / max) * (H - 6);
        return (
          <rect
            key={i}
            x={i * bw + 1.5}
            y={H - h}
            width={bw - 3}
            height={h}
            fill="var(--accent)"
          />
        );
      })}
    </svg>
  );
}
