-- 0009_ai_rate_limits_rls.sql
--
-- Fix Supabase linter ERROR `rls_disabled_in_public` on `public.ai_rate_limits`.
--
-- Background: migration 0005 (story 01.9) intentionally left RLS off because the
-- table is service-role only — the rate-limiter at
-- `apps/hypeflow/lib/api/rate-limit.ts` accesses it exclusively via the service
-- client (`createServiceClient()`), which has BYPASSRLS in Supabase.
--
-- However, every table in the `public` schema is auto-exposed by PostgREST. With
-- RLS off, the anon/authenticated keys (which ship in the frontend bundle) can
-- still read and write this table directly. The linter correctly flags this as
-- ERROR-level.
--
-- Fix: enable RLS, add explicit deny-all policies for anon and authenticated,
-- and revoke direct table grants from those roles. Service-role bypasses RLS,
-- so the rate-limiter continues to work unchanged. No data is touched.
--
-- This table has no `agency_id` / `client_id` columns — it is per-IP infra data,
-- not tenant data — so the standard agency baseline policy from
-- `docs/guidelines/multi-tenancy.md` does not apply.

BEGIN;

ALTER TABLE public.ai_rate_limits ENABLE ROW LEVEL SECURITY;

-- Explicit deny policies. Without any policy, RLS already default-denies for
-- non-bypass roles, but Supabase's linter then flags `0014_no_policy`. Being
-- explicit is also clearer to future readers.
CREATE POLICY "ai_rate_limits_deny_anon"
  ON public.ai_rate_limits
  FOR ALL
  TO anon
  USING (false)
  WITH CHECK (false);

CREATE POLICY "ai_rate_limits_deny_authenticated"
  ON public.ai_rate_limits
  FOR ALL
  TO authenticated
  USING (false)
  WITH CHECK (false);

-- Defence in depth: revoke direct grants too. Service-role keeps full access via
-- its role; anon/authenticated lose privileges at both the grant and policy level.
REVOKE ALL ON TABLE public.ai_rate_limits FROM anon, authenticated;

COMMENT ON TABLE public.ai_rate_limits IS
  'Sliding-window counter for /api/ai/* rate limits. Story 01.9 / audit C6. '
  'Service-role only — RLS deny-all for anon/authenticated (migration 0009).';

COMMIT;
