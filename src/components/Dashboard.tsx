"use client";

// Orchestrates the dashboard: polls the runner API (/api/status, /api/signals,
// /api/positions, /api/decisions) and renders live data; if the runner is
// unreachable it falls back to the seeded deterministic demo feed so the
// dashboard always renders and looks alive. One set of view models feeds every
// panel regardless of source.

import { useEffect, useRef, useState } from "react";
import { Bell, Briefcase, Settings, Target, TrendingUp } from "lucide-react";
import {
  buildPnlSeries,
  buildSparkline,
  createDemoFeed,
  INITIAL_DECISIONS,
  INITIAL_STATS,
  type Decision as MockDecision,
  type Stats,
} from "@/lib/mock";
import {
  fmtPct,
  fmtSignedUsd,
  fmtUsd,
  normDecisions,
  normPositions,
  normSignals,
  normStatus,
  usePoll,
  type AlertView,
  type DecisionView,
  type Source,
} from "@/components/live";
import { demoAlerts, demoDecision, demoPositions, demoSignals } from "@/components/demo";
import DecisionFeed, { type FeedFilter } from "@/components/DecisionFeed";
import { AlertsStrip, PositionsPanel, SignalsPanel } from "@/components/Panels";
import { PnlPanel, Spark, SparkBars, StatTile } from "@/components/Chart";
import Select, { type SelectOption } from "@/components/Select";
import ThemeToggle from "@/components/ThemeToggle";
import {
  AlertsSkeleton,
  ChartSkeleton,
  FeedSkeleton,
  PanelSkeleton,
  TileSkeleton,
} from "@/components/Skeletons";

const SKELETON_MS = 650; // first-load shimmer, within the 400-900 ms budget
const MAX_ROWS = 9;

const SPARK_ROI = buildSparkline(21, 40, 0.9);
const SPARK_HIT = buildSparkline(35, 40, 0.25);
const SPARK_POS = buildSparkline(49, 18, 0.5);

type RefreshValue = "2000" | "4000" | "8000";
const REFRESH_OPTIONS: SelectOption<RefreshValue>[] = [
  { value: "2000", label: "Fast (2s)" },
  { value: "4000", label: "Normal (4s)" },
  { value: "8000", label: "Slow (8s)" },
];

type PanelId = "bell" | "settings" | null;

