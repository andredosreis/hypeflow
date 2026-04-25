# Codebase Architecture Mapping

**Generated:** 2026-04-22
**Analyzed by:** ADR Map — Phase 1
**Project directory:** `hypeflow-os/`

---

## Project Overview

**Name:** HYPE Flow OS
**Purpose:** Multi-tenant SaaS platform for marketing agencies to manage leads, pipelines, paid-traffic analytics, sales automation, and client reporting. Agencies manage multiple clients through a single workspace; each client gets a read-only portal to track their own results.
**Type:** B2B SaaS — Agency Operations Platform
**Primary language:** TypeScript (100% of application code)
**Primary framework:** Next.js 14 (App Router)
**Monorepo tool:** Turborepo

**Git timeline:** Initial commit 2026-04-06. Delivered in 19 rapid "Wave" iterations between 2026-04-06 and 2026-04-18. Active development underway.

---

## Technology Stack

### Frontend
| Technology | Version | Role |
|---|---|---|
| Next.js | 14 (App Router) | Full-stack React framework, SSR/SSG/RSC |
| React | 18 | Component model |
| TypeScript | 5.x | End-to-end type safety |
| Tailwind CSS | 3.x | Utility-first styling |
| Recharts | 2.x | Analytics charts and dashboards |
| @dnd-kit | 6.x / 8.x | Drag-and-drop (Kanban pipeline) |
| @xyflow/react | 12.x | React Flow — visual workflow builder canvas |
| Framer Motion | 11.x | UI animations |
| React Hook Form | 7.x | Form management |
| Zod | 3.x | Schema validation (forms + API boundaries) |
| date-fns | 4.x | Date manipulation |
| Lucide React | 0.474 | Icon library |
| TanStack React Query | 5.x | Server state and cache (via tRPC integration) |

### Backend / API Layer
| Technology | Version | Role |
|---|---|---|
| tRPC | 11.x | Type-safe RPC layer between Next.js front and back |
| superjson | 2.x | tRPC serializer (Date, BigInt, Map, Set support) |
| Next.js API Routes | 14 | Webhook receivers, AI endpoints |
| Supabase JS | 2.48 | BaaS client (DB, Auth, Realtime, Storage) |
| @supabase/ssr | 0.5 | SSR-safe Supabase client utilities |
| Anthropic API (Claude) | REST | AI assistant, automation generation, copy generation |

### Database / Infrastructure
| Technology | Role |
|---|---|
| PostgreSQL (via Supabase) | Primary data store — single source of truth |
| Supabase Auth | JWT-based authentication, OAuth |
| Supabase RLS | Row-Level Security — multi-tenant data isolation |
| Supabase Edge Functions | Background jobs (Deno runtime) |
| Supabase Storage | File storage (reports, logos) |
| Supabase Realtime | WebSocket subscriptions for live UI updates |
| pg_notify | Internal event bus for async triggers |

### External Integrations
| Service | Integration Method |
|---|---|
| Meta Marketing API (v19.0) | REST — ad campaign sync, insight metrics |
| Google Calendar API (v3) | OAuth 2.0 REST — call scheduling, meet links |
| Google Ads API | REST client (packages/integrations) |
| TikTok Ads API | Edge function sync |
| GoHighLevel (GHL) | Inbound webhook receiver (contact/opportunity/form events) |
| WhatsApp Business Cloud API | Outbound messages (call reminders, follow-ups) |
| Resend | Transactional emails |
| Anthropic Claude API | AI chat, automation JSON generation, copy writing |

### Infrastructure / Deployment
| Component | Technology |
|---|---|
| Hosting | Vercel (multiple apps) |
| Build orchestration | Turborepo |
| Package manager | npm 10.x |
| Node version | 18+ |
| Monitoring (planned) | Sentry (error tracking), PostHog (product analytics), Axiom (observability) |

---

## System Modules

### Module Index

