# Progress Tracker

Update after every completed feature.

---

## Current Status

**Phase:** Demo dashboard fully functional + deploy-ready.
**Last completed:** Dashboard polish and deploy files. All controls work: time-range tabs (1H/6H/24H/7D/30D/ALL) slice a 240-point master PnL series with a dynamic y-axis and per-range x labels; a Pause/Resume button in the feed header stops the auto-play ticker (top-bar pill flips to AGENT-PAUSED); the bell opens a notifications panel (recent signed bets) and the gear opens a settings panel (feed speed FAST/NORMAL/SLOW, actually changes the tick interval); both close on outside click. First load shows a 650 ms shimmer skeleton for the feed, chart, and stat tiles. `src/lib/mock.ts` is internally consistent: TxLINE consensus decimal odds -> implied prob -> de-vig by overround -> model prob (fair + delta) -> edge (model minus market) -> tenth-Kelly stake, one `decide()` helper used by both the seed rows and the live feed; comments map each field to the real TxLINE stream. Deploy files: `Dockerfile` (oven/bun:1, non-root, no secrets), `.dockerignore`, `docker-compose.yml` (single pulled `app` service), `.github/workflows/deploy.yml` (registry login, build+push, Dokploy webhook), `next.config.ts` sets `typescript.ignoreBuildErrors` (Next 16 dropped build-time ESLint). Verified: `bunx tsc --noEmit` clean, `bunx next build` passes, built app serves.
**Next:** Nothing scheduled. The backend WIP under `src/{config,strategy,txline}` is unused by the app (kept for the real agent later).

---

## Progress

- [x] Dashboard page (`src/app/page.tsx` -> `src/components/Dashboard.tsx`)
- [x] Seeded mock data + deterministic demo feed (`src/lib/mock.ts`)
- [x] Design tokens in `globals.css` (charcoal `#0a0c10`, cyan `#22d3ee`, lime `#a3e635`, flat)
- [x] Inline SVG flags (`src/components/Flag.tsx`) - emoji flags do not render on Windows
- [x] Working controls: range tabs re-scale chart, Pause/Resume, bell + settings panels
- [x] Loading skeletons (shimmer, 650 ms) for feed, chart, stat tiles
- [x] Consistent mock pipeline (de-vig -> model prob -> edge -> Kelly) in `src/lib/mock.ts`
- [x] Deploy files: Dockerfile, .dockerignore, docker-compose.yml, deploy workflow
- [ ] Real TxLINE / Solana wiring (post-hackathon; see `src/strategy`, `src/txline`)
