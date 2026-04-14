# HypeFlow OS

**HypeFlow OS** is a full-stack CRM and marketing automation platform for agencies. Built as a Turborepo monorepo with Next.js 14, Supabase, and tRPC, it supports multi-tenant client management, lead pipeline tracking, ad performance metrics, and deep integrations with Google, Meta, LinkedIn, and TikTok.

---

## Apps

| App | Port | Description |
|-----|------|-------------|
| `apps/hypeflow` | 3000 | Main agency dashboard — leads, pipeline, automations, traffic, calls |
| `apps/agency` | 3010 | Secondary agency interface |
| `apps/portal` | 3012 | Client-facing portal — ROI, calls, pipeline view |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14.2 (App Router) |
| Language | TypeScript 5.7 |
| API | tRPC 11 + React Query 5 |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth |
| Styling | Tailwind CSS 3.4 |
| Animations | Framer Motion |
| Charts | Recharts |
| Forms | React Hook Form + Zod |
| Drag & Drop | @dnd-kit |
| State | Zustand |
| Email | Resend |
| Build | Turbo 2.9 |
| Deployment | Vercel |

---

## Project Structure

```
hypeflow-os/
├── apps/
│   ├── hypeflow/          # Main agency management dashboard
│   ├── agency/            # Secondary agency interface
│   └── portal/            # Client-facing portal
├── packages/
│   ├── config/            # Shared ESLint/TypeScript config
│   ├── database/          # Supabase generated types
│   ├── email/             # Email templates (Resend)
│   ├── integrations/      # Third-party API clients
│   └── ui/                # Shared UI components
└── supabase/
    ├── migrations/        # Database schema migrations
    ├── functions/         # Supabase edge functions
    └── seed/              # Database seed data
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm 10+
- [Supabase CLI](https://supabase.com/docs/guides/cli) (for local DB)
- A Supabase project

### Installation

```bash
# Clone the repository
git clone <repo-url>
cd hypeflow-os

# Install all dependencies
npm install
```

### Environment Variables

Copy the example file and fill in your credentials:

```bash
cp .env.example .env.local
```

**Required variables:**

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# App URLs
NEXT_PUBLIC_APP_URL=http://localhost:3010
NEXT_PUBLIC_PORTAL_URL=http://localhost:3012
API_SECRET_KEY=your-internal-api-secret

# Email
RESEND_API_KEY=your-resend-key
EMAIL_FROM=noreply@yourapp.com

# Google OAuth + Calendar
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=http://localhost:3000/api/integrations/google/callback
GOOGLE_ADS_DEVELOPER_TOKEN=...

# Meta (Facebook/Instagram)
META_APP_ID=...
META_APP_SECRET=...
META_REDIRECT_URI=...

# LinkedIn
LINKEDIN_CLIENT_ID=...
LINKEDIN_CLIENT_SECRET=...

# TikTok
TIKTOK_APP_ID=...
TIKTOK_APP_SECRET=...
```

**Optional (monitoring):**

```env
SENTRY_DSN=...
NEXT_PUBLIC_POSTHOG_KEY=...
NEXT_PUBLIC_POSTHOG_HOST=https://eu.posthog.com
```

### Database Setup

```bash
# Apply migrations to your Supabase project
npm run db:push

# Regenerate TypeScript types from your schema
npm run db:types
```

### Running in Development

```bash
# Run the main hypeflow app only (port 3000)
npm run dev

# Run all apps simultaneously
npm run dev:all
```

---

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start main hypeflow app (port 3000) |
| `npm run dev:all` | Start all apps in parallel |
| `npm run build` | Build the main app for production |
| `npm run lint` | Run ESLint across all packages |
| `npm run typecheck` | Run TypeScript type checking |
| `npm run test` | Run test suite |
| `npm run format` | Format code with Prettier |
| `npm run db:push` | Push Supabase migrations |
| `npm run db:types` | Regenerate database type definitions |

---

## Features

