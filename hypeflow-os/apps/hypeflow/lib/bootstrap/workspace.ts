import type { User } from '@supabase/supabase-js'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export const DEMO_RESPONSE = {
  user: null as User | null,
  agencyId: 'demo-agency-id',
  clientId: 'preview-client-1',
} as const

const DEFAULT_STAGES = [
  { name: 'Nova', position: 0, color: '#21A0C4', is_terminal: false, is_won: false },
  { name: 'Qualificando', position: 1, color: '#F5A623', is_terminal: false, is_won: false },
  { name: 'Agendada', position: 2, color: '#4FC8EA', is_terminal: false, is_won: false },
  { name: 'Proposta', position: 3, color: '#D1FF00', is_terminal: false, is_won: false },
  { name: 'Fechada', position: 4, color: '#00E5A0', is_terminal: true, is_won: true },
]

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
}

export function isDemoMode(): boolean {
  if (process.env.NEXT_PUBLIC_DEMO_MODE !== 'true') return false
  if (process.env.NODE_ENV === 'production') {
    throw new Error('NEXT_PUBLIC_DEMO_MODE=true is not allowed in production')
  }
  return true
}

/**
 * Resolves the current user's workspace (agencyId, clientId).
 *
 * Fast path: anon-role + RLS read of the user's own row. If the user is already
 * `bootstrapped`, no service-role queries run.
 *
 * Slow path (first-time only): bootstrapNewWorkspace creates the agency, links
 * the users row, seeds default pipeline_stages, and flips `bootstrapped` to true
 * so subsequent calls hit the fast path.
 *
 * Service role is only used inside bootstrapNewWorkspace and only for the three
 * operations that genuinely require RLS bypass (creating a new agency, linking
 * the users row, seeding pipeline_stages on a fresh agency).
 */
export async function ensureWorkspaceForCurrentUser() {
  if (isDemoMode()) return DEMO_RESPONSE

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Bootstrap requires authenticated user — middleware should have redirected')
  }

  // Fast path: anon-role + RLS read of own row
  // (relies on `users_self_read` policy from migration 0006)
  const { data: profile } = await supabase
    .from('users')
    .select('agency_id, bootstrapped')
    .eq('id', user.id)
    .maybeSingle()

  if (profile?.bootstrapped && profile.agency_id) {
    const { data: client } = await supabase
      .from('clients')
      .select('id')
      .eq('agency_id', profile.agency_id)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()

    return { user, agencyId: profile.agency_id, clientId: client?.id ?? null }
  }

  return bootstrapNewWorkspace(user, profile)
}

/**
 * First-time setup. Service role is required because:
 *   1. Creating the first `agencies` row — anon-role can't insert into agencies
 *      (no agency_id in JWT yet, RLS blocks).
 *   2. Linking the `users` row with `agency_id` — even with users_self_read, an
 *      authenticated user updating their own agency_id from null is gated by the
 *      `agency_admin_manage_users` policy which requires is_agency_admin().
 *      Bootstrap happens before any admin can grant that privilege.
 *   3. Seeding default `pipeline_stages` — same reason as agencies.
 *
 * Demo data (leads, traffic_metrics) is intentionally NOT seeded here. If demo
 * data is needed for a fresh dev account, run the dedicated seed script.
 */
async function bootstrapNewWorkspace(
  user: User,
  existingProfile: { agency_id: string | null; bootstrapped: boolean } | null,
) {
  const service = await createServiceClient()

  let agencyId = existingProfile?.agency_id ?? null
  if (!agencyId) {
    agencyId = crypto.randomUUID()
    const seed = user.email?.split('@')[0] ?? 'agency'
    const slug = `${slugify(seed || 'agency')}-${agencyId.slice(0, 6)}`

    await service.from('agencies').insert({
      id: agencyId,
      name: `Agencia ${seed}`,
      slug,
      logo_url: null,
      plan: 'starter',
      settings: {},
    })
  }

  await service.from('users').upsert({
    id: user.id,
    agency_id: agencyId,
    full_name: (user.user_metadata?.full_name as string | undefined) ?? user.email?.split('@')[0] ?? 'Owner',
    email: user.email ?? `${agencyId}@hypeflow.local`,
    role: 'owner',
    avatar_url: null,
    is_active: true,
    bootstrapped: true,
    last_login: new Date().toISOString(),
  })

  const { data: existingStages } = await service
    .from('pipeline_stages')
    .select('id')
    .eq('agency_id', agencyId)
    .limit(1)

  if (!existingStages?.length) {
    await service.from('pipeline_stages').insert(
      DEFAULT_STAGES.map((stage) => ({
        id: crypto.randomUUID(),
        agency_id: agencyId,
        pipeline_id: null,
        name: stage.name,
        position: stage.position,
        color: stage.color,
        sla_hours: stage.is_terminal ? null : 48,
        automation_rules: [],
        is_terminal: stage.is_terminal,
        is_won: stage.is_won,
      }))
    )
  }

  // Resolve clientId via service role too — RLS would now allow the read but
  // we already have the service handle and the row may not exist yet.
  const { data: existingClient } = await service
    .from('clients')
    .select('id')
    .eq('agency_id', agencyId)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  return { user, agencyId, clientId: existingClient?.id ?? null }
}
