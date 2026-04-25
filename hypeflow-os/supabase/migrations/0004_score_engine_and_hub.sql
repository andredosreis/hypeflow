-- ============================================================
-- HYPE Flow OS — Migration 0004: Score Engine & Ingestion Hub
-- ============================================================
-- Adds to leads:
--   score_breakdown         — JSONB breakdown of signal contributions from the engine
--   score_weights_version   — SHA-256 (truncated) of the weights config used
--   score_error             — TRUE when scoring failed (fallback applied)
--   email_normalized        — lowercased+trimmed email for dedup
--   phone_normalized        — digits-only phone for dedup
--   event_id                — idempotency key from inbound webhook
--   deduplication_info      — non-user-facing JSONB metadata describing why a
--                             normalized field was cleared during backfill
--
-- Adds new table:
--   webhook_failures        — dead-letter log for rejected/failed webhooks
--
-- Adds constraints/indices:
--   UNIQUE (client_id, email_normalized)
--   UNIQUE (client_id, phone_normalized)
--   INDEX  leads(event_id)
--
-- Production-safe backfill:
--   1. Populate email_normalized and phone_normalized from existing email/phone.
--   2. For each (client_id, email_normalized) collision group: keep the oldest
--      lead (smallest created_at, id as tiebreaker) and clear the normalized
--      field on the rest, preserving a trace in deduplication_info. Original
--      email/phone are NEVER modified — no data is lost.
--   3. Same for phone.
--   4. Only then enforce the UNIQUE constraints.
--
-- Runs inside a single transaction — either the whole migration applies or
-- nothing does. Safe to roll back on any failure.
-- ============================================================

BEGIN;

-- ─── 1. LEADS: SCORE ENGINE COLUMNS ──────────────────────────
ALTER TABLE leads
  ADD COLUMN score_breakdown        JSONB,
  ADD COLUMN score_weights_version  TEXT,
  ADD COLUMN score_error            BOOLEAN NOT NULL DEFAULT FALSE;

-- ─── 2. LEADS: INGESTION HUB COLUMNS ─────────────────────────
ALTER TABLE leads
  ADD COLUMN email_normalized       TEXT,
  ADD COLUMN phone_normalized       TEXT,
  ADD COLUMN event_id               TEXT,
  ADD COLUMN deduplication_info     JSONB;

-- ─── 3. BACKFILL normalized fields ───────────────────────────
-- Empty strings after normalization are collapsed to NULL so they don't
-- collide on the UNIQUE constraint (Postgres treats NULLs as distinct).
UPDATE leads
   SET email_normalized = NULLIF(LOWER(TRIM(email)), '')
 WHERE email IS NOT NULL;

UPDATE leads
   SET phone_normalized = NULLIF(REGEXP_REPLACE(phone, '[^0-9]', '', 'g'), '')
 WHERE phone IS NOT NULL;

-- ─── 4. DEDUP email collisions ───────────────────────────────
-- Winner = oldest row (smallest created_at, id as tiebreaker).
-- Losers keep their original email but get email_normalized cleared and
-- a pointer to the winner recorded in deduplication_info.email.
WITH email_groups AS (
  SELECT id,
         client_id,
         email_normalized,
         ROW_NUMBER() OVER (
           PARTITION BY client_id, email_normalized
           ORDER BY created_at ASC, id ASC
         ) AS rn,
         FIRST_VALUE(id) OVER (
           PARTITION BY client_id, email_normalized
           ORDER BY created_at ASC, id ASC
         ) AS winner_id
    FROM leads
   WHERE email_normalized IS NOT NULL
)
UPDATE leads l
   SET deduplication_info =
         COALESCE(l.deduplication_info, '{}'::jsonb)
         || jsonb_build_object(
              'email', jsonb_build_object(
                'duplicate_of',   g.winner_id,
                'collided_value', g.email_normalized,
                'marked_at',      NOW()
              )
            ),
       email_normalized = NULL
  FROM email_groups g
 WHERE l.id = g.id
   AND g.rn > 1;

-- ─── 5. DEDUP phone collisions ───────────────────────────────
WITH phone_groups AS (
  SELECT id,
         client_id,
         phone_normalized,
         ROW_NUMBER() OVER (
           PARTITION BY client_id, phone_normalized
           ORDER BY created_at ASC, id ASC
         ) AS rn,
         FIRST_VALUE(id) OVER (
           PARTITION BY client_id, phone_normalized
           ORDER BY created_at ASC, id ASC
         ) AS winner_id
    FROM leads
   WHERE phone_normalized IS NOT NULL
)
UPDATE leads l
   SET deduplication_info =
         COALESCE(l.deduplication_info, '{}'::jsonb)
         || jsonb_build_object(
              'phone', jsonb_build_object(
                'duplicate_of',   g.winner_id,
                'collided_value', g.phone_normalized,
                'marked_at',      NOW()
              )
            ),
       phone_normalized = NULL
  FROM phone_groups g
 WHERE l.id = g.id
   AND g.rn > 1;

-- ─── 6. DEDUP CONSTRAINTS ────────────────────────────────────
-- After steps 4/5 all collisions are cleared (duplicates now have NULL
-- normalized fields, which UNIQUE allows to repeat).
ALTER TABLE leads
  ADD CONSTRAINT leads_client_email_normalized_uniq
    UNIQUE (client_id, email_normalized);

ALTER TABLE leads
  ADD CONSTRAINT leads_client_phone_normalized_uniq
    UNIQUE (client_id, phone_normalized);

-- ─── 7. IDEMPOTENCY INDEX ────────────────────────────────────
CREATE INDEX leads_event_id_idx ON leads(event_id);

-- ─── 8. WEBHOOK FAILURES (dead-letter) ───────────────────────
CREATE TABLE webhook_failures (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id     UUID REFERENCES agencies(id) ON DELETE CASCADE,
  client_id     UUID REFERENCES clients(id) ON DELETE CASCADE,
  provider      TEXT NOT NULL,                        -- 'evolution' | 'ghl' | 'meta' | 'custom' | ...
  received_at   TIMESTAMPTZ NOT NULL,                 -- when the webhook hit our endpoint
  raw_payload   JSONB NOT NULL,                       -- untouched body for replay
  reason        TEXT NOT NULL,                        -- short error classifier
  attempt_count INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX webhook_failures_agency_idx    ON webhook_failures(agency_id);
CREATE INDEX webhook_failures_client_idx    ON webhook_failures(client_id);
CREATE INDEX webhook_failures_provider_idx  ON webhook_failures(provider);
CREATE INDEX webhook_failures_received_idx  ON webhook_failures(received_at DESC);

ALTER TABLE webhook_failures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agency_webhook_failures_all" ON webhook_failures
  FOR ALL TO authenticated
  USING (agency_id = get_user_agency_id());

COMMIT;
