import type { NextRequest } from 'next/server'
import type { LeadDTO } from '../dto'
import type { Adapter, AdapterContext } from '../types'
import { verifyHmac } from '../auth'
import { generateEventId } from '../normalize'

interface TallyField {
  key?: string
  label?: string
  type?: string
  value?: unknown
}

interface TallyPayload {
  eventId?: string
  eventType?: string
  createdAt?: string
  data?: {
    responseId?: string
    submissionId?: string
    respondentId?: string
    formId?: string
    formName?: string
    createdAt?: string
    fields?: TallyField[]
    [k: string]: unknown
  }
  [k: string]: unknown
}

const NAME_LABEL_HINTS = ['name', 'nome', 'nombre']
const UTM_KEYS = new Set([
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_content',
  'utm_term',
])

function findContact(fields: TallyField[]): {
  email: string | undefined
  phone: string | undefined
  name: string | undefined
} {
  let email: string | undefined
  let phone: string | undefined
  let nameByLabel: string | undefined
  let firstText: string | undefined

  for (const f of fields) {
    const value = typeof f.value === 'string' ? f.value.trim() : ''
    if (!value) continue
    const type = f.type ?? ''
    const labelLower = (f.label ?? '').toLowerCase()

    if (!email && type === 'INPUT_EMAIL') email = value
    if (!phone && type === 'INPUT_PHONE_NUMBER') phone = value

    if (type === 'INPUT_TEXT') {
      if (!firstText) firstText = value
      if (!nameByLabel && NAME_LABEL_HINTS.some((h) => labelLower.includes(h))) {
        nameByLabel = value
      }
    }
  }

  return { email, phone, name: nameByLabel ?? firstText }
}

function findUtm(fields: TallyField[]): LeadDTO['utm'] {
  const utm: Record<string, string> = {}
  for (const f of fields) {
    const value = typeof f.value === 'string' ? f.value.trim() : ''
    if (!value) continue
    const keyOrLabel = (f.key ?? f.label ?? '').toLowerCase().replace(/-/g, '_')
    if (UTM_KEYS.has(keyOrLabel)) {
      const short = keyOrLabel.replace(/^utm_/, '') as 'source' | 'medium' | 'campaign' | 'content' | 'term'
      utm[short] = value
    }
  }
  return utm
}

/**
 * Tally adapter (FORM_RESPONSE → LeadDTO with source.platform='form').
 *
 * Field mapping is heuristic: emails and phones are unambiguous (typed
 * inputs), name falls back to "first text field" when no label hint matches.
 * Story 03.4+ may add explicit per-client field mapping.
 */
export const tallyAdapter: Adapter<TallyPayload> = {
  provider: 'tally',

  verify(req: NextRequest, expectedSecret: string | undefined, rawBody: string): boolean {
    return verifyHmac(
      rawBody,
      req.headers.get('tally-signature'),
      expectedSecret,
      { encoding: 'base64' },
    )
  },

  async parse(body, ctx: AdapterContext): Promise<LeadDTO | { skip: true; reason: string }> {
    const eventType = body?.eventType
    if (!eventType || typeof eventType !== 'string') {
      throw new Error('missing eventType')
    }
    if (eventType !== 'FORM_RESPONSE') {
      return { skip: true, reason: `event ${eventType} not handled` }
    }

    const data = body.data
    const fields = Array.isArray(data?.fields) ? data!.fields! : []
    if (fields.length === 0) throw new Error('empty fields array')

    const contact = findContact(fields)
    if (!contact.email && !contact.phone && !contact.name) {
      throw new Error('no contact info recoverable from form fields')
    }

    const utm = findUtm(fields)
    const receivedAt = new Date().toISOString()
    const eventId = data?.responseId
      ? `tally:${data.responseId}`
      : generateEventId(body, receivedAt, 'tally')

    return {
      event_id: eventId,
      provider: 'tally',
      client_id: ctx.clientId,
      received_at: receivedAt,
      contact: {
        ...(contact.name ? { name: contact.name } : {}),
        ...(contact.email ? { email: contact.email } : {}),
        ...(contact.phone ? { phone: contact.phone } : {}),
      },
      source: {
        platform: 'form',
      },
      utm,
      metadata: {
        tally_form_id: data?.formId,
        tally_form_name: data?.formName,
        tally_event_id: body.eventId,
      },
      raw_payload: body as unknown as Record<string, unknown>,
      schema_version: 'v1',
    }
  },
}
