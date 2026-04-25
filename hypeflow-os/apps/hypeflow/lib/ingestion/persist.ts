import type { SupabaseClient } from '@supabase/supabase-js'
import type { LeadDTO } from './dto'
import { normalizeEmail, normalizePhone } from './normalize'
import type { DedupOutcome } from './dedup'

export type PersistOutcome =
  | { kind: 'created'; leadId: string }
  | { kind: 'merged'; leadId: string }
  | { kind: 'duplicate_chained'; leadId: string; duplicateOf: string }
  | { kind: 'idempotent'; leadId: string }

/**
 * Persists the lead and a `lead_interactions` audit row in a single logical
 * unit of work. Branches on the dedup outcome:
 *
 *   - event_id      → idempotent: do nothing, return the existing leadId.
 *   - recent_match  → merge: update touch fields on the existing lead.
 *   - old_match     → create a new lead with deduplication_info.duplicated_of.
 *   - none          → create a fresh lead.
 *
 * `agency_id` is derived by the caller from the client's row (FDD invariant —
 * never trust the provider).
 */
export async function persistLead(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  service: SupabaseClient<any, any, any>,
  dto: LeadDTO,
  agencyId: string,
  dedup: DedupOutcome,
  score: { score: number; pending: boolean },
): Promise<PersistOutcome> {
  // 1. Idempotent replay
  if (dedup.kind === 'event_id') {
    return { kind: 'idempotent', leadId: dedup.leadId }
  }

  const emailNormalized = normalizeEmail(dto.contact.email ?? null)
  const phoneNormalizedE164 = normalizePhone(dto.contact.phone ?? null)

  // 2. Merge into recent existing lead
  if (dedup.kind === 'recent_match') {
    const { error: mergeErr } = await service
      .from('leads')
      .update({
        last_contact_at: dto.received_at,
        full_name: dto.contact.name ?? undefined,
        email: dto.contact.email ?? undefined,
        phone: dto.contact.phone ?? undefined,
        metadata: {
          ...(dto.metadata ?? {}),
          score_pending: score.pending,
        },
      })
      .eq('id', dedup.leadId)
    if (mergeErr) throw new Error(mergeErr.message)

    await insertInteraction(service, {
      leadId: dedup.leadId,
      agencyId,
      provider: dto.provider,
      sourcePlatform: dto.source.platform,
      kind: 'webhook_received',
      mergedFrom: dto.event_id,
    })
    return { kind: 'merged', leadId: dedup.leadId }
  }

  // 3 & 4. Create new lead (fresh, or chained from old duplicate)
  const baseRow = buildInsertRow({
    dto,
    agencyId,
    score,
    emailNormalized,
    phoneNormalizedE164,
  })

  if (dedup.kind === 'old_match') {
    baseRow.deduplication_info = {
      duplicated_of: dedup.leadId,
      matched_on: dedup.matchedOn,
      original_created_at: dedup.createdAt,
    }
  }

  const { data: inserted, error } = await service
    .from('leads')
    .insert(baseRow)
    .select('id')
    .single()
  if (error || !inserted) throw new Error(error?.message ?? 'lead insert returned no row')

  await insertInteraction(service, {
    leadId: inserted.id,
    agencyId,
    provider: dto.provider,
    sourcePlatform: dto.source.platform,
    kind: 'webhook_received',
  })

  if (dedup.kind === 'old_match') {
    return { kind: 'duplicate_chained', leadId: inserted.id, duplicateOf: dedup.leadId }
  }
  return { kind: 'created', leadId: inserted.id }
}

function buildInsertRow(args: {
  dto: LeadDTO
  agencyId: string
  score: { score: number; pending: boolean }
  emailNormalized: string | null
  phoneNormalizedE164: string | null
}): Record<string, unknown> {
  return {
    agency_id: args.agencyId,
    client_id: args.dto.client_id,
    full_name: args.dto.contact.name ?? args.dto.contact.email ?? args.dto.contact.phone ?? 'Unknown',
    email: args.dto.contact.email ?? null,
    phone: args.dto.contact.phone ?? null,
    email_normalized: args.emailNormalized,
    phone_normalized: args.phoneNormalizedE164,
    source: args.dto.source.platform,
    source_platform: args.dto.source.platform,
    source_type: 'webhook',
    campaign_id: null,
    utm_source: args.dto.utm?.source ?? null,
    utm_medium: args.dto.utm?.medium ?? null,
    utm_campaign: args.dto.utm?.campaign ?? null,
    utm_content: args.dto.utm?.content ?? null,
    referral_source: null,
    status: 'new',
    score: args.score.score,
    temperature: 'cold',
    tags: [],
    notes: null,
    lost_reason: null,
    stage_entered_at: args.dto.received_at,
    last_contact_at: null,
    first_contact_at: args.dto.received_at,
    event_id: args.dto.event_id,
    metadata: {
      ...(args.dto.metadata ?? {}),
      score_pending: args.score.pending,
      ad_id: args.dto.source.ad_id ?? null,
      creative_id: args.dto.source.creative_id ?? null,
      campaign_external_id: args.dto.source.campaign_id ?? null,
    },
    raw_payload: args.dto.raw_payload,
    schema_version: args.dto.schema_version,
    provider: args.dto.provider,
  }
}

async function insertInteraction(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  service: SupabaseClient<any, any, any>,
  args: {
    leadId: string
    agencyId: string
    provider: string
    sourcePlatform: string
    kind: 'webhook_received'
    mergedFrom?: string
  },
): Promise<void> {
  const { error } = await service.from('lead_interactions').insert({
    lead_id: args.leadId,
    agency_id: args.agencyId,
    type: args.kind,
    direction: 'inbound',
    metadata: {
      provider: args.provider,
      source_platform: args.sourcePlatform,
      ...(args.mergedFrom ? { merged_from_event_id: args.mergedFrom } : {}),
    },
  })
  if (error) {
    // Interaction failure does NOT roll back the lead. Log and continue.
    console.error('[webhook-ingestion] lead_interactions insert failed', error.message)
  }
}
