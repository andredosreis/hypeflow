import type { SupabaseClient } from '@supabase/supabase-js'

export type FailureReason =
  | 'schema_invalid'
  | 'dto_validation_failed'
  | 'db_unavailable'
  | 'adapter_error'
  | 'unknown'

interface RecordFailureArgs {
  provider: string
  clientId: string | null
  agencyId: string | null
  rawPayload: unknown
  reason: FailureReason
  errorDetail?: string
}

/**
 * Inserts a row into `webhook_failures` for later inspection / replay
 * (ADR-014, separate story). Failures here are themselves logged but never
 * thrown — the ingestion pipeline must still respond to the provider.
 */
export async function recordWebhookFailure(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  service: SupabaseClient<any, any, any>,
  args: RecordFailureArgs,
): Promise<void> {
  try {
    await service.from('webhook_failures').insert({
      provider: args.provider,
      client_id: args.clientId,
      agency_id: args.agencyId,
      received_at: new Date().toISOString(),
      raw_payload: (args.rawPayload ?? {}) as object,
      reason: args.reason,
      error_detail: args.errorDetail ?? null,
      attempt_count: 1,
      last_attempt_at: new Date().toISOString(),
    })
  } catch (err) {
    // Last-ditch logging — losing the dead-letter row is bad but should not
    // prevent the response to the provider.
    console.error('[webhook-ingestion] failed to record dead-letter', {
      provider: args.provider,
      reason: args.reason,
      err: err instanceof Error ? err.message : String(err),
    })
  }
}