| ID | Name | Description |
|---|---|---|
| INFRA | Infrastructure & Platform | Supabase, PostgreSQL, Edge Functions, hosting, monorepo configuration |
| AUTH | Authentication & Authorization | Supabase Auth, JWT, RLS, middleware routing, dual-user-type system |
| API | API Layer | tRPC router tree, Next.js API routes, domain-based organization |
| CRM | CRM — Leads & Pipeline | Lead management, pipeline stages, Kanban board, lead scoring, interactions |
| CLIENTS | Client Management | Agency client accounts, account managers, health scores, MRR tracking |
| ANALYTICS | Traffic & Analytics | Ad platform integrations, campaign metrics, attribution, ROI calculator |
| AUTOMATION | Automation Engine | Rule-based automations, visual workflow builder (React Flow), AI-generated flows |
| CALLS | Calls & Calendar | Call scheduling, Google Calendar sync, reminders, outcome tracking |
| AI | AI Features | HYPE AI assistant, automation generation, copy generation (all via Anthropic Claude) |
| INTEGRATIONS | External Integrations | Meta, Google Ads, TikTok, GHL webhook ingestion, pixel tracking, UTM templates |
| PORTAL | Client Portal | Read-only portal for end-clients — pipeline view, leads, calls, ROI, reports |
| UI | Shared UI & Layout | Admin navigation layout, providers, shared icons, TanStack Query + tRPC client setup |
| DATA | Data Layer & Schema | Database schema (3 migrations), types, seed, RLS policies, demo workspace bootstrap |
| EMAIL | Email & Notifications | Transactional email templates (Resend), call reminders, lead notifications, welcome |
| LANDING | Landing Page | Marketing landing (Vite + React, separate from the OS app) |
| SQUADS | AI Squads | AIOS meta-framework squads (framework tooling, not product code) |

---

### INFRA: Infrastructure & Platform

**Purpose:** Defines the monorepo structure, build orchestration, and all backing services that the product runs on.
**Location:** `hypeflow-os/`, `hypeflow-os/supabase/`, root `turbo.json`, `vercel.json`
**Key Components:**
- Turborepo workspace with `apps/*` and `packages/*` workspaces
- Supabase project (PostgreSQL + Auth + Edge Functions + Realtime + Storage)
- Vercel deployment targets (one per app)
- Supabase Edge Functions runtime (Deno)

**Technologies:** Turborepo, npm workspaces, Vercel, Supabase, Deno (Edge Functions)
**Dependencies:** None (foundational)
**Patterns:** Monorepo, BaaS (Backend-as-a-Service), serverless edge functions
**Key Files:**
- `hypeflow-os/package.json` — workspace root, Turborepo
- `hypeflow-os/turbo.json` — pipeline: build, dev, lint, typecheck, test
- `hypeflow-os/vercel.json` — deployment config
- `hypeflow-os/supabase/` — Supabase project files
**Scope:** Small — ~10 config files

---

### AUTH: Authentication & Authorization

**Purpose:** Handles all authentication flows (agency team vs client portal users) and enforces authorization via RLS at the database layer and middleware at the HTTP layer.
**Location:** `apps/hypeflow/middleware.ts`, `apps/hypeflow/lib/supabase/`, `apps/hypeflow/server/trpc.ts`, `supabase/migrations/0002_rls_policies.sql`
**Key Components:**
- Next.js middleware that guards `/admin/*` and `/client/*` routes
- Dual user type resolution: `users` table (agency team) vs `client_users` table (portal users)
- tRPC context resolves user type and exposes `agencyUser` / `clientUser` to procedures
- `agencyProcedure` and `clientProcedure` enforce authorization at the procedure level
- RLS policies enforced at PostgreSQL level for all 15 tables
- Demo/placeholder mode bypasses Supabase for local preview without credentials

