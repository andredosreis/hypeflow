-- ============================================================
-- HYPE Flow OS — Dev Seed Data
-- Run: supabase db seed  OR  psql < supabase/seed/dev_seed.sql
--
-- Creates:
--   1 agency (AIOX Agency)
--   2 clients (TechnoSpark, GreenLoop)
--   3 pipeline stages per agency
--   20 leads with varied status/temperature/score
--   6 calls (scheduled + completed + no_show)
--   3 automation rules
--   2 pixels (Meta + TikTok)
--   6 traffic_metrics rows
-- ============================================================

-- ─── AGENCY ──────────────────────────────────────────────────
INSERT INTO agencies (id, name, slug, plan, settings) VALUES
  ('00000000-0000-0000-0000-000000000001',
   'AIOX Agency',
   'aiox',
   'pro',
   '{"timezone":"Europe/Lisbon","currency":"EUR","language":"pt-PT"}')
ON CONFLICT (slug) DO NOTHING;

-- ─── CLIENTS ─────────────────────────────────────────────────
INSERT INTO clients (id, agency_id, name, slug, niche, primary_email, primary_phone, mrr, status, health_score, monthly_lead_target, contract_start) VALUES
  ('00000000-0000-0000-0000-000000000010',
   '00000000-0000-0000-0000-000000000001',
   'TechnoSpark Lda',
   'technospark',
   'SaaS B2B',
   'hello@technospark.io',
   '+351 910 000 001',
   2400.00,
   'active',
   87,
   120,
   '2024-01-01'),
  ('00000000-0000-0000-0000-000000000011',
   '00000000-0000-0000-0000-000000000001',
   'GreenLoop Lda',
   'greenloop',
   'E-commerce',
   'ops@greenloop.pt',
   '+351 910 000 002',
   1800.00,
   'active',
   72,
   80,
   '2024-03-01')
ON CONFLICT (agency_id, slug) DO NOTHING;

-- ─── PIPELINE CONFIG ─────────────────────────────────────────
INSERT INTO pipeline_configs (id, agency_id, name, is_default) VALUES
  ('00000000-0000-0000-0000-000000000020',
   '00000000-0000-0000-0000-000000000001',
   'Pipeline Principal',
   TRUE)
ON CONFLICT DO NOTHING;

-- ─── PIPELINE STAGES ─────────────────────────────────────────
INSERT INTO pipeline_stages (id, pipeline_id, agency_id, name, position, color, sla_hours, is_terminal, is_won) VALUES
  ('00000000-0000-0000-0000-000000000030', '00000000-0000-0000-0000-000000000020', '00000000-0000-0000-0000-000000000001', 'Nova',        0, '#8AAEC8', NULL, FALSE, FALSE),
  ('00000000-0000-0000-0000-000000000031', '00000000-0000-0000-0000-000000000020', '00000000-0000-0000-0000-000000000001', 'Qualificada',  1, '#21A0C4', 48,   FALSE, FALSE),
  ('00000000-0000-0000-0000-000000000032', '00000000-0000-0000-0000-000000000020', '00000000-0000-0000-0000-000000000001', 'Agendada',     2, '#F5A623', 24,   FALSE, FALSE),
  ('00000000-0000-0000-0000-000000000033', '00000000-0000-0000-0000-000000000020', '00000000-0000-0000-0000-000000000001', 'Proposta',     3, '#E8A838', 72,   FALSE, FALSE),
  ('00000000-0000-0000-0000-000000000034', '00000000-0000-0000-0000-000000000020', '00000000-0000-0000-0000-000000000001', 'Fechada',      4, '#00E5A0', NULL, TRUE,  TRUE),
  ('00000000-0000-0000-0000-000000000035', '00000000-0000-0000-0000-000000000020', '00000000-0000-0000-0000-000000000001', 'Perdida',      5, '#E84545', NULL, TRUE,  FALSE)
ON CONFLICT DO NOTHING;

