-- ============================================================
-- HYPE Flow OS — Migration 0003: Pixels, UTMs, TikTok & Realtime
-- ============================================================
-- Adds:
--   pixels            — tracking pixel registry per client
--   pixel_events      — server-side events log (Meta CAPI, Google MP, TikTok EAPI)
--   utm_templates     — reusable UTM parameter presets
--   scheduled_actions — delayed automation action queue
-- Updates:
--   traffic_metrics   — adds tiktok as recognised platform enum comment
-- ============================================================

-- ─── PIXELS ──────────────────────────────────────────────────
-- Stores pixel IDs for each client and platform.
-- Used by the pixel events endpoint to fan-out server-side events.
CREATE TABLE pixels (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id   UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  client_id   UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  platform    TEXT NOT NULL,                          -- 'meta' | 'google' | 'tiktok' | 'linkedin' | 'custom'
  pixel_id    TEXT NOT NULL,                          -- platform-specific pixel/measurement ID
  name        TEXT NOT NULL DEFAULT 'Pixel principal',
  is_active   BOOLEAN DEFAULT TRUE,
  access_token TEXT,                                  -- for server-side Conversions API
  test_event_code TEXT,                               -- Meta: test event code for debugging
  metadata    JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(client_id, platform, pixel_id)
);

CREATE INDEX pixels_client_idx ON pixels(client_id);
CREATE INDEX pixels_platform_idx ON pixels(platform);

CREATE TRIGGER pixels_updated_at BEFORE UPDATE ON pixels
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Enable RLS
ALTER TABLE pixels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agency_pixels_all" ON pixels
  FOR ALL TO authenticated
  USING (agency_id = get_user_agency_id());

CREATE POLICY "portal_pixels_read" ON pixels
  FOR SELECT TO authenticated
  USING (client_id = get_client_user_client_id());

-- ─── PIXEL EVENTS ────────────────────────────────────────────
-- Server-side event log — one row per event sent to each platform.
-- Allows debugging, deduplication and reporting on event coverage.
CREATE TABLE pixel_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pixel_id        UUID NOT NULL REFERENCES pixels(id) ON DELETE CASCADE,
  agency_id       UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  client_id       UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  lead_id         UUID REFERENCES leads(id) ON DELETE SET NULL,
  event_name      TEXT NOT NULL,                      -- 'Lead', 'Purchase', 'PageView', etc.
  event_id        TEXT,                               -- deduplication ID (match browser event)
  event_source_url TEXT,
  user_data       JSONB DEFAULT '{}',                 -- hashed: email, phone, fn, ln, ip, ua
  custom_data     JSONB DEFAULT '{}',                 -- value, currency, content_ids, etc.
  platform_response JSONB DEFAULT '{}',               -- raw API response from platform
  status          TEXT DEFAULT 'sent',                -- 'sent' | 'error' | 'duplicate'
  error_message   TEXT,
  sent_at         TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX pixel_events_pixel_idx ON pixel_events(pixel_id);
CREATE INDEX pixel_events_client_idx ON pixel_events(client_id);
CREATE INDEX pixel_events_sent_at_idx ON pixel_events(sent_at DESC);
CREATE INDEX pixel_events_event_name_idx ON pixel_events(event_name);

ALTER TABLE pixel_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agency_pixel_events_all" ON pixel_events
  FOR ALL TO authenticated
  USING (agency_id = get_user_agency_id());

