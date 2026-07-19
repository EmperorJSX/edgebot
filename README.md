# edgebot

An autonomous value-betting agent for World Cup markets.

Built for the TxLINE and Solana World Cup hackathon (Trading Tools and Agents track). Runs on Solana devnet.

## What it is

edgebot is a fully autonomous agent. It reads TxLINE consensus odds, de-vigs them into a fair probability, compares that to the price available in a market, and when the edge clears a configured threshold it sizes a bet with fractional Kelly and signs and sends it on Solana devnet with its own keypair. It records every decision and grades it after the match (win or loss, ROI, hit rate). Once started, it runs with no human input.

## How it works

1. Ingest the TxLINE odds stream.
2. Convert consensus odds into a fair implied probability (de-vig).
3. Compare to the market price and compute the edge.
4. If the edge exceeds the threshold, size the bet with fractional Kelly under per-match and total exposure caps.
5. Sign and send the bet, then log the decision.
6. After settlement, grade the decision and update ROI and hit rate.

edgebot can trade proofsettle markets, or a built-in mock venue so it is demoable on its own. A judge-testable demo mode replays recorded odds so it trades live on demand.

## TxLINE endpoints used

- Guest auth: POST /auth/guest/start
- On-chain subscribe and token activation (free World Cup tier)
- Odds: snapshots and SSE stream (StablePrice consensus)

## Tech stack

Bun, Hono, Drizzle with Postgres, gill (Solana Kit), and a Next dashboard. Solana devnet.

## Run locally

Prerequisites: Bun, Postgres, and a funded devnet keypair for the agent.

1. Copy the env file and fill it in: `cp .env.example .env`
2. Install dependencies: `bun install`
3. Create the database schema: `bun run db:push`
4. Start the agent: `bun run agent`
5. Start the dashboard: `bun run dev`
6. Run the demo replay: `bun run demo`

Select the venue (proofsettle or mock) in `.env`. The `context/` folder holds the strategy math and architecture.

## Links

Live dashboard: TBD. Demo video: TBD. Repo: https://github.com/EmperorJSX/edgebot