### Agency Dashboard (`apps/hypeflow`)
- Multi-client management with isolated workspaces
- Custom CRM pipeline stages with Kanban board
- Lead management with temperature scoring (cold / warm / hot)
- Call scheduling with Google Calendar + Google Meet integration
- Automation rules — trigger-based workflows
- Traffic and ad spend metrics by platform (Google, Meta, TikTok, LinkedIn)
- Client health scoring and lead attribution
- Email communication via Resend
- Conversation history and lead interactions
- Forms and lead capture
- Reputation management
- Payments tracking

### Client Portal (`apps/portal`)
- Lead pipeline visibility
- Call history and scheduling
- ROI dashboards
- Simplified read-only interface for clients

---

## Integrations

| Platform | Capabilities |
|----------|-------------|
| **Google Calendar** | Bidirectional sync, Google Meet links, webhook push notifications |
| **Google Ads** | Campaign performance tracking, lead attribution |
| **Meta (Facebook/Instagram)** | Conversions API, server-side pixel events, OAuth |
| **LinkedIn** | Campaign ads, lead attribution |
| **TikTok** | Ad platform, pixel tracking |
| **WhatsApp Business** | Messaging integration (env configured) |
| **ManyChat** | Chat automation (env configured) |
| **N8N / Make** | Webhook-based workflow automation |

---

## Database

Built on Supabase (PostgreSQL) with Row-Level Security for multi-tenant isolation.

### Core Tables

| Table | Purpose |
|-------|---------|
| `agencies` | Root tenant accounts |
| `users` | Agency team members |
| `client_users` | Client portal users |
| `clients` | Client accounts under agencies |
| `leads` | Lead records with pipeline tracking |
| `calls` | Scheduled/completed calls |
| `pipeline_stages` | Customizable pipeline stages per agency |
| `automations_rules` | Trigger-based automation definitions |
| `automation_logs` | Automation execution history |
| `integrations` | OAuth tokens (Google, Meta, LinkedIn, TikTok) |
| `traffic_metrics` | Ad spend, clicks, leads, conversions by date/platform |
| `lead_interactions` | Email, phone, meeting interaction history |
| `pixels` | Tracking pixel configurations |
| `pixel_events` | Server-side conversion events |
| `utm_templates` | Reusable UTM parameter presets |

### Multi-tenancy

- **Agency** is the root tenant — all data scoped to `agency_id`
- **RLS policies** enforce agency-level isolation on every table
- **Client portal** users have read-only access scoped to their `client_id`
- **Helper functions:** `get_user_agency_id()`, `is_agency_admin()`, `get_client_user_client_id()`

---

## Architecture

### API Layer

- **tRPC** routers organized by role: `admin.*` (agency) and `portal.*` (client)
- **Procedures:** `agencyProcedure` and `clientProcedure` enforce authorization per request
- **SuperJSON** serialization for Dates and complex types

### Authentication

- Supabase Auth (email/password)
- Middleware redirects unauthenticated users to `/login`
- Dual-user model: `users` table (agency staff) vs `client_users` table (portal)

### State Management

- **Server state:** Supabase + tRPC + React Query
- **Client state:** Zustand for local UI state (modals, selections, etc.)

### Key Files

| File | Purpose |
|------|---------|
| `apps/hypeflow/server/root.ts` | tRPC router root |
| `apps/hypeflow/server/trpc.ts` | tRPC context + procedures |
| `apps/hypeflow/middleware.ts` | Auth middleware |
| `packages/database/src/index.ts` | Supabase generated types |
| `packages/integrations/src/` | Third-party API clients |
| `supabase/migrations/` | Database schema history |
| `turbo.json` | Monorepo task pipeline |

---

## Deployment

The project is deployed on **Vercel** using its native monorepo support.

- Each app in `apps/` is a separate Vercel project
- Environment variables are configured per project in the Vercel dashboard
- Database migrations are applied via `npm run db:push` before deploying schema changes

---

## License

Private — All rights reserved.
