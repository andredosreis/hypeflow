# HYPE Flow OS — Schema de Dados

**Version:** 1.1  
**Date:** 2026-04-06 (actualizado 2026-04-22)  
**Autor:** Andre dos Reis (Engenheiro de Software)

> **Nota de cobertura:** este documento cobre a migration `0001_initial_schema.sql`. As migrations seguintes adicionam tabelas não aqui documentadas:
> - `0002_rls_policies.sql` — policies RLS + helper functions (`get_user_agency_id`, `get_client_user_client_id`, `is_agency_admin`)
> - `0003_pixels_utms_tiktok.sql` — tabelas `pixels`, `pixel_events`, `utm_templates`, `scheduled_actions`; suporte TikTok em `traffic_metrics`
>
> Para o schema completo e actualizado, consultar directamente os ficheiros de migration em `supabase/migrations/`.

---

## Diagrama Entidade-Relacionamento (Simplificado)

```
agencies ──< users
agencies ──< clients ──< leads ──< lead_interactions
                                 ──< calls
clients ──< pipeline_configs
clients ──< traffic_metrics
clients ──< integrations

leads ──< call_leads (via calls)
users ──< calls (agent)
```

---

## Tabelas Core

### `agencies`
```sql
CREATE TABLE agencies (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  slug        TEXT UNIQUE NOT NULL,
  logo_url    TEXT,
  plan        TEXT DEFAULT 'starter', -- starter, pro, enterprise
  settings    JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);
```

### `users`
```sql
CREATE TABLE users (
  id          UUID PRIMARY KEY REFERENCES auth.users(id),
  agency_id   UUID REFERENCES agencies(id) ON DELETE CASCADE,
  full_name   TEXT NOT NULL,
  email       TEXT NOT NULL,
  role        TEXT NOT NULL, -- agency_admin, agency_manager, agency_viewer
  avatar_url  TEXT,
  is_active   BOOLEAN DEFAULT TRUE,
  last_login  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
```

### `clients`
```sql
CREATE TABLE clients (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id       UUID REFERENCES agencies(id) ON DELETE CASCADE,
  account_manager_id UUID REFERENCES users(id),
  
  -- Dados do negócio
  name            TEXT NOT NULL,
  slug            TEXT NOT NULL,
  niche           TEXT NOT NULL, -- imovel, credito, clinica, outro
  logo_url        TEXT,
  website         TEXT,
  
  -- Contactos
  primary_email   TEXT,
  primary_phone   TEXT,
  billing_email   TEXT,
  
  -- Contrato
  mrr             DECIMAL(10,2) DEFAULT 0,
  contract_start  DATE,
  contract_end    DATE,
  
  -- Status
  status          TEXT DEFAULT 'active', -- active, paused, churned, onboarding
  health_score    INTEGER DEFAULT 100, -- 0-100
  
  -- Lead targets
  monthly_lead_target  INTEGER,
  
  settings        JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
```

