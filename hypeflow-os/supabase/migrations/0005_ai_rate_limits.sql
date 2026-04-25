-- Story 01.9 — AI route rate-limit backend (C6 from test-audit-report-2026-04-24).
--
-- Stores per-(ip, route) request timestamps for sliding-window rate limiting.
-- Service-role only: no RLS; the application accesses this table via service client.
--
-- Cleanup: rows older than 10 minutes are irrelevant for a 60s window.
-- A cron job or Edge Function should periodically `DELETE FROM ai_rate_limits WHERE ts < now() - interval '10 minutes'`.
-- For the initial deployment, acceptable to let the table grow bounded by traffic and add the cleanup later.

create table if not exists public.ai_rate_limits (
  id         bigserial primary key,
  bucket_key text        not null,        -- e.g. "ip:1.2.3.4:agent"
  ts         timestamptz not null default now()
);

create index if not exists ai_rate_limits_bucket_ts_idx
  on public.ai_rate_limits (bucket_key, ts desc);

comment on table  public.ai_rate_limits is 'Sliding-window counter for /api/ai/* rate limits. Story 01.9 / audit C6. Service-role only.';
comment on column public.ai_rate_limits.bucket_key is 'Composite key: "ip:<addr>:<route-name>". Used to count requests per (IP, route) in the current window.';
comment on column public.ai_rate_limits.ts is 'Request timestamp. Rows older than the rate-limit window are effectively garbage.';

-- Explicitly do NOT enable RLS — this table is internal and read/written only by the service-role client.
-- The application is responsible for not exposing it to user code.
