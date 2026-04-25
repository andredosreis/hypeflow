-- =============================================================
-- Story 03.1 / FDD lead-ingestion-hub-fdd.md — Lead Ingestion Hub MVP
-- =============================================================
-- Migration 0004 already added ingestion-hub columns and dedup constraints
-- (event_id, email_normalized, phone_normalized, deduplication_info,
-- score_breakdown/score_error/score_weights_version, webhook_failures table).
--
-- This migration adds only what is still missing for the universal Lead DTO:
--   - leads.metadata (provider-specific extras with no canonical mapping)
--   - leads.raw_payload (audit trail for ingested webhooks)
--   - leads.source_platform (canonical, distinct from legacy `source`)
--   - leads.schema_version (DTO version)
--   - leads.provider (which adapter produced the row)
--   - UNIQUE constraint on leads.event_id (was just a non-unique index)
--   - webhook_failures.error_detail / last_attempt_at / replayed_at
--   - webhook_failures retention helpers
--
-- All additions are nullable + safely backfilled. NO existing constraints are
-- altered or dropped.
-- =============================================================

begin;

-- ─── Schema additions to public.leads ────────────────────────────
alter table public.leads
  add column if not exists metadata jsonb not null default '{}'::jsonb,
  add column if not exists raw_payload jsonb,
  add column if not exists source_platform text,
  add column if not exists schema_version text not null default 'v1',
  add column if not exists provider text;

comment on column public.leads.metadata is
  'Provider-specific fields without canonical mapping. Reserved keys: score_pending. Distinct from deduplication_info (which tracks merge/dedup state). Story 03.1 / FDD.';
comment on column public.leads.raw_payload is
  'Original webhook payload preserved for audit. Never logged; only persisted here and in webhook_failures.';
comment on column public.leads.source_platform is
  'Canonical platform: facebook | whatsapp | instagram | google | tiktok | linkedin | manual | …';
comment on column public.leads.schema_version is
  'DTO version. v1 today; coexistence model documented in FDD §5.';
comment on column public.leads.provider is
  'Adapter that produced this row: evolution | meta | tally | typeform | manychat | n8n | ghl | manual.';

-- ─── Backfill existing rows ───────────────────────────────────────
update public.leads
   set source_platform = source
 where source_platform is null;

update public.leads
   set provider = 'manual'
 where provider is null;

-- ─── UNIQUE on event_id (was non-unique index from 0004) ──────────
-- Partial unique index — multiple rows without event_id are still allowed
-- (manual leads). Idempotency only matters when event_id is set.
create unique index if not exists leads_event_id_uniq
  on public.leads (event_id)
  where event_id is not null;

-- ─── Recent-by-client lookup (dedup recency check) ───────────────
create index if not exists leads_client_created_at_idx
  on public.leads (client_id, created_at desc);

-- ─── webhook_failures additions ───────────────────────────────────
alter table public.webhook_failures
  add column if not exists error_detail text,
  add column if not exists last_attempt_at timestamptz not null default now(),
  add column if not exists replayed_at timestamptz;

comment on column public.webhook_failures.error_detail is
  'Free-form error message captured at the time of failure. Useful for diagnosing recurring schema mismatches.';
comment on column public.webhook_failures.last_attempt_at is
  'Updated each time replay is attempted. Story 03.1 sets it on insert; replay flow (ADR-014) updates it on retry.';
comment on column public.webhook_failures.replayed_at is
  'Set when a manual replay successfully persists the lead. Until then the row is "pending" in the dead-letter queue.';

create index if not exists webhook_failures_pending
  on public.webhook_failures (received_at)
  where replayed_at is null;

commit;
