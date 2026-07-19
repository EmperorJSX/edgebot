<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

---

# edgebot

The **`context/` folder is the source of truth** for this project — what it is, how it's built, and the conventions to follow. Read it before writing any code.

## Read before anything else

In this order:

1. `context/project-overview.md` — what this app is and who it's for
2. `context/architecture.md` — stack, file layout, the module pattern
3. `context/ui-tokens.md` — design tokens (light + dark)
4. `context/ui-rules.md` — layout, theming, mobile-first, component rules
5. `context/ui-registry.md` — components already built (reuse before creating)
6. `context/code-standards.md` — TypeScript / Hono / Drizzle / React conventions
7. `context/library-docs.md` — rules for the libraries installed here
8. `context/build-plan.md` — the phased feature plan
9. `context/progress-tracker.md` — what's done, in progress, and next

Visual designs, when present, live in `context/designs/` and are the source of truth for UI.

## How to work

- **Context first, code second.** The files above define this project's conventions — follow them, don't guess.
- **Reuse before writing.** Check `context/ui-registry.md` and `src/lib/*` before adding a component, hook, or helper. Extract and import; don't copy-paste.
- **Keep context current.** After each feature, update `context/progress-tracker.md` (and `context/ui-registry.md` if you added a component).
- **Check library rules first.** Before using a third-party library, read `context/library-docs.md`.

## New project? Make the context yours

The `context/` files ship as **generic starting points**. Before building, replace the placeholders:

- Rewrite `context/project-overview.md` and `context/build-plan.md` for edgebot.
- Clear the sample images in `context/designs/` and add your own.
