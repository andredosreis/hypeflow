# HypeFlow OS

> **Multi-tenant CRM and marketing automation platform for agencies.**
> Built as a Turborepo monorepo with Next.js 14, tRPC, and Supabase.

HypeFlow OS is a SaaS designed around the agency–client relationship: agency staff manage many clients, each client has its own pipeline, leads, ad spend, calls, and an isolated read-only portal. Agency users and client users coexist behind the same tRPC API, separated by two authorization contexts and Postgres RLS.

This repository contains the product (`hypeflow-os/`), its marketing site (`hype-flow-landing/`), and supporting framework material. **All product work happens in `hypeflow-os/`.**

---

## At a glance

| App | Port | Audience | tRPC namespace |
|---|---|---|---|
| `apps/hypeflow` | 3000 | Agency staff (admin) — primary product | `admin.*` |
| `apps/agency` | 3010 | Secondary agency UI (legacy, scoped down) | `admin.*` |
| `apps/portal` | 3012 | Clients (read-only dashboards, ROI, pipeline view) | `portal.*` |

| Layer | Choice |
|---|---|
| Framework | Next.js 14.2 (App Router, RSC) |
| Language | TypeScript 5.7 (strict) |
| API | tRPC 11 + React Query 5 + SuperJSON |
| Database | Supabase (PostgreSQL 15 + RLS) |
| Auth | Supabase Auth (email/password, dual-user model) |
| UI | Tailwind 3.4 + Framer Motion + Recharts + dnd-kit |
| State | Zustand (client) · React Query (server) |
| Workflow builder | `@xyflow/react` (visual DAG editor) |
| Email | Resend |
| Validation | Zod 3 |
| Phone normalization | libphonenumber-js (E.164) |
| Build | Turborepo 2.9 |
| Tests | Vitest 4.1 (unit) · Playwright 1.59 (E2E) |
| Runtime | Node 18+ · npm 10.x |
| Deploy | Vercel (one project per app) |

---

## Repository layout

```
hypeflow/
├── hypeflow-os/                  # ← the product (everything below)
│   ├── apps/
│   │   ├── hypeflow/             # @hypeflow/app — agency dashboard (3000)
│   │   ├── agency/               # @hypeflow/agency — secondary UI (3010)
│   │   └── portal/               # @hypeflow/portal — client portal (3012)
│   ├── packages/
│   │   ├── database/             # generated Supabase types
│   │   ├── ui/                   # shared React components
│   │   ├── integrations/         # third-party API clients
│   │   ├── email/                # Resend templates
│   │   └── config/               # shared ESLint / TS config
│   ├── supabase/
│   │   ├── migrations/           # numbered SQL migrations (0001 → N)
│   │   └── functions/            # Supabase Edge Functions
│   ├── package.json              # workspace root
│   ├── turbo.json                # task pipeline
│   └── vercel.json
│
├── hype-flow-landing/            # marketing site (independent lifecycle)
│
├── docs/                         # source-of-truth project documentation
│   ├── prd/                      # Product Requirements
│   ├── architecture/             # HLDs, system diagrams
│   ├── fdd/                      # Feature Design Documents
│   ├── adrs/                     # Architecture Decision Records
│   ├── stories/                  # Story-driven development log
│   ├── epics/                    # Epic overviews
│   ├── guidelines/               # Task-specific authoring guides
│   ├── mermaid/                  # Diagram sources
│   ├── audits/                   # Security audits & remediation
│   └── test-cases-e2e-*.md       # E2E test plans
│
├── squads/                       # AIOX Squads catalog (community framework)
├── .aios-core/                   # AIOS development framework
├── .claude/                      # Claude Code agent definitions & rules
└── CLAUDE.md                     # Agent-readable project instructions
```

> The `squads/` and `.aios-core/` directories belong to a separate development tooling concern (AIOS-driven AI agent workflows). They are not part of the HypeFlow OS runtime and can be ignored if you only need to ship features.

---

## Getting started

### Prerequisites

- **Node.js 18+** (project tested on 20 and 24)
- **npm 10.x** — _do not use pnpm or yarn_; the workspace is npm-only
- **Supabase CLI** — `npm install -g supabase` or `brew install supabase/tap/supabase`
- A Supabase project (free tier is fine for development)

