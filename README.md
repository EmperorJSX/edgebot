# edgebot

Autonomous value-betting agent for World Cup markets.

- **Track:** Trading Tools & Agents
- **Prize:** $16K (10k / 4k / 2k)
- **Chain:** Solana (devnet) · **Data:** TxLINE (primary input)

## What it is

A fully autonomous agent that reads TxLINE consensus odds, computes implied probability, compares it to on-chain market odds, and when the edge clears a threshold it **auto-signs and sends** the Solana bet. Kelly-fraction sizing, per-match exposure caps, and a self-logged decision trail.

## Why it wins

Runs with zero human input once deployed. Deterministic, documented edge formula + Kelly math — defensible enough for a real trading desk. Trades proofsettle's markets, closing the loop.

## TxLINE endpoints

- SSE stream / odds feed — _TBD_

## Status

🚧 WIP. A judge-testable **demo mode** replays recorded odds so the agent trades live on-camera after real matches end.

Live: _TBD_ · Demo video: _TBD_ · Repo: https://github.com/EmperorJSX/edgebot