**Technologies:** Supabase Auth, @supabase/ssr, Next.js middleware, tRPC middleware, PostgreSQL RLS
**Dependencies:** INFRA, DATA
**Patterns:** Role-based access control (RBAC), Row Level Security, JWT, middleware redirect routing, demo fallback pattern
**Key Files:**
- `apps/hypeflow/middleware.ts`
- `apps/hypeflow/lib/supabase/middleware.ts` — session refresh + redirect logic
- `apps/hypeflow/lib/supabase/server.ts` — `createClient()`, `createServiceClient()`, null client for demo
- `apps/hypeflow/server/trpc.ts` — tRPC context, `agencyProcedure`, `clientProcedure`
- `supabase/migrations/0002_rls_policies.sql` — all RLS policies
**Scope:** Medium — ~8 key files

---

### API: API Layer

**Purpose:** Provides a fully type-safe RPC API through tRPC, organized in a domain-based hierarchy. Also exposes raw Next.js API routes for webhooks and AI endpoints.
**Location:** `apps/hypeflow/server/`, `apps/hypeflow/app/api/`
**Key Components:**
- tRPC root router with `admin.*` and `portal.*` namespaces
- Admin domain tree: `crm.*` (leads, clients, pipeline, conversas), `analytics.*` (trafego, dashboard), `operacoes.*` (calls, equipa, parceiros), `conteudo.*` (playbooks, marketing), `automacoes.*` (automations, integrations, workflows)
- Portal domain tree: dashboard, leads, calls, roi, pipeline
- Next.js API routes: `/api/trpc/[trpc]`, `/api/webhooks/ghl`, `/api/ai/agent`, `/api/ai/automation`, `/api/ai/copy`

**Technologies:** tRPC v11, superjson, Next.js App Router API routes
**Dependencies:** AUTH, DATA
**Patterns:** tRPC end-to-end type safety, BFF (Backend For Frontend), domain-organized router tree, procedure-level authorization
**Key Files:**
- `apps/hypeflow/server/root.ts` — full router tree (appRouter)
- `apps/hypeflow/server/trpc.ts` — tRPC initialization, context, procedures
- `apps/hypeflow/server/routers/admin/` — 11 domain routers
- `apps/hypeflow/server/routers/client/` — 5 portal routers
- `apps/hypeflow/app/api/trpc/[trpc]/route.ts` — tRPC HTTP handler
**Scope:** Medium — ~18 router files

---

### CRM: Leads & Pipeline

**Purpose:** Core CRM functionality — lead lifecycle management from capture to close, pipeline visualization as a Kanban board, lead scoring, and interaction logging.
**Location:** `apps/hypeflow/app/(admin)/admin/contactos/`, `apps/hypeflow/app/(admin)/admin/pipeline/`, `apps/hypeflow/server/routers/admin/crm/`
**Key Components:**
- Lead list (contactos) with filtering, search, CSV export, UTM attribution display
- Kanban board (`pipeline`) using @dnd-kit for drag-and-drop stage transitions
- Lead score (0–100) with temperature classification (cold/warm/hot)
- Lead interaction timeline (calls, WhatsApp, email, form submissions)
- Add lead modal with live qualification score preview (Wave 17)
- CRM router: leads, clients, pipeline, conversas

**Technologies:** @dnd-kit/core, @dnd-kit/sortable, tRPC, Supabase, Recharts
**Dependencies:** AUTH, API, DATA
**Patterns:** Kanban with drag-and-drop, lead scoring engine, UTM attribution tracking, CRUD via tRPC
**Key Files:**
- `apps/hypeflow/app/(admin)/admin/pipeline/components/KanbanBoard.tsx`
- `apps/hypeflow/app/(admin)/admin/pipeline/components/KanbanCard.tsx`
- `apps/hypeflow/app/(admin)/admin/pipeline/components/KanbanColumn.tsx`
- `apps/hypeflow/server/routers/admin/crm/leads.ts`
- `apps/hypeflow/server/routers/admin/crm/pipeline.ts`
**Scope:** Large — ~15 files (page + components + routers)

