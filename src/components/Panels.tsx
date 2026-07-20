"use client";

// Live value-bet signals, open positions, and sharp-move alerts. Each panel
// renders a real empty state before the agent produces data.

import { Zap } from "lucide-react";
import MatchCell from "@/components/MatchCell";
import {
  fmtPct,
  fmtSignedUsd,
  fmtUsd,
  type AlertView,
  type PositionView,
  type SignalView,
} from "@/components/live";

const TH = "px-3 py-2.5 text-[11px] font-semibold tracking-[0.14em] text-muted";

function PanelShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-line bg-panel">
      <h2 className="px-5 pt-4 pb-1 text-sm font-bold tracking-[0.08em]">{title}</h2>
      {children}
    </section>
  );
}

function EmptyRow({ text }: { text: string }) {
  return <div className="px-5 pb-5 pt-2 text-sm text-muted">{text}</div>;
}

function SelectionChip({ name }: { name: string }) {
  return (
    <span className="rounded border border-line px-1.5 py-0.5 text-[10px] font-semibold tracking-wider text-muted">
      {name.toUpperCase()}
    </span>
  );
}

export function SignalsPanel({ signals }: { signals: SignalView[] }) {
  return (
    <PanelShell title="LIVE VALUE SIGNALS">
      {signals.length === 0 ? (
        <EmptyRow text="No value signals right now. A signal appears when the model probability beats the de-vigged consensus price." />
      ) : (
        <div className="overflow-x-auto px-3 pb-2">
          <table className="w-full min-w-[560px] border-collapse text-sm">
            <thead>
              <tr>
                <th className={TH + " text-left"}>TIME</th>
                <th className={TH + " text-left"}>SIGNAL</th>
                <th className={TH + " text-center"}>PRICE</th>
                <th className={TH + " text-center"}>EDGE</th>
                <th className={TH + " pr-4 text-right"}>KELLY STAKE</th>
              </tr>
            </thead>
            <tbody>
              {signals.map((s) => (
                <tr key={s.id} className="border-t border-line/60">
                  <td className="tabular px-3 py-2.5 text-fg/80">{s.time}</td>
                  <td className="px-3 py-2">
                    <span className="flex items-center gap-2">
                      <MatchCell match={s.match} />
                      <SelectionChip name={s.selection} />
                      {s.sharp && <Zap size={13} className="text-lime" />}
                    </span>
                  </td>
                  <td className="tabular px-3 py-2.5 text-center text-fg/90">
                    {s.price === null ? "-" : s.price.toFixed(2)}
                  </td>
                  <td
                    className={
                      "tabular px-3 py-2.5 text-center font-semibold " +
                      ((s.edgePct ?? 0) >= 0 ? "text-accent" : "text-loss")
                    }
                  >
                    {fmtPct(s.edgePct, true)}
                  </td>
                  <td className="tabular px-3 py-2.5 pr-4 text-right text-fg/90">
                    {s.stakePct === null
                      ? s.stakeUsd === null
                        ? "-"
                        : fmtUsd(s.stakeUsd)
                      : fmtPct(s.stakePct) + (s.stakeUsd === null ? "" : ` (${fmtUsd(s.stakeUsd)})`)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </PanelShell>
  );
}

export function PositionsPanel({ positions }: { positions: PositionView[] }) {
  return (
    <PanelShell title="OPEN POSITIONS">
      {positions.length === 0 ? (
        <EmptyRow text="No open positions. Signed bets show up here with their live P&L." />
      ) : (
        <div className="overflow-x-auto px-3 pb-2">
          <table className="w-full min-w-[560px] border-collapse text-sm">
            <thead>
              <tr>
                <th className={TH + " text-left"}>POSITION</th>
                <th className={TH + " text-center"}>STAKE</th>
                <th className={TH + " text-center"}>ENTRY</th>
                <th className={TH + " text-center"}>P&L</th>
                <th className={TH + " pr-4 text-right"}>STATUS</th>
              </tr>
            </thead>
            <tbody>
              {positions.map((p) => (
                <tr key={p.id} className="border-t border-line/60">
                  <td className="px-3 py-2">
                    <span className="flex items-center gap-2">
                      <MatchCell match={p.match} />
                      <SelectionChip name={p.selection} />
                    </span>
                  </td>
                  <td className="tabular px-3 py-2.5 text-center text-fg/90">{fmtUsd(p.stake)}</td>
                  <td className="tabular px-3 py-2.5 text-center text-fg/90">
                    {p.price === null ? "-" : p.price.toFixed(2)}
                  </td>
                  <td
                    className={
                      "tabular px-3 py-2.5 text-center font-semibold " +
                      ((p.pnl ?? 0) >= 0 ? "text-accent" : "text-loss")
                    }
                  >
                    {fmtSignedUsd(p.pnl)}
                  </td>
                  <td className="px-3 py-2.5 pr-4 text-right">
                    <span className="inline-block rounded-md border border-line px-2.5 py-1 text-xs font-bold tracking-[0.08em] text-muted">
                      {p.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </PanelShell>
  );
}

export function AlertsStrip({ alerts }: { alerts: AlertView[] }) {
  return (
    <section className="flex items-center gap-4 rounded-xl border border-line bg-panel px-5 py-3">
      <div className="flex shrink-0 items-center gap-2">
        <Zap size={15} className={alerts.length > 0 ? "text-lime" : "text-muted"} />
        <h2 className="text-xs font-bold tracking-[0.14em]">SHARP MOVES</h2>
        {alerts.length > 0 && (
          <span className="tabular rounded-full border border-lime/50 px-1.5 text-[11px] font-bold text-lime">
            {alerts.length}
          </span>
        )}
      </div>
      {alerts.length === 0 ? (
        <span className="truncate text-sm text-muted">
          No sharp moves detected. The agent flags significant consensus odds shifts here.
        </span>
      ) : (
        <ul className="flex gap-3 overflow-x-auto">
          {alerts.map((a) => (
            <li
              key={a.id}
              className="flex shrink-0 items-center gap-2.5 rounded-lg border border-lime/30 bg-lime/5 px-3 py-1.5 text-sm"
            >
              <span className="tabular text-xs text-muted">{a.time}</span>
              <span className="whitespace-nowrap text-fg/90">{a.text}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
