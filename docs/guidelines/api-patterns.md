# API Patterns (tRPC)

Read before editing anything under `apps/*/server/` or adding a new tRPC procedure.

## Dual-User Context

`apps/hypeflow/server/trpc.ts` is the authorization backbone. `createTRPCContext()` resolves **one** of:

- `agencyUser` — row from `users` table (agency staff; carries `agency_id` + `role`)
- `clientUser` — row from `client_users` table (portal users; carries `client_id` + `agency_id`)

Both being `null` means the request is unauthenticated.

## Procedures

| Procedure | Guard | Use for |
|---|---|---|
| `publicProcedure` | none | anonymous endpoints (rare — landing forms, public embeds) |
| `agencyProcedure` | `agencyUser` required | every `admin.*` router |
| `clientProcedure` | `clientUser.client_id` required | every `portal.*` router |

**Never mix both user types in one procedure.** If a feature needs both agency and client access, split it into two procedures on two routers. Shared logic goes in a helper that either caller can invoke.

## Router Organization

- `apps/hypeflow/server/routers/admin/{analytics,automacoes,conteudo,crm,operacoes}/` — agency-facing
- `apps/hypeflow/server/routers/client/` (flat) — portal-facing
- `apps/hypeflow/server/root.ts` — mounts everything under `admin.*` and `portal.*`

## Demo / Placeholder Mode

When `NEXT_PUBLIC_SUPABASE_URL` is empty or contains `placeholder`, `createTRPCContext` returns hardcoded demo users (both `agencyUser` and `clientUser` populated) so landing/preview deploys render without real Supabase credentials. **Do not remove this branch when editing `trpc.ts`.**

## Writing a New Procedure

1. Pick the right procedure — `agencyProcedure` for `admin.*`, `clientProcedure` for `portal.*`.
2. Validate input with Zod. The error formatter already surfaces `ZodError.flatten()` — no extra wiring needed.
3. Access Supabase via `ctx.supabase`. Never instantiate a new client inside the handler.
4. Filter queries by the tenant column even though RLS backs it up:
   - Agency: `.eq('agency_id', ctx.agencyUser.agency_id)`
   - Client: `.eq('client_id', ctx.clientUser.client_id)`
   This catches bugs during local dev before they reach RLS, and makes intent explicit in the code.
5. Throw `TRPCError` with a specific `code` (`NOT_FOUND`, `FORBIDDEN`, `BAD_REQUEST`) — never return `null` to mean "denied."
