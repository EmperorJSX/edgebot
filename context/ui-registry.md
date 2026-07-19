# UI Registry

Components that already exist - **reuse before creating**. All live in `src/components/`.

| Component   | Purpose                                                                                          |
| ----------- | ------------------------------------------------------------------------------------------------ |
| `Dashboard` | The whole demo dashboard (client component): top bar, decision feed table, PnL chart, stat tiles. Internal pieces: `TopBar`, `Metric`, `DecisionFeed`, `PnlPanel`, `PnlChart`, `StatTile`, `Spark`, `SparkBars`. Auto-play tick every 4s from `createDemoFeed()`. |
| `Flag`      | 28px round inline-SVG country flag. Props: `code: TeamCode` (18 teams, see `src/lib/mock.ts`).    |

Data/helpers in `src/lib/mock.ts`: `mulberry32` seeded RNG, `INITIAL_DECISIONS` / `INITIAL_STATS` (match the design 1:1), `buildPnlSeries`, `buildSparkline`, `createDemoFeed`.

Tokens (Tailwind v4 `@theme`, `globals.css`): `ink` page bg, `panel`, `line` borders, `fg`, `muted`, `accent` cyan, `lime`, `loss` red. Utility classes: `.tabular`, `.pulse-dot`, `.row-in`.