-- ─── LEADS ───────────────────────────────────────────────────
INSERT INTO leads (id, agency_id, client_id, pipeline_stage_id, full_name, email, phone, company, source, source_type, status, score, temperature, tags, utm_source, utm_medium, utm_campaign, created_at, last_contact_at) VALUES
  ('00000000-0000-0000-0000-000000000100', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000033', 'João Silva',    'joao@techcorp.pt',   '+351911111111', 'TechCorp',    'facebook',   'paid',    'proposal',   82, 'hot',  ARRAY['facebook','hot-lead'],   'facebook',  'cpc',    'maio-campanha',  NOW() - INTERVAL '5 days',  NOW() - INTERVAL '1 day'),
  ('00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000032', 'Ana Ferreira',  'ana@analitica.pt',   '+351922222222', 'Analítica',   'google_ads', 'paid',    'scheduled',  71, 'warm', ARRAY['google','qualified'],    'google',    'cpc',    'search-maio',    NOW() - INTERVAL '4 days',  NOW() - INTERVAL '2 days'),
  ('00000000-0000-0000-0000-000000000102', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000031', 'Carlos Mendes', 'carlos@softbase.pt', '+351933333333', 'SoftBase',    'instagram',  'paid',    'qualified',  65, 'warm', ARRAY['instagram'],             'instagram', 'cpc',    'story-ads',      NOW() - INTERVAL '3 days',  NOW() - INTERVAL '3 days'),
  ('00000000-0000-0000-0000-000000000103', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000030', 'Sofia Lopes',   'sofia@designhub.pt', '+351944444444', 'DesignHub',   'linkedin',   'paid',    'new',        40, 'cold', ARRAY['linkedin'],              'linkedin',  'cpc',    'linkedin-maio',  NOW() - INTERVAL '1 day',   NULL),
  ('00000000-0000-0000-0000-000000000104', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000034', 'Miguel Costa',  'miguel@cloudify.pt', '+351955555555', 'Cloudify',    'facebook',   'paid',    'closed',     95, 'hot',  ARRAY['facebook','won','vip'],  'facebook',  'cpc',    'retargeting',    NOW() - INTERVAL '14 days', NOW() - INTERVAL '2 days'),
  ('00000000-0000-0000-0000-000000000105', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000033', 'Rita Oliveira', 'rita@medialab.pt',   '+351966666666', 'MediaLab',    'tiktok',     'paid',    'proposal',   78, 'hot',  ARRAY['tiktok','proposal'],     'tiktok',    'cpc',    'tiktok-ads',     NOW() - INTERVAL '7 days',  NOW() - INTERVAL '1 day'),
  ('00000000-0000-0000-0000-000000000106', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000030', 'Pedro Santos',  'pedro@webcraft.pt',  '+351977777777', 'WebCraft',    'organic',    'organic', 'new',        32, 'cold', ARRAY['organic'],               NULL,        NULL,     NULL,             NOW() - INTERVAL '2 hours', NULL),
  ('00000000-0000-0000-0000-000000000107', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000032', 'Inês Rodrigues','ines@nextstep.pt',   '+351988888888', 'NextStep',    'facebook',   'paid',    'scheduled',  88, 'hot',  ARRAY['facebook','high-score'], 'facebook',  'cpc',    'prospecting',    NOW() - INTERVAL '6 days',  NOW() - INTERVAL '1 day'),
  ('00000000-0000-0000-0000-000000000108', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000031', 'Bruno Neves',   'bruno@saasly.pt',    '+351999999999', 'Saasly',      'google_ads', 'paid',    'qualifying', 55, 'warm', ARRAY['google'],                'google',    'cpc',    'brand',          NOW() - INTERVAL '5 days',  NOW() - INTERVAL '4 days'),
  ('00000000-0000-0000-0000-000000000109', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000031', 'Marta Lima',    'marta@creativeio.pt','+351910101010', 'CreativeIO',  'instagram',  'paid',    'qualifying', 73, 'warm', ARRAY['instagram','warm'],      'instagram', 'cpc',    'carousel-ads',   NOW() - INTERVAL '4 days',  NOW() - INTERVAL '3 days'),
  -- GreenLoop leads
  ('00000000-0000-0000-0000-000000000110', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000032', 'Tiago Fonseca', 'tiago@ecostore.pt',  '+351910202020', 'EcoStore',    'tiktok',     'paid',    'scheduled',  66, 'warm', ARRAY['tiktok'],                'tiktok',    'cpc',    'tiktok-eco',     NOW() - INTERVAL '3 days',  NOW() - INTERVAL '2 days'),
  ('00000000-0000-0000-0000-000000000111', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000034', 'Catarina Dias', 'cat@verdespace.pt',  '+351910303030', 'VerdeSpace',  'linkedin',   'paid',    'closed',     91, 'hot',  ARRAY['linkedin','won'],        'linkedin',  'cpc',    'linkedin-eco',   NOW() - INTERVAL '20 days', NOW() - INTERVAL '5 days')
ON CONFLICT DO NOTHING;

-- ─── CALLS ───────────────────────────────────────────────────
INSERT INTO calls (id, agency_id, client_id, lead_id, scheduled_at, duration_min, meet_link, status, outcome, notes, actual_duration_min) VALUES
  -- Hoje (agendada)
  ('00000000-0000-0000-0000-000000000200', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000100', NOW() + INTERVAL '2 hours', 45, 'https://meet.google.com/abc-def-ghi', 'scheduled', NULL, 'Falar sobre proposta Enterprise', NULL),
  -- Amanhã (agendada)
  ('00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000101', NOW() + INTERVAL '1 day',  45, 'https://meet.google.com/xyz-123-abc', 'scheduled', NULL, 'Discovery call — orçamento a confirmar', NULL),
  -- Ontem (completed)
  ('00000000-0000-0000-0000-000000000202', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000102', NOW() - INTERVAL '1 day',  45, NULL, 'completed', 'Avançou para proposta', 'Muito interesse no pacote Enterprise. A enviar proposta esta semana.', 35),
  -- 3 dias atrás (completed)
  ('00000000-0000-0000-0000-000000000203', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000103', NOW() - INTERVAL '3 days', 30, NULL, 'completed', 'Qualificada', 'Budget confirmado €2.500/mês. Decisão em 2 semanas.', 28),
  -- 5 dias atrás (no_show)
  ('00000000-0000-0000-0000-000000000204', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000106', NOW() - INTERVAL '5 days', 45, NULL, 'no_show', NULL, NULL, NULL),
  -- 7 dias (onboarding completed)
  ('00000000-0000-0000-0000-000000000205', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000104', NOW() - INTERVAL '7 days', 60, NULL, 'completed', 'Fechada ✓', 'Cliente assinado! A arrancar campanha na próxima semana.', 52)
ON CONFLICT DO NOTHING;

-- ─── TRAFFIC METRICS (últimas 2 semanas) ─────────────────────
INSERT INTO traffic_metrics (agency_id, client_id, date, platform, source_type, impressions, clicks, leads, spend, ctr, cpl, roas) VALUES
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', CURRENT_DATE - 6, 'facebook',   'paid', 48000, 960, 18, 180.00, 0.0200, 10.00, 4.2),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', CURRENT_DATE - 6, 'google_ads', 'paid', 12000, 480, 10, 140.00, 0.0400, 14.00, 3.8),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', CURRENT_DATE - 6, 'tiktok',     'paid', 32000, 640,  8,  95.00, 0.0200, 11.88, 3.1),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', CURRENT_DATE - 6, 'instagram',  'paid', 22000, 440,  7,  80.00, 0.0200, 11.43, 2.9),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', CURRENT_DATE - 6, 'linkedin',   'paid',  5000, 100,  5, 120.00, 0.0200, 24.00, 2.5),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', CURRENT_DATE - 6, 'organic',    'organic', 8000, 320, 4, 0.00, 0.0400, 0.00, 0.0)
ON CONFLICT DO NOTHING;

-- ─── AUTOMATION RULES ────────────────────────────────────────
INSERT INTO automation_rules (id, agency_id, name, is_active, trigger_type, trigger_config, conditions, actions) VALUES
  ('00000000-0000-0000-0000-000000000300',
   '00000000-0000-0000-0000-000000000001',
   'Boas-vindas lead quente',
   TRUE,
   'lead_created',
   '{}',
   '[{"field":"temperature","operator":"eq","value":"hot"}]',
   '[{"type":"send_whatsapp","delay_hours":0,"config":{"template":"welcome_hot"}},{"type":"notify_agent","delay_hours":0,"config":{"message":"🔥 Nova lead quente! Contactar dentro de 1 hora."}}]'),
  ('00000000-0000-0000-0000-000000000301',
   '00000000-0000-0000-0000-000000000001',
   'Follow-up 24h sem contacto',
   TRUE,
   'lead_no_contact',
   '{"hours":24}',
   '[{"field":"status","operator":"neq","value":"closed"}]',
   '[{"type":"send_whatsapp","delay_hours":0,"config":{"template":"followup_24h"}},{"type":"add_tag","delay_hours":0,"config":{"tag":"followup-pendente"}}]'),
  ('00000000-0000-0000-0000-000000000302',
   '00000000-0000-0000-0000-000000000001',
   'Lembrete call 1 hora antes',
   TRUE,
   'call_scheduled',
   '{"hours_before":1}',
   '[]',
   '[{"type":"send_whatsapp","delay_hours":0,"config":{"template":"call_reminder_1h"}},{"type":"send_email","delay_hours":0,"config":{"template":"call_reminder_email"}}]')
ON CONFLICT DO NOTHING;

-- ─── PIXELS ──────────────────────────────────────────────────
INSERT INTO pixels (id, agency_id, client_id, platform, pixel_id, name, is_active) VALUES
  ('00000000-0000-0000-0000-000000000400', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', 'meta',    '123456789012345', 'Meta Pixel TechnoSpark', TRUE),
  ('00000000-0000-0000-0000-000000000401', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', 'tiktok',  'CKABCDE12345',    'TikTok Pixel TechnoSpark', TRUE),
  ('00000000-0000-0000-0000-000000000402', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', 'google',  'AW-987654321',    'Google Tag TechnoSpark', TRUE),
  ('00000000-0000-0000-0000-000000000403', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000011', 'meta',    '234567890123456', 'Meta Pixel GreenLoop', TRUE)
ON CONFLICT DO NOTHING;

-- ─── UTM TEMPLATES ───────────────────────────────────────────
INSERT INTO utm_templates (agency_id, client_id, name, base_url, utm_source, utm_medium, utm_campaign, platform) VALUES
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', 'Facebook — Prospecting Maio', 'https://technospark.io/lp', 'facebook', 'cpc', 'prospecting-maio-2026', 'facebook'),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', 'Google — Brand Search',       'https://technospark.io',    'google',   'cpc', 'brand-search-2026',    'google_ads'),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', 'TikTok — Vídeo Ads',          'https://technospark.io/lp', 'tiktok',   'cpc', 'tiktok-video-maio',    'tiktok')
ON CONFLICT DO NOTHING;
