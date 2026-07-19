# Hackathon requirements (LOCKED, build to this)

This file is the binding spec for the build. Coding agents: follow it exactly. Do not display prize amounts anywhere public.

## Event
TxLINE and Solana World Cup Hackathon (Superteam Earn). Deadline 2026-07-19 23:59 UTC. Solana devnet is fine. TxLINE must be the PRIMARY data source. The deployed URL lives on an edgebot.emperorjs.com subdomain.

## Track: Trading Tools and Agents
Build an agent or automated tool that ingests TxLINE feeds and executes a defined strategy autonomously. Clear logic and a working system beat a polished demo with neither.

## Judging criteria (optimize for these)
1. Core Functionality and Data Ingestion: runs and executes decisions using live OR simulated TxLINE feeds.
2. Autonomous Operation: fully automated, executes its logic with no manual human input once deployed.
3. Logic and Code Architecture: clean, deterministic, well documented, mathematically or strategically defensible.
4. Innovation and Novelty: a genuinely new approach to algorithmic sports tracking or autonomous interaction.
5. Production Readiness: robust enough that a professional trading team could realistically deploy it.

## Submission requirements (all must be satisfiable)
- Demo video up to 5 minutes: the problem, a live walkthrough, and how TxLINE powers the backend. Absolute screening requirement.
- Public repo: github.com/EmperorJSX/edgebot.
- A working deployed link OR a functional devnet endpoint the judges can test themselves.
- Brief technical documentation: core idea, technical highlights, and the exact list of TxLINE endpoints used.
- A short note on the TxLINE API experience.

## Do not get disqualified
- Ship a running agent or tool, live or on devnet, that ingests TxLINE and executes a defined strategy. Not a concept.
- Integrate TxLINE data as a live input.
- Submit before the deadline.

## CRITICAL: judge-testability (this is where most teams fail)
Matches END at the deadline, so judges test AFTER the live feed is gone. This project MUST ship a judge-testable DEMO MODE that replays recorded odds so the agent visibly ingests data, computes edge, sizes with Kelly, and signs devnet bets, all on demand, with the dashboard updating live. The rules explicitly allow "live or simulated" feeds.
- `bun run demo` runs the agent against recorded odds in fixtures/.
- The agent must be demoable WITHOUT proofsettle by using its built-in mock venue, so a judge can run it standalone.
- The deployed dashboard must default to, or clearly offer, demo mode, so a judge opening it days later sees the agent trading, never a dead screen.
- The README must include a "Test it in 60 seconds" section written for judges.

## Easy to test and showcase (hard requirement)
- One command locally (`bun run demo`), one click live.
- Deterministic replay so the demo video is crisp and repeatable.
- The dashboard is never empty: it shows the decision feed, PnL curve, and open positions from the replayed run.
- Autonomy is visible: the agent runs on its own with a clear running indicator and a live decision log, no manual clicks needed.
