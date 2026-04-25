/**
 * POST /api/pixels/events
 *
 * Server-side Conversions API endpoint.
 * Receives events from the client browser/server and fans them out
 * to each active pixel for the given client.
 *
 * Supported platforms:
 *   - Meta Conversions API (CAPI)
 *   - Google Measurement Protocol (GA4)
 *   - TikTok Events API (EAPI)
 *
 * Request body:
 * {
 *   client_id:  string              — HYPE Flow client UUID
 *   event_name: string              — e.g. 'Lead', 'Purchase', 'PageView'
 *   event_id:   string              — browser event ID for deduplication
 *   source_url: string              — page URL where event fired
 *   user_data: {                    — raw user data (hashed server-side)
 *     email?: string
 *     phone?: string
 *     first_name?: string
 *     last_name?: string
 *     ip?: string
 *     user_agent?: string
 *   }
 *   custom_data?: {                 — event-specific data
 *     value?: number
 *     currency?: string
 *     content_ids?: string[]
 *     lead_id?: string
 *   }
 * }
 *
 * Auth: Bearer token (API_SECRET_KEY) — called from form submit flow
 */

import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { createServiceClient } from '@/lib/supabase/server'

/* ─── types ─── */

interface EventRequest {
  client_id: string
  event_name: string
  event_id?: string
  source_url?: string
  user_data?: {
    email?: string
    phone?: string
    first_name?: string
    last_name?: string
    ip?: string
    user_agent?: string
  }
  custom_data?: {
    value?: number
    currency?: string
    content_ids?: string[]
    lead_id?: string
  }
}

interface PixelRow {
  id: string
  platform: string
  pixel_id: string
  access_token: string | null
  test_event_code: string | null
}

/* ─── Hash helper (SHA-256) ─── */

function hash(value: string): string {
  return createHash('sha256').update(value.trim().toLowerCase()).digest('hex')
}

function hashUserData(raw: EventRequest['user_data']) {
  if (!raw) return {}
  return {
    em:  raw.email      ? [hash(raw.email)]      : undefined,
    ph:  raw.phone      ? [hash(raw.phone.replace(/\D/g, ''))] : undefined,
    fn:  raw.first_name ? [hash(raw.first_name)] : undefined,
    ln:  raw.last_name  ? [hash(raw.last_name)]  : undefined,
    client_ip_address: raw.ip,
    client_user_agent: raw.user_agent,
  }
}

/* ─── Meta CAPI ─── */

async function sendMetaCAPI(
  pixel: PixelRow,
  event: EventRequest,
  hashedUser: ReturnType<typeof hashUserData>
): Promise<{ success: boolean; response?: unknown; error?: string }> {
  const body = {
    data: [{
      event_name:       event.event_name,
      event_time:       Math.floor(Date.now() / 1000),
      event_id:         event.event_id,
      event_source_url: event.source_url,
      action_source:    'website',
      user_data:        hashedUser,
      custom_data:      event.custom_data ?? {},
    }],
    test_event_code: pixel.test_event_code ?? undefined,
  }

  const url = `https://graph.facebook.com/v19.0/${pixel.pixel_id}/events?access_token=${pixel.access_token}`

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  const json = await res.json()
  if (!res.ok) return { success: false, error: JSON.stringify(json) }
  return { success: true, response: json }
}

/* ─── TikTok Events API ─── */

