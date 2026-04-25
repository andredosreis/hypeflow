# HYPE Flow OS — Arquitectura Técnica

**Version:** 1.1  
**Date:** 2026-04-06 (actualizado 2026-04-22)  
**Autor:** Andre dos Reis (Engenheiro de Software)  
**Status:** Activo — reconciliado com Waves 1-19

---

## 1. Visão Geral da Arquitectura

```
┌─────────────────────────────────────────────────────────────────┐
│                        HYPE Flow OS                             │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │             apps/hypeflow  (Next.js 14 App Router)      │   │
│  │  ┌──────────────────────┐  ┌──────────────────────────┐ │   │
│  │  │ route group (admin)  │  │ route group (client)     │ │   │
│  │  │ Equipa da agência    │  │ Portal do cliente        │ │   │
│  │  │ /admin/*             │  │ /client/*                │ │   │
│  │  └──────────┬───────────┘  └───────────┬──────────────┘ │   │
│  └─────────────┼──────────────────────────┼────────────────┘   │
│                │                          │                     │
│  ┌─────────────▼──────────────────────────▼───────────────┐   │
│  │          API Layer — tRPC (admin.* + portal.*)          │   │
│  │          + Next.js API Routes (webhooks, AI)            │   │
│  └──────────────────────────┬────────────────────────────-─┘   │
│                             │                                   │
│  ┌──────────────────────────▼──────────────────────────────┐   │
│  │                    Supabase                             │   │
│  │  ┌─────────────┐  ┌──────────────┐  ┌───────────────┐  │   │
│  │  │  PostgreSQL  │  │  Auth + RLS  │  │  Realtime     │  │   │
│  │  │  (Database)  │  │  (Security)  │  │  (Websockets) │  │   │
│  │  └─────────────┘  └──────────────┘  └───────────────┘  │   │
│  │  ┌─────────────┐  ┌──────────────┐                      │   │
│  │  │   Storage   │  │  Edge Fns    │                      │   │
│  │  │  (Files)    │  │  (Deno)      │                      │   │
│  │  └─────────────┘  └──────────────┘                      │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              External Integrations Layer                │   │
│  │  Meta API │ Google Ads/Meet │ TikTok │ GHL │ WA Cloud  │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Stack Técnica

### 2.1 Frontend

| Tecnologia | Versão | Justificação |
|-----------|--------|-------------|
| **Next.js** | 14 (App Router) | SSR/SSG, performance, SEO, routing |
| **React** | 18 | Component model, ecosystem |
| **TypeScript** | 5.x | Type safety end-to-end |
| **Tailwind CSS** | 3.x | Utility-first, design system ágil |
| **shadcn/ui** | latest | Componentes acessíveis, customizáveis |
| **Recharts** | 2.x | Gráficos e dashboards |
| **@dnd-kit** | latest | Drag & drop no Kanban |
| **Tanstack Query** | 5.x | Server state management, caching |
| **React Hook Form** | 7.x | Formulários performantes |
| **Zod** | 3.x | Schema validation (forms + API) |
| **date-fns** | 4.x | Manipulação de datas |
| **Framer Motion** | 11.x | Animações (consistência com landing) |

### 2.2 Backend / API

| Tecnologia | Versão | Justificação |
|-----------|--------|-------------|
| **Next.js API Routes** | 14 | BFF pattern, co-location |
| **tRPC** | 11.x | Type-safe APIs end-to-end, sem boilerplate |
| **Supabase** | latest | PostgreSQL gerido + Auth + Realtime + Storage |
| **Supabase RLS** | — | Row Level Security — isolamento de dados por cliente |

### 2.3 Integrações

| Serviço | SDK / Método |
|---------|-------------|
| **Google Meet / Calendar** | Google OAuth 2.0 + Calendar API v3 |
| **Meta Ads (FB + IG)** | Meta Marketing API v19 |
| **Google Ads** | Google Ads API (REST) |
| **LinkedIn Ads** | LinkedIn Marketing API |
| **WhatsApp Business** | WhatsApp Cloud API |
| **Google Search Console** | Search Console API v3 |
| **Google Analytics 4** | GA4 Data API |

### 2.4 Infraestrutura

| Componente | Tecnologia | Justificação |
|-----------|-----------|-------------|
| **Hosting** | Vercel | Deploy automático, edge, preview branches |
| **Database** | Supabase (PostgreSQL) | Gerido, RLS, Realtime built-in |
| **Auth** | Supabase Auth | JWT, OAuth, MFA support |
| **Storage** | Supabase Storage | Ficheiros de relatórios, logos |
| **Background Jobs** | Supabase Edge Functions | Webhooks, sync de dados de APIs |
| **Email** | Resend | Transactional emails |
| **Monitorização** | Sentry | Error tracking |
| **Analytics interno** | PostHog | Product analytics |

### 2.5 Qualidade & Testes

| Ferramenta | Propósito |
|-----------|----------|
| **Vitest** | Unit & integration tests |
| **Playwright** | E2E tests |
| **ESLint** | Linting |
| **Prettier** | Code formatting |
| **Husky** | Pre-commit hooks |

---

## 3. Estrutura do Projecto

```
hypeflow-os/
├── apps/
│   └── hypeflow/                  # App unificado — admin + portal via route groups (Wave 19)
│       ├── app/
│       │   ├── (auth)/            # Login / signup (agência)
│       │   ├── (admin)/           # Route group — equipa da agência
│       │   │   └── admin/
│       │   │       ├── dashboard/ # Dashboard master
│       │   │       ├── contactos/ # CRM + leads
│       │   │       ├── pipeline/  # Kanban + pipeline
│       │   │       ├── trafego/   # Tracking de fontes pagas
│       │   │       ├── calls/     # Gestão de calls + Google Meet
│       │   │       ├── clientes/  # Gestão de clientes da agência
│       │   │       ├── automacoes/# Automation Builder + Workflow Builder
│       │   │       └── config/    # Configurações + integrações
│       │   ├── (client)/          # Route group — portal do cliente (read-only)
│       │   │   └── client/
│       │   │       ├── dashboard/ # KPIs do cliente
│       │   │       ├── leads/     # Pipeline view read-only
│       │   │       ├── calls/     # Agendamentos
│       │   │       └── roi/       # Métricas ROI
│       │   ├── portal/[token]/    # Preview por token (sem autenticação)
│       │   └── api/               # API routes
│       │       ├── trpc/[trpc]/   # Handler tRPC
│       │       ├── webhooks/ghl/  # Ingestão de leads via GHL
│       │       └── ai/            # Endpoints AI (agent, automation, copy)
│       ├── middleware.ts           # Guard de rotas (admin/* e client/*)
│       └── server/
│           ├── root.ts            # appRouter — admin.* + portal.*
│           ├── trpc.ts            # Contexto, agencyProcedure, clientProcedure
│           └── routers/
│               ├── admin/         # Domain-based (reorganizado em Wave 19)
│               │   ├── crm/       # leads, clients, pipeline, conversas
│               │   ├── analytics/ # trafego, dashboard
│               │   ├── operacoes/ # calls, equipa, parceiros
│               │   ├── conteudo/  # playbooks, marketing
│               │   └── automacoes/# automations, integrations, workflows
│               └── client/        # Routers do portal (5 routers read-only)
│
├── packages/
│   ├── ui/                        # Componentes partilhados (minimal)
│   ├── database/                  # Tipos TypeScript gerados pelo Supabase
│   ├── integrations/              # Clientes de APIs externas
│   │   ├── meta/                  # Meta Marketing API v19
│   │   ├── google-ads/            # Google Ads API
│   │   └── google/                # Google Calendar API v3
│   └── email/                     # Templates Resend (call-reminder, follow-up, etc.)
│
├── supabase/
│   ├── migrations/                # 0001 schema, 0002 RLS, 0003 pixels/UTMs/TikTok
│   ├── functions/                 # Edge Functions Deno (automation-engine, call-reminders, sync-*)
│   └── seed/                      # Seed data dev
│
└── docs/                          # Documentação (este repo)
```

> **Monorepo:** Turborepo para gestão de workspaces e cache de builds.

---

## 4. Modelo de Segurança

### 4.1 Autenticação

```
Utilizador → Supabase Auth → JWT token
JWT contém: user_id, role, agency_id, client_id (se portal)
```

**Roles:**
- `agency_admin` — Acesso total à plataforma da agência
- `agency_manager` — Acesso comercial + clientes atribuídos
- `agency_viewer` — Só leitura
- `client_admin` — Acesso total ao portal do cliente
- `client_viewer` — Só leitura no portal

### 4.2 Row Level Security (RLS)

Todas as tabelas têm RLS activo. Exemplos:

```sql
-- Leads: só visíveis para a agência do utilizador
CREATE POLICY "agency_sees_own_leads" ON leads
  FOR ALL USING (agency_id = auth.jwt() ->> 'agency_id');

