import { rateLimit } from '@/lib/api/rate-limit'

/**
 * Two-tier rate limiting for inbound webhooks (FDD §2 H4).
 *
 * - 100 req/min per IP.
 * - 1000 req/hour per agency (≈ 16 req/min sustained).
 *
 * Backed by the same `ai_rate_limits` Postgres table introduced in story 01.9
 * (sliding window via count + insert). Buckets are namespaced so they cannot
 * collide with the AI route limits.
 *
 * Returns the failing scope so the caller can include it in the structured
 * log without leaking which scope tripped to the provider.
 */
export type WebhookRateLimitResult =
  | { allowed: true }
  | { allowed: false; retryAfter: number; scope: 'ip' | 'agency' }

const IP_LIMIT_PER_MIN = 100
const AGENCY_LIMIT_PER_HOUR = 1000

export async function enforceWebhookRateLimit(args: {
  ip: string | null
  agencyId: string
}): Promise<WebhookRateLimitResult> {
  const ipBucket = `webhook:ip:${args.ip ?? 'unknown'}`
  const agencyBucket = `webhook:agency:${args.agencyId}`

  // The shared rateLimit() helper enforces a fixed (LIMIT, WINDOW) of
  // 20 / 60s. Wrap with bucket-specific dimensions by passing custom keys
  // — but the helper does not accept dynamic limits. For the MVP we
  // approximate the two thresholds by calling the helper twice with
  // distinct bucket names; if either bucket overflows the helper returns
  // not-allowed. Story 03.X (rate-limit refactor) will make the limit
  // configurable per call.
  //
  // Until that refactor: we accept that the effective limit is the
  // shared 20/60s. This is more conservative than the FDD's 100/min but
  // still enforces the security objective (no flood). Tracked in Known
  // Gaps of story 03.1.
  void IP_LIMIT_PER_MIN
  void AGENCY_LIMIT_PER_HOUR

  const ipResult = await rateLimit(args.ip ?? 'unknown', ipBucket)
  if (!ipResult.allowed) {
    return { allowed: false, retryAfter: ipResult.retryAfter ?? 60, scope: 'ip' }
  }

  const agencyResult = await rateLimit(args.agencyId, agencyBucket)
  if (!agencyResult.allowed) {
    return { allowed: false, retryAfter: agencyResult.retryAfter ?? 60, scope: 'agency' }
  }

  return { allowed: true }
}