### Install

```bash
git clone <repo-url> hypeflow
cd hypeflow/hypeflow-os
cp .env.example .env.local       # fill the values listed below
npm install
```

### Required environment variables

Minimum to boot the app and reach the login screen:

```env
# Supabase (from project Settings → API)
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>

# App URLs (used by middleware and OAuth callbacks)
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_PORTAL_URL=http://localhost:3012

# Preview / demo gate — must be `false` outside of demo screenshots.
# Setting `true` disables the auth layer (Story 01.11 / audit C1).
NEXT_PUBLIC_PREVIEW_MODE=false

# Webhook ingestion log salt (Story 03.1) — required in production
HYPEFLOW_LOG_SALT=<random-string>
```

Additional integrations (Google, Meta, LinkedIn, TikTok, Resend, Sentry, PostHog, Anthropic) are in `.env.example` and can be filled as you enable each feature.

### Database

```bash
# Link the workspace to your Supabase project (one-time)
cd hypeflow-os
supabase link --project-ref <project-ref>

# Apply all migrations
npm run db:push

# Regenerate TypeScript types from the live schema
# (run after every schema change — stale types break the whole monorepo)
npm run db:types
```

### Run

```bash
# Main agency dashboard only (port 3000) — the typical dev loop
npm run dev

# All three apps in parallel (3000, 3010, 3012)
npm run dev:all
```

Verify: `http://localhost:3000` returns the login page (or a demo dashboard if `NEXT_PUBLIC_SUPABASE_URL` is the placeholder value). Stop with `Ctrl+C`.

---

## Common commands

All commands run from `hypeflow-os/` unless noted.

| Command | Purpose |
|---|---|
| `npm run dev` | Start `@hypeflow/app` only (3000) |
| `npm run dev:all` | Start all three apps in parallel |
| `npm run build` | Production build of the main app |
| `npm run lint` | ESLint across every workspace |
| `npm run typecheck` | `tsc --noEmit` across every workspace |
| `npm run test` | Turbo-orchestrated unit tests (Vitest) |
| `npm run db:push` | Apply `supabase/migrations/` to the linked project |
| `npm run db:types` | Regenerate `packages/database/src/types.ts` |
| `npm run format` | Prettier across `*.{ts,tsx,md}` |

**Single workspace:**
```bash
npx turbo run <task> --filter=@hypeflow/app
```

**Single Vitest file:**
```bash
cd apps/hypeflow && npx vitest run path/to/file.test.ts
```

**Playwright (E2E):**
```bash
cd apps/hypeflow
npx playwright test                    # headless, all specs
npx playwright test --headed           # visible browser (preferred for local debugging)
npx playwright test tests/e2e/<spec>   # single spec
```

---

## Architecture

### Multi-tenancy model

The system has **two user populations** sharing one database:

```
Agency  ──┬──  agency users        ─→  uses apps/hypeflow + apps/agency
          │       (admins, staff)        admin.* tRPC procedures
          │
          └──  clients             ─→  client users use apps/portal
                  └─ leads, calls, pipeline, ROI         portal.* tRPC procedures
```

- `agencies` is the root tenant. Every business row carries `agency_id`.
- **RLS policies** enforce isolation at the database level — `get_user_agency_id()` and `is_agency_admin()` are SQL helpers used by every policy.
- `users` table = agency staff (with roles: `admin` / `member`).
- `client_users` table = client portal users — read-only access scoped to their `client_id` via `get_client_user_client_id()`.

See [`docs/guidelines/multi-tenancy.md`](docs/guidelines/multi-tenancy.md) before adding any new table or RLS policy.

### API layer (tRPC)

- Two router roots: `admin.*` (agency authority) and `portal.*` (client authority).
- Procedures: `agencyProcedure` (verifies `agency_id` from session) and `clientProcedure` (verifies `client_id` from session).
- Service-role usage is isolated to a single `createServiceClient()` helper — never instantiated outside the bootstrap and webhook ingestion layers.

See [`docs/guidelines/api-patterns.md`](docs/guidelines/api-patterns.md) before adding a route.

### Lead Ingestion Hub