### `client_users` (Portal do cliente)
```sql
CREATE TABLE client_users (
  id          UUID PRIMARY KEY REFERENCES auth.users(id),
  client_id   UUID REFERENCES clients(id) ON DELETE CASCADE,
  agency_id   UUID REFERENCES agencies(id),
  full_name   TEXT NOT NULL,
  email       TEXT NOT NULL,
  role        TEXT DEFAULT 'client_admin', -- client_admin, client_viewer
  is_active   BOOLEAN DEFAULT TRUE,
  last_login  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Módulo de Leads / CRM

### `leads`
```sql
CREATE TABLE leads (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id       UUID REFERENCES agencies(id),
  client_id       UUID REFERENCES clients(id) ON DELETE CASCADE,
  agent_id        UUID REFERENCES users(id),
  
  -- Dados do contacto
  full_name       TEXT NOT NULL,
  email           TEXT,
  phone           TEXT,
  company         TEXT,
  
  -- Origem
  source          TEXT NOT NULL, -- facebook, instagram, google, linkedin, whatsapp, email, organic, manual, referral
  source_type     TEXT DEFAULT 'paid', -- paid, organic, manual
  campaign_id     UUID REFERENCES ad_campaigns(id),
  utm_source      TEXT,
  utm_medium      TEXT,
  utm_campaign    TEXT,
  utm_content     TEXT,
  referral_source TEXT,
  
  -- Qualificação
  status          TEXT DEFAULT 'new', -- new, qualifying, qualified, contacted, scheduled, proposal, negotiation, closed, lost
  score           INTEGER DEFAULT 0, -- 0-100 (AI qualificação)
  temperature     TEXT DEFAULT 'cold', -- cold, warm, hot
  
  -- Pipeline
  pipeline_stage_id UUID REFERENCES pipeline_stages(id),
  stage_entered_at  TIMESTAMPTZ DEFAULT NOW(),
  
  -- Metadados
  tags            TEXT[] DEFAULT '{}',
  notes           TEXT,
  lost_reason     TEXT,
  
  -- Datas
  last_contact_at TIMESTAMPTZ,
  first_contact_at TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX leads_client_id_idx ON leads(client_id);
CREATE INDEX leads_agency_id_idx ON leads(agency_id);
CREATE INDEX leads_status_idx ON leads(status);
CREATE INDEX leads_source_idx ON leads(source);
CREATE INDEX leads_created_at_idx ON leads(created_at);
```

### `lead_interactions`
```sql
CREATE TABLE lead_interactions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id     UUID REFERENCES leads(id) ON DELETE CASCADE,
  agency_id   UUID REFERENCES agencies(id),
  user_id     UUID REFERENCES users(id),
  
  type        TEXT NOT NULL, -- call, email, whatsapp, note, status_change, meeting, task
  direction   TEXT, -- inbound, outbound
  subject     TEXT,
  content     TEXT,
  outcome     TEXT, -- interested, not_interested, no_answer, scheduled, follow_up
  
  metadata    JSONB DEFAULT '{}', -- dados adicionais por tipo
  
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Módulo de Pipeline

### `pipeline_configs`
```sql
CREATE TABLE pipeline_configs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id   UUID REFERENCES agencies(id),
  client_id   UUID REFERENCES clients(id), -- NULL = default para agência
  name        TEXT NOT NULL DEFAULT 'Default',
  is_default  BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
```

### `pipeline_stages`
```sql
CREATE TABLE pipeline_stages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_id     UUID REFERENCES pipeline_configs(id) ON DELETE CASCADE,
  agency_id       UUID REFERENCES agencies(id),
  
  name            TEXT NOT NULL,
  position        INTEGER NOT NULL,
  color           TEXT DEFAULT '#21A0C4',
  
  -- SLA
  sla_hours       INTEGER, -- horas máximas nesta fase
  
  -- Automações
  automation_rules JSONB DEFAULT '[]',
  
  is_terminal     BOOLEAN DEFAULT FALSE, -- fechada / perdida
  is_won          BOOLEAN DEFAULT FALSE, -- se terminal, é won?
  
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Módulo de Calls

### `calls`
```sql
CREATE TABLE calls (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id       UUID REFERENCES agencies(id),
  client_id       UUID REFERENCES clients(id),
  lead_id         UUID REFERENCES leads(id),
  agent_id        UUID REFERENCES users(id),
  
  -- Agendamento
  scheduled_at    TIMESTAMPTZ NOT NULL,
  duration_min    INTEGER DEFAULT 45, -- duração planeada em minutos
  
  -- Google Meet
  meet_link       TEXT,
  calendar_event_id TEXT,
  
  -- Status
  status          TEXT DEFAULT 'scheduled', -- scheduled, completed, no_show, cancelled, rescheduled
  
  -- Resultado
  outcome         TEXT, -- advanced, lost, follow_up, proposal_sent
  notes           TEXT,
  actual_duration_min INTEGER, -- duração real
  
  -- Datas
  completed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Módulo de Tráfego

### `integrations`
```sql
CREATE TABLE integrations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id   UUID REFERENCES agencies(id),
  client_id   UUID REFERENCES clients(id),
  
  provider    TEXT NOT NULL, -- meta, google_ads, google_analytics, linkedin, whatsapp, google_calendar
  
  -- OAuth tokens (encriptados)
  access_token  TEXT,
  refresh_token TEXT,
  token_expiry  TIMESTAMPTZ,
  
  -- IDs da conta externa
  external_account_id TEXT,
  external_account_name TEXT,
  
  status      TEXT DEFAULT 'active', -- active, error, expired, disconnected
  last_sync   TIMESTAMPTZ,
  error_message TEXT,
  
  metadata    JSONB DEFAULT '{}',
  
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);
```

### `ad_campaigns`
```sql
CREATE TABLE ad_campaigns (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id       UUID REFERENCES agencies(id),
  client_id       UUID REFERENCES clients(id),
  integration_id  UUID REFERENCES integrations(id),
  
  external_id     TEXT NOT NULL, -- ID na plataforma de ads
  platform        TEXT NOT NULL, -- meta, google_ads, linkedin
  name            TEXT NOT NULL,
  status          TEXT, -- active, paused, ended
  
  objective       TEXT,
  daily_budget    DECIMAL(10,2),
  total_budget    DECIMAL(10,2),
  
  started_at      DATE,
  ended_at        DATE,
  
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
```

### `traffic_metrics`
```sql
CREATE TABLE traffic_metrics (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id       UUID REFERENCES agencies(id),
  client_id       UUID REFERENCES clients(id),
  integration_id  UUID REFERENCES integrations(id),
  campaign_id     UUID REFERENCES ad_campaigns(id),
  
  date            DATE NOT NULL,
  platform        TEXT NOT NULL, -- meta, google_ads, linkedin, google_organic, instagram_organic, whatsapp, email
  source_type     TEXT NOT NULL, -- paid, organic
  
  -- Métricas universais
  impressions     BIGINT DEFAULT 0,
  clicks          BIGINT DEFAULT 0,
  leads           INTEGER DEFAULT 0,
  conversions     INTEGER DEFAULT 0,
  spend           DECIMAL(10,2) DEFAULT 0,
  
  -- Métricas derivadas (calculadas)
  ctr             DECIMAL(6,4), -- clicks/impressions
  cpl             DECIMAL(10,2), -- spend/leads
  roas            DECIMAL(10,4), -- revenue/spend
  
  -- Métricas específicas por plataforma
  platform_metrics JSONB DEFAULT '{}',
  
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(client_id, date, platform, campaign_id)
);

-- Índice para queries de dashboard
CREATE INDEX traffic_metrics_client_date_idx ON traffic_metrics(client_id, date);
CREATE INDEX traffic_metrics_platform_idx ON traffic_metrics(platform);
```

---

## Módulo de Relatórios

### `reports`
```sql
CREATE TABLE reports (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id   UUID REFERENCES agencies(id),
  client_id   UUID REFERENCES clients(id),
  
  type        TEXT NOT NULL, -- weekly, monthly, pipeline, traffic, calls
  period_start DATE NOT NULL,
  period_end   DATE NOT NULL,
  
  status      TEXT DEFAULT 'draft', -- draft, generated, sent
  file_url    TEXT, -- Supabase Storage URL
  
  generated_at TIMESTAMPTZ,
  sent_at      TIMESTAMPTZ,
  
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
```

---

## RLS Policies (resumo)

```sql
-- Activar RLS em todas as tabelas
ALTER TABLE agencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE traffic_metrics ENABLE ROW LEVEL SECURITY;

-- Exemplo: leads visíveis pela agência
CREATE POLICY "agency_leads" ON leads
  FOR ALL TO authenticated
  USING (agency_id = (SELECT agency_id FROM users WHERE id = auth.uid()));

-- Exemplo: leads visíveis pelo cliente (só as suas)
CREATE POLICY "client_leads_read" ON leads
  FOR SELECT TO authenticated
  USING (client_id = (SELECT client_id FROM client_users WHERE id = auth.uid()));

-- Exemplo: clients — agência só vê os seus
CREATE POLICY "agency_clients" ON clients
  FOR ALL TO authenticated
  USING (agency_id = (SELECT agency_id FROM users WHERE id = auth.uid()));
```

---

## Índices de Performance

```sql
-- Leads — queries frequentes
CREATE INDEX leads_last_contact_idx ON leads(last_contact_at);
CREATE INDEX leads_stage_idx ON leads(pipeline_stage_id);
CREATE INDEX leads_agent_idx ON leads(agent_id);

-- Calls — calendário e histórico
CREATE INDEX calls_scheduled_idx ON calls(scheduled_at);
CREATE INDEX calls_agent_idx ON calls(agent_id);
CREATE INDEX calls_lead_idx ON calls(lead_id);

-- Traffic metrics — dashboard queries
CREATE INDEX traffic_date_range_idx ON traffic_metrics(client_id, date DESC);
```

---

*Schema definido por Andre dos Reis (Engenheiro de Software).*  
*Migrations SQL a criar em: `supabase/migrations/`*
