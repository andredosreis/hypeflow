import type { SupabaseClient } from '@supabase/supabase-js'

const RECENT_WINDOW_DAYS = 30

export type DedupOutcome =
  | { kind: 'event_id'; leadId: string }
  | { kind: 'recent_match'; leadId: string; matchedOn: 'email' | 'phone'; createdAt: string }
  | { kind: 'old_match'; leadId: string; matchedOn: 'email' | 'phone'; createdAt: string }
  | { kind: 'none' }

/**
 * Idempotency / deduplication lookup. Order:
 *   1. event_id — guarantees idempotent replays.
 *   2. (client_id, email_normalized) — same person, same client.
 *   3. (client_id, phone_normalized) — same number, same client.
 *
 * "recent" = lead was created in the last 30 days. Caller merges into the
 * existing row instead of creating a new one. "old" = caller creates a new
 * row with `deduplication_info.duplicated_of` pointing at the historical lead.
 */
export async function findDuplicate(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, any, any>,
  args: {
    clientId: string
    eventId: string
    emailNormalized: string | null
    phoneNormalized: string | null
  },
): Promise<DedupOutcome> {
  // 1. event_id (cheapest, idempotent path)
  const { data: byEvent } = await supabase
    .from('leads')
    .select('id')
    .eq('event_id', args.eventId)
    .maybeSingle()
  if (byEvent?.id) return { kind: 'event_id', leadId: byEvent.id }

  // 2. (client_id, email_normalized)
  if (args.emailNormalized) {
    const { data } = await supabase
      .from('leads')
      .select('id, created_at')
      .eq('client_id', args.clientId)
      .eq('email_normalized', args.emailNormalized)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (data?.id && data.created_at) {
      return classify('email', data.id, data.created_at)
    }
  }

  // 3. (client_id, phone_normalized)
  if (args.phoneNormalized) {
    const { data } = await supabase
      .from('leads')
      .select('id, created_at')
      .eq('client_id', args.clientId)
      .eq('phone_normalized', args.phoneNormalized)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (data?.id && data.created_at) {
      return classify('phone', data.id, data.created_at)
    }
  }

  return { kind: 'none' }
}

function classify(matchedOn: 'email' | 'phone', leadId: string, createdAt: string): DedupOutcome {
  const ageMs = Date.now() - new Date(createdAt).getTime()
  const recentMs = RECENT_WINDOW_DAYS * 86_400_000
  if (ageMs <= recentMs) {
    return { kind: 'recent_match', leadId, matchedOn, createdAt }
  }
  return { kind: 'old_match', leadId, matchedOn, createdAt }
}