async function sendTikTokEAPI(
  pixel: PixelRow,
  event: EventRequest,
  hashedUser: ReturnType<typeof hashUserData>
): Promise<{ success: boolean; response?: unknown; error?: string }> {
  if (!pixel.access_token) return { success: false, error: 'No access token for TikTok pixel' }

  const body = {
    pixel_code:  pixel.pixel_id,
    event:       event.event_name,
    event_id:    event.event_id,
    timestamp:   new Date().toISOString(),
    context: {
      page: { url: event.source_url },
      ip:   event.user_data?.ip,
      user_agent: event.user_data?.user_agent,
    },
    properties: event.custom_data ?? {},
    user: {
      email: hashedUser.em?.[0],
      phone: hashedUser.ph?.[0],
    },
    test_event_code: pixel.test_event_code ?? undefined,
  }

  const res = await fetch('https://business-api.tiktok.com/open_api/v1.3/pixel/track/', {
    method: 'POST',
    headers: {
      'Access-Token':  pixel.access_token,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  const json = await res.json()
  if (!res.ok || json.code !== 0) return { success: false, error: JSON.stringify(json) }
  return { success: true, response: json }
}

/* ─── Google Measurement Protocol (GA4) ─── */

async function sendGoogleMP(
  pixel: PixelRow,
  event: EventRequest
): Promise<{ success: boolean; response?: unknown; error?: string }> {
  // pixel_id for Google = Measurement ID (e.g. G-XXXXXXXXXX or AW-XXXXXXXXXX)
  const apiSecret = pixel.access_token // stored in access_token field
  if (!apiSecret) return { success: false, error: 'No API secret for Google pixel' }

  const url = `https://www.google-analytics.com/mp/collect?measurement_id=${pixel.pixel_id}&api_secret=${apiSecret}`

  const body = {
    client_id: event.user_data?.ip ?? 'server',
    events: [{
      name:   event.event_name.toLowerCase().replace(/[^a-z0-9_]/g, '_'),
      params: {
        ...event.custom_data,
        event_id:    event.event_id,
        page_location: event.source_url,
      },
    }],
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  // GA4 MP returns 204 on success, no body
  if (res.status === 204 || res.ok) return { success: true }
  return { success: false, error: `HTTP ${res.status}` }
}

/* ─── Auth ─── */

function verifyAuth(req: NextRequest): boolean {
  const auth = req.headers.get('Authorization')
  if (!auth?.startsWith('Bearer ')) return false
  return auth.slice(7) === process.env.API_SECRET_KEY
}

/* ─── Handler ─── */

export async function POST(request: NextRequest) {
  if (!verifyAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: EventRequest
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!body.client_id || !body.event_name) {
    return NextResponse.json({ error: 'client_id and event_name are required' }, { status: 400 })
  }

  const supabase = await createServiceClient()

  // Get all active pixels for this client
  const { data: pixels, error: dbErr } = await supabase
    .from('pixels')
    .select('id, platform, pixel_id, access_token, test_event_code')
    .eq('client_id', body.client_id)
    .eq('is_active', true)

  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 })
  if (!pixels?.length) return NextResponse.json({ sent: false, reason: 'No active pixels for client' })

  const hashedUser = hashUserData(body.user_data)
  const results: Array<{ platform: string; pixelId: string; success: boolean; error?: string }> = []

  // Fan-out to each platform
  for (const pixel of pixels as PixelRow[]) {
    let result: { success: boolean; response?: unknown; error?: string }

    switch (pixel.platform) {
      case 'meta':
        result = await sendMetaCAPI(pixel, body, hashedUser)
        break
      case 'tiktok':
        result = await sendTikTokEAPI(pixel, body, hashedUser)
        break
      case 'google':
        result = await sendGoogleMP(pixel, body)
        break
      default:
        result = { success: false, error: `Unsupported platform: ${pixel.platform}` }
    }

    results.push({ platform: pixel.platform, pixelId: pixel.pixel_id, ...result })

    // Log event to pixel_events table
    await supabase.from('pixel_events').insert({
      pixel_id:         pixel.id,
      agency_id:        (await supabase.from('pixels').select('agency_id').eq('id', pixel.id).single()).data?.agency_id,
      client_id:        body.client_id,
      event_name:       body.event_name,
      event_id:         body.event_id,
      event_source_url: body.source_url,
      user_data:        hashedUser,
      custom_data:      body.custom_data ?? {},
      platform_response: result.response ?? {},
      status:           result.success ? 'sent' : 'error',
      error_message:    result.error ?? null,
    }).then(undefined, console.error)
  }

  const allSuccess = results.every(r => r.success)
  console.log(`[pixel-events] ${body.event_name} for client ${body.client_id}: ${results.length} pixels, allSuccess=${allSuccess}`)

  return NextResponse.json({
    sent:    allSuccess,
    pixels:  results.length,
    results,
  })
}
