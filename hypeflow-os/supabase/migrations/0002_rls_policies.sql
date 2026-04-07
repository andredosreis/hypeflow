-- ============================================================
-- HYPE Flow OS — Migration 0002: RLS Policies
-- ============================================================

-- Helper: get agency_id for logged-in agency user
CREATE OR REPLACE FUNCTION get_user_agency_id()
RETURNS UUID AS $$
  SELECT agency_id FROM users WHERE id = auth.uid()
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Helper: get client_id for logged-in portal user
CREATE OR REPLACE FUNCTION get_client_user_client_id()
RETURNS UUID AS $$
  SELECT client_id FROM client_users WHERE id = auth.uid()
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Helper: check if logged-in user is agency admin
CREATE OR REPLACE FUNCTION is_agency_admin()
RETURNS BOOLEAN AS $$
  SELECT role = 'agency_admin' FROM users WHERE id = auth.uid()
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- ─── Enable RLS ───────────────────────────────────────────────
ALTER TABLE agencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE traffic_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- ─── AGENCIES ────────────────────────────────────────────────
CREATE POLICY "agency_self_read" ON agencies
  FOR SELECT TO authenticated
  USING (id = get_user_agency_id());

-- ─── USERS (agency team) ─────────────────────────────────────
CREATE POLICY "agency_users_read" ON users
  FOR SELECT TO authenticated
  USING (agency_id = get_user_agency_id());

CREATE POLICY "agency_admin_manage_users" ON users
  FOR ALL TO authenticated
  USING (agency_id = get_user_agency_id() AND is_agency_admin());

-- ─── CLIENTS ─────────────────────────────────────────────────
-- Agency: see their own clients
CREATE POLICY "agency_clients_all" ON clients
  FOR ALL TO authenticated
  USING (agency_id = get_user_agency_id());

-- Portal user: see only their client
CREATE POLICY "portal_client_read" ON clients
  FOR SELECT TO authenticated
  USING (id = get_client_user_client_id());

-- ─── LEADS ───────────────────────────────────────────────────
-- Agency: all leads in their agency
CREATE POLICY "agency_leads_all" ON leads
  FOR ALL TO authenticated
  USING (agency_id = get_user_agency_id());

-- Portal: read-only, only their client's leads
CREATE POLICY "portal_leads_read" ON leads
  FOR SELECT TO authenticated
  USING (client_id = get_client_user_client_id());

-- ─── LEAD INTERACTIONS ───────────────────────────────────────
CREATE POLICY "agency_interactions_all" ON lead_interactions
  FOR ALL TO authenticated
  USING (agency_id = get_user_agency_id());

-- ─── CALLS ───────────────────────────────────────────────────
CREATE POLICY "agency_calls_all" ON calls
  FOR ALL TO authenticated
  USING (agency_id = get_user_agency_id());

CREATE POLICY "portal_calls_read" ON calls
  FOR SELECT TO authenticated
  USING (client_id = get_client_user_client_id());

-- ─── PIPELINE ────────────────────────────────────────────────
CREATE POLICY "agency_pipeline_all" ON pipeline_configs
  FOR ALL TO authenticated
  USING (agency_id = get_user_agency_id());

CREATE POLICY "agency_stages_all" ON pipeline_stages
  FOR ALL TO authenticated
  USING (agency_id = get_user_agency_id());

-- ─── INTEGRATIONS ────────────────────────────────────────────
CREATE POLICY "agency_integrations_all" ON integrations
  FOR ALL TO authenticated
  USING (agency_id = get_user_agency_id());

-- ─── AD CAMPAIGNS ────────────────────────────────────────────
CREATE POLICY "agency_campaigns_all" ON ad_campaigns
  FOR ALL TO authenticated
  USING (agency_id = get_user_agency_id());

-- ─── TRAFFIC METRICS ─────────────────────────────────────────
CREATE POLICY "agency_traffic_all" ON traffic_metrics
  FOR ALL TO authenticated
  USING (agency_id = get_user_agency_id());

CREATE POLICY "portal_traffic_read" ON traffic_metrics
  FOR SELECT TO authenticated
  USING (client_id = get_client_user_client_id());

-- ─── AUTOMATION RULES ────────────────────────────────────────
CREATE POLICY "agency_automations_all" ON automation_rules
  FOR ALL TO authenticated
  USING (agency_id = get_user_agency_id());

CREATE POLICY "agency_automation_logs_all" ON automation_logs
  FOR ALL TO authenticated
  USING (agency_id = get_user_agency_id());

-- ─── REPORTS ─────────────────────────────────────────────────
CREATE POLICY "agency_reports_all" ON reports
  FOR ALL TO authenticated
  USING (agency_id = get_user_agency_id());

CREATE POLICY "portal_reports_read" ON reports
  FOR SELECT TO authenticated
  USING (client_id = get_client_user_client_id());
