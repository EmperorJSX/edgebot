// Judge-testable demo: `bun run demo`. Zero config: forces replay mode and
// runs the agent against the bundled REAL recorded World Cup odds, printing
// every decision as it happens, then a summary. Deterministic: two runs
// produce the same decisions (only wall-clock timestamps differ).
process.env.MODE ??= "replay";

export {}; // module scope for top-level await

const { createEngineState, runStrategyTick, totalPnl, openExposure } = await import("./index");

const state = createEngineState();
const started = Date.now();
console.log("edgebot demo: replaying recorded TxLINE World Cup odds\n");

// One full pass over the recording (the INFO restart marks the end).
while (state.replayLoops === 0) {
  const { decisions } = await runStrategyTick(state);
  for (const d of decisions) {
    const when = new Date(d.ts).toISOString().slice(11, 19);
    const tag = d.action.padEnd(6);
    const label = d.match ? `${d.match}${d.selection ? ` [${d.selection}]` : ""}: ` : "";
    console.log(`${when} ${tag} ${label}${d.reason}`);
  }
  if (state.tickCount > 5000) break; // safety valve, never hit with a sane dataset
}

const stillOpen = state.positions.filter((p) => p.status === "open");
const settled = state.positions.filter((p) => p.status !== "open");
const wins = settled.filter((p) => p.status === "won").length;
console.log("\n--- summary ---");
console.log(`ticks:        ${state.tickCount}`);
console.log(`decisions:    ${state.nextDecisionId - 1}`);
console.log(`bets settled: ${settled.length} (${wins} won)`);
console.log(`bets open:    ${stillOpen.length} (exposure ${openExposure(state).toFixed(2)})`);
console.log(`bankroll:     ${state.bankroll.toFixed(2)} (started ${state.startBankroll.toFixed(2)})`);
console.log(`total P&L:    ${totalPnl(state).toFixed(2)} in ${((Date.now() - started) / 1000).toFixed(1)}s`);
process.exit(0);
