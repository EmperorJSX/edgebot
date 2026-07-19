# UI Tokens

Design tokens for EmperorJS Projects. Colors, radius, and type are driven by **semantic tokens** so the same classes work in light and dark. Never hardcode hex; never use raw Tailwind color classes (`bg-indigo-500`, `text-gray-600`). Use the tokens below.

Reference design: `context/designs/`. Accent is **indigo/violet**; surfaces are white cards on a faint-gray page (light) / elevated cards on near-black (dark).

---

## How it works (Tailwind v4 + next-themes)

Tokens are CSS variables defined in `src/app/globals.css` — once under `:root` (light) and overridden under `.dark`. They're mapped to Tailwind utilities with `@theme inline`, so `bg-card`, `text-muted-foreground`, `border-border`, etc. recolor automatically when the `.dark` class flips. Dark mode is class-based (next-themes), enabled via:

```css
@custom-variant dark (&:where(.dark, .dark *));
```

```tsx
// Correct — semantic tokens, theme-agnostic
className = "bg-card text-foreground border-border";
// Correct — accent
className = "bg-primary text-primary-foreground";
// Never — hardcoded hex
className = "bg-[#6366f1] text-[#101828]";
// Never — raw Tailwind colors
className = "bg-indigo-500 text-gray-600";
```

No `tailwind.config.ts` for colors — everything is `@theme` + CSS vars in `globals.css`.

---

## The tokens

| Token                          | Light     | Dark      | Use                                            |
| ------------------------------ | --------- | --------- | ---------------------------------------------- |
| `background`                   | `#f6f7fb` | `#0b0e14` | Page background                                |
| `foreground`                   | `#101828` | `#e6e8ee` | Primary text                                   |
| `card` / `card-foreground`     | `#ffffff` | `#12161f` | Card/panel surface + text on it                |
| `muted`                        | `#eef1f7` | `#1a1f29` | Subtle fills                                   |
| `muted-foreground`             | `#6a7282` | `#9aa3b2` | Secondary text, labels, timestamps, nav-idle   |
| `border` / `input`             | `#e6e8f0` | `#232a36` | Borders, dividers, input outlines              |
| `primary` / `primary-foreground` | `#6366f1` / `#fff` | `#6366f1` / `#fff` | Buttons, active nav, links, logo, focus |
| `accent` / `accent-foreground` | `#eef1f7` | `#1a1f29` | Hover surfaces, pills                          |
| `ring`                         | `#6366f1` | `#818cf8` | Focus ring                                     |
| `sidebar`                      | `#ffffff` | `#0f131b` | Sidebar / top-bar surface                      |
| `scrollbar-thumb` / `-hover`   | `#d2d6e0` / `#aab2c2` | `#2b3340` / `#3a4453` | Custom scrollbar thumb (resting / hover) |

> `--scrollbar-thumb` / `--scrollbar-thumb-hover` are used **directly in CSS** (the `scrollbar-*` + `::-webkit-scrollbar-*` rules in `globals.css`), not mapped as Tailwind utilities — so they are not in `@theme inline`. They give every scroll container (modal bodies, dropdowns, the page) a slim rounded pill that recolors with the theme.

Generated utilities: `bg-*`, `text-*`, `border-*` for each (e.g. `bg-card`, `text-muted-foreground`, `border-border`, `bg-primary`, `text-primary-foreground`, `ring-ring`, `bg-sidebar`).

### Quick usage guide

| Element                     | Token(s)                                            |
| --------------------------- | --------------------------------------------------- |
| Page                        | `bg-background text-foreground` (body sets this)    |
| Card / list / panel         | `bg-card border border-border rounded-xl`           |
| Heading / body              | `text-foreground`                                   |
| Secondary / muted text      | `text-muted-foreground`                             |
| Primary button              | `bg-primary text-primary-foreground hover:opacity-90` |
| Secondary button            | `border border-border hover:bg-accent`              |
| Active nav item             | `bg-primary/10 text-primary`                        |
| Idle nav item               | `text-muted-foreground hover:bg-accent hover:text-foreground` |
| Input                       | `border border-border bg-transparent focus:border-ring` |

---

## Status badges

Status colors use Tailwind's palette at low-opacity backgrounds with theme-aware text — the one sanctioned use of named colors, kept in `src/lib/{ideas,projects}.ts` as `STATUS_STYLE` maps (do not inline elsewhere). Pattern:

```
inline-flex rounded-full px-2 py-0.5 text-xs font-medium <bg + text>
```

- **Idea statuses** (`STATUS_STYLE` in `lib/ideas.ts`): brainstorming=indigo, researching=sky, validating=violet, approved=emerald, rejected=rose, converted=blue — each `bg-<c>-500/15 text-<c>-700 dark:text-<c>-400`.
- **Project statuses** (`PROJECT_STATUS_STYLE` in `lib/projects.ts`): planning=amber, designing=fuchsia, development=sky, testing=violet, ready=teal, live=emerald, maintenance=blue, archived=neutral.

Rendered by `<StatusBadge>` (ideas) and `<ProjectStatusBadge>` (projects).

---

## Type, spacing, radius

- **Font:** Geist Sans (`--font-sans`, set in root layout via `next/font`). `tabular-nums` for stat numbers.
- **Headings:** page title `text-2xl font-semibold tracking-tight`; section heading `text-sm font-medium text-muted-foreground`; stat number `text-3xl font-semibold`.
- **Spacing:** card padding `p-4`–`p-6`; section gaps `space-y-6`/`space-y-8`; field gaps `space-y-4`/`gap-4`.
- **Radius:** cards `rounded-xl`, controls/buttons `rounded-lg`, badges/avatars `rounded-full`.

---

## Invariants

- Never hardcode hex in components. Never use raw Tailwind color classes — only semantic tokens (status badges are the lone exception, and only via the `STATUS_STYLE` maps).
- Every surface that has a background must use `bg-card` (or `bg-background`/`bg-muted`/`bg-accent`) — never a literal color — so dark mode works.
- New theme values are added as CSS vars in `:root` AND `.dark`, then mapped in `@theme inline`. Never add colors in a config file.
- `primary` is the only accent (indigo). Never reach for Tailwind's `indigo-*`/`violet-*` directly.
