import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * requireSession — auth gate for API route handlers.
 *
 * Returns either:
 *   - `{ response: NextResponse<401>, user: null, supabase: null }` when no session is present
 *   - `{ response: null, user, supabase }` when authenticated
 *
 * Story 01.9 (audit C6). Uses the anon-role client (cookies-backed), NOT service-role.
 * Service-role must never be used for session verification — it bypasses RLS and has no
 * concept of "current user".
 */
export async function requireSession() {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.getUser()

  if (error || !data?.user) {
    return {
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
      user: null,
      supabase: null,
    } as const
  }

  return {
    response: null,
    user: data.user,
    supabase,
  } as const
}

/**
 * getClientIp — extracts the caller's IP from headers Vercel populates.
 *
 * Returns `null` if neither `x-forwarded-for` nor `x-real-ip` is present.
 * Callers must handle `null` explicitly (reject the request, do not fall back to a sentinel
 * that could cause all callers to share a single rate-limit bucket).
 */
export function getClientIp(headers: Headers): string | null {
  const xff = headers.get('x-forwarded-for')
  if (xff) {
    const first = xff.split(',')[0]?.trim()
    if (first) return first
  }
  const xri = headers.get('x-real-ip')
  if (xri) return xri.trim()
  return null
}
