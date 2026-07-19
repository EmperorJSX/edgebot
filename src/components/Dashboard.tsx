"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Bell,
  Briefcase,
  Pause,
  Play,
  Radio,
  Settings,
  Target,
  TrendingUp,
} from "lucide-react";
import Flag from "@/components/Flag";
import {
  buildPnlSeries,
  buildSparkline,
  createDemoFeed,
  INITIAL_DECISIONS,
  INITIAL_STATS,
  RANGE_WINDOWS,
  RANGES,
  type Decision,
  type Range,
  type Stats,
} from "@/lib/mock";

const SKELETON_MS = 650; // first-load shimmer, within the 400-900 ms budget
const MAX_ROWS = 9;
const SPEEDS: { label: string; ms: number }[] = [
  { label: "FAST", ms: 2000 },
  { label: "NORMAL", ms: 4000 },
  { label: "SLOW", ms: 8000 },
];

const SPARK_ROI = buildSparkline(21, 40, 0.9);
const SPARK_HIT = buildSparkline(35, 40, 0.25);
const SPARK_POS = buildSparkline(49, 18, 0.5);

const usd = (n: number) =>
  "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const signedUsd = (n: number) => (n < 0 ? "-" : "+") + usd(Math.abs(n));

type PanelId = "bell" | "settings" | null;

export default function Dashboard() {
  const [booted, setBooted] = useState(false);
  const [paused, setPaused] = useState(false);
  const [tickMs, setTickMs] = useState(4000);
  const [decisions, setDecisions] = useState<Decision[]>(INITIAL_DECISIONS);
  const [stats, setStats] = useState<Stats>(INITIAL_STATS);
  const [series, setSeries] = useState<number[]>(buildPnlSeries);
  const bankrollRef = useRef(INITIAL_STATS.bankroll);
  bankrollRef.current = stats.bankroll;
  // One generator for the whole session so pause/resume never replays ids.
  const feedRef = useRef<ReturnType<typeof createDemoFeed> | null>(null);
  if (feedRef.current === null) feedRef.current = createDemoFeed();

  useEffect(() => {
    const t = setTimeout(() => setBooted(true), SKELETON_MS);
    return () => clearTimeout(t);
  }, []);

  // Auto-play: a new agent decision every few seconds, no human input.
  useEffect(() => {
    if (!booted || paused) return;
    const t = setInterval(() => {
      const { decision, pnlDelta, hitDelta, posDelta } = feedRef.current!(bankrollRef.current);
      setDecisions((d) => [decision, ...d].slice(0, MAX_ROWS));
      setSeries((sv) => [...sv.slice(1), sv[sv.length - 1] + pnlDelta * 4]);
      setStats((s) => ({
        bankroll: s.bankroll + pnlDelta,
        pnl24h: s.pnl24h + pnlDelta,
        roi: s.roi + pnlDelta / 128,
        hitRate: Math.min(64, Math.max(53, s.hitRate + hitDelta)),
        openPositions: Math.min(9, Math.max(3, s.openPositions + posDelta)),
      }));
    }, tickMs);
    return () => clearInterval(t);
  }, [booted, paused, tickMs]);

  return (
    <main className="mx-auto flex min-h-screen max-w-[1720px] flex-col gap-4 pb-5">
      <TopBar
        stats={stats}
        paused={paused}
        decisions={decisions}
        tickMs={tickMs}
        onTickMs={setTickMs}
      />
      <div className="flex flex-col gap-4 px-4 sm:px-5">
        {booted ? (
          <DecisionFeed decisions={decisions} paused={paused} onTogglePause={() => setPaused((p) => !p)} />
        ) : (
          <FeedSkeleton />
        )}
        <section className="grid gap-4 md:grid-cols-3 lg:grid-cols-[7fr_2fr_2fr_2fr]">
          {booted ? (
            <>
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
            </>
          ) : (
            <>
              <ChartSkeleton />
              <TileSkeleton />
              <TileSkeleton />
              <TileSkeleton />
            </>
          )}
        </section>
      </div>
    </main>
  );
}

