-- ============================================================
-- HYPE Flow OS — Migration 0001: Initial Schema
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── AGENCIES ────────────────────────────────────────────────
CREATE TABLE agencies (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  slug        TEXT UNIQUE NOT NULL,
  logo_url    TEXT,
  plan        TEXT DEFAULT 'starter',
  settings    JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── USERS (agency team) ────────────────────────────────────
CREATE TABLE users (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  agency_id   UUID REFERENCES agencies(id) ON DELETE CASCADE,
  full_name   TEXT NOT NULL,
  email       TEXT NOT NULL,
  role        TEXT NOT NULL DEFAULT 'agency_manager',
  avatar_url  TEXT,
  is_active   BOOLEAN DEFAULT TRUE,
  last_login  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── CLIENTS ─────────────────────────────────────────────────
CREATE TABLE clients (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id            UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  account_manager_id   UUID REFERENCES users(id) ON DELETE SET NULL,
  name                 TEXT NOT NULL,
  slug                 TEXT NOT NULL,
  niche                TEXT NOT NULL DEFAULT 'outro',
  logo_url             TEXT,
  website              TEXT,
  primary_email        TEXT,
  primary_phone        TEXT,
  billing_email        TEXT,
  mrr                  DECIMAL(10,2) DEFAULT 0,
  contract_start       DATE,
  contract_end         DATE,
  status               TEXT DEFAULT 'active',
  health_score         INTEGER DEFAULT 100,
  monthly_lead_target  INTEGER,
  settings             JSONB DEFAULT '{}',
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(agency_id, slug)
);

-- ─── CLIENT USERS (portal access) ────────────────────────────
CREATE TABLE client_users (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id   UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  agency_id   UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  full_name   TEXT NOT NULL,
  email       TEXT NOT NULL,
  role        TEXT DEFAULT 'client_admin',
  is_active   BOOLEAN DEFAULT TRUE,
  last_login  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── PIPELINE CONFIG ─────────────────────────────────────────
CREATE TABLE pipeline_configs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id   UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  client_id   UUID REFERENCES clients(id) ON DELETE CASCADE,
  name        TEXT NOT NULL DEFAULT 'Default',
  is_default  BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE pipeline_stages (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_id      UUID REFERENCES pipeline_configs(id) ON DELETE CASCADE,
  agency_id        UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  position         INTEGER NOT NULL,
  color            TEXT DEFAULT '#21A0C4',
  sla_hours        INTEGER,
  automation_rules JSONB DEFAULT '[]',
  is_terminal      BOOLEAN DEFAULT FALSE,
  is_won           BOOLEAN DEFAULT FALSE,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ─── LEADS ───────────────────────────────────────────────────
CREATE TABLE leads (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id         UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  client_id         UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  agent_id          UUID REFERENCES users(id) ON DELETE SET NULL,
  pipeline_stage_id UUID REFERENCES pipeline_stages(id) ON DELETE SET NULL,
  full_name         TEXT NOT NULL,
  email             TEXT,
  phone             TEXT,
  company           TEXT,
  source            TEXT NOT NULL DEFAULT 'manual',
  source_type       TEXT DEFAULT 'manual',
  campaign_id       UUID,
  utm_source        TEXT,
  utm_medium        TEXT,
  utm_campaign      TEXT,
  utm_content       TEXT,
  referral_source   TEXT,
  status            TEXT DEFAULT 'new',
  score             INTEGER DEFAULT 0,
  temperature       TEXT DEFAULT 'cold',
  tags              TEXT[] DEFAULT '{}',
  notes             TEXT,
  lost_reason       TEXT,
  stage_entered_at  TIMESTAMPTZ DEFAULT NOW(),
  last_contact_at   TIMESTAMPTZ,
  first_contact_at  TIMESTAMPTZ DEFAULT NOW(),
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX leads_client_id_idx ON leads(client_id);
CREATE INDEX leads_agency_id_idx ON leads(agency_id);
CREATE INDEX leads_status_idx ON leads(status);
CREATE INDEX leads_source_idx ON leads(source);
CREATE INDEX leads_created_at_idx ON leads(created_at DESC);
CREATE INDEX leads_stage_idx ON leads(pipeline_stage_id);
CREATE INDEX leads_agent_idx ON leads(agent_id);
CREATE INDEX leads_last_contact_idx ON leads(last_contact_at);

-- ─── LEAD INTERACTIONS ───────────────────────────────────────
CREATE TABLE lead_interactions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id     UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  agency_id   UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
  type        TEXT NOT NULL,
  direction   TEXT,
  subject     TEXT,
  content     TEXT,
  outcome     TEXT,
  metadata    JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX lead_interactions_lead_id_idx ON lead_interactions(lead_id);

-- ─── CALLS ───────────────────────────────────────────────────
CREATE TABLE calls (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id            UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  client_id            UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  lead_id              UUID REFERENCES leads(id) ON DELETE SET NULL,
  agent_id             UUID REFERENCES users(id) ON DELETE SET NULL,
  scheduled_at         TIMESTAMPTZ NOT NULL,
  duration_min         INTEGER DEFAULT 45,
  meet_link            TEXT,
  calendar_event_id    TEXT,
  calendar_id          TEXT,
  google_channel_id    TEXT,
  status               TEXT DEFAULT 'scheduled',
  outcome              TEXT,
  notes                TEXT,
  actual_duration_min  INTEGER,
  reminder_sent        BOOLEAN DEFAULT FALSE,
  completed_at         TIMESTAMPTZ,
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX calls_scheduled_idx ON calls(scheduled_at);
CREATE INDEX calls_agent_idx ON calls(agent_id);
CREATE INDEX calls_lead_idx ON calls(lead_id);
CREATE INDEX calls_status_idx ON calls(status);

-- ─── INTEGRATIONS ────────────────────────────────────────────
CREATE TABLE integrations (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id             UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  client_id             UUID REFERENCES clients(id) ON DELETE CASCADE,
  provider              TEXT NOT NULL,
  access_token          TEXT,
  refresh_token         TEXT,
  token_expiry          TIMESTAMPTZ,
  external_account_id   TEXT,
  external_account_name TEXT,
  status                TEXT DEFAULT 'active',
  last_sync             TIMESTAMPTZ,
  error_message         TEXT,
  metadata              JSONB DEFAULT '{}',
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(client_id, provider)
);

-- ─── AD CAMPAIGNS ────────────────────────────────────────────
CREATE TABLE ad_campaigns (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id      UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  client_id      UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  integration_id UUID REFERENCES integrations(id) ON DELETE SET NULL,
  external_id    TEXT NOT NULL,
  platform       TEXT NOT NULL,
  name           TEXT NOT NULL,
  status         TEXT,
  objective      TEXT,
  daily_budget   DECIMAL(10,2),
  total_budget   DECIMAL(10,2),
  started_at     DATE,
  ended_at       DATE,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(client_id, platform, external_id)
);

-- ─── TRAFFIC METRICS ─────────────────────────────────────────
CREATE TABLE traffic_metrics (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id        UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  client_id        UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  integration_id   UUID REFERENCES integrations(id) ON DELETE SET NULL,
  campaign_id      UUID REFERENCES ad_campaigns(id) ON DELETE SET NULL,
  date             DATE NOT NULL,
  platform         TEXT NOT NULL,
  source_type      TEXT NOT NULL DEFAULT 'paid',
  impressions      BIGINT DEFAULT 0,
  clicks           BIGINT DEFAULT 0,
  leads            INTEGER DEFAULT 0,
  conversions      INTEGER DEFAULT 0,
  spend            DECIMAL(12,4) DEFAULT 0,
  ctr              DECIMAL(8,6),
  cpl              DECIMAL(12,4),
  roas             DECIMAL(10,4),
  platform_metrics JSONB DEFAULT '{}',
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX traffic_metrics_unique_idx ON traffic_metrics(client_id, date, platform, COALESCE(campaign_id::text, 'null'));
CREATE INDEX traffic_metrics_client_date_idx ON traffic_metrics(client_id, date DESC);
CREATE INDEX traffic_metrics_platform_idx ON traffic_metrics(platform);
CREATE INDEX traffic_metrics_date_idx ON traffic_metrics(date DESC);

-- ─── AUTOMATION RULES ────────────────────────────────────────
CREATE TABLE automation_rules (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id        UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  client_id        UUID REFERENCES clients(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  is_active        BOOLEAN DEFAULT TRUE,
  trigger_type     TEXT NOT NULL,
  trigger_config   JSONB DEFAULT '{}',
  conditions       JSONB DEFAULT '[]',
  actions          JSONB DEFAULT '[]',
  execution_count  INTEGER DEFAULT 0,
  last_executed_at TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE automation_logs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id           UUID REFERENCES automation_rules(id) ON DELETE CASCADE,
  agency_id         UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  lead_id           UUID REFERENCES leads(id) ON DELETE SET NULL,
  trigger_data      JSONB DEFAULT '{}',
  actions_executed  JSONB DEFAULT '[]',
  status            TEXT DEFAULT 'success',
  error_message     TEXT,
  executed_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX automation_logs_rule_id_idx ON automation_logs(rule_id);
CREATE INDEX automation_logs_agency_idx ON automation_logs(agency_id);
CREATE INDEX automation_logs_executed_at_idx ON automation_logs(executed_at DESC);

-- ─── REPORTS ─────────────────────────────────────────────────
CREATE TABLE reports (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id    UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  client_id    UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  type         TEXT NOT NULL,
  period_start DATE NOT NULL,
  period_end   DATE NOT NULL,
  status       TEXT DEFAULT 'draft',
  file_url     TEXT,
  generated_at TIMESTAMPTZ,
  sent_at      TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ─── UPDATED_AT TRIGGERS ─────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER agencies_updated_at BEFORE UPDATE ON agencies FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER clients_updated_at BEFORE UPDATE ON clients FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER leads_updated_at BEFORE UPDATE ON leads FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER calls_updated_at BEFORE UPDATE ON calls FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER integrations_updated_at BEFORE UPDATE ON integrations FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER automation_rules_updated_at BEFORE UPDATE ON automation_rules FOR EACH ROW EXECUTE FUNCTION update_updated_at();
