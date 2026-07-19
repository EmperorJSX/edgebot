# UI Rules

How to build EmperorJS Projects UI. The designs in `context/designs/` are the source of truth for visuals; these rules keep things consistent. Use tokens from `context/ui-tokens.md` — never hardcode colors.

---

## Mobile-first, always

Design the **small screen first**, then layer breakpoints up.

- Base classes target mobile. Add `md:` / `lg:` for larger screens — never the reverse.
- Grids start single-column: `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`.
- Tap targets ≥ 36px. Don't rely on hover for anything essential.
- Test at 375px wide before anything else.

## Light + dark

Every screen must work in both themes. Because we use semantic tokens, this is automatic — but:

- Never use a literal color where a token exists.
- Test both themes (toggle in the sidebar / mobile top bar — `<ThemeToggle>`).
- Don't set a fixed white/black; use `bg-card` / `text-foreground`.

## App shell (`<AppShell>`)

The authed area uses a **sidebar on desktop, drawer on mobile** (matches the design — not a top navbar):

- **md+**: fixed left sidebar (`w-60`, `bg-sidebar`, `border-r border-border`) — brand, nav, then user card + theme toggle + sign-out pinned to the bottom.
- **mobile**: a top bar (hamburger + brand + theme toggle); tapping the hamburger opens an off-canvas drawer with the same nav. Nav taps close the drawer.
- **Active nav item**: `bg-primary/10 text-primary`. Idle: `text-muted-foreground hover:bg-accent`. Active state is derived from `usePathname()`.
- Nav icons are from **lucide-react**. Unbuilt modules render as disabled "Coming soon" rows.
- Page content: `mx-auto max-w-6xl p-5 md:p-8`.

## Cards

Every content block is a card: `rounded-xl border border-border bg-card p-4` (or `p-6`). Color lives _inside_ cards (badges, text, icons) — never tint the card surface itself.

## Typography

- Page title: `text-2xl font-semibold tracking-tight`, with a `text-sm text-muted-foreground` subtitle.
- Section heading: `text-sm font-medium text-muted-foreground`.
- Body: `text-foreground`; secondary/labels/timestamps: `text-muted-foreground`.
- Stat numbers: `text-3xl font-semibold tabular-nums`.

## Buttons

- **Primary**: `rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50`.
- **Secondary**: `rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-accent`.
- **Destructive**: text-only `text-rose-500 hover:text-rose-600` (with a `confirm()` for deletes).
- Show a pending label on submit (`{isPending ? "Saving…" : "Save"}`) and disable the button.

## Form inputs

`w-full rounded-lg border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-ring`. Labels: `mb-1.5 block text-sm font-medium`.

## Lists & tables

- List/table containers are cards. Rows separated by `divide-y divide-border`; row hover `hover:bg-accent`.
- Column headers (when used): `text-xs text-muted-foreground`.
- On mobile, prefer stacked rows or horizontal scroll over cramped multi-column tables.

## Badges

Pill shape `rounded-full px-2 py-0.5 text-xs font-medium`. Status badges come from `<StatusBadge>` / `<ProjectStatusBadge>` only.

## Empty states

Every list that can be empty shows one: dashed-border card, `text-muted-foreground` message, and a CTA link (e.g. "Create your first project"). Loading uses a simple `text-muted-foreground` "Loading…".

## Avatars

Colored circle with an initial: `flex size-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground`. Team member stacks overlap with `-space-x-2`.

## Do nots

- Never hardcode hex or use raw Tailwind color classes.
- Never tint a card background.
- Never build desktop-first then bolt on mobile.
- Never assume light mode (no literal white/black).
- Never show raw API errors — surface human-readable text.
- Never call `fetch` in a component — use `useHonoQuery` / `useHonoMutation`.