export default function Dashboard() {
  const [booted, setBooted] = useState(false);
  const [paused, setPaused] = useState(false);
  const [tickMs, setTickMs] = useState(4000);
  const [filter, setFilter] = useState<FeedFilter>("all");

  // Live P&L series: use the runner's history when exposed, else accumulate
  // the polled running P&L client-side (in the fetch callback, not an effect).
  const [liveSeries, setLiveSeries] = useState<number[]>([]);
  const onStatus = (s: ReturnType<typeof normStatus>) => {
    if (s.series && s.series.length >= 2) {
      setLiveSeries(s.series);
      return;
    }
    const v = s.pnl ?? s.pnl24h;
    if (v === null) return;
    setLiveSeries((buf) =>
      buf.length > 0 && buf[buf.length - 1] === v ? buf : [...buf, v].slice(-240)
    );
  };

  // Runner API polling. Pause freezes both polling and the demo feed.
  const status = usePoll("/api/status", normStatus, tickMs, !paused, onStatus);
  // limit=500 covers the runner's full retained log (its cap is 500).
  const decisionsPoll = usePoll("/api/decisions?limit=500", normDecisions, tickMs, !paused);
  const signalsPoll = usePoll("/api/signals", normSignals, tickMs, !paused);
  const positionsPoll = usePoll("/api/positions", normPositions, tickMs * 2, !paused);

  const apiUp = status.data !== null;
  const source: Source = status.data?.mode ?? "demo";

  // Demo fallback state, driven only while the runner API is unreachable.
  const [demoDecisions, setDemoDecisions] = useState<MockDecision[]>(INITIAL_DECISIONS);
  const [demoStats, setDemoStats] = useState<Stats>(INITIAL_STATS);
  const [demoSeries, setDemoSeries] = useState<number[]>(buildPnlSeries);
  const bankrollRef = useRef(INITIAL_STATS.bankroll);
  useEffect(() => {
    bankrollRef.current = demoStats.bankroll;
  }, [demoStats.bankroll]);
  // One generator for the whole session so pause/resume never replays ids.
  const feedRef = useRef<ReturnType<typeof createDemoFeed> | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setBooted(true), SKELETON_MS);
    return () => clearTimeout(t);
  }, []);

  // Demo auto-play: a new agent decision every few seconds, no human input.
  useEffect(() => {
    if (!booted || paused || apiUp) return;
    if (feedRef.current === null) feedRef.current = createDemoFeed();
    const t = setInterval(() => {
      const { decision, pnlDelta, hitDelta, posDelta } = feedRef.current!(bankrollRef.current);
      setDemoDecisions((d) => [decision, ...d].slice(0, MAX_ROWS));
      setDemoSeries((sv) => [...sv.slice(1), sv[sv.length - 1] + pnlDelta * 4]);
      setDemoStats((s) => ({
        bankroll: s.bankroll + pnlDelta,
        pnl24h: s.pnl24h + pnlDelta,
        roi: s.roi + pnlDelta / 128,
        hitRate: Math.min(64, Math.max(53, s.hitRate + hitDelta)),
        openPositions: Math.min(9, Math.max(3, s.openPositions + posDelta)),
      }));
    }, tickMs);
    return () => clearInterval(t);
  }, [booted, paused, apiUp, tickMs]);

  // View models: one render path for live and demo.
  const allRows: DecisionView[] = apiUp
    ? (decisionsPoll.data ?? [])
    : demoDecisions.map(demoDecision);
  // Newest first: by seq cursor when the runner sends one, else flip an
  // oldest-first log by timestamp.
  const ordered = allRows.every((r) => r.seq !== null)
    ? [...allRows].sort((a, b) => b.seq! - a.seq!)
    : allRows.length > 1 && allRows[0].time <= allRows[allRows.length - 1].time
      ? [...allRows].reverse()
      : allRows;
  const rows = (
    filter === "all" ? ordered : ordered.filter((r) => (filter === "signed" ? r.signed : !r.signed))
  ).slice(0, MAX_ROWS);

  const sigRows = apiUp ? (signalsPoll.data ?? []).slice(0, 8) : demoSignals(demoDecisions);
  const posRows = apiUp ? (positionsPoll.data ?? []).slice(0, 8) : demoPositions(demoDecisions);
  const alerts: AlertView[] = apiUp
    ? [
        ...sigRows
          .filter((s) => s.sharp)
          .map((s) => ({
            id: `al-${s.id}`,
            time: s.time,
            match: s.match,
            text:
              s.prevPrice !== null && s.price !== null
                ? `${s.match}: price ${s.prevPrice.toFixed(2)} to ${s.price.toFixed(2)}`
                : s.deltaProbPct !== null
                  ? `${s.match}: implied prob shifted ${fmtPct(s.deltaProbPct, true)}`
                  : `Sharp move on ${s.match}`,
          })),
        ...ordered
          .filter((d) => d.sharp)
          .map((d) => ({
            id: `al-${d.id}`,
            time: d.time,
            match: d.match,
            text: d.reason ?? `Sharp move on ${d.match}`,
          })),
      ].slice(0, 6)
    : demoAlerts(demoDecisions);

  // Rows present at the first non-empty render never animate; anything that
  // streams in later flashes via .row-in. Seeded in an effect so the ref is
  // never touched during render.
  const initialIds = useRef<Set<string> | null>(null);
  useEffect(() => {
    if (initialIds.current === null && ordered.length > 0) {
      initialIds.current = new Set(ordered.map((r) => r.id));
    }
  });
  const isFresh = (id: string) => initialIds.current !== null && !initialIds.current.has(id);

  const sv = status.data;
  const bankroll = apiUp ? sv!.bankroll : demoStats.bankroll;
  const pnl24h = apiUp ? sv!.pnl24h : demoStats.pnl24h;
  const roi = apiUp ? sv!.roi : demoStats.roi;
  const hitRate = apiUp ? sv!.hitRate : demoStats.hitRate;
  const openPositions = apiUp ? (sv!.openPositions ?? posRows.length) : demoStats.openPositions;
  const series = apiUp ? (liveSeries.length >= 2 ? liveSeries : null) : demoSeries;

  // Skeleton gates: minimum boot shimmer, then per-endpoint readiness.
  const settled = booted && !status.loading;
  const feedReady = settled && (!apiUp || !decisionsPoll.loading);
  const signalsReady = settled && (!apiUp || !signalsPoll.loading);
  const positionsReady = settled && (!apiUp || !positionsPoll.loading);

  return (
    <main className="mx-auto flex min-h-screen max-w-[1720px] flex-col gap-4 pb-5">
      <TopBar
        bankroll={bankroll}
        pnl24h={pnl24h}
        pnlLabel={apiUp ? "PNL (RUNNING)" : "PNL (24H)"}
        source={source}
        connecting={!settled}
        paused={paused}
        rows={ordered}
        tickMs={tickMs}
        onTickMs={setTickMs}
      />
      <div className="flex flex-col gap-4 px-4 sm:px-5">
        {settled ? <AlertsStrip alerts={alerts} /> : <AlertsSkeleton />}
        {feedReady ? (
          <DecisionFeed
            rows={rows}
            paused={paused}
            onTogglePause={() => setPaused((p) => !p)}
            filter={filter}
            onFilter={setFilter}
            isFresh={isFresh}
          />
        ) : (
          <FeedSkeleton />
        )}
        <section className="grid gap-4 lg:grid-cols-2">
          {signalsReady ? <SignalsPanel signals={sigRows} /> : <PanelSkeleton />}
          {positionsReady ? <PositionsPanel positions={posRows} /> : <PanelSkeleton />}
        </section>
        <section className="grid gap-4 md:grid-cols-3 lg:grid-cols-[7fr_2fr_2fr_2fr]">
          {settled ? (
            <>
              <PnlPanel series={series} showDates={!apiUp} />
              <StatTile
                label="ROI (30D)"
                value={fmtPct(roi, true)}
                icon={<TrendingUp size={22} />}
                spark={<Spark data={SPARK_ROI} />}
              />
              <StatTile
                label="HIT RATE (30D)"
                value={fmtPct(hitRate)}
                icon={<Target size={22} />}
                spark={<Spark data={SPARK_HIT} />}
              />
              <StatTile
                label="OPEN POSITIONS"
                value={openPositions === null ? "-" : String(openPositions)}
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
  bankroll,
  pnl24h,
  pnlLabel,
  source,
  connecting,
  paused,
  rows,
  tickMs,
  onTickMs,
}: {
  bankroll: number | null;
  pnl24h: number | null;
  pnlLabel: string;
  source: Source;
  connecting: boolean;
  paused: boolean;
  rows: DecisionView[];
  tickMs: number;
  onTickMs: (ms: number) => void;
}) {
  const [panel, setPanel] = useState<PanelId>(null);
  const toggle = (id: PanelId) => setPanel((p) => (p === id ? null : id));
  const badge = paused
    ? "AGENT-PAUSED"
    : connecting
      ? "CONNECTING"
      : source === "demo"
        ? "DEMO-FEED"
        : source === "replay"
          ? "AUTONOMOUS-REPLAY"
          : "AUTONOMOUS-RUNNING";
  const idle = paused || connecting;
  return (
    <header className="flex items-center justify-between gap-4 border-b border-line/60 px-4 py-3 sm:px-5">
      <div className="flex items-center gap-5">
        <span className="flex items-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/logo-icon.png" alt="edgebot" className="h-10 w-10 rounded-xl" />
          <span className="text-2xl font-extrabold tracking-tight">
            <span className="text-accent">edge</span>
            <span className="text-lime">bot</span>
          </span>
        </span>
        <div
          className={
            "hidden items-center gap-2.5 rounded-md border px-4 py-2 sm:flex " +
            (idle ? "border-line" : "border-accent/40")
          }
        >
          <span className={"h-2 w-2 rounded-full " + (idle ? "bg-muted" : "pulse-dot bg-accent")} />
          <span
            className={
              "text-xs font-semibold tracking-[0.18em] " + (idle ? "text-muted" : "text-accent")
            }
          >
            {badge}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-4 sm:gap-6">
        <Metric label="BANKROLL (USDC)" value={fmtUsd(bankroll)} valueClass="text-fg" />
        <div className="h-9 w-px bg-line" />
        <Metric label={pnlLabel} value={fmtSignedUsd(pnl24h)} valueClass="text-accent" />
        <ThemeToggle />
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
                  <BellPanel rows={rows} />
                ) : (
                  <SettingsPanel tickMs={tickMs} onTickMs={onTickMs} source={source} />
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

function BellPanel({ rows }: { rows: DecisionView[] }) {
  const signed = rows.filter((d) => d.signed).slice(0, 4);
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
                Signed {d.stakePct === null ? "a bet" : fmtPct(d.stakePct)} on {d.match}
                <span className="tabular ml-2 text-xs text-muted">{d.time}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function SettingsPanel({
  tickMs,
  onTickMs,
  source,
}: {
  tickMs: number;
  onTickMs: (ms: number) => void;
  source: Source;
}) {
  return (
    <div>
      <div className="mb-3 text-[11px] font-semibold tracking-[0.14em] text-muted">SETTINGS</div>
      <div className="mb-2 text-xs font-medium tracking-wider text-muted">REFRESH RATE</div>
      <Select
        value={String(tickMs) as RefreshValue}
        options={REFRESH_OPTIONS}
        onChange={(v) => onTickMs(Number(v))}
        ariaLabel="Refresh rate"
      />
      <div className="mt-4 border-t border-line/60 pt-3 text-xs text-muted">
        {source === "demo"
          ? "Demo feed: seeded deterministic data, no live orders. Start the runner to go live."
          : source === "replay"
            ? "Replay mode: recorded TxLINE odds driving the real strategy."
            : "Connected to the autonomous runner."}
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  valueClass,
}: {
  label: string;
  value: string;
  valueClass: string;
}) {
  return (
    <div className="text-right">
      <div className="text-[11px] font-medium tracking-[0.14em] text-muted">{label}</div>
      <div className={"tabular text-xl font-bold " + valueClass}>{value}</div>
    </div>
  );
}