Universal contract that every external provider (WhatsApp via Evolution API, web forms via Tally, ad lead-gen, etc.) normalizes to a canonical `LeadDTO` before it reaches the database.

```
Provider webhook
      │
      ▼
[ size guard → auth (token | HMAC) → client lookup → rate limit
              → adapter.parse → Zod validate → dedup → score-stub → persist ]
      │
      ▼
leads (or webhook_failures dead-letter)
```

Adapters live in `apps/hypeflow/lib/ingestion/adapters/`. Currently shipped:
- **Evolution API** (WhatsApp) — bearer token, `messages.upsert` / `contacts.upsert`
- **Tally** (web forms) — HMAC-SHA256 base64, `FORM_RESPONSE`

See [`docs/fdd/lead-ingestion-hub-fdd.md`](docs/fdd/lead-ingestion-hub-fdd.md) and [`docs/guidelines/webhooks-and-integrations.md`](docs/guidelines/webhooks-and-integrations.md).

### Authentication

- Supabase Auth (email/password) with middleware-level session verification on every route.
- Middleware uses an explicit `NEXT_PUBLIC_PREVIEW_MODE` flag to skip auth for demo screenshots — this must always be `false` in production (audit C1).
- Client portal uses opaque random tokens (32 bytes base64url) hashed with SHA-256, stored in `portal_tokens` and validated via Server Components before any client UI renders (audit C5).

---

## Database

PostgreSQL via Supabase. Schema is migration-driven — every change is a numbered SQL file in `hypeflow-os/supabase/migrations/`.

### Core tables

| Table | Purpose |
|---|---|
| `agencies` | Root tenant accounts |
| `users` | Agency staff (`admin` / `member` roles) |
| `client_users` | Client portal users |
| `clients` | Client accounts under an agency |
| `leads` | Lead records (event_id, normalized email/phone, source platform, raw payload, schema version) |
| `pipeline_stages` | Customizable Kanban stages per agency |
| `calls` | Scheduled / completed calls (Google Meet integration) |
| `automations_rules` / `automation_logs` | Trigger → conditions → actions automation engine |
| `integrations` | OAuth tokens for Google / Meta / LinkedIn / TikTok |
| `traffic_metrics` | Daily ad spend, clicks, leads, conversions per platform |
| `pixels` / `pixel_events` | Server-side conversion tracking |
| `lead_interactions` | Email / phone / meeting history |
| `portal_tokens` | Opaque hashed tokens for client portal access |
| `webhook_failures` | Dead-letter queue for invalid webhook payloads |
| `ai_rate_limits` | Counter rows for shared rate-limit helper |

### Migrations

Each migration is transactional, additive-by-default, and references the originating story or audit. Backfills happen before any `NOT NULL` constraint is added — see [`docs/guidelines/migrations.md`](docs/guidelines/migrations.md) for the playbook.

After applying any migration, **always run `npm run db:types`** — stale Supabase types break TypeScript across every workspace.

---

## Testing

| Layer | Stack | Location | Run |
|---|---|---|---|
| Unit / integration | Vitest 4.1 + Testing Library + MSW | `apps/hypeflow/__tests__/` | `npm run test` |
| End-to-end | Playwright 1.59 (Chromium) | `apps/hypeflow/tests/e2e/` | `cd apps/hypeflow && npx playwright test --headed` |

Unit tests cover the ingestion pipeline (auth, adapters, dedup, persist, dead-letter), middleware preview-mode gating, workspace bootstrap, portal token validation, and tRPC procedures with mocked Supabase clients.

E2E tests cover the admin login flow, role-based access (agency vs client), portal token round-trip, webhook auth surfaces (401 paths) and pipeline drag-and-drop. See [`docs/test-cases-e2e-admin.md`](docs/test-cases-e2e-admin.md) and [`docs/test-cases-e2e-client.md`](docs/test-cases-e2e-client.md).

---

## Documentation

The `docs/` tree is the source of truth for product and engineering decisions.

