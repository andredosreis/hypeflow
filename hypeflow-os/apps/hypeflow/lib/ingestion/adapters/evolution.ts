import type { NextRequest } from 'next/server'
import type { LeadDTO } from '../dto'
import type { Adapter, AdapterContext } from '../types'
import { verifyToken } from '../auth'
import { generateEventId } from '../normalize'

interface EvolutionPayload {
  event?: string
  instance?: string
  data?: {
    key?: { remoteJid?: string }
    pushName?: string
    message?: { conversation?: string }
    messageTimestamp?: number
    [k: string]: unknown
  }
  [k: string]: unknown
}

const HANDLED_EVENTS = new Set(['messages.upsert', 'contacts.upsert'])

/**
 * Evolution API adapter. Implements:
 *   - Bearer token auth (token resolved per client_id by the route).
 *   - `messages.upsert` and `contacts.upsert` → LeadDTO (source.platform='whatsapp').
 *   - All other events → `{ skip: true }` so the route returns 200 OK without
 *     creating a lead (FDD §5 events table).
 *
 * The adapter is intentionally pure — it does no DB calls. The route handler
 * orchestrates rate-limit, dedup, persist, and dead-letter.
 */
export const evolutionAdapter: Adapter<EvolutionPayload> = {
  provider: 'evolution',

  verify(req: NextRequest, expectedToken: string | undefined): boolean {
    return verifyToken(req, expectedToken)
  },

  async parse(body, ctx: AdapterContext): Promise<LeadDTO | { skip: true; reason: string }> {
    const event = body?.event
    if (!event || typeof event !== 'string') {
      throw new Error('missing event field')
    }
    if (!HANDLED_EVENTS.has(event)) {
      return { skip: true, reason: `event ${event} not handled` }
    }

    const data = body.data
    const remoteJid = data?.key?.remoteJid
    if (!remoteJid || typeof remoteJid !== 'string') {
      throw new Error('missing data.key.remoteJid')
    }

    // Strip "@s.whatsapp.net" / "@c.us" suffix; remaining part is the digits-only number.
    const phoneRaw = remoteJid.split('@')[0]?.trim()
    if (!phoneRaw) throw new Error('cannot extract phone from remoteJid')

    const receivedAt = new Date().toISOString()
    const eventId = generateEventId(body, receivedAt, 'evolution')

    return {
      event_id: eventId,
      provider: 'evolution',
      client_id: ctx.clientId,
      received_at: receivedAt,
      contact: {
        name: data?.pushName,
        // Phone arrives as international digits without "+". Prefix it so
        // libphonenumber-js parses correctly downstream.
        phone: phoneRaw.startsWith('+') ? phoneRaw : `+${phoneRaw}`,
      },
      source: {
        platform: 'whatsapp',
      },
      utm: {},
      metadata: {
        evolution_instance: body.instance,
        whatsapp_jid: remoteJid,
        message_timestamp: data?.messageTimestamp,
      },
      raw_payload: body as unknown as Record<string, unknown>,
      schema_version: 'v1',
    }
  },
}