---

### CLIENTS: Client Management

**Purpose:** Manages the agency's client accounts — creation, settings, account manager assignment, MRR tracking, health scores, and client user (portal access) management.
**Location:** `apps/hypeflow/app/(admin)/admin/clientes/`, `apps/hypeflow/server/routers/admin/crm/clients.ts`
**Key Components:**
- Client list and detail views
- Health score tracking (0–100)
- MRR and contract dates
- Multi-client workspace isolation (every entity has `agency_id` + `client_id`)
- Auto-provisioning of default pipeline stages and seed data on first login

**Technologies:** tRPC, Supabase, Next.js
**Dependencies:** AUTH, DATA, API
**Patterns:** Multi-tenant data model (agency_id scoping), workspace auto-provisioning
**Key Files:**
- `apps/hypeflow/server/routers/admin/crm/clients.ts`
- `apps/hypeflow/lib/bootstrap/workspace.ts` — workspace and seed data provisioning
- `supabase/migrations/0001_initial_schema.sql` — `clients`, `client_users` tables
**Scope:** Medium — ~8 files

---

### ANALYTICS: Traffic & Analytics

**Purpose:** Aggregates paid ad performance metrics from Meta, Google Ads, and TikTok. Displays campaign-level insights, CPL, ROAS, conversion attribution, and a ROI calculator.
**Location:** `apps/hypeflow/app/(admin)/admin/trafego/`, `apps/hypeflow/server/routers/admin/analytics/`, `packages/integrations/src/`
**Key Components:**
- Trafego page: paid traffic metrics dashboard with Recharts
- Campaign-level attribution (source → lead → conversion)
- Per-channel funnel conversion report (Wave 9)
- Campaign ROI calculator widget (Wave 13)
- Meta API client (packages/integrations/src/meta/client.ts)
- Google Ads API client (packages/integrations/src/google-ads/client.ts)
- Supabase Edge Functions for periodic ad data sync (sync-meta-ads, sync-tiktok-ads)
- `traffic_metrics` table with per-day, per-platform rows

**Technologies:** Meta Marketing API v19, Google Ads API, TikTok Ads API, Recharts, Supabase Edge Functions (Deno), tRPC
**Dependencies:** INTEGRATIONS, DATA, API
**Patterns:** Read-model analytics table (denormalized metrics), periodic sync via Edge Functions, multi-platform normalization
**Key Files:**
- `apps/hypeflow/app/(admin)/admin/trafego/` — dashboard UI
- `apps/hypeflow/server/routers/admin/analytics/trafego.ts`
- `packages/integrations/src/meta/client.ts`
- `packages/integrations/src/google-ads/client.ts`
- `supabase/functions/sync-meta-ads/index.ts`
- `supabase/functions/sync-tiktok-ads/index.ts`
**Scope:** Large — ~12 files

---

### AUTOMATION: Automation Engine

**Purpose:** Configurable rule-based automation system with two editors: a simplified visual editor (custom-built) and a full React Flow-based workflow builder. AI can generate automation flows from natural language.
**Location:** `apps/hypeflow/app/(admin)/admin/automacoes/`, `apps/hypeflow/server/routers/admin/automacoes/`, `supabase/functions/automation-engine/`
**Key Components:**
- Automation rules list (automations.ts router)
- Visual inline editor (VisualEditor.tsx) — custom-built node graph with IF/ELSE, delays, triggers, actions
- React Flow workflow builder (WorkflowCanvas.tsx) — @xyflow/react drag-and-drop canvas with custom node types (TriggerNode, WhatsappNode, DelayNode, ConditionNode, EndNode)
- Conditions inline editor (Wave 18)
- AI automation generation — `/api/ai/automation` → Anthropic Claude produces structured JSON flow
- Supabase Edge Function `automation-engine` — evaluates rules against lead events, executes actions
- `automation_rules` and `automation_logs` database tables

