-- =============================================================
-- Story 01.13 / audit C5 — random opaque portal tokens
-- =============================================================
-- Replaces the deterministic clientId hash (apps/hypeflow/app/(admin)/admin/
-- clientes/page.tsx:derivePortalToken) with DB-stored opaque tokens.
-- Raw token shown to the agency user once at generation; only the SHA-256
-- hash is persisted. Lookups happen via service role from
-- apps/hypeflow/lib/portal/tokens.ts (RLS blocks anon).
-- =============================================================

begin;

create table public.portal_tokens (
  id           uuid primary key default gen_random_uuid(),
  client_id    uuid not null references public.clients(id) on delete cascade,
  agency_id    uuid not null references public.agencies(id) on delete cascade,
  token_hash   text not null unique,
  created_by   uuid not null references public.users(id) on delete restrict,
  created_at   timestamptz not null default now(),
  expires_at   timestamptz not null,
  last_used_at timestamptz,
  revoked_at   timestamptz,
  label        text
);

create index portal_tokens_active_hash on public.portal_tokens (token_hash) where revoked_at is null;
create index portal_tokens_client_id on public.portal_tokens (client_id);

alter table public.portal_tokens enable row level security;

drop policy if exists "agency_portal_tokens_read" on public.portal_tokens;
create policy "agency_portal_tokens_read" on public.portal_tokens
  for select to authenticated
  using (agency_id = get_user_agency_id());

drop policy if exists "agency_portal_tokens_write" on public.portal_tokens;
create policy "agency_portal_tokens_write" on public.portal_tokens
  for all to authenticated
  using (agency_id = get_user_agency_id() and is_agency_admin())
  with check (agency_id = get_user_agency_id() and is_agency_admin());

comment on table public.portal_tokens is
  'Opaque portal access tokens (story 01.13 / audit C5). Raw token is never stored — only the SHA-256 hash. Service role validates anon lookups via apps/hypeflow/lib/portal/tokens.ts.';

commit;
