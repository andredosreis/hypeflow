# Multi-Tenancy (RLS)

Read before creating a new table or RLS policy.

## Tenant Hierarchy

- **`agency_id`** — root tenant. One agency owns many clients, users, leads, etc.
- **`client_id`** — sub-tenant under an agency. Multiple clients per agency.

Isolation is enforced at the database level via Row-Level Security. Application code still filters explicitly (see `api-patterns.md`) — treat RLS as the safety net, not the primary control.

## Helper Functions (used inside policies)

| Function | Returns |
|---|---|
| `get_user_agency_id()` | The authed agency user's `agency_id` |
| `get_client_user_client_id()` | The authed portal user's `client_id` |
| `is_agency_admin()` | Role check for the authed agency user |

All defined in `supabase/migrations/0002_rls_policies.sql`.

## New Table Checklist

1. **Tenant columns:**
   - `agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE`  
     **Exception:** ingestion / dead-letter tables (`webhook_failures` and similar) where the agency may be unresolvable at insert time — leave `agency_id` nullable and add a SQL comment explaining why. The Vercel deploy model remains one project per app in `apps/` regardless.
   - `client_id UUID REFERENCES clients(id) ON DELETE CASCADE` if rows are client-scoped.
2. **Enable RLS:** `ALTER TABLE <name> ENABLE ROW LEVEL SECURITY;`
3. **Baseline policy (agency):**
   ```sql
   CREATE POLICY "agency_<name>_all" ON <name>
     FOR ALL TO authenticated
     USING (agency_id = get_user_agency_id());
   ```
4. **Portal read policy** (if portal users need access):
   ```sql
   CREATE POLICY "portal_<name>_read" ON <name>
     FOR SELECT TO authenticated
     USING (client_id = get_client_user_client_id());
   ```
5. **Index FK columns used in RLS predicates.** RLS executes as a join — a missing index on `agency_id` / `client_id` silently tanks query performance at scale.
6. **`updated_at` trigger** (if the table is mutable): add the shared `update_updated_at()` trigger — see `pixels` / `utm_templates` for the pattern.

Canonical reference: `supabase/migrations/0003_pixels_utms_tiktok.sql` has full table + RLS + policies + realtime publication.

## Realtime

To enable Supabase Realtime on a table: `ALTER PUBLICATION supabase_realtime ADD TABLE <name>;` Realtime respects RLS, so the policies above are sufficient.