**Technologies:** @xyflow/react (React Flow), Supabase Edge Functions, Anthropic Claude API, tRPC, Deno
**Dependencies:** API, AI, DATA, CRM
**Patterns:** Event-driven automation rules, visual programming (node graph), AI-to-JSON flow generation, edge function execution
**Key Files:**
- `apps/hypeflow/app/(admin)/admin/automacoes/components/VisualEditor.tsx`
- `apps/hypeflow/app/(admin)/admin/automacoes/disparos/sequencias/components/WorkflowCanvas.tsx`
- `apps/hypeflow/app/(admin)/admin/automacoes/disparos/sequencias/components/nodes/` — custom node types
- `apps/hypeflow/server/routers/admin/automacoes/automations.ts`
- `apps/hypeflow/server/routers/admin/automacoes/workflows.ts`
- `apps/hypeflow/app/api/ai/automation/route.ts`
- `supabase/functions/automation-engine/index.ts`
**Scope:** Large — ~15 files

---

### CALLS: Calls & Calendar

**Purpose:** Manages sales call scheduling, Google Calendar and Google Meet integration, pre-call reminders via WhatsApp and email, and call outcome tracking.
**Location:** `apps/hypeflow/app/(admin)/admin/calls/`, `apps/hypeflow/server/routers/admin/operacoes/calls.ts`, `packages/integrations/src/google/calendar.ts`, `supabase/functions/call-reminders/`
**Key Components:**
- Calls list with status, outcome filters, countdown timer, outcome chart (Wave 15)
- Google Calendar API client with bidirectional sync and push notification webhooks
- Google Meet link auto-generation on calendar event creation
- `call-reminders` Edge Function — runs on schedule, sends WhatsApp + email reminders 24h and 1h before calls
- `calls` database table with calendar_event_id and google_channel_id tracking

**Technologies:** Google Calendar API v3, Google Meet, WhatsApp Business Cloud API, Resend, Supabase Edge Functions (Deno), tRPC
**Dependencies:** API, INTEGRATIONS, EMAIL, DATA
**Patterns:** OAuth 2.0 calendar integration, webhook push notifications for calendar changes, scheduled reminders via Edge Functions
**Key Files:**
- `apps/hypeflow/server/routers/admin/operacoes/calls.ts`
- `packages/integrations/src/google/calendar.ts`
- `supabase/functions/call-reminders/index.ts`
**Scope:** Medium — ~6 files

---

### AI: AI Features

**Purpose:** Embeds Anthropic Claude as a CRM AI assistant (HYPE AI), an automation flow generator, and a sales copy writer. All three are Next.js API routes that proxy to the Anthropic Messages API, with graceful demo-mode fallbacks.
**Location:** `apps/hypeflow/app/api/ai/`
**Key Components:**
- `/api/ai/agent` — HYPE AI chat assistant with lead context injection; answers in European Portuguese; mode: `chat` | `autonomous`
- `/api/ai/automation` — converts natural language descriptions into structured JSON automation flows (node graph)
- `/api/ai/copy` — generates sales copy variants (email, WhatsApp, SMS) for given objectives and tones
- Demo fallback pattern: if `ANTHROPIC_API_KEY` is absent, mock responses are returned without errors
- Model: `claude-sonnet-4-6`

**Technologies:** Anthropic Claude API (`claude-sonnet-4-6`), Next.js API routes
**Dependencies:** API
**Patterns:** AI-as-a-feature (proxied LLM), context injection, demo-mode graceful degradation, structured output (JSON from LLM)
**Key Files:**
- `apps/hypeflow/app/api/ai/agent/route.ts` — CRM AI assistant
- `apps/hypeflow/app/api/ai/automation/route.ts` — flow generation
- `apps/hypeflow/app/api/ai/copy/route.ts` — sales copy generation
**Scope:** Small — 3 files