-- Leads: cliente só vê as suas próprias leads
CREATE POLICY "client_sees_own_leads" ON leads
  FOR SELECT USING (client_id = auth.jwt() ->> 'client_id');

-- Clientes: agência só vê os seus clientes
CREATE POLICY "agency_sees_own_clients" ON clients
  FOR ALL USING (agency_id = auth.jwt() ->> 'agency_id');
```

### 4.3 Isolamento Multi-tenant

```
Agency A  →  [agency_id = "uuid-a"]  →  Só vê dados com agency_id = "uuid-a"
Client X  →  [client_id = "uuid-x"]  →  Só vê dados com client_id = "uuid-x"
```

---

## 5. Fluxo de Dados — Tráfego

```
Meta Ads API ─┐
Google Ads ───┤
LinkedIn Ads ─┼──→ Supabase Edge Function (sync job, cada 6h)
GA4 ──────────┤         │
GSC ──────────┘         │
                        ▼
               traffic_metrics table
               (normalised, por source/date/campaign)
                        │
                        ▼
               tRPC query → Frontend Dashboard
```

---

## 6. Fluxo de Dados — Calls

```
Agente cria call no HYPE Flow OS
        │
        ▼
Google Calendar API → Cria evento
        │
        ▼
Google Meet API → Gera link Meet
        │
        ▼
