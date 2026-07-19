# Code Standards

Conventions actually used in this codebase. Match the surrounding code.

## TypeScript

- `strict` is on. No `any` in committed code — prefer precise types or `unknown` + narrowing.
- Derive types from the source of truth: Drizzle (`typeof table.$inferSelect`), zod (`z.infer`), Hono RPC (`InferRequestType`/`InferResponseType`). Don't hand-write shapes the framework can infer.
- Keep `bunx tsc --noEmit` and `bun run lint` clean before considering a feature done.

## Backend (Hono routes)

- One chained router per module; export it; compose in `app.ts`. Chaining is mandatory for RPC inference.
- Guard every handler: `if (!authed(c)) return c.json({ error: "Unauthorized" }, 401);`.
- Validate bodies with `zValidator("json", schema)`; read via `c.req.valid("json")`.
- Normalize empty strings to `null` before writing; generate `slug` from name/title with `slugify`.
- After any create/update/delete: `await publishInvalidation([wsTopic("get","<module>")])`.
- Return `c.json(row, 201)` on create; `404` when an `:id` isn't found; `400` only via zod (don't hand-roll validation).

## Database (Drizzle)

- Schema in `src/backend/db/schema.ts`; export row types. Use `pgEnum` for fixed status sets, `text` for open-ended fields (categories, roles) to avoid migrations.
- Apply changes with `bunx drizzle-kit push` (no migration files yet). FKs that shouldn't block deletes use `onDelete: "set null"`; owned children use `"cascade"`.
- Reads filter/derive in SQL where it matters; small single-user lists may be filtered/counted in JS (note the ceiling if it could grow).

## Frontend (React)

- Pages in `src/app/(app)/<m>/` are thin server wrappers; real UI is a client component.
- Reads: `useHonoQuery`. Writes: `useHonoMutation`. Never `fetch` directly.
- Detail components derive their record from the list query (`data?.find(...)`) so realtime keeps them fresh.
- Local form state with `useState` + `FormData`; cast the body to the endpoint's `InferRequestType<...>["json"]`.
- Always render loading and empty states.

## Styling

- Tokens only (see `ui-tokens.md`). Mobile-first. Light + dark. No raw hex, no raw Tailwind color classes.

## General

- Reuse before adding: check `ui-registry.md` (incl. its "Shared building blocks" table) and `src/lib/*`.
- **DRY — no copy-paste.** If you're about to paste a block you've already written elsewhere, stop and extract it instead: a component (`src/components/`), hook (`src/hooks/`), helper (`src/lib/`), or backend helper (e.g. `deleteById`/`persistTabs`). Parameterize small visual differences with a prop; don't fork. Run `bun dupes-check` before a feature is done — it must not report new clones. Backend routes keep their inline `authed(c)` guard + 404 (Hono RPC needs inline handlers); that's the only sanctioned repetition.
- No speculative abstractions — build the minimum that works, following the established module pattern. (DRY is about *removing real duplication*, not pre-building shared code for one use.)
- Update `progress-tracker.md` and `ui-registry.md` after each feature.
