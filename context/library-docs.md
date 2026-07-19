# Library Docs

Project-specific rules for the libraries here. Read this before reaching for a library; load its skill/official docs for anything beyond these notes.

## Next.js 16 — read first

APIs differ from older Next. Before writing framework code, read the relevant guide in `node_modules/next/dist/docs/`. Notes that bit us:

- Dynamic route `params` is a **Promise** — `const { id } = await params` in pages.
- Route Handlers live at `app/api/.../route.ts`; we mount Hono at `app/api/[[...route]]/route.ts` with `handle(app)` from `hono/vercel`, `export const runtime = "nodejs"`.
- Start the app with `bun run dev` (the `next` binary isn't on PATH).

## Hono + RPC

- One **chained** router per module; compose in `app.ts`; export `AppType`. Without chaining, `hc<AppType>` infers nothing.
- The app uses `.basePath("/api")`, so the client is `hc<AppType>(origin).api` (`src/lib/api.ts`) — call sites read `client.ideas.$get`.
- `$path()` includes the `/api` prefix; `endpointTopic` (`src/lib/wsTopics.ts`) strips it so WS topics are `get:ideas`, etc.
- Import `AppType` with `import type` only — never pull the server app into the client bundle.

## Environment variables — `src/backend/env.ts`

Every env var is validated once by a zod schema in `src/backend/env.ts`; a missing/invalid var throws an aggregated, readable error at boot (fail fast). **On the server, import `{ env }` from `@/backend/env` instead of reading `process.env.*`.** Defaults live in the schema (`REDIS_URL`, `REALTIME_PORT`, `NODE_ENV`); `ACCESS_TOKEN` is optional (DB-backed tokens are primary).

- **Never import `env` into a client component** — `process.env.R2_SECRET_ACCESS_KEY` etc. are undefined in the browser, so the parse would throw. `env` has no `server-only` marker (the Bun realtime server + seed sit in its import chain and can't load `server-only`), so this rule is by convention: `env` is only reachable from `src/backend/*`.
- **`NEXT_PUBLIC_*`** are still read as direct `process.env.NEXT_PUBLIC_X` literals in client code (`imageSrc`, `image-loader`, `WsProvider`) so Next can inline them; they're *also* in the schema so a server boot fails fast if they're missing.
- **Exceptions (read `process.env` directly, by design):** `db/migrate.ts` (standalone migration runner — needs only `DATABASE_URL`, has its own guard); and `redis/index.ts` + `realtime/server.ts` (`REDIS_URL`/`REALTIME_PORT`) — the realtime gateway is a lean, separate process that must not have to satisfy the app's full env schema, so its shared redis helper stays config-light. Because of this, in `docker-compose.yml` **only the `app` service uses `env_file`** (it needs the full set); `realtime` just gets `NODE_ENV`/`REDIS_URL`/`REALTIME_PORT` explicitly.

## @hono/zod-validator + zod (v4)

Required for typed request bodies — `useHonoMutation` infers the body from the route's `zValidator("json", schema)`. No validator → no body type.

## Drizzle + postgres

- `src/backend/db/index.ts` exports `db` (query builder) and `sql` (raw `postgres` client, e.g. for future LISTEN/NOTIFY). Schema in `db/schema.ts`.
- `drizzle.config.ts` points at `./src/backend/db/schema.ts`. `bunx drizzle-kit push` does NOT auto-load `.env.local` — pass `DATABASE_URL=...` inline.

## TanStack Query (via useHonoQuery/useHonoMutation)

Don't use `useQuery`/`useMutation` directly — use the project wrappers in `src/hooks/`. They derive the cache key + WS topic from the endpoint and handle the Hono response envelope. Cache invalidation is realtime-driven; mutations do not invalidate.

## Realtime (ioredis + Bun + react-use-websocket)

- Gateway: `src/backend/realtime/server.ts`, run by **Bun** (`bun run realtime`) — it can't be a Next route (no WS upgrades). It declares minimal local `BunServer`/`BunWebSocket` types instead of importing `bun` (which clashes with DOM/node libs).
- Publish from routes with `publishInvalidation([topic])` (Redis channel `realtime:invalidations`).
- Client connects via `WsProvider` using a single-use ticket from `/api/realtime/ticket`.
- Separate Redis connections for pub vs sub (a subscriber socket can't issue commands).

## next-themes + Tailwind v4

- Class strategy (`.dark` on `<html>`). `globals.css` declares `@custom-variant dark (&:where(.dark, .dark *))` so `dark:` utilities respond to the class.
- Root `<html>` needs `suppressHydrationWarning`. Read `resolvedTheme` (undefined until mounted) — don't gate with `setState`-in-effect (lint forbids it).
- **Gotcha:** adding NEW `@theme` tokens (or `@custom-variant`) to `globals.css` is not picked up by dev HMR — the `.next` cache serves a partial compile (old tokens work, new `bg-*` utilities and the `.dark{}` overrides go missing). After changing the token set, `rm -rf .next` and restart `bun run dev`.

## sonner — toasts

- Single `<Toaster>` (`src/components/Toaster.tsx`) mounted in the root layout inside `ThemeProvider`; it's theme-aware via `resolvedTheme` and uses `richColors`. Don't mount another.
- For copy-to-clipboard use `copyText(value, msg?)` (`src/lib/clipboard.ts`) — it toasts success/error. Otherwise call `toast.success/error/message` from `sonner` directly. Copy buttons render a static `Copy` icon (no check-mark swap).

## lucide-react

Icon set used in nav and chrome. Import named icons (`import { Crown } from "lucide-react"`); size with the `size` prop. Don't add other icon libraries **except** `react-icons` for brand logos (below) — lucide has no brand marks.

## react-icons — brand logos only

Used **only** for tech-stack brand logos (Node.js, TypeScript, …), which lucide lacks. Import from the Simple Icons set: `import { SiNodedotjs } from "react-icons/si"`. Don't use it for general UI icons — that's still lucide. Tech metadata (snake_case id → name + `Icon` + brand `color`) lives in `src/lib/techStack.ts`; projects store the ids in `techStackList`. Brand hex colors via inline `style` are a sanctioned exception (like the avatar/status colors); pick colors that stay visible in both themes (no pure black/white).

## media-chrome + youtube-video-element — the demo-video player

`src/components/DemoVideo.tsx` renders the project's demo video with `media-chrome/react` controls. It plays any URL: YouTube (`youtu.be`/`youtube.com`, via the **default** export of `youtube-video-element/react`) or a direct file (`<video slot="media">`). Both register browser custom elements, so the player **must** be loaded client-only — the detail page imports it with `next/dynamic(..., { ssr: false })`. Don't import `media-chrome` at module scope in an SSR'd component.

## prism-react-renderer — code syntax highlighting

Used for the MCP curl example on `/documentation` (`src/components/documentation/CurlBlock.tsx`). Synchronous, React-native, bundles Prism (incl. `bash`). Import `{ Highlight, themes }`; render with the render-prop (`{ tokens, getLineProps, getTokenProps }`).

- **Theme-aware the class-based way:** the theme is a JS object of inline colors (no CSS-var flip), so render **two** variants — `themes.oneLight` (`block dark:hidden`) and `themes.oneDark` (`hidden dark:block`). SSR/hydration-safe (no `resolvedTheme` read, no flash), and keeps the box surface a design token (`!bg-transparent` pre inside a `bg-primary/5` box). Don't read next-themes to pick the theme — it hydration-mismatches.
- Only token text colors come from Prism; everything else stays tokenized. This syntax-color exception is sanctioned (like the brand/status colors).

## aws4fetch — Cloudflare R2 uploads

Uploaded assets (images + pitch-deck PDFs) live in R2, not on disk. `aws4fetch` is a tiny (zero-dep) SigV4 signer that works in the Next node runtime and under Bun (unlike the AWS SDK / `Bun.s3`, which isn't available in the Next route).

- **Transport:** `src/backend/r2.ts` — `presignPut(key)` (client-upload URL, query-signed, 10 min) and `r2Put(key, bytes, type)` (server-side PUT for MCP ingest + seed). No `server-only` here so the Bun-run seed can import it; R2 secrets are non-`NEXT_PUBLIC` env, so they never reach the client bundle.
- **Store/validation:** `src/backend/images-store.ts` (`server-only`) — `presignUpload(type, size)` mints an id + presigned URL; `storeFromUrl(url)` downloads + validates + `r2Put`s (MCP tools).
- **Client flow:** `uploadImage(file)` (`src/lib/upload-image.ts`) → `useImageUpload()` hook. Presign via the typed Hono client, then a raw `fetch` PUT to the signed R2 URL (the one sanctioned "UI calls fetch" exception — it targets R2, not our API).
- **Reads:** public bucket, `imageSrc(id)` = `NEXT_PUBLIC_R2_PUBLIC_URL/<id>`. No serve route.
- **Optimization:** a **custom `next/image` loader** (`src/image-loader.ts`, wired via `images.loader:"custom"` + `loaderFile` in `next.config.ts`) routes R2 URLs through **Cloudflare Image Transformations** (`/cdn-cgi/image/width=…,quality=…,format=auto/<id>`) — **prod only** (`NODE_ENV==="production"`); in dev it returns the raw R2 URL so no transformation quota is spent. It passes non-R2 srcs (local `/public`, `blob:` upload previews) through untouched. So R2 `<Image>`s are NOT `unoptimized` (only the two blob-preview components — `ImageUpload`, `LogoUpload` — keep `unoptimized`). **Requires** "Transformations" enabled on the `projects-cdn.emperorjs.com` Cloudflare zone (dashboard → Images → Transformations); only works on the Cloudflare-proxied custom domain, not `*.r2.dev`. A custom loader bypasses the built-in optimizer, so no `remotePatterns` is needed.
- **Env:** `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME` (server), `NEXT_PUBLIC_R2_PUBLIC_URL` (public hostname).

## moment — the only date API

All date/time work goes through `moment`; the native `Date` object is banned (see AGENTS.md). Don't add `date-fns`/`dayjs`/`luxon` alongside it.

- **Display:** use `formatDate(input)` → `"May 20, 2025"` and `timeAgo(input)` → `"2 days ago"` from `src/lib/time.ts`. Don't re-implement formatting at call sites.
- **Relative-time wording** is configured once in `time.ts` via `moment.updateLocale("en", …)` + `relativeTimeThreshold` (numeric "1 week ago", "just now" under a minute) to match the designs. That global config loads on first import — edit it there, not per call.
- **Timestamps as numbers:** `moment().valueOf()` (replaces `Date.now()`); **ISO strings:** `moment().toISOString()`.
- **DB writes:** Drizzle `timestamp` columns are `mode: 'date'`, so pass `moment().toDate()` (e.g. `updatedAt: moment().toDate()`). This is the one place a native `Date` legitimately appears, produced by moment.
- **Gotcha:** `moment(null)` is *Invalid Date* but `moment(undefined)` is *now* — pass `undefined`, never `null`, when you want the current time as a fallback.