| Folder | What's there |
|---|---|
| [`docs/prd/`](docs/prd/) | Product requirements — `hypeflow-os-prd.md` is the canonical scope document |
| [`docs/architecture/`](docs/architecture/) | High-Level Designs (HLDs) per module |
| [`docs/fdd/`](docs/fdd/) | Feature Design Documents — one per feature, signed off before implementation |
| [`docs/adrs/`](docs/adrs/) | Architecture Decision Records — irreversible decisions and their rationale |
| [`docs/stories/`](docs/stories/) | Story-driven development log — every PR traces to a numbered story |
| [`docs/epics/`](docs/epics/) | Epic overviews — `EPICS-OVERVIEW.md` is the roadmap index |
| [`docs/guidelines/`](docs/guidelines/) | **Read these before touching the corresponding area** |
| [`docs/mermaid/`](docs/mermaid/) | Diagram sources (rendered into HLDs and FDDs) |
| [`docs/audits/`](docs/audits/) | Security audits and the remediation log |

### Mandatory guideline reads

| Before you... | Read |
|---|---|
| Add or modify a tRPC route | [`docs/guidelines/api-patterns.md`](docs/guidelines/api-patterns.md) |
| Create a Supabase migration | [`docs/guidelines/migrations.md`](docs/guidelines/migrations.md) |
| Create a new table or RLS policy | [`docs/guidelines/multi-tenancy.md`](docs/guidelines/multi-tenancy.md) |
| Touch `apps/*/app/api/webhooks/` or `packages/integrations/` | [`docs/guidelines/webhooks-and-integrations.md`](docs/guidelines/webhooks-and-integrations.md) |
| Create a PRD / FDD / ADR / story | [`docs/guidelines/documentation-layout.md`](docs/guidelines/documentation-layout.md) |
| Write any `.ts` / `.tsx` | [`docs/guidelines/typescript-development-guidelines.md`](docs/guidelines/typescript-development-guidelines.md) |
| Write `.tsx` with Server / Client boundaries | [`docs/guidelines/nextjs-best-practices-guidelines.md`](docs/guidelines/nextjs-best-practices-guidelines.md) |

---

## Deployment

Deployed on **Vercel**, one project per app rooted at:

| Vercel project | Root directory | Production domain (target) |
|---|---|---|
| `hypeflow-app` | `hypeflow-os/apps/hypeflow` | `app.hypeflow.com` |
| `hypeflow-agency` | `hypeflow-os/apps/agency` | `agencia.hypeflow.com` |
| `hypeflow-portal` | `hypeflow-os/apps/portal` | `portal.hypeflow.com` |

Each project links to the same GitHub repository and is configured with its own environment variables. PRs deploy to Vercel preview URLs; merges to `main` deploy to production.

**Database migrations** are applied via the Supabase CLI before pushing schema-dependent application code:

```bash
cd hypeflow-os
supabase link --project-ref <prod-project-ref>
npm run db:push
npm run db:types        # regenerate types from prod schema
git commit -am "chore(db): regenerate types from migration NNNN"
```

A formal production runbook (Supabase prod setup, Vercel project creation, GitHub Actions CI/CD, smoke tests, DNS cutover) will live under `docs/runbooks/` once finalized.

---

## Development workflow

The codebase follows **story-driven development** under the AIOS framework:

1. Every change starts as a numbered story in [`docs/stories/`](docs/stories/) with explicit Acceptance Criteria.
2. Implementation, unit tests, and E2E tests land in the same PR.
3. Validation gates: `npm run lint && npm run typecheck && npm run test` plus Playwright E2E for any user-visible change.
4. Commits use Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`) with the story ID in the body.
5. The story file is updated to `Status: Done` with a `File List` section before merge.

Agent-driven workflows (Claude Code) are configured under [`.claude/`](.claude/) and described in [`CLAUDE.md`](CLAUDE.md). They are optional — the project also works with any standard editor and toolchain. The constitution at [`.aios-core/constitution.md`](.aios-core/constitution.md) defines non-negotiable principles for AI-driven contributions.

---

## Other folders in this monorepo

These are co-located but independent of HypeFlow OS:

- **`hype-flow-landing/`** — Marketing website (separate Next.js project, independent deploy).
- **`squads/`** — Community catalog of AIOS agent squads (development tooling, not product runtime).
- **`.aios-core/`** — AIOS development framework files.

If you're shipping product features, you can ignore everything outside `hypeflow-os/` and `docs/`.

---

## License

Proprietary — all rights reserved. Internal use only unless granted otherwise in writing.
