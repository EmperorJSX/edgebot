# UI Registry

Components that already exist — **reuse before creating**. Update this file whenever you add or change a component. All live in `src/components/` unless noted.

## Shell & chrome

| Component        | Purpose                                                              |
| ---------------- | ------------------------------------------------------------------- |
| `AppShell`       | Authed layout: responsive sidebar (desktop) / drawer (mobile), nav with active state, user card, theme toggle, sign-out. Wraps all `(app)` pages. |
| `ThemeProvider`  | next-themes provider (class strategy). In root layout.              |
| `ThemeToggle`    | Sun/Moon light–dark switch.                                         |
| `Providers`      | TanStack Query + `WsProvider` (realtime). Wraps `(app)` content.    |
| `WsProvider`     | WebSocket connection + topic subscribe (drives `useHonoQuery` refetch). |
| `SignOutButton`  | Posts `/api/auth/logout`, returns to `/login`.                      |
| `SettingsView`   | Client view for the Settings page (tabs + MCP / Access Token / Active Sessions cards). Takes `accessToken` from the server page (`process.env.ACCESS_TOKEN`). Self-contained (inline `ChromeLogo` + `NigeriaFlag` SVGs, copy/reveal helpers). |

## Primitives

| Component            | Purpose                                                     |
| -------------------- | ----------------------------------------------------------- |
| `StatusBadge`        | Idea status pill — colored dot + label (4 progress statuses: Not Started / Planning / In Progress / Ready to Build, from `STATUS_STYLE` + `STATUS_DOT` in `lib/ideas.ts`). |
| `ProjectStatusBadge` | Project status pill (from `PROJECT_STATUS_STYLE`).          |
| `Modal`              | Native `<dialog>` wrapper (focus trap, Esc, backdrop). Props: `open`, `onClose`, `title`, `children`. Use for create/edit instead of a dedicated page. |
| `DropdownMenu`       | Custom "⋮" actions menu (closes on outside-click / Esc / select). Props: `items: { label, icon?, onSelect, destructive? }[]`, `label?`, plus optional `icon` + `buttonClassName` to restyle the trigger (e.g. the idea detail's bordered "⋯" square). Used for the dashboard row actions (Open / Edit / Delete). |
| `CustomSelect`       | Reusable custom dropdown/value picker. Props: `label`, `options` (each `{ value, label, dot? }` — `dot` is an optional bg-color class shown as a leading status dot in trigger + options), `value?`, `defaultValue?`, `onChange?`, `name?`, `disabled?`, `className?`, `buttonClassName?`. Emits a hidden input when `name` is passed, so forms can keep using `FormData` without native `<select>`. |
| `ConfirmDialog`      | Custom confirm prompt (replaces native `confirm()`), built on `Modal`. Props: `open`, `title`, `description?`, `confirmLabel?`, `cancelLabel?`, `destructive?`, `onConfirm`, `onClose`. |

### Shared building blocks (reuse these — DRY)

Extracted so the list/detail pages and forms don't re-implement them. **Check here before hand-rolling a card, header, avatar, skeleton, dropdown effect, or form field.**

| Component / export | Purpose |
| ------------------ | ------- |
| `DialogShell`      | Native `<dialog>` shell: syncs `open`, Esc + backdrop-click close. Caller passes sizing `className` + body. `Modal`, `ManageProjectModal`, and `ManageIdeaModal` are built on it — don't write a new `<dialog>`. |
| `StatCard`         | Dashboard/Ideas/Projects stat tile (icon + label + value + CTA). Pass `href` for a link CTA or `onClick` for a button; `large` for the bigger Projects cards. `icon` is a node, e.g. `<Lightbulb size={22} />`. |
| `Avatar`           | Square project/idea thumbnail — uploaded image, else tinted initials. Props: `imageId`, `name`. |
| `AvatarStack`      | Overlapping round member avatars + "+N" overflow. Props: `members`, `emptyLabel?` (pass `"Unassigned"` to show a placeholder when empty). *(This is the "avatar-stack component" previously listed as not-built.)* |
| `PageHeader` / `NewButton` | List-page title + subtitle + right-aligned `action`; `NewButton` is the primary "＋ New …" CTA. Use for every list page header. |
| `Sk` / `StatCardSkeleton` (`skeletons.tsx`) | Shared loading-skeleton primitive + the stat-card skeleton (`large?`). Build row skeletons from `Sk`. |
| `TagInput`         | The inline "New tag" text input (commit on blur/Enter, cancel on Esc). Pairs with `useTagEditor`. *(Distinct from `project-modal/TagInput`, which is the form's tag-array chip editor.)* |
| `FormFields` exports | `Text`, `Area`, `Select`, `Label`, `inputClass`, and `FormActions` (error + Cancel/Save row). Used by older simple forms such as `ProjectForm` and the Teams member form. |
| `project-modal/fields` exports | Shared wide-modal primitives: `Label`, `Field`, `FieldMeta`, `SectionHead`, `ModalFormFooter`, `inputClass`, and `formatBytes`. Used by `ManageProjectModal`, `ManageIdeaModal`, and project-modal field components. |
| `actionMenuItems` (`DropdownMenu.tsx`) | Builds the standard Open / Edit / Delete `DropdownItem[]` for project & idea row menus: `actionMenuItems({ onOpen, onEdit, onDelete })`. |
| `Toaster` (`Toaster.tsx`) | Theme-aware **sonner** toaster, mounted once in the root layout (inside `ThemeProvider`). Follows `resolvedTheme`. Don't add a second one — call `toast`/`copyText` from anywhere. |

`ProjectForm` is legacy/simple and is no longer rendered by any page. The dashboard shows full loading **skeletons** (stat cards + both tables) while `GET /dashboard` is pending.

`ManageProjectModal` (with the `useManageProjectModal()` hook) is the **full** add/edit project modal matching `context/designs/add-edit-project-modal.png` — it has superseded `ProjectForm` everywhere it was wired (dashboard, projects **list**, and project **detail** pages). `ProjectForm` is no longer rendered by any page. See the dedicated section below.

`ManageIdeaModal` (with the `useManageIdeaModal()` hook) is the single add/edit idea modal for dashboard, ideas list, and idea detail pages. It follows the `ManageProjectModal` shell/header/footer pattern but only exposes idea-detail fields (read-only linked-project image preview, title, summary, status/category/priority/impact, description, problem, solution, target audience, key features, tags). `IdeaForm` has been removed.

## Helpers (`src/lib/`)

| Helper | Purpose |
| ------ | ------- |
| `avatarColor(seed)` / `initial(name)` (`lib/avatar.ts`) | Deterministic colored letter/initials avatars. Named-color palette (sanctioned exception, like the status maps). Used by the dashboard project tiles + team avatar stacks. |
| `copyText(value, msg?)` (`lib/clipboard.ts`) | Copy-to-clipboard + success/error toast (via sonner). **The** copy affordance — don't hand-roll `navigator.clipboard` + a "copied" icon-swap. Copy buttons stay a static `Copy` icon; the toast is the feedback. |
| `timeAgo(date)` (`lib/time.ts`) | "2 days ago" / "1 week ago" relative time (`Intl.RelativeTimeFormat`, numeric:"always"). |
| `formatDate(date)` (`lib/time.ts`) | "May 20, 2025" absolute date (`Intl.DateTimeFormat`). Used by the Ideas "Created" column. |
| `categoryMeta(category)` / `CATEGORY_META` (`lib/ideas.ts`) | Per-category lucide icon + tint classes (`wrap` icon-tile, `pill` badge) for the Ideas list. Named-color maps (sanctioned exception), neutral default fallback. |
| `parseUserAgent(ua)` (`lib/ua.ts`) | Heuristic browser/OS detection (no dep). Used server-side by `getCurrentSession` for the Settings Active Sessions row. Has a `bun src/lib/ua.ts` self-check. |
| `fetchClientGeo()` / `SessionGeo` (`lib/geo.ts`) | Client-side IP geolocation via `http://ip-api.com/json` (free, no key, CORS-open). Called on login; best-effort (returns null on failure). |
| `getCurrentSession()` (`backend/session-info.ts`, server-only) | Builds the real `SessionInfo` (browser/OS from the request UA; IP, city/country, countryCode, login time from the `GEO_COOKIE` set at login). |

## Module components

List + detail views are **inlined directly into their `page.tsx`** (no proxy component, no `/new` page). Create happens in a `Modal` on the list/dashboard; forms take an `onDone` callback that closes it.

| Module   | List view          | Create form (in `Modal`) | Inline actions   |
| -------- | ------------------ | ------------------------ | ---------------- |
| Dashboard| `dashboard/page.tsx` | `ManageIdeaModal` / `ManageProjectModal` | —              |
| Ideas    | `ideas/page.tsx` (dashboard-style data table: stat cards + filter bar + pagination); `ideas/[id]/page.tsx` (detail) | `ManageIdeaModal`               | Detail: Edit button (opens `ManageIdeaModal`) + ⋯ `DropdownMenu` (favorite / edit / delete) + live Status/Priority/Category/Impact `CustomSelect`s; row `DropdownMenu` (Open / Edit / favorite / Delete) on list |
| Projects | `projects/page.tsx`| `ManageProjectModal`     | (status + team selectors inline in `[id]/page.tsx`) |
| Teams    | `teams/page.tsx`   | `MemberForm` (inlined modal) | Add/Edit member modals on list page; no `[id]` detail page |

## Hooks (`src/hooks/`)

- `useHonoQuery(endpoint, args?, opts?)` — typed read; cache key + WS topic derived from the endpoint.
- `useHonoMutation(endpoint, opts?)` — typed write; pass the raw body, or `{ param, json }` for `/:id` routes.
- `useImageUpload(opts?)` — R2 upload hook: presign via `client.images.$post` → PUT the file straight to R2 → returns the stored id. `upload.mutate(file)` (pass the File itself), `upload.isPending`, `upload.error`. Used by `ImageUpload`, `LogoUpload`, `ScreenshotsField`, `PitchDeckField`. Wraps `uploadImage` (`src/lib/upload-image.ts`). Bytes never touch our server.
- `useManageProjectModal()` — returns `{ open, openCreate, openEdit(project), close, modal }`. Render `{modal}` once in a page; call `openCreate()` for a new project or `openEdit(p)` to edit. Wraps `ManageProjectModal` (handles both add + edit). Used by `dashboard/page.tsx`, `projects/page.tsx`, and `projects/[slug]/page.tsx`.
- `useManageIdeaModal()` — returns `{ open, openCreate, openEdit(idea), close, modal }`. Render `{modal}` once in a page; call `openCreate()` for a new idea or `openEdit(i)` to edit. Wraps `ManageIdeaModal`. Used by `dashboard/page.tsx`, `ideas/page.tsx`, and `ideas/[id]/page.tsx`.
- `useDismiss(open, ref, onClose)` — closes a popover/menu on outside-click or Esc. Used by `CustomSelect`, `DropdownMenu`, and the owner picker. Use it instead of re-writing the mousedown/keydown effect.
- `useTabParam(ids, fallback)` — active tab synced to the `?tab=` search param; the fallback/default tab keeps a clean URL (param removed). Returns `{ active, setTab }`. Used by `SettingsView` and the documentation `McpDocs`. Needs a `<Suspense>` boundary (uses `useSearchParams`).
- `useOrigin(fallback?)` — the browser origin via `useSyncExternalStore` (server snapshot = `fallback`, so no hydration mismatch). Used for the real `${origin}/mcp` endpoint on Settings + docs.
- `useCopy(timeout?)` — copy-to-clipboard with a transient `copied` key (`{ copied, copy }`). Used by `SettingsView` and `McpDocs`.
- `useResourceForm({ create, patch, editing, id })` — shared create-vs-patch `onSubmit` + active mutation for `<form>` + `FormData` modals. Used by legacy/simple forms such as `ProjectForm` and `MemberForm`.
- `useTagEditor(tags, onChange)` — inline tag-editor state (`newTag`/`adding` + `add`/`remove`/`cancel`). Pairs with `TagInput` on the idea & project detail pages. Call it above any early return.

## Conventions for new components

- PascalCase filename = component name. One primary component per file.
- Client components fetch via the hooks; detail components derive their record from the module's list query.
- Reuse `StatusBadge`/`ProjectStatusBadge`, the button/input/card classes in `ui-rules.md`, and lucide-react icons.

## Not yet built (see build-plan)

Per-project documentation editor (the top-level `/documentation` page IS built — see below), global Search, Activity feed, project-detail full inline edit, generic data-table.

### Teams Index Page

File: `src/app/(app)/teams/page.tsx`
Last updated: 2026-06-30

| Property         | Class           |
| ---------------- | --------------- |
| Background       | `bg-card` for table, search, modal inputs, and upload area |
| Border           | `border border-border`; rows use `divide-y divide-border` |
| Border radius    | `rounded-xl` for table/upload, `rounded-lg` for controls |
| Text — primary   | `text-foreground`, `text-3xl font-semibold tracking-tight` for page title |
| Text — secondary | `text-muted-foreground`, `text-sm`/`text-base` for member metadata |
| Spacing          | `space-y-7`, table row `px-7 py-5`, search `h-12 pl-12` |
| Hover state      | `hover:bg-accent/50`, `hover:bg-primary/10`, `hover:opacity-90` |
| Shadow           | `shadow-sm` on the primary Add Member CTA |
| Accent usage     | `bg-primary`, `text-primary`, `border-primary/30`, `bg-primary/10` |

**Pattern notes:**
The Teams page is a one-team member directory matching `context/designs/teams.png`. Member add/edit happens in modals on the list page; the old `/teams/[id]` management page is removed. The member form supports drag/drop image input and stores the image URL/data URL on `teamMember.imageUrl`.

### Projects Index Page

File: `src/app/(app)/projects/page.tsx`
Last updated: 2026-06-29

| Property         | Class           |
| ---------------- | --------------- |
| Background       | `bg-card` for stat cards, filters, table, pagination controls |
| Border           | `border border-border`; table rows use `divide-y divide-border` |
| Border radius    | `rounded-xl` for cards/table, `rounded-lg` for controls, `rounded-md` for pills |
| Text — primary   | `text-foreground`, `text-3xl font-semibold tracking-tight` for page title |
| Text — secondary | `text-muted-foreground`, `text-sm`/`text-base` for subtitles and table metadata |
| Spacing          | `space-y-7`, card `p-5`, table row `px-6 py-3`, controls `h-11 px-4` |
| Hover state      | `hover:bg-accent/60`, `hover:bg-accent`, `hover:underline`, `hover:opacity-90` |
| Shadow           | `shadow-sm` on the primary CTA only |
| Accent usage     | `bg-primary`, `text-primary`, `bg-primary/10`; stat/category/status/avatar colors are mapped constants |

**Pattern notes:**
The projects index follows the dashboard-style data surface from `context/designs/projects.png`: stat cards above a filter bar, then a single bordered table with compact rows and a footer pagination strip. List-specific project status badges render `live` as "Completed" to match the design while preserving the stored project status value. Filtering, sorting, and pagination are server-side through `client.projects.$get` query params.

### Project Detail Page

File: `src/app/(app)/projects/[slug]/page.tsx` (routed by **slug**, not id)
Last updated: 2026-06-30

| Property         | Class           |
| ---------------- | --------------- |
| Background       | `bg-card` for the header + all 11 Overview cards; inner feature/stat/pitch boxes are bordered (no fill) |
| Border           | `border border-border`; tabs use `border-b`, active tab `border-primary` |
| Border radius    | `rounded-xl` cards, `rounded-lg` inner boxes, `rounded-2xl` header tile, `rounded-full` pills/avatars |
| Text — primary   | `text-foreground`, `text-2xl font-semibold` title, `text-base font-semibold` card titles |
| Text — secondary | `text-muted-foreground` for tagline, labels, captions; `text-primary` for links/active tab |
| Spacing          | `space-y-6`, card `p-5 md:p-6`, Overview grid `lg:grid-cols-[1.25fr_1fr] gap-6` (Recent Activity `lg:col-span-2`) |
| Accent usage     | `bg-primary` filled checks, `bg-primary/10 text-primary` (category/+more/stat icons), status dot via `PROJECT_STATUS_DOT` |

**Pattern notes:**
Matches `context/designs/project-details.png`, all from real DB rows (no component-level mock data). Detail derives from the realtime `client.projects.$get` list query (`pageSize:"50"`). Header tile = **project image → `avatarColor`+`initial`**. Favorite star + inline Add Tag PATCH live (`projects` route accepts `favorite`/`tags`); Edit Project opens the full `ManageProjectModal` (via `useManageProjectModal`), delete uses `ConfirmDialog`, ⋯ menu uses `DropdownMenu`. Reuses `ProjectStatusBadge` and the avatar-stack pattern from the projects list. Best matched at ≥1100px content width (the design's canvas); narrower viewports wrap gracefully.

Real data, not placeholders:
- **Screenshots** = uploaded image ids rendered via `imageSrc(id)` → R2 public URL (`<Image>`); **"View all"** opens a `Modal` grid.
- **Files** = `ProjectFile[]` (`{name, file:"<uuid>.<ext>", size, type}`); Pitch Deck card shows `files[0]`, **View All Files** modal lists all (type-tinted icon + download `<a href={imageSrc(f.file)}>`). Files stat = `files.length`.
- **Demo Video** = `DemoVideo` (`media-chrome/react`, dynamic `ssr:false`) playing any URL incl. YouTube. **Tech Stack** = `techMeta(id)` from `lib/techStack.ts` → name + `react-icons/si` brand logo (brand hex via inline `style`, sanctioned exception); **"+N more"** opens a modal.
- **Project ID** shows the unique `slug`; routing also uses `slug`. **Active tab** persists in `?tab=` (`useSearchParams`, Suspense-wrapped; Overview = clean URL). All **"View all"** buttons (screenshots / files / tech / milestones / activity) open one shared `Modal`.

**Routing:** the URL uses the **slug** (`/projects/coinegram`), not the id — stable across reseeds. The page finds the project by slug in the list query and uses `project.id` for PATCH/DELETE. All links (projects list, dashboard recents, idea `linkedProject`) point at `p.slug`; the idea route's `linkedProject` embed includes `slug`. A missing/unknown slug renders a centered **not-found state** (primary `FolderX` tile + heading + muted copy + "Back to Projects" CTA), aligned to the design system.

Roadmap, Notes, and Activity are real tab bodies backed by DB JSON rows on `projects` (`roadmapPhases`, `notes`, `timelineActivity`). Notes and Activity are queried through dedicated backend endpoints for server-side filtering/pagination; Roadmap phase status/progress are computed from task completion, not stored. The Overview Milestones card and task/note/team stats are derived from `roadmapPhases`, `notes`, and embedded members rather than stored count columns. Overview Recent Activity uses the same `timelineActivity` source as the Activity tab. Non-token colors are limited to `react-icons` brand hex + status/category/timeline icon tints (same sanctioned basis as `avatarColor` and status maps).

**Loading skeleton:** `ProjectDetailSkeleton` mirrors the full layout 1:1 (action bar, header card with tile + identity + divider + 5 meta rows, tab strip, and the active tab body) so there's no layout shift. Overview skeletons the 2-col grid of all 11 cards; Roadmap/Notes/Activity have tab-specific skeleton bodies. Used as both the `Suspense` fallback and the cold-query state. The projects **list** page (`projects/page.tsx`) likewise skeletons its stat cards, table rows, and footer count while `GET /projects` is pending.

### Project Detail Non-Overview Tabs

File: `src/app/(app)/projects/[slug]/page.tsx` + `src/components/ProjectDetailSkeleton.tsx`
Last updated: 2026-06-30

| Property         | Class           |
| ---------------- | --------------- |
| Background       | `bg-card` for tab panels, phase/note/activity rows, search controls, stat tiles |
| Border           | `border border-border`; tab strip `border-b border-border`; roadmap info `border-primary/20` |
| Border radius    | `rounded-xl` for tab panels/rows, `rounded-lg` for controls/stat tiles, `rounded-full` for timeline markers |
| Text — primary   | `text-foreground`, tab body headings `text-xl font-semibold tracking-tight`, row titles `text-base`/`text-lg font-semibold` |
| Text — secondary | `text-muted-foreground`, `text-sm` descriptions/metadata |
| Spacing          | Tab panel `p-4 md:p-5`, rows/cards `px-5 py-6 md:px-7`, roadmap phase cards `p-5 md:p-6`, timeline gap `gap-4` |
| Hover state      | `hover:bg-accent hover:text-foreground`, primary CTA `hover:opacity-90` |
| Shadow           | `shadow-sm` only on the New Note primary CTA |
| Accent usage     | Active tab `border-primary text-primary`; completed/in-progress/planned pills use mapped low-opacity status tints; timeline/info uses `bg-primary/5`, `text-primary` |

**Pattern notes:**
Roadmap matches `project-roadmap-tab.png`: overview stat tiles at the top, then a `md:grid-cols-[220px_1fr]` phase timeline with status markers, progress bars, phase cards, two-column task lists on larger screens, and a primary-tinted info footer. Roadmap task rows are clickable checkbox-style buttons using the same visual marker; later phase tasks are disabled until all previous phase tasks are complete, and the backend enforces the same rule. Notes matches `project-notes-tab.png`: backend-backed search + New Note controls, individually bordered note rows with category icon tiles/category pills, row `DropdownMenu` edit/delete actions, `Modal` create/edit form, and `ConfirmDialog` delete. Activity matches `project-activity-tab.png`: backend-backed search, `CustomSelect` filter, bordered vertical timeline with tinted circular icons, timestamps, and functional pagination chrome. All three collapse mobile-first without horizontal overflow; controls stack on small screens.

### ManageProjectModal

Files: `src/components/ManageProjectModal.tsx` (orchestrator) + `src/components/project-modal/*` (field components) + `src/hooks/useManageProjectModal.tsx`
Last updated: 2026-07-01

| Property         | Class           |
| ---------------- | --------------- |
| Background       | `bg-card` for dialog, inputs, chips, upload boxes; `backdrop:bg-black/50` |
| Border           | `border border-border`; dashed `border-dashed` for upload/drop zones; header/footer `border-b`/`border-t` |
| Border radius    | `rounded-2xl` dialog + logo tile, `rounded-lg` inputs/chips, `rounded-full` radios/avatars |
| Text — primary   | `text-foreground`, header `text-xl font-semibold`, section heads `text-base font-semibold` |
| Text — secondary | `text-muted-foreground` for hints/counters/notes; required `*` + errors use `text-rose-500` |
| Spacing          | Dialog `max-w-5xl`, header/footer `px-6 py-4–5 sm:px-8`, body `space-y-8 px-6 py-6`, inputs `h-11` |
| Accent usage     | `bg-primary` checks/radios + CTA, `text-primary` links/active tab, `bg-primary/10 text-primary` feature icon tiles, `border-primary/40 text-primary` "Add" buttons |

**Pattern notes:**
Built on `DialogShell` (single flex-column layout: `max-h-[92vh] overflow-hidden` on the dialog, `flex-1 min-h-0 overflow-y-auto` body — so **only the body scrolls**, no double scrollbar). Matches `context/designs/add-edit-project-modal.png`. Add vs edit is decided by whether a `project` is passed (edit → "Edit Project" / "Save Changes" / PATCH; add → "Add Project" / "Create Project" / POST). The inner form remounts per project (`key={project?.id ?? "new"}`). State is **react-hook-form** + **zod** resolver (`src/lib/projectForm.ts` holds the schema, types, status options, `projectFormDefaults`); errors render below the input.

`ManageProjectModal.tsx` is a slim orchestrator; each section is its own file under `src/components/project-modal/`. It now includes a **Project Summary** section with `summary`, `purpose`, `targetUsers`, and `valueProposition`, persisted through the projects route and rendered by project detail/overview surfaces.

Project modal field files:
- `fields.tsx` — `Label` / `Field` / `FieldMeta` / `SectionHead` / `ModalFormFooter` / `inputClass` / `formatBytes`.
- `FileDrop.tsx` — reusable `<label>` + hidden input + **drag-and-drop** (`data-dragging` for styling). Used by every upload zone (logo, screenshots, pitch deck, demo video).
- `LogoUpload`, `ScreenshotsField` (full-image thumbnails — fixed `h-32`, natural width, `object-contain`, not cropped), `PitchDeckField` (lists project `files` with download + delete, PDF drag-drop upload), `TagInput`, `OwnerPicker` (avatars shown in the dropdown), `StatusRadios`, `KeyFeaturesField`, `FeaturesField` (`useFieldArray`; each row's icon is editable via `IconPicker`), `IconPicker` (grid of `FEATURE_ICONS`), `LinkInput`, `DemoVideoField` (Upload/Use-Link tabs), `TechStackField` (predefined `TECH_STACK` picker with brand icons + search; opens **upward** since it's the last section).
- Popovers (owner/icon/tech) use the shared `useDismiss` hook.

**Editable Project ID:** the slug field is editable; backend `createProject`/`updateProject` accept `slug` (slugified + uniqued, falls back to name) plus `summary`, `about`, `purpose`, `targetUsers`, `valueProposition`, `keyFeatures`, `techStackList`, `screenshots`, `features`, `files`. The images endpoint (`routes/images.ts`) is now **presign-only** — it returns a presigned R2 PUT URL (`{ id, uploadUrl }`); the client uploads the file straight to R2 (PDF ≤20MB, images ≤5MB). Assets are served from `NEXT_PUBLIC_R2_PUBLIC_URL` via `imageSrc(id)`. Feature icons come from the shared `src/lib/featureIcons.tsx` registry (used by the detail Overview tab too, so picked icons render there). **Visual-only (ponytail, marked in-file):** rich-text toolbar, feature reorder glyphs, demo-video *file* upload (no video endpoint — use "Use Link"). Reuses `CustomSelect`, `avatarColor`/`initial`, `imageSrc`, `techMeta`.

### ManageIdeaModal

Files: `src/components/ManageIdeaModal.tsx` + `src/hooks/useManageIdeaModal.tsx` + `src/lib/ideaForm.ts`
Last updated: 2026-07-01

| Property         | Class           |
| ---------------- | --------------- |
| Background       | `bg-card` for dialog, inputs, chips, upload tile; `backdrop:bg-black/50` |
| Border           | `border border-border`; header/footer `border-b`/`border-t` |
| Border radius    | `rounded-2xl` dialog + image tile, `rounded-lg` inputs/chips |
| Text — primary   | `text-foreground`, header `text-xl font-semibold` |
| Text — secondary | `text-muted-foreground` for hints/counters; required `*` + errors use `text-rose-500` |
| Spacing          | Dialog `max-w-4xl`, header/footer `px-6 py-4–5 sm:px-8`, body `space-y-8 px-6 py-6`, inputs `h-11` |
| Accent usage     | `bg-primary` CTA, `text-primary` selected dropdown items and tag chips |

**Pattern notes:**
Built on `DialogShell`, `react-hook-form`, zod (`src/lib/ideaForm.ts`), `TagInput`, `CustomSelect`, and shared `project-modal/fields` primitives. Add vs edit is decided by whether an `idea` is passed (edit → "Edit Idea" / "Save Changes" / PATCH; add → "New Idea" / "Create Idea" / POST). The image tile is read-only: ideas inherit imagery from `linkedProject.imageId`; unlinked ideas show the category fallback tile. The body scrolls inside the fixed dialog shell. Idea route validation now accepts `keyFeatures[]` as a JSON array, so the modal updates the Key Features card without comma-string parsing at the UI layer.

### CustomSelect

File: `src/components/CustomSelect.tsx`
Last updated: 2026-06-29

| Property         | Class           |
| ---------------- | --------------- |
| Background       | `bg-card` for trigger and dropdown panel |
| Border           | `border border-border` |
| Border radius    | `rounded-lg` |
| Text — primary   | `text-foreground` |
| Text — secondary | `text-muted-foreground` for placeholder and chevron |
| Spacing          | Trigger `h-11 px-4`, options `px-3 py-2` |
| Hover state      | `hover:bg-accent` |
| Shadow           | `shadow-lg` on the dropdown panel |
| Accent usage     | Selected option uses `text-primary` and a check icon |

**Pattern notes:**
Use `CustomSelect` anywhere a dropdown/value picker is needed. Do not use native `<select>` in app UI. When the select participates in a form, pass `name` so the component emits a hidden input for `FormData`. The menu detects available viewport space before opening and switches to dropup placement near the bottom of the viewport, so footer/pagination dropdowns do not increase page height.

### Settings Page

Files: `src/app/(app)/settings/page.tsx` (server) + `src/components/SettingsView.tsx` (client)
Last updated: 2026-06-30

| Property         | Class           |
| ---------------- | --------------- |
| Background       | `bg-card` for the three section cards + read-only inputs |
| Border           | `border border-border`; session rows use `divide-y divide-border` |
| Border radius    | `rounded-2xl` for section cards, `rounded-lg` for inputs/copy buttons |
| Text — primary   | `text-foreground`, `text-3xl font-semibold tracking-tight` page title, `text-lg font-semibold` section titles |
| Text — secondary | `text-muted-foreground` for subtitles, helper text, table metadata |
| Spacing          | `space-y-6`, card `p-6`, inputs `h-11`, copy buttons `size-11` |
| Hover state      | `hover:bg-accent` (copy), `hover:bg-primary/5` (Regenerate), `hover:text-foreground` (tabs/eye) |
| Accent usage     | `bg-primary/10 text-primary` icon tiles, `border-primary/40 text-primary` Regenerate; active tab `border-primary text-primary` |

**Pattern notes:**
Matches `context/designs/settings.png`. The tab bar **switches content** (one section shown at a time); the active tab is stored in the `?tab=` search param via the shared `useTabParam` hook (so `SettingsView` is wrapped in `<Suspense>` in the page). Everything is **real / read, no mock data**:
- The page is a Server Component that reads the **DB-backed access token** via `getOrCreateAccessToken()` (`backend/access-token.ts`) and the current session via `getCurrentSession()` (`backend/session-info.ts`), then passes both to the client `SettingsView`.
- **MCP Endpoint URL** = `${origin}/mcp` (via the shared `useOrigin` hook — client-only `useSyncExternalStore`, so no hydration mismatch). Copy uses the shared `useCopy` hook. The access token authenticates MCP/API requests against it.
- **Active Sessions** = the one real session. Browser/OS from the request User-Agent (`lib/ua.ts` `parseUserAgent`); IP + city/country + login time from the `GEO_COOKIE`, which is captured **client-side at login** (`lib/geo.ts` `fetchClientGeo` → `http://ip-api.com/json`) and stored server-side by the auth route. Browser icon is the inline multicolor `ChromeLogo` for Chrome, else lucide `Globe`; the flag is `https://flagcdn.com/24x18/{countryCode}.png` (falls back to a `MapPin`). "Sign Out" reuses the real logout (which clears both cookies).
- Read-only inputs use a prominent focus ring (`focus:ring-2 focus:ring-ring/40`). Destructive "Sign Out" uses rose (the sanctioned destructive color).

### Documentation Page

Files: `src/app/(app)/documentation/page.tsx` (server) + `src/components/documentation/{DocumentationView,AboutCard,Pillars,Categories,McpDocs,CurlBlock}.tsx`
Last updated: 2026-07-01

| Property         | Class           |
| ---------------- | --------------- |
| Background       | `bg-card` for all section cards; code chips `bg-primary/5`; category tiles use mapped low-opacity tints |
| Border           | `border border-border`; MCP header `border-b`, tab rail `md:border-r`; category pills `border border-border` |
| Border radius    | `rounded-xl` cards, `rounded-lg` pills/tabs/code chips/icon tiles |
| Text — primary   | `text-foreground`, page title `text-3xl font-semibold tracking-tight`, card titles `text-lg font-semibold` |
| Text — secondary | `text-muted-foreground`; `text-primary` for "Our Goal", active tab, and code accents |
| Spacing          | `space-y-6`, card `p-5 md:p-6`, category grid `sm:grid-cols-3 lg:grid-cols-5 gap-3`, MCP body `md:grid-cols-[220px_1fr]` |
| Accent usage     | `bg-primary/10 text-primary` icon tiles + active tab; `bg-primary/5` code chips + "Our Goal" callout |

**Pattern notes:**
Matches `context/designs/documentation.png`. Server `page.tsx` reads the real token via `getOrCreateAccessToken()` and passes it to the client `DocumentationView` (Suspense-wrapped — `McpDocs` reads `?tab=`). Sections are separate files: `AboutCard`, `Pillars` (4 philosophy cards), `Categories` (15 pills; per-category lucide icon + tint map, sanctioned like `CATEGORY_META`; inline `GithubMark` SVG since lucide dropped brand glyphs), and `McpDocs`. **`McpDocs`** has a functional side-tab rail via `useTabParam` (default `overview` = clean URL; others set `?tab=endpoint|authentication|tools|examples|security`). Overview renders the intro **plus** every sub-section stacked; a specific tab renders just that section. **Real MCP data:** endpoint `${origin}/mcp` (`useOrigin`), and the Authentication chip + Usage-Examples curl show the real DB access token (masked by default, eye-reveal + `useCopy`). The Usage-Examples curl is syntax-highlighted via **`CurlBlock`** (`prism-react-renderer`, `bash`) — see `library-docs.md`. Verified light/dark + mobile (tab rail scrolls horizontally, cards stack) with Playwright. The header book-icon links to `#mcp-docs`.