---

### INTEGRATIONS: External Integrations

**Purpose:** Manages OAuth connections to ad platforms, inbound webhook ingestion from GHL (GoHighLevel), pixel tracking configuration, and UTM template presets.
**Location:** `apps/hypeflow/app/(admin)/admin/config/`, `apps/hypeflow/app/api/webhooks/`, `packages/integrations/src/`, `supabase/migrations/0003_pixels_utms_tiktok.sql`
**Key Components:**
- GHL webhook ingestion — `/api/webhooks/ghl` — handles contact.created, contact.updated, opportunity.*, appointment.booked, form.submitted events; maps GHL leads to internal leads table
- Config page with integration status cards (Meta, Google Ads, TikTok, LinkedIn, WhatsApp, ManyChat, N8N, Make), pixel management, UTM templates
- Meta OAuth flow + API client
- Google Ads API client
- `integrations` database table (per agency/client OAuth tokens)
- `pixels` table (server-side Conversions API tracking)
- `utm_templates` table
- `scheduled_actions` table (delayed automation action queue)

**Technologies:** Meta Marketing API, Google Ads API, TikTok Ads API, GoHighLevel, WhatsApp Business Cloud API, ManyChat, N8N, Make (Integromat)
**Dependencies:** DATA, API
**Patterns:** OAuth token storage, inbound webhook adapter pattern (normalize external events to internal model), pixel fan-out for server-side tracking, UTM template presets
**Key Files:**
- `apps/hypeflow/app/api/webhooks/ghl/route.ts`
- `packages/integrations/src/meta/client.ts`
- `packages/integrations/src/google-ads/client.ts`
- `packages/integrations/src/google/calendar.ts`
- `supabase/migrations/0003_pixels_utms_tiktok.sql`
**Scope:** Medium — ~10 files

---

### PORTAL: Client Portal

**Purpose:** Read-only portal for the agency's end-clients to view their own leads, pipeline, calls, ROI metrics, and report downloads. Distinct authentication context from the admin area.
**Location:** `apps/hypeflow/app/(client)/`, `apps/hypeflow/server/routers/client/`, `apps/hypeflow/app/portal/[token]/`
**Key Components:**
- Client dashboard with KPI cards, lead trends, call status
- Pipeline view (read-only Kanban)
- Leads list with scores and status
- ROI metrics page
- Calls schedule view
- Shareable portal link via `/portal/[token]` (unauthenticated preview)
- `clientProcedure` in tRPC enforces `client_id` scoping for all portal queries

**Technologies:** tRPC, Supabase RLS, Next.js App Router
**Dependencies:** AUTH, API, DATA
**Patterns:** Dual-application in a single Next.js app (route group isolation: `(admin)` vs `(client)`), read-only client portal, token-based shareable preview
**Key Files:**
- `apps/hypeflow/app/(client)/client/` — portal pages
- `apps/hypeflow/server/routers/client/` — portal tRPC routers
- `apps/hypeflow/app/portal/[token]/page.tsx` — token-based portal preview
**Scope:** Medium — ~12 files

---

### UI: Shared UI & Layout

**Purpose:** Provides shared layout components, icon utilities, React Query + tRPC client provider setup, and the global CSS/design system.
**Location:** `apps/hypeflow/components/`, `apps/hypeflow/lib/trpc/`, `packages/ui/`
**Key Components:**
- Admin navigation/sidebar layout (components/layout/)
- TRPCProvider.tsx — wraps app with TanStack Query + tRPC
- Platform icon components (PlatformIcons)
- Tailwind design system (custom CSS variables, animations)
- `packages/ui/` — shared UI component library (currently minimal, `src/index.ts`)

