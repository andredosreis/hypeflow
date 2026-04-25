# Migrations

Read before creating or modifying any file in `hypeflow-os/supabase/migrations/`.

## File Naming

Sequentially numbered 4-digit prefix: `0001_initial_schema.sql`, `0002_rls_policies.sql`, …, `NNNN_<slug>.sql`. Never reuse a number. The slug is kebab-case and describes the intent (`score_engine_and_hub`, not `add_columns`).

## Production-Safety Rules

**The system runs in production with real data.** Any migration that touches existing rows must follow these rules — no exceptions:

1. **Backfill before constraints.** When you add `NOT NULL` / `UNIQUE` / FK constraints to an existing table, populate or de-duplicate the relevant rows in the same migration, *before* the `ALTER TABLE ... ADD CONSTRAINT`. Running the constraint on unprepared data will abort the migration mid-flight.
2. **Never delete data.** For de-duplication, mark the losing rows — e.g., null out the normalized field and record `{duplicate_of, collided_value, marked_at}` in a `deduplication_info` JSONB column — rather than `DELETE`. Customers expect historical rows to stay accessible.
3. **Wrap destructive or multi-step migrations in a transaction.** Use explicit `BEGIN;` / `COMMIT;` so a failure rolls back the whole migration. Note: this blocks `CREATE INDEX CONCURRENTLY` — if you need a concurrent index, put it in a separate migration that is documented as non-transactional.
4. **Deterministic tiebreakers.** When de-duplicating, always include `id ASC` as the last tiebreaker in `ROW_NUMBER() OVER (PARTITION BY ... ORDER BY created_at ASC, id ASC)`. Without it, re-running the same migration against a different environment can pick a different "winner."

Canonical pattern: `supabase/migrations/0004_score_engine_and_hub.sql` (columns → backfill → dedup → constraints).

## After the Migration

Always run `npm run db:types`. It regenerates `packages/database/src/types.ts` from the live schema. Skipping this causes TypeScript errors across every workspace that imports database types.

## Adding RLS Rules

Creating a table means RLS work — see `multi-tenancy.md` for the checklist.
