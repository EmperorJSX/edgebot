# Progress Tracker

Update after every completed feature.

---

## Current Status

**Phase:** Demo dashboard complete (front-end mock).
**Last completed:** Autonomous-agent dashboard matching `context/designs/dashboard.png`: top bar (wordmark logo, AUTONOMOUS-RUNNING pill, bankroll + 24h PnL), LIVE DECISION FEED table (time, match with SVG flags, model prob, market price, edge, Kelly stake, SIGNED/SKIPPED), inline-SVG PnL chart with range tabs, and 3 stat tiles (ROI, hit rate, open positions). Auto-play demo loop: a seeded client-side ticker (`src/lib/mock.ts` `createDemoFeed`) appends a decision row every 4s, nudges the PnL curve and stats. Zero-config boot: no env, no db, no api route; `bun run dev` renders as-is. `bunx tsc --noEmit` clean.
**Next:** Nothing scheduled. The backend WIP under `src/{config,strategy,txline}` is unused by the app (kept for the real agent later).

---

## Progress

- [x] Dashboard page (`src/app/page.tsx` -> `src/components/Dashboard.tsx`)
- [x] Seeded mock data + deterministic demo feed (`src/lib/mock.ts`)
- [x] Design tokens in `globals.css` (charcoal `#0a0c10`, cyan `#22d3ee`, lime `#a3e635`, flat)
- [x] Inline SVG flags (`src/components/Flag.tsx`) - emoji flags do not render on Windows
- [ ] Real TxLINE / Solana wiring (post-hackathon; see `src/strategy`, `src/txline`)
