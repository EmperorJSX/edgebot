# Project Overview

## What this is

**EmperorJS Projects** (`projects.emperorjs.com`) is a private internal web app — the central hub for brainstorming, organizing, planning, building, and managing every project under the EmperorJS brand. Instead of ideas scattered across notebooks, chats, and docs, everything lives in one intelligent workspace.

It models the full project lifecycle:

> Idea → Brainstorm → Validation → Planning → Development → Documentation → Launch → Maintenance

## Who uses it

**One user** (the owner). This is a personal tool, so:

- Auth is a single **access token** — no email, no sign-up, no accounts.
- Content (ideas, projects) belongs to the **workspace**, not to a user row.
- **Teams** are a content concept: there is one workspace team made of named members with roles (Founder, Admin, Developer, Designer, Viewer). Projects assign team members via `teamMemberIds`. Team members are NOT logins or access boundaries.

## Modules

| Module        | Status      | Notes                                                             |
| ------------- | ----------- | ----------------------------------------------------------------- |
| Auth          | ✅ Built    | Single access token → session cookie                              |
| Dashboard     | ✅ Built    | Stat cards + recent projects/ideas; realtime                      |
| Ideas         | ✅ Built    | Capture, status workflow, tags, full field set                    |
| Projects      | ✅ Built    | Full info + status workflow + assigned team members               |
| Teams         | ✅ Built    | One workspace team + members with roles, assignable to projects   |
| Documentation | ⬜ Planned  | Per-project markdown docs (overview, architecture, API, etc.)     |
| Search        | ⬜ Planned  | Global search across projects, ideas, members, tags               |
| Activity Feed | ⬜ Planned  | Global activity log                                               |

Everything else in the PRD (AI workspace, kanban, calendar, etc.) is post-MVP.

## Status workflows

- **Idea**: Brainstorming → Researching → Validating → Approved → Rejected → Converted to Project
- **Project**: Planning → Designing → Development → Testing → Ready for Launch → Live → Maintenance → Archived

## Product principles

- Single source of truth for every EmperorJS project.
- Everything documented; knowledge persists across projects.
- Fast to capture an idea, fast to find anything.
- Realtime — changes reflect live across open tabs.

See `context/architecture.md` for how it's built and `context/build-plan.md` for what's next.
