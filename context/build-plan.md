# Build Plan

## Core principle

Build module-by-module as **thin vertical slices** following the module pattern in `architecture.md`: schema → chained Hono route (zod + realtime) → client UI (`useHonoQuery`/`useHonoMutation`) → wire to the shell. Every feature is visible, themed (light + dark), mobile-first, and verified before moving on. Update `progress-tracker.md` + `ui-registry.md` after each.

---

## Phase 0 — Foundation ✅ DONE

- Next 16 + React 19 + Tailwind v4 + TypeScript.
- Postgres + Drizzle; Redis; Bun WS realtime gateway.
- Hono RPC API + typed client + `useHonoQuery`/`useHonoMutation`.
- Token auth (single `ACCESS_TOKEN`), single-user, content not user-linked.

## Phase 1 — Core modules ✅ DONE

- **Auth** — token login/logout, session cookie, route guards.
- **Ideas** — list, create, detail, status workflow, tags, delete. Realtime.
- **Teams** — one workspace team + members (named, with roles), assignable to projects. Realtime.
- **Projects** — full info + dev fields, status workflow, team-member assignment, delete. Realtime.
- **Dashboard** — stat cards + recent projects/ideas.

## Phase 2 — Design system ✅ DONE (foundation)

- Semantic token system (light + dark) in `globals.css`; indigo primary.
- next-themes + `ThemeToggle`; lucide icons.
- Mobile-first `AppShell` (sidebar ↔ drawer) matching `context/designs/dashboard.png`.
- Tokenized cards/buttons/borders/muted text across existing components.

**Remaining design polish (incremental):** match `dashboard.png` more closely per page — stat cards with colored icon tiles + "View all" links, the Recent Projects/Ideas tables with avatar stacks and a row `⋮` menu, project/idea avatars. Add design references for ideas/projects/teams/detail pages to `context/designs/` and apply.

## Phase 3 — Documentation module ⬜ NEXT

Per-project markdown documentation.

- **Schema:** `document` (id, projectId FK, section, title, content, updatedAt) — sections from the PRD (Overview, Requirements, Architecture, Database Design, API, Env Vars, Deployment, Dev Notes, Meeting Notes, Roadmap, Changelog, Resources).
- **Route:** `routes/documents.ts` — list by project, create, update, delete; realtime `get:documents`.
- **UI:** docs tab on the project detail page; markdown editor + rendered preview (pick a lightweight MD lib — add to `library-docs.md` first). Section nav.

## Phase 4 — Search ⬜

Global search across projects, ideas, members, tags, status, categories.

- **Route:** `GET /search?q=` — query across tables (ILIKE for the single-user dataset; note the ceiling).
- **UI:** a search entry in the shell (⌘K-style or a search page) with grouped results linking to detail pages.

## Phase 5 — Activity Feed ⬜

Global activity log ("Created Project X", "Idea converted", "Member joined").

- **Schema:** `activity` (id, kind, entity, summary, createdAt) — written by the mutation routes (small helper, like `publishInvalidation`).
- **Route:** `GET /activity` (recent). **UI:** feed on the dashboard + a full page. Realtime `get:activity`.

## Later (post-MVP, from the PRD)

Project timeline, comments, file uploads (Cloudflare R2), AI workspace, kanban, calendar, notifications, GitHub integration, public showcase. Not scheduled.

---

## Definition of done (every feature)

Visible in the UI · light + dark · mobile-first · realtime where it has shared state · `tsc` + `lint` clean · `progress-tracker.md` + `ui-registry.md` updated.
