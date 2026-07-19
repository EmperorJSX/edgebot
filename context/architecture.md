# Architecture

## Stack

| Layer      | Choice                                                                 |
| ---------- | ---------------------------------------------------------------------- |
| Framework  | Next.js 16 (App Router, Turbopack), React 19, TypeScript               |
| Styling    | Tailwind CSS v4 (tokens via `@theme` in `globals.css`) + next-themes   |
| Icons      | lucide-react                                                           |
| API        | Hono, mounted in the Next catch-all route; typed RPC via `hc<AppType>` |
| Validation | zod + `@hono/zod-validator`                                            |
| DB         | PostgreSQL + Drizzle ORM (`postgres` driver)                           |
| Auth       | Single access token → HMAC session cookie (no email/accounts)          |
| Data fetch | TanStack Query, wrapped as `useHonoQuery` / `useHonoMutation`          |
| Realtime   | Redis pub/sub → standalone **Bun** WebSocket gateway                   |
| Runtime    | Bun (package manager + runs the gateway)                               |

> Next.js 16 differs from training data — read `node_modules/next/dist/docs/` before writing framework code.

## File layout

```
src/
  app/
    (auth)/login/            token login (outside Providers)
    (app)/                   authed area — layout does requireAuth() + <Providers><AppShell>
      dashboard/ ideas/ projects/ teams/   thin pages → client components
    api/[[...route]]/route.ts   the ONLY api file: handle(app)
    layout.tsx               root: fonts + <ThemeProvider>
    globals.css              design tokens (light + dark)
  backend/                   ALL server code
    db/{index,schema}.ts     Drizzle client (db + raw sql) + schema
    auth.ts                  token verify + session cookie helpers
    session.ts               isAuthed() / requireAuth() (Server Components)
    http.ts                  authed(c) guard for Hono routes
    app.ts                   composes routers, exports AppType
    routes/                  one chained Hono router per module
    realtime/{server,publish}.ts   Bun WS gateway + Redis publish
    redis/{index,realtime}.ts      ioredis client + channel/ticket helpers
    classes/PubSub.ts        ref-counted Redis pub/sub
  components/                PascalCase React components
  hooks/                     useHonoQuery, useHonoMutation
  lib/                       api.ts (RPC client), wsTopics, client-safe metadata (ideas/projects/teams)
```

## The module pattern (replicate for every new module)

1. **Schema** — add table(s) to `src/backend/db/schema.ts`, `bunx drizzle-kit push`.
2. **Route** — `src/backend/routes/<m>.ts`: one chained `new Hono().get().post().patch().delete()`, each handler guarded by `authed(c)`, bodies validated with `zValidator("json", schema)`. After every write, `await publishInvalidation([wsTopic("get","<m>")])`.
3. **Compose** — add `.route("/<m>", <m>)` to `src/backend/app.ts` (keeps `AppType` complete for RPC).
4. **UI** — `<M>List` / `<M>Form` / `<M>Detail` client components using `useHonoQuery`/`useHonoMutation` against `client.<m>.*`. Detail derives its record from the list query (one source of truth, stays live). Pages in `src/app/(app)/<m>/` are thin wrappers.
5. **Shared meta** — fixed option lists / status labels+styles in `src/lib/<m>.ts` (client-safe, no server imports).

## Data flow

- **Reads:** client component → `useHonoQuery(client.x.$get)` → Hono route → Drizzle → JSON. TanStack Query caches by topic.
- **Writes:** `useHonoMutation(client.x.$post)` → Hono route (zod-validated) → Drizzle → `publishInvalidation`.
- **Realtime:** Hono `publishInvalidation([topic])` → Redis channel `realtime:invalidations` → Bun gateway → `WsProvider` → `useHonoQuery` refetches the matching topic. Mutations never invalidate directly.
- **Auth:** login posts the token → `/api/auth/login` sets the `emperor_session` cookie → Server Components check `isAuthed()`, Hono routes check `authed(c)`, the WS upgrade uses a single-use Redis ticket from `/api/realtime/ticket`.

## Teams model

The app has one workspace team. `team` is the workspace container; `teamMember` rows hold named members with optional email/image metadata. Projects assign members directly with `project.teamMemberIds` (`text[]`), not a `teamId`.

## Running locally

Two processes, plus Postgres (5432, db `emperorjs_projects`) and Redis (6379):

- `bun run dev` → http://localhost:7000
- `bun run realtime` → ws://localhost:7001

`.env.local` holds `DATABASE_URL`, `REDIS_URL`, `ACCESS_TOKEN`, `REALTIME_PORT`, `NEXT_PUBLIC_WS_URL`, `NEXT_PUBLIC_APP_URL`.