**Technologies:** TanStack React Query v5, tRPC React client, Tailwind CSS, Framer Motion, Lucide React
**Dependencies:** API
**Patterns:** Provider composition pattern, utility-first design system, colocation of page-level components
**Key Files:**
- `apps/hypeflow/components/providers/TRPCProvider.tsx`
- `apps/hypeflow/components/icons/PlatformIcons.tsx`
- `apps/hypeflow/app/globals.css` — design tokens and CSS variables
- `apps/hypeflow/tailwind.config.ts`
- `apps/hypeflow/lib/trpc/client.ts`
**Scope:** Small — ~8 files

---

### DATA: Data Layer & Schema

**Purpose:** Defines the complete PostgreSQL schema (3 migrations), TypeScript types, RLS policies, seed data, and the demo workspace auto-provisioning system.
**Location:** `hypeflow-os/supabase/migrations/`, `hypeflow-os/supabase/seed/`, `apps/hypeflow/lib/types/`, `apps/hypeflow/lib/bootstrap/workspace.ts`, `packages/database/`
**Key Components:**
- Migration 0001: Core schema — agencies, users, clients, client_users, pipeline_configs, pipeline_stages, leads, lead_interactions, calls, integrations, ad_campaigns, traffic_metrics, automation_rules, automation_logs, reports. Updated_at triggers on all mutable tables.
- Migration 0002: RLS policies — 15 tables, agency-scoped and client-scoped policies, helper SQL functions (`get_user_agency_id`, `get_client_user_client_id`, `is_agency_admin`)
- Migration 0003: pixels, pixel_events, utm_templates, scheduled_actions tables; TikTok platform support
- `packages/database/` — generated TypeScript types from Supabase
- `lib/types/` — domain types for CRM, equipa, marketing, playbooks, portal, parceiros, conversas
- `lib/bootstrap/workspace.ts` — auto-provisions agency, clients, pipeline stages, seed leads, and traffic metrics for new and demo users
- Seed file: `supabase/seed/dev_seed.sql`

**Technologies:** PostgreSQL, Supabase (schema management), pl/pgsql (triggers, helper functions)
**Dependencies:** INFRA
**Patterns:** PostgreSQL as single source of truth, RLS-enforced multi-tenancy, `updated_at` triggers, auto-provisioning bootstrap, UUID primary keys, JSONB for flexible metadata fields
**Key Files:**
- `supabase/migrations/0001_initial_schema.sql`
- `supabase/migrations/0002_rls_policies.sql`
- `supabase/migrations/0003_pixels_utms_tiktok.sql`
- `apps/hypeflow/lib/bootstrap/workspace.ts`
- `apps/hypeflow/lib/types/` — all domain type files
- `packages/database/src/index.ts`
**Scope:** Medium — ~15 files

---

### EMAIL: Email & Notifications

**Purpose:** Sends transactional emails for lead notifications, call reminders, follow-ups, and welcome messages using the Resend API.
**Location:** `packages/email/`
**Key Components:**
- `packages/email/src/sender.ts` — Resend client wrapper
- Templates: call-reminder.ts, follow-up.ts, lead-notification.ts, welcome.ts
- Used by the `call-reminders` Edge Function for reminder emails

**Technologies:** Resend API
**Dependencies:** INFRA
**Patterns:** Transactional email templates as TypeScript modules, centralized email package
**Key Files:**
- `packages/email/src/sender.ts`
- `packages/email/src/templates/`
**Scope:** Small — ~6 files

---

### LANDING: Landing Page

**Purpose:** Separate marketing landing page for HYPE Flow OS, built with a different tech stack from the main OS app.
**Location:** `hype-flow-landing/`
**Key Components:**
- Vite + React SPA
- Tailwind CSS styling
- Separate ESLint config and build pipeline

**Technologies:** Vite, React, Tailwind CSS (separate from monorepo)
**Dependencies:** None (standalone)
**Patterns:** Standalone SPA (not part of Turborepo workspace)
**Scope:** Small — independent project

---

### SQUADS: AI Squads

