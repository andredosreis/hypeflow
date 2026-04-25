import { randomBytes, createHash } from 'crypto'
import { createServiceClient } from '@/lib/supabase/server'

export interface PortalTokenContext {
  token_id: string
  client_id: string
  agency_id: string
}

/**
 * Generates a cryptographically random portal token. Output is base64url-
 * encoded 32 bytes → 43 chars (~256 bits of entropy). Caller stores only the
 * SHA-256 hash; the raw value is shown to the agency user exactly once at
 * generation time.
 */
export function generateRawToken(): string {
  return randomBytes(32).toString('base64url')
}

/**
 * Returns the SHA-256 hex digest of the raw token. Used both at generation
 * time (to persist) and at validation time (to look up).
 */
export function hashToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex')
}

/**
 * Looks up a raw token in `portal_tokens` and returns the (client_id, agency_id)
 * context if and only if the token is unrevoked and unexpired. Returns null
 * for any other case — caller should respond with 404, never leak why.
 *
 * Uses service role because RLS on `portal_tokens` blocks anon reads (the
 * portal page caller has no Supabase session). Agency-membership invariants
 * are enforced at generation/revocation time, not here.
 */
export async function validatePortalToken(rawToken: string): Promise<PortalTokenContext | null> {
  if (!rawToken || rawToken.length < 20) return null

  const tokenHash = hashToken(rawToken)
  const service = await createServiceClient()

  const { data } = await service
    .from('portal_tokens')
    .select('id, client_id, agency_id, expires_at, revoked_at')
    .eq('token_hash', tokenHash)
    .maybeSingle()

  if (!data) return null
  if (data.revoked_at) return null
  if (new Date(data.expires_at) <= new Date()) return null

  // Best-effort last_used_at update; do not block the response on failure.
  void service
    .from('portal_tokens')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', data.id)
    .then(undefined, () => {})

  return { token_id: data.id, client_id: data.client_id, agency_id: data.agency_id }
}
