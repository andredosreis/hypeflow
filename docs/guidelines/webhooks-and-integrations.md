# Webhooks & Integrations

Read before touching `apps/*/app/api/webhooks/*` or `packages/integrations/*`.

## Inbound Webhooks

Route handlers live at `apps/hypeflow/app/api/webhooks/<provider>/route.ts`. Current providers:

- `ghl` — GoHighLevel

The provider-agnostic Lead Ingestion Hub (see `docs/fdd/lead-ingestion-hub-fdd.md`) is designed to replace per-provider routes. New providers should plug into the Hub rather than adding another folder here.

### Every handler must

1. **Respond fast.** Return `200` quickly once the payload is persisted — do the heavy work (scoring, notifications, downstream calls) asynchronously. External providers time out and retry if you block.
2. **Be idempotent.** Use `event_id` on `leads` as the idempotency key. If a row with the same `(client_id, event_id)` already exists, skip the rest of the pipeline and return success.
3. **Never drop a payload silently.** If anything fails — schema validation, missing client mapping, engine exception — write a row to `webhook_failures` before returning.

## Dead-Letter Table (`webhook_failures`)

When a webhook fails at any step, record:

| Column | Meaning |
|---|---|
| `raw_payload` (JSONB) | The untouched request body, for replay |
| `reason` (TEXT) | Short classifier: `invalid_schema`, `client_not_found`, `engine_error`, … |
| `provider` (TEXT) | `evolution`, `ghl`, `meta`, `custom`, … |
| `received_at` (TIMESTAMPTZ) | When the request hit the endpoint |
| `agency_id` / `client_id` | Nullable — ingestion may fail before resolving either |
| `attempt_count` (INTEGER) | Incremented on each replay |

See `supabase/migrations/0004_score_engine_and_hub.sql` for the schema.

## Outbound Integrations (`packages/integrations/`)

One subdirectory per provider: `google/`, `google-ads/`, `meta/`, … Each exports a typed client that encapsulates OAuth token refresh, retry, and response shape. New providers follow this layout — do not create ad-hoc `fetch()` calls scattered across apps.

Tokens live in the `integrations` table; the client libraries read/write to it via a service-role Supabase client.

## Scheduled / Background Work

`hypeflow-os/supabase/functions/` holds Supabase Edge Functions for scheduled jobs that don't fit inside a Next.js route. They deploy via `supabase functions deploy <name>` — **not** via Vercel.

Current functions: `automation-engine`, `call-reminders`, `sync-meta-ads`, `sync-tiktok-ads`.
