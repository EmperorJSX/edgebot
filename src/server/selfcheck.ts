import assert from "node:assert";
import { openExposure, totalPnl, type Decision, type Position } from "@/engine";
import { decisionsSince, getStore } from "./store";

// Runnable check for the decision-log cursor + P&L / exposure math:
//   bun run src/server/selfcheck.ts

const store = getStore();

const mk = (id: number): Decision => ({ id, ts: id, action: "INFO", reason: `d${id}` });

// cursor: only entries after `after`, oldest first, capped by limit
store.state.decisions = [1, 2, 3, 4, 5].map(mk);
assert.deepEqual(decisionsSince(3, 10).map((d) => d.id), [4, 5]);
assert.deepEqual(decisionsSince(0, 2).map((d) => d.id), [1, 2]);
assert.deepEqual(decisionsSince(99, 10), []);

// trimmed log: the engine caps decisions at 500 but ids keep counting, so the
// cursor stays valid after old entries fall off
store.state.decisions = Array.from({ length: 500 }, (_, i) => mk(i + 106)); // ids 106..605
assert.deepEqual(decisionsSince(604, 10).map((d) => d.id), [605]);
assert.deepEqual(decisionsSince(0, 1).map((d) => d.id), [106]);

// exposure + running P&L: open positions only count toward exposure and
// mark-to-market; settled ones are already in realizedPnl
const pos = (stake: number, pnl: number, status: Position["status"]): Position => ({
  id: `p-${stake}`,
  fixtureId: 1,
  selection: "Home",
  stake,
  decimal: 2,
  fairProbAtEntry: 0.5,
  openedTs: 0,
  status,
  pnl,
});
store.state.realizedPnl = 3;
store.state.positions = [pos(10, 1.5, "open"), pos(100, 80, "won")];
assert.equal(openExposure(store.state), 10);
assert.equal(totalPnl(store.state), 4.5);

console.log("server/store selfcheck ok");
