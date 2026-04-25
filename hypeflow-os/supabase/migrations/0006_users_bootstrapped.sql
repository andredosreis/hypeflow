-- =============================================================
-- Story 01.12 / audit C2 — short-circuit bootstrap on every page load
-- =============================================================
-- Adds `users.bootstrapped` so app/(admin)/layout.tsx can skip the
-- service-role bootstrap path after the first navigation per user.
-- Also adds a `users_self_read` RLS policy so a user can read their
-- own row before the agency_id link is established (chicken-and-egg
-- with the existing agency_users_read policy).
-- =============================================================

begin;

-- ─── Column ─────────────────────────────────────────────────────
alter table public.users
  add column if not exists bootstrapped boolean not null default false;

comment on column public.users.bootstrapped is
  'Set to true after ensureWorkspaceForCurrentUser has finished initial agency + pipeline_stages setup. Used by app/(admin)/layout.tsx to short-circuit subsequent page loads. Story 01.12 / audit C2.';

-- ─── Backfill ───────────────────────────────────────────────────
-- Any existing user row with an agency_id already went through bootstrap.
update public.users set bootstrapped = true where agency_id is not null;

-- ─── RLS: users_self_read ───────────────────────────────────────
-- The existing `agency_users_read` policy reads `users.agency_id` via
-- get_user_agency_id() — which itself selects from `users`. For first-
-- time users (no agency_id yet) this is a chicken-and-egg block.
-- Add a self-read policy so authenticated users can always read their
-- own row regardless of agency state.
drop policy if exists "users_self_read" on public.users;

create policy "users_self_read" on public.users
  for select to authenticated
  using (id = auth.uid());

comment on policy "users_self_read" on public.users is
  'Allow a user to read their own users row regardless of agency_id state. Required by app/(admin)/layout.tsx fast-path bootstrap check. Story 01.12 / audit C2.';

commit;