**Purpose:** AIOS meta-framework squads for AI agent orchestration. These are framework tooling artifacts, not product code.
**Location:** `squads/`
**Key Components:** apex, brand, curator, deep-research, dispatch, education, kaizen, kaizen-v2, legal-analyst, seo, squad-creator, squad-creator-pro — each squad is an AI agent persona definition
**Technologies:** AIOS framework, Node.js, Python (analytics scripts)
**Dependencies:** None
**Patterns:** Agent persona definitions, squad-based AI orchestration
**Scope:** Large (framework) — not product code

---

## Cross-Cutting Concerns

### Infrastructure
- **Supabase BaaS** handles PostgreSQL, Auth, Realtime, Storage, and Edge Functions — reducing custom infrastructure to near-zero for Phase 1
- **Vercel** handles all deployment with preview branches per PR
- **Turborepo** orchestrates build, lint, typecheck, test pipelines across workspaces

### Authentication & Security
- **Dual user-type system:** agency users (`users` table) and portal users (`client_users` table) are resolved in the same JWT flow
- **RLS is the primary security boundary** — all 15 domain tables enforce agency_id or client_id scoping at the database level
- **tRPC procedures add a second authorization layer** — `agencyProcedure` and `clientProcedure` check user type before any resolver runs
- **Demo/preview mode:** When `NEXT_PUBLIC_SUPABASE_URL` contains `placeholder`, a null client returns empty data without errors — allowing UI preview without credentials

### Data Layer
- PostgreSQL is declared the single source of truth (ADR-0011)
- All mutable tables have `updated_at` triggers
- Multi-tenancy enforced via `agency_id` on every table (with `client_id` as secondary scope)
- JSONB used for flexible metadata (`settings`, `platform_metrics`, `automation_rules` configs)

### API Layer
- tRPC provides end-to-end type safety from database types through router procedures to React Query hooks
- superjson handles complex TypeScript types (Date, BigInt) over the wire
- Raw Next.js API routes used only for webhooks (GHL) and AI proxying (Anthropic) where tRPC is not appropriate

### AI Integration
- All AI features proxy to Anthropic Claude (`claude-sonnet-4-6`) with demo fallbacks
- AI features operate in Portuguese (European Portuguese)
- Automation generation produces structured JSON that maps to internal node graph types

### External Integrations
- Integration OAuth tokens stored in the `integrations` table per agency/client
- Platform-specific API clients live in `packages/integrations/` for reuse
- Background sync runs in Supabase Edge Functions (Deno runtime)
- GHL webhook adapter normalizes external events to internal lead model

### Observability (Planned)
- Sentry for error tracking (configured in env, not yet confirmed active)
- PostHog for product analytics (configured in env)
- Axiom for structured logging (ADR-0017, Proposed status)
- SLOs and error budget policy defined (ADR-0018, Proposed status)

---

## Existing ADR Coverage

There are 18 existing ADRs in `docs/adrs/` covering:
- Infrastructure (Supabase plan, migration to self-host)
- Authentication (JWT custom claims hook)
- Database (Postgres as source of truth, pg_notify, optimistic concurrency, data retention)
- Integration (WhatsApp provider, GHL edge function invocation, dead-letter queue replay)
- Performance (no distributed cache in Phase 1, async CSV export)
- Observability (Axiom stack, SLOs)

**Notably absent from existing ADRs** (candidates for Phase 2 identification):
- Next.js 14 App Router as primary framework
- tRPC as API protocol
- Turborepo as monorepo tool
- Supabase as BaaS platform (ADR-0001 covers plan selection, not the BaaS choice itself)
- @xyflow/react for visual workflow builder
- @dnd-kit for Kanban drag-and-drop
- Anthropic Claude as the AI provider
- Demo/null-client pattern for preview mode
- Dual-app-in-single-Next.js pattern (route groups for admin vs portal)
- PostgreSQL RLS as multi-tenancy enforcement mechanism