-- ─── UTM TEMPLATES ───────────────────────────────────────────
-- Reusable UTM parameter presets for campaign URL generation.
CREATE TABLE utm_templates (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id   UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  client_id   UUID REFERENCES clients(id) ON DELETE CASCADE,  -- NULL = agency-wide template
  name        TEXT NOT NULL,
  base_url    TEXT NOT NULL,
  utm_source  TEXT NOT NULL,
  utm_medium  TEXT NOT NULL,
  utm_campaign TEXT NOT NULL,
  utm_content TEXT,
  utm_term    TEXT,
  platform    TEXT,                                   -- 'facebook' | 'google' | 'tiktok' | etc.
  is_active   BOOLEAN DEFAULT TRUE,
  use_count   INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX utm_templates_client_idx ON utm_templates(client_id);
CREATE INDEX utm_templates_agency_idx ON utm_templates(agency_id);

CREATE TRIGGER utm_templates_updated_at BEFORE UPDATE ON utm_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE utm_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agency_utm_templates_all" ON utm_templates
  FOR ALL TO authenticated
  USING (agency_id = get_user_agency_id());

-- ─── SCHEDULED ACTIONS ───────────────────────────────────────
-- Queue for delayed automation actions (e.g. send email after 24h).
-- Processed by the automation-scheduler edge function (cron).
CREATE TABLE scheduled_actions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id       UUID REFERENCES automation_rules(id) ON DELETE CASCADE,
  agency_id     UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  lead_id       UUID REFERENCES leads(id) ON DELETE CASCADE,
  action_type   TEXT NOT NULL,
  action_config JSONB DEFAULT '{}',
  scheduled_for TIMESTAMPTZ NOT NULL,                 -- when to execute
  status        TEXT DEFAULT 'pending',               -- 'pending' | 'executed' | 'cancelled' | 'failed'
  attempts      INTEGER DEFAULT 0,
  last_error    TEXT,
  executed_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX scheduled_actions_status_idx ON scheduled_actions(status, scheduled_for);
CREATE INDEX scheduled_actions_agency_idx ON scheduled_actions(agency_id);
CREATE INDEX scheduled_actions_lead_idx ON scheduled_actions(lead_id);

ALTER TABLE scheduled_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agency_scheduled_actions_all" ON scheduled_actions
  FOR ALL TO authenticated
  USING (agency_id = get_user_agency_id());

-- ─── FORMS TABLE (for native forms support) ──────────────────
-- Stores form definitions created in the Formulários page.
CREATE TABLE forms (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id   UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  client_id   UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL,
  description TEXT,
  is_published BOOLEAN DEFAULT FALSE,
  fields      JSONB DEFAULT '[]',                     -- array of field definitions
  settings    JSONB DEFAULT '{}',                     -- redirect_url, notification_email, etc.
  submission_count INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(agency_id, slug)
);

CREATE INDEX forms_slug_idx ON forms(slug);
CREATE INDEX forms_client_idx ON forms(client_id);

CREATE TRIGGER forms_updated_at BEFORE UPDATE ON forms
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE forms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agency_forms_all" ON forms
  FOR ALL TO authenticated
  USING (agency_id = get_user_agency_id());

-- Public read for published forms (used by /f/[slug] page)
CREATE POLICY "public_forms_read" ON forms
  FOR SELECT TO anon, authenticated
  USING (is_published = TRUE);

-- ─── FORM ANSWERS ────────────────────────────────────────────
CREATE TABLE form_answers (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id     UUID NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
  lead_id     UUID REFERENCES leads(id) ON DELETE SET NULL,
  agency_id   UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  field_id    TEXT NOT NULL,
  answer      TEXT,
  submitted_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX form_answers_lead_idx ON form_answers(lead_id);
CREATE INDEX form_answers_form_idx ON form_answers(form_id);

ALTER TABLE form_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agency_form_answers_all" ON form_answers
  FOR ALL TO authenticated
  USING (agency_id = get_user_agency_id());

-- ─── ENABLE REALTIME ─────────────────────────────────────────
-- Allow Supabase Realtime subscriptions on these tables.
-- The portal Pipeline and agency dashboard use live subscriptions.
ALTER PUBLICATION supabase_realtime ADD TABLE leads;
ALTER PUBLICATION supabase_realtime ADD TABLE calls;
ALTER PUBLICATION supabase_realtime ADD TABLE pipeline_stages;
ALTER PUBLICATION supabase_realtime ADD TABLE automation_logs;