function TopBar({
  stats,
  paused,
  decisions,
  tickMs,
  onTickMs,
}: {
  stats: Stats;
  paused: boolean;
  decisions: Decision[];
  tickMs: number;
  onTickMs: (ms: number) => void;
}) {
  const [panel, setPanel] = useState<PanelId>(null);
  const toggle = (id: PanelId) => setPanel((p) => (p === id ? null : id));
  return (
    <header className="flex items-center justify-between gap-4 border-b border-line/60 px-4 py-3 sm:px-5">
      <div className="flex items-center gap-5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/logo-wordmark.png" alt="edgebot" className="h-10 w-auto" />
        <div
          className={
            "hidden items-center gap-2.5 rounded-md border px-4 py-2 sm:flex " +
            (paused ? "border-line" : "border-accent/40")
          }
        >
          <span
            className={
              "h-2 w-2 rounded-full " + (paused ? "bg-muted" : "pulse-dot bg-accent")
            }
          />
          <span
            className={
              "text-xs font-semibold tracking-[0.18em] " +
              (paused ? "text-muted" : "text-accent")
            }
          >
            {paused ? "AGENT-PAUSED" : "AUTONOMOUS-RUNNING"}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-5 sm:gap-6">
        <Metric label="BANKROLL (USDC)" value={usd(stats.bankroll)} valueClass="text-fg" />
        <div className="h-9 w-px bg-line" />
        <Metric label="PNL (24H)" value={signedUsd(stats.pnl24h)} valueClass="text-accent" />
        <div className="relative hidden items-center gap-4 text-muted lg:flex">
          <button
            aria-label="Notifications"
            onClick={() => toggle("bell")}
            className={"transition-colors hover:text-fg " + (panel === "bell" ? "text-accent" : "")}
          >
            <Bell size={18} />
          </button>
          <button
            aria-label="Settings"
            onClick={() => toggle("settings")}
            className={
              "transition-colors hover:text-fg " + (panel === "settings" ? "text-accent" : "")
            }
          >
            <Settings size={18} />
          </button>
          {panel !== null && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setPanel(null)} />
              <div className="absolute right-0 top-9 z-20 w-80 rounded-xl border border-line bg-panel p-4 shadow-2xl">
                {panel === "bell" ? (
                  <BellPanel decisions={decisions} />
                ) : (
                  <SettingsPanel tickMs={tickMs} onTickMs={onTickMs} />
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

function BellPanel({ decisions }: { decisions: Decision[] }) {
  const signed = decisions.filter((d) => d.signed).slice(0, 4);
  return (
    <div>
      <div className="mb-3 text-[11px] font-semibold tracking-[0.14em] text-muted">
        NOTIFICATIONS
      </div>
      {signed.length === 0 ? (
        <div className="py-2 text-sm text-muted">No signed bets yet.</div>
      ) : (
        <ul className="flex flex-col gap-3">
          {signed.map((d) => (
            <li key={d.id} className="flex items-start gap-2.5 text-sm">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
              <span className="text-fg/90">
                Signed {d.stakePct?.toFixed(2)}% on {d.home} vs {d.away}
                <span className="tabular ml-2 text-xs text-muted">{d.time}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function SettingsPanel({ tickMs, onTickMs }: { tickMs: number; onTickMs: (ms: number) => void }) {
  return (
    <div>
      <div className="mb-3 text-[11px] font-semibold tracking-[0.14em] text-muted">SETTINGS</div>
      <div className="mb-2 text-xs font-medium tracking-wider text-muted">FEED SPEED</div>
      <div className="flex gap-2">
        {SPEEDS.map((s) => (
          <button
            key={s.ms}
            onClick={() => onTickMs(s.ms)}
            className={
              "flex-1 rounded-md border px-2 py-1.5 text-xs font-bold tracking-wider " +
              (tickMs === s.ms
                ? "border-accent/60 text-accent"
                : "border-line text-muted hover:text-fg")
            }
          >
            {s.label}
          </button>
        ))}
      </div>
      <div className="mt-4 border-t border-line/60 pt-3 text-xs text-muted">
        Demo mode: seeded data, no live orders.
      </div>
    </div>
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

function DecisionFeed({
  decisions,
  paused,
  onTogglePause,
}: {
  decisions: Decision[];
  paused: boolean;
  onTogglePause: () => void;
}) {
  const th = "px-3 py-2.5 text-[11px] font-semibold tracking-[0.14em] text-muted";
  return (
    <section className="rounded-xl border border-line bg-panel">
      <div className="flex items-center justify-between gap-3 px-5 pt-4 pb-1">
        <div className="flex items-center gap-2.5">
          <span
            className={
              "h-2.5 w-2.5 rounded-full " + (paused ? "bg-muted" : "pulse-dot bg-accent")
            }
          />
          <h2 className="text-sm font-bold tracking-[0.08em]">LIVE DECISION FEED</h2>
        </div>
        <button
          onClick={onTogglePause}
          className="flex items-center gap-1.5 rounded-md border border-line px-3 py-1.5 text-xs font-bold tracking-[0.08em] text-muted transition-colors hover:border-accent/60 hover:text-accent"
        >
          {paused ? <Play size={13} /> : <Pause size={13} />}
          {paused ? "RESUME" : "PAUSE"}
        </button>
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
  const [range, setRange] = useState<Range>("30D");
  const win = RANGE_WINDOWS[range];
  const slice = series.slice(-win.points);
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
                (r === range ? "border-accent text-accent" : "border-transparent text-muted hover:text-fg")
              }
            >
              {r}
            </button>
          ))}
        </div>
      </div>
      <PnlChart series={slice} labels={win.labels} />
    </div>
  );
}

/** Round gridline steps so every zoom level gets 3-6 clean ticks. */
function niceTicks(lo: number, hi: number): number[] {
  const span = Math.max(hi - lo, 10);
  const step =
    [25, 50, 100, 200, 250, 500, 1000, 2000].find((s) => span / s <= 5) ?? 2000;
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
            stroke={v === 0 ? "#2a3646" : "#141b25"}
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

function Skeleton({ className }: { className: string }) {
  return <div className={"shimmer rounded-md " + className} />;
}

function FeedSkeleton() {
  return (
    <section className="rounded-xl border border-line bg-panel px-5 py-4">
      <Skeleton className="mb-4 h-4 w-44" />
      {Array.from({ length: 7 }, (_, i) => (
        <Skeleton key={i} className="mb-2.5 h-9 w-full" />
      ))}
    </section>
  );
}

function ChartSkeleton() {
  return (
    <div className="rounded-xl border border-line bg-panel p-5 md:col-span-3 lg:col-span-1">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-48" />
      </div>
      <Skeleton className="mt-4 h-56 w-full" />
    </div>
  );
}

function TileSkeleton() {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-line bg-panel p-5">
      <Skeleton className="h-3 w-24" />
      <div className="shimmer mt-1 h-14 w-14 rounded-full" />
      <Skeleton className="h-8 w-28" />
      <Skeleton className="mt-auto h-8 w-full" />
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
