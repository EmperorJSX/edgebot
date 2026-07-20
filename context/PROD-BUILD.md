# edgebot production build: 3 parallel agents (Trading track)

Goal: a REAL autonomous value-betting agent that ingests TxLINE odds and executes a defined strategy, judge-testable AFTER matches end (replay / simulated mode). This is the Trading track; it is scored on: core functionality + data ingestion, autonomous operation (runs with no human input once deployed), clean deterministic + documented logic, innovation, production readiness. TxLINE MUST be a live input (with replay fallback). No em dashes. Must boot zero-config on the replay path.

## File ownership (never edit outside your list; you cross-IMPORT, never co-edit)
- edgebot-engine: src/strategy/**, src/txline/**, src/lib/**, src/types/**, src/engine/** (create). Owns package.json + `bun install`.
- edgebot-runner: src/server/** (create), src/worker/** (create), src/config/**, src/app/api/**, src/instrumentation.ts
- edgebot-ui: src/app/** (except src/app/api), src/components/**, src/app/globals.css, src/app/layout.tsx, src/app/icon.png

## Contract (build to these exports; import, do not co-edit)
- engine (src/engine/index.ts):
  - TxLINE client (real devnet, replay fallback): getFixtures(), getOdds(fixtureId), subscribeOdds(cb). Flow + endpoints in context/HACKATHON-REQUIREMENTS.md. Wrap every real call so ANY failure falls back to bundled replay odds. Ship a recorded replay dataset so it works after matches end.
  - strategy (pure, deterministic, documented math): devig(oddsSet), fairProb(oddsSet), edge(fair, offered), kelly(prob, decimalOdds, bankroll, fraction), detectSharpMove(prev, next) (flag significant odds shifts), runStrategyTick(state) -> { signals, positions, decisions }.
  - types: Fixture, OddsSet, Signal, Position, Decision (a timestamped decision-log entry).
- runner:
  - Next API routes (src/app/api): GET /api/status, /api/signals, /api/positions, /api/decisions (the autonomous decision log), /api/replay (drive one tick of the replay). All read the engine.
  - Autonomous loop: src/instrumentation.ts (or a src/worker singleton) starts a server-side ticker that calls engine.runStrategyTick every 60s (live) or fast (replay, env DEMO=1), appending to an in-memory decision log. This is the "runs without human input" proof.
- ui: dashboard reads /api/* client-side and shows live signals, open positions, running P&L, the autonomous decision log (streaming), and sharp-move alerts. Loading skeletons. Dark mode. Custom <Select> (NO native select). Favicon (src/app/icon.png from /home/ubuntu/projects/_brand/logo/edgebot/icon.png).

## Rules
- Real TxLINE where reachable, replay fallback so judges can test after matches end. The loop is autonomous (no manual input). Strategy math deterministic + commented. No native <select>. Leave ONE runnable check on the strategy math (a tiny assert-based self-check). tsc clean on your files (`bunx tsc --noEmit`, ignore cross-module until integration). Do NOT git commit. Report via  bash /home/ubuntu/projects/_fleet/fleet.sh note <your-slug> progress "..."  and keep todo.md ticked. Build until your layer is production-ready.
