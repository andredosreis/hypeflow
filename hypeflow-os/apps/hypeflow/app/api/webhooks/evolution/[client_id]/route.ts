import { NextResponse, type NextRequest } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { getClientIp } from '@/lib/api/with-session'
import { evolutionAdapter } from '@/lib/ingestion/adapters/evolution'
import { leadDtoSchema } from '@/lib/ingestion/dto'
import { findDuplicate } from '@/lib/ingestion/dedup'
import { persistLead } from '@/lib/ingestion/persist'
import { recordWebhookFailure } from '@/lib/ingestion/dead-letter'
import { enforceWebhookRateLimit } from '@/lib/ingestion/rate-limit'
import { scoreLeadStub } from '@/lib/ingestion/score'
import { logIngestionEvent } from '@/lib/ingestion/log'
import { normalizeEmail, normalizePhone } from '@/lib/ingestion/normalize'

const MAX_BODY_BYTES = 1_048_576 // 1 MB (FDD §5)

function tokenEnvKey(clientId: string): string {
  return `EVOLUTION_TOKEN_${clientId.toUpperCase().replace(/-/g, '_')}`
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ client_id: string }> },
) {
  const start = Date.now()
  const { client_id } = await params

  // 0. Size guard
  const cl = Number(req.headers.get('content-length') ?? '0')
  if (cl > MAX_BODY_BYTES) {
    return NextResponse.json({ error: 'Payload too large' }, { status: 413 })
  }

  // 1. Read raw body (so HMAC-style adapters can inspect it later).
  const rawText = await req.text()

  // 2. Auth — token from env keyed by client_id.
  const expectedToken = process.env[tokenEnvKey(client_id)]
  if (!evolutionAdapter.verify(req, expectedToken)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 3. Lookup client → derive agency_id.
  const service = await createServiceClient()
  const { data: client } = await service
    .from('clients')
    .select('id, agency_id')
    .eq('id', client_id)
    .maybeSingle()

  if (!client) {
    // 200 silent — never leak whether the client_id is valid (FDD §6).
    return NextResponse.json({ ok: true })
  }

  // 4. Rate limit (after client lookup so we can bucket by agency).
  const ip = getClientIp(req.headers)
  const rl = await enforceWebhookRateLimit({ ip, agencyId: client.agency_id })
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, {
      status: 429,
      headers: { 'Retry-After': String(rl.retryAfter) },
    })
  }

  // 5. Parse JSON.
  let body: unknown
  try {
    body = JSON.parse(rawText)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // 6. Adapter parse → LeadDTO or { skip: true }.
  let dtoOrSkip
  try {
    dtoOrSkip = await evolutionAdapter.parse(body as never, {
      clientId: client.id,
      rawText,
    })
  } catch (err) {
    await recordWebhookFailure(service, {
      provider: 'evolution',
      clientId: client.id,
      agencyId: client.agency_id,
      rawPayload: body,
      reason: 'schema_invalid',
      errorDetail: err instanceof Error ? err.message : String(err),
    })
    return NextResponse.json({ ok: true })
  }
  if ('skip' in dtoOrSkip) {
    return NextResponse.json({ ok: true })
  }

  // 7. Validate DTO (paranoid double-check).
  const parsed = leadDtoSchema.safeParse(dtoOrSkip)
  if (!parsed.success) {
    await recordWebhookFailure(service, {
      provider: 'evolution',
      clientId: client.id,
      agencyId: client.agency_id,
      rawPayload: body,
      reason: 'dto_validation_failed',
      errorDetail: JSON.stringify(parsed.error.flatten()),
    })
    return NextResponse.json({ ok: true })
  }
  const dto = parsed.data

  // 8. Dedup.
  const dupe = await findDuplicate(service, {
    clientId: client.id,
    eventId: dto.event_id,
    emailNormalized: normalizeEmail(dto.contact.email ?? null),
    phoneNormalized: normalizePhone(dto.contact.phone ?? null),
  })

  // 9. Score (stub).
  const score = scoreLeadStub(dto)

  // 10. Persist.
  try {
    const result = await persistLead(service, dto, client.agency_id, dupe, score)
    logIngestionEvent({
      level: 'info',
      event:
        result.kind === 'created' ? 'lead.created'
        : result.kind === 'merged' ? 'lead.merged'
        : result.kind === 'duplicate_chained' ? 'lead.created_chained'
        : 'lead.idempotent',
      dto,
      durationMs: Date.now() - start,
      extra: { lead_id_hash_unsafe: undefined },
    })
    return NextResponse.json({ ok: true, event_id: dto.event_id })
  } catch (err) {
    logIngestionEvent({
      level: 'error',
      event: 'lead.persist_failed',
      dto,
      error: err,
      durationMs: Date.now() - start,
    })
    await recordWebhookFailure(service, {
      provider: 'evolution',
      clientId: client.id,
      agencyId: client.agency_id,
      rawPayload: body,
      reason: 'db_unavailable',
      errorDetail: err instanceof Error ? err.message : String(err),
    })
    return NextResponse.json({ error: 'Service unavailable' }, {
      status: 503,
      headers: { 'Retry-After': '30' },
    })
  }
}

/** GET handler for health / verification pings. */
export async function GET() {
  return NextResponse.json({ status: 'evolution webhook endpoint active' })
}
