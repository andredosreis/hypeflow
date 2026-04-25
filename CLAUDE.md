# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Summary

HypeFlow OS is a multi-tenant CRM and marketing automation platform for agencies, built as a Turborepo monorepo with three Next.js apps (agency dashboard, secondary agency UI, client portal) sharing one Supabase/PostgreSQL database. Agency staff and client users coexist behind the same tRPC API via two authorization contexts.

## Tech Stack

Next.js 14.2 (App Router) · TypeScript 5.7 · Supabase (PostgreSQL + Auth + RLS) · tRPC 11 + React Query 5 · Tailwind 3.4 · Turborepo 2.9 · Node 18+ / npm 10.x · Deployed on Vercel (one project per app in `apps/`).

## Environment

All product work happens in `hypeflow-os/`. Package manager is **npm 10.x** — do not use pnpm or yarn.

```bash
cd hypeflow-os
cp .env.example .env.local       # fill Supabase + OAuth keys
npm install
npm run dev                       # main app on :3000
# or
npm run dev:all                   # all three apps (3000, 3010, 3012)
```

**Verify running:** `http://localhost:3000` returns the login page (or a demo dashboard if `NEXT_PUBLIC_SUPABASE_URL` is a placeholder).  
**Stop:** `Ctrl+C` in the terminal running `turbo dev`.

## Commands (from `hypeflow-os/`)

| Command | Purpose |
|---|---|
| `npm run lint` | ESLint across all workspaces |
| `npm run typecheck` | `tsc --noEmit` across all workspaces |
| `npm run test` | Turbo-orchestrated tests |
| `npm run build` | Production build of main app |
| `npm run db:push` | Apply `supabase/migrations/` to the linked Supabase project |
| `npm run db:types` | Regenerate `packages/database/src/types.ts` |

**Single workspace only:** `npx turbo run <task> --filter=@hypeflow/<pkg>`  
**Single Jest file:** `cd apps/hypeflow && npx jest path/to/file.test.ts`

## Folder Structure

```
hypeflow/
├── hypeflow-os/                   # the product — all commands run here
│   ├── apps/
│   │   ├── hypeflow/              # agency dashboard :3000  (@hypeflow/app · admin.* tRPC)
│   │   ├── agency/                # secondary agency UI :3010
│   │   └── portal/                # client portal :3012         (portal.* tRPC)
│   ├── packages/                  # database · ui · integrations · email · config
│   └── supabase/
│       ├── migrations/            # numbered SQL migrations
│       └── functions/             # edge functions
├── hype-flow-landing/             # marketing site (independent lifecycle)
├── squads/                        # AIOX Squads community catalogue
└── docs/
    ├── guidelines/                # task-specific guides — see triggers below
    ├── prd/  architecture/  fdd/  adrs/  stories/  mermaid/
    └── ...
```

## Universal Rules

1. **Scope lives in `hypeflow-os/`.** Any mention of leads, CRM, pipeline, webhooks, tRPC, or migrations points there. `cd hypeflow-os` before running product scripts.
2. **System runs in production with live data.** Migrations that touch existing rows must backfill before adding constraints — see `docs/guidelines/migrations.md`.
3. **After any schema change, run `npm run db:types`.** Stale types break TypeScript across every workspace.

## Triggers — read before acting

| Before you... | Read |
|---|---|
| Add/modify a tRPC route or edit `apps/*/server/` | `docs/guidelines/api-patterns.md` |
| Create or edit a file in `hypeflow-os/supabase/migrations/` | `docs/guidelines/migrations.md` |
| Create a new DB table or RLS policy | `docs/guidelines/multi-tenancy.md` |
| Touch `apps/*/app/api/webhooks/` or `packages/integrations/` | `docs/guidelines/webhooks-and-integrations.md` |
| Create a PRD / FDD / ADR / story / diagram | `docs/guidelines/documentation-layout.md` |
| Write any `.ts` / `.tsx` | `docs/guidelines/typescript-development-guidelines.md` |
| Write `.tsx` with Server/Client boundaries | `docs/guidelines/nextjs-best-practices-guidelines.md` |

The AIOS framework (agent activation, story-driven workflow, L1–L4 mutability) is covered in `.claude/CLAUDE.md` and loads separately.
