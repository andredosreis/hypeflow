import { createServiceClient } from '@/lib/supabase/server'

/**
 * rate-limit — sliding-window rate limiter backed by Supabase table `ai_rate_limits`.
 *
 * Story 01.9 (audit C6). 20 requests / 60 seconds / IP × route.
 *
 * Design:
 *   - Table `public.ai_rate_limits` stores (bucket_key, ts) rows; migration 0005.
 *   - On each call:
 *       1. Count rows with bucket_key matching and ts within the window.
 *       2. If count < limit → insert new row → allow.
 *       3. If count >= limit → reject with retry_after based on oldest row in the window.
 *   - Race condition: count-then-insert is not atomic. Two concurrent requests at the
 *     boundary could both pass when they should bounce one. Accepted trade-off for now —
 *     the exploit this blocks (looped anonymous calls at >20/min) is slowed by an order
 *     of magnitude regardless. A Postgres function with `SELECT ... FOR UPDATE` can tighten
 *     this later if needed.
 *
 * Demo/dev escape hatch:
 *   - If the service client is a no-op (`createNullClient` in server.ts when Supabase env
 *     is unconfigured), the counter silently allows everything. This is correct for local
 *     dev without Supabase running. Production deployments must have real Supabase env set.
 */

const LIMIT = 20
const WINDOW_SECONDS = 60

export type RateLimitResult = {
  allowed: boolean
  /** Seconds until the oldest request in the current window expires (for `Retry-After` header). */
  retryAfter: number
}

/**
 * rateLimit — returns `{ allowed, retryAfter }` for a given (ip, routeKey).
 *
 * On infrastructure failure (Supabase unreachable, table missing, etc.), this function
 * **fails OPEN** by returning `{ allowed: true, retryAfter: 0 }` and logging. This is a
 * deliberate choice: a broken rate-limiter must not take down production AI calls for
 * authenticated users. The auth gate (requireSession) still applies; the risk window is
 * bounded to "infra recovery time", and the auth cost floor is ~zero (Supabase auth.getUser
 * against cookies is cheap) so even wide-open we are not burning much Anthropic.
 */
export async function rateLimit(ip: string, routeKey: string): Promise<RateLimitResult> {
  const bucketKey = `ip:${ip}:${routeKey}`
  const windowStart = new Date(Date.now() - WINDOW_SECONDS * 1000)

  try {
    const supabase = await createServiceClient()

    const { count, error: countErr } = await supabase
      .from('ai_rate_limits')
      .select('id', { count: 'exact', head: true })
      .eq('bucket_key', bucketKey)
      .gte('ts', windowStart.toISOString())

    if (countErr) {
      console.warn('[rate-limit] count failed; failing open', { bucketKey, err: countErr.message })
      return { allowed: true, retryAfter: 0 }
    }

    if ((count ?? 0) >= LIMIT) {
      // Find the oldest row in the window to compute retry_after.
      const { data: oldest } = await supabase
        .from('ai_rate_limits')
        .select('ts')
        .eq('bucket_key', bucketKey)
        .gte('ts', windowStart.toISOString())
        .order('ts', { ascending: true })
        .limit(1)
        .maybeSingle()

      const oldestTs = oldest?.ts ? new Date(oldest.ts).getTime() : Date.now()
      const retryAfter = Math.max(1, Math.ceil((oldestTs + WINDOW_SECONDS * 1000 - Date.now()) / 1000))
      return { allowed: false, retryAfter }
    }

    const { error: insertErr } = await supabase
      .from('ai_rate_limits')
      .insert({ bucket_key: bucketKey })

    if (insertErr) {
      console.warn('[rate-limit] insert failed; allowing this request', { bucketKey, err: insertErr.message })
    }

    return { allowed: true, retryAfter: 0 }
  } catch (err) {
    console.warn('[rate-limit] unexpected error; failing open', { bucketKey, err })
    return { allowed: true, retryAfter: 0 }
  }
}
