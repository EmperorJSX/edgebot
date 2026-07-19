"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Bell, Briefcase, Radio, Settings, Target, TrendingUp } from "lucide-react";
import Flag from "@/components/Flag";
import {
  buildPnlSeries,
  buildSparkline,
  CHART_DATES,
  createDemoFeed,
  INITIAL_DECISIONS,
  INITIAL_STATS,
  type Decision,
  type Stats,
} from "@/lib/mock";

const TICK_MS = 4000;
const MAX_ROWS = 9;
const RANGES = ["1H", "6H", "24H", "7D", "30D", "ALL"];

const SPARK_ROI = buildSparkline(21, 40, 0.9);
const SPARK_HIT = buildSparkline(35, 40, 0.25);
const SPARK_POS = buildSparkline(49, 18, 0.5);

const usd = (n: number) =>
  "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const signedUsd = (n: number) => (n < 0 ? "-" : "+") + usd(Math.abs(n));

export default function Dashboard() {
  const [decisions, setDecisions] = useState<Decision[]>(INITIAL_DECISIONS);
  const [stats, setStats] = useState<Stats>(INITIAL_STATS);
  const [series, setSeries] = useState<number[]>(buildPnlSeries);
  const bankrollRef = useRef(INITIAL_STATS.bankroll);
  bankrollRef.current = stats.bankroll;

  // Auto-play: a new agent decision every few seconds, no human input.
  useEffect(() => {
    const next = createDemoFeed();
    const t = setInterval(() => {
      const { decision, pnlDelta, hitDelta, posDelta } = next(bankrollRef.current);
      setDecisions((d) => [decision, ...d].slice(0, MAX_ROWS));
      setSeries((sv) => [...sv.slice(1), Math.min(2940, sv[sv.length - 1] + pnlDelta * 4)]);
      setStats((s) => ({
        bankroll: s.bankroll + pnlDelta,
        pnl24h: s.pnl24h + pnlDelta,
        roi: s.roi + pnlDelta / 128,
        hitRate: Math.min(64, Math.max(53, s.hitRate + hitDelta)),
        openPositions: Math.min(9, Math.max(3, s.openPositions + posDelta)),
      }));
    }, TICK_MS);
    return () => clearInterval(t);
  }, []);

  return (
    <main className="mx-auto flex min-h-screen max-w-[1720px] flex-col gap-4 pb-5">
      <TopBar stats={stats} />
      <div className="flex flex-col gap-4 px-4 sm:px-5">
        <DecisionFeed decisions={decisions} />
        <section className="grid gap-4 md:grid-cols-3 lg:grid-cols-[7fr_2fr_2fr_2fr]">
          <PnlPanel series={series} />
          <StatTile
            label="ROI (30D)"
            value={"+" + stats.roi.toFixed(2) + "%"}
            icon={<TrendingUp size={22} />}
            spark={<Spark data={SPARK_ROI} />}
          />
          <StatTile
            label="HIT RATE (30D)"
            value={stats.hitRate.toFixed(2) + "%"}
            icon={<Target size={22} />}
            spark={<Spark data={SPARK_HIT} />}
          />
          <StatTile
            label="OPEN POSITIONS"
            value={String(stats.openPositions)}
            icon={<Briefcase size={22} />}
            spark={<SparkBars data={SPARK_POS} />}
          />
        </section>
      </div>
    </main>
  );
}

function TopBar({ stats }: { stats: Stats }) {
  return (
    <header className="flex items-center justify-between gap-4 border-b border-line/60 px-4 py-3 sm:px-5">
      <div className="flex items-center gap-5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/logo-wordmark.png" alt="edgebot" className="h-10 w-auto" />
        <div className="hidden items-center gap-2.5 rounded-md border border-accent/40 px-4 py-2 sm:flex">
          <span className="pulse-dot h-2 w-2 rounded-full bg-accent" />
          <span className="text-xs font-semibold tracking-[0.18em] text-accent">
            AUTONOMOUS-RUNNING
          </span>
        </div>
      </div>
      <div className="flex items-center gap-5 sm:gap-6">
        <Metric label="BANKROLL (USDC)" value={usd(stats.bankroll)} valueClass="text-fg" />
        <div className="h-9 w-px bg-line" />
        <Metric label="PNL (24H)" value={signedUsd(stats.pnl24h)} valueClass="text-accent" />
        <div className="hidden items-center gap-4 text-muted lg:flex">
          <Bell size={18} />
          <Settings size={18} />
        </div>
      </div>
    </header>
  );
}

function Metric({ label, value, valueClass }: { label: string; value: string; valueClass: string }) {
  return (
    <div className="text-right">
      <div className="text-[11px] font-medium tracking-[0.14em] text-muted">{label}</div>
      <div className={"tabular text-xl font-bold " + valueClass}>{value}</div>
    </div>
  );
}