Guarda em calls table (Supabase)
        │
        ├── Notificação email → lead (via Resend)
        ├── Notificação in-app → agente
        └── 15min antes → reminder automático
```

---

## 7. Decisões de Arquitectura

| # | Decisão | Alternativas Consideradas | Justificação |
|---|---------|--------------------------|-------------|
| 1 | Monorepo Turborepo | Repos separados | Partilha de código (UI, tipos, integrações) sem overhead |
| 2 | Supabase como backend | Firebase, custom Postgres | RLS built-in, Realtime, Auth integrado, velocidade de dev |
| 3 | tRPC sobre REST/GraphQL | REST puro, GraphQL | Type safety end-to-end sem codegen, menos boilerplate |
| 4 | Next.js App Router | Vite + Express | SSR nativo, API routes co-locadas, Vercel deploy trivial |
| 5 | shadcn/ui sobre outras libs | Ant Design, Material UI | Customização total, sem bundle overhead, acessível |
| 6 | Vercel hosting | AWS, Railway | Zero config deploy, edge functions, preview branches |

---

## 8. Considerações de Escalabilidade

**Fase 1 (0-50 clientes):**
- Supabase free/pro tier
- Vercel hobby/pro
- Edge Functions para sync de APIs

**Fase 2 (50-500 clientes):**
- Supabase Pro com connection pooling (PgBouncer)
- Jobs de sync mais frequentes (cron Supabase)
- CDN para relatórios PDF (Supabase Storage + CDN)

**Fase 3 (500+ clientes):**
- Supabase Enterprise ou migração para RDS gerido
- Queue system (Bull/BullMQ) para jobs pesados
- Separação de read/write replicas

---

*Arquitectura definida por Andre dos Reis (Engenheiro de Software).*  
*Revisão necessária antes de iniciar desenvolvimento*