function DecisionFeed({ decisions }: { decisions: Decision[] }) {
  const th = "px-3 py-2.5 text-[11px] font-semibold tracking-[0.14em] text-muted";
  return (
    <section className="rounded-xl border border-line bg-panel">
      <div className="flex items-center gap-2.5 px-5 pt-4 pb-1">
        <span className="pulse-dot h-2.5 w-2.5 rounded-full bg-accent" />
        <h2 className="text-sm font-bold tracking-[0.08em]">LIVE DECISION FEED</h2>
      </div>
      <div className="overflow-x-auto px-3 pb-2">
        <table className="w-full min-w-[860px] border-collapse text-sm">
          <thead>
            <tr>
              <th className={th + " text-left"}>TIME</th>
              <th className={th + " text-left"}>MATCH</th>
              <th className={th + " text-center"}>MODEL PROB</th>
              <th className={th + " text-center"}>MARKET PRICE</th>
              <th className={th + " text-center"}>EDGE</th>
              <th className={th + " text-center"}>KELLY STAKE</th>
              <th className={th + " pr-4 text-right"}>ACTION</th>
            </tr>
          </thead>
          <tbody>
            {decisions.map((d, i) => (
              <tr key={d.id} className={"border-t border-line/60" + (d.id >= 100 ? " row-in" : "")}>
                <td className="px-3 py-3">
                  <span className="tabular flex items-center gap-2 text-fg/80">
                    <Radio size={14} className={d.id >= 100 && i === 0 ? "text-lime" : "text-muted"} />
                    {d.time}
                  </span>
                </td>
                <td className="px-3 py-2">
                  <span className="flex items-center gap-2">
                    <Flag code={d.homeCode} />
                    <Flag code={d.awayCode} />
                    <span className="ml-1.5 font-medium">
                      {d.home} vs {d.away}
                    </span>
                  </span>
                </td>
                <td className="tabular px-3 py-3 text-center font-semibold text-accent">
                  {(d.prob * 100).toFixed(1)}%
                </td>
                <td className="tabular px-3 py-3 text-center text-fg/90">{d.price.toFixed(2)}</td>
                <td
                  className={
                    "tabular px-3 py-3 text-center font-semibold " +
                    (d.edgePct >= 0 ? "text-accent" : "text-loss")
                  }
                >
                  {(d.edgePct >= 0 ? "+" : "") + d.edgePct.toFixed(2)}%
                </td>
                <td className="tabular px-3 py-3 text-center text-fg/90">
                  {d.stakePct === null ? "-" : `${d.stakePct.toFixed(2)}% (${usd(d.stakeUsd ?? 0)})`}
                </td>
                <td className="px-3 py-2.5 pr-4 text-right">
                  <span
                    className={
                      "inline-block min-w-[92px] rounded-md border px-3 py-1.5 text-center text-xs font-bold tracking-[0.08em] " +
                      (d.signed ? "border-accent/60 text-accent" : "border-line text-muted")
                    }
                  >
                    {d.signed ? "SIGNED" : "SKIPPED"}
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

function PnlPanel({ series }: { series: number[] }) {
  const [range, setRange] = useState("30D");
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
                "border-b-2 pb-0.5 text-xs font-semibold tracking-wider " +
                (r === range ? "border-accent text-accent" : "border-transparent text-muted")
              }
            >
              {r}
            </button>
          ))}
        </div>
      </div>
      <PnlChart series={series} />
    </div>
  );
}

function PnlChart({ series }: { series: number[] }) {
  const W = 900;
  const H = 268;
  const L = 58;
  const R = 14;
  const T = 14;
  const B = 30;
  const MIN = -1000;
  const MAX = 3000;
  const x = (i: number) => L + (i / (series.length - 1)) * (W - L - R);
  const y = (v: number) => T + (1 - (v - MIN) / (MAX - MIN)) * (H - T - B);
  const pts = series.map((v, i) => x(i).toFixed(1) + "," + y(v).toFixed(1)).join(" ");
  const label = (v: number) => (v < 0 ? "-$" : "$") + Math.abs(v).toLocaleString("en-US");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="mt-3 w-full">
      {[3000, 2000, 1000, 0, -1000].map((v) => (
        <g key={v}>
          <text x={L - 10} y={y(v) + 3.5} textAnchor="end" className="fill-muted" fontSize={11}>
            {label(v)}
          </text>
          <line
            x1={L}
            x2={W - R}
            y1={y(v)}
            y2={y(v)}
            stroke={v === 0 ? "#2a3646" : "#141b25"}
            strokeDasharray={v === 0 ? "5 5" : undefined}
          />
        </g>
      ))}
      {CHART_DATES.map((d, i) => (
        <text
          key={d}
          x={L + (i / (CHART_DATES.length - 1)) * (W - L - R)}
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
        stroke="var(--color-accent)"
        strokeWidth={2}
        strokeLinejoin="round"
      />
    </svg>
  );
}

function StatTile({
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

function Spark({ data }: { data: number[] }) {
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
      <polyline points={pts} fill="none" stroke="var(--color-accent)" strokeWidth={1.5} />
    </svg>
  );
}

function SparkBars({ data }: { data: number[] }) {
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
            fill="var(--color-accent)"
          />
        );
      })}
    </svg>
  );
}
