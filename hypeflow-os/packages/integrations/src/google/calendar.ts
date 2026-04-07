/**
 * Google Calendar API v3 integration
 * Full bidirectional sync with webhook push notifications
 */

const CALENDAR_BASE = 'https://www.googleapis.com/calendar/v3'

export interface CalendarEvent {
  id?: string
  summary: string
  description?: string
  start: { dateTime: string; timeZone: string }
  end: { dateTime: string; timeZone: string }
  attendees?: Array<{ email: string; displayName?: string; responseStatus?: string }>
  conferenceData?: {
    createRequest?: {
      requestId: string
      conferenceSolutionKey: { type: 'hangoutsMeet' }
    }
    entryPoints?: Array<{ entryPointType: string; uri: string; label?: string }>
    conferenceSolution?: { name: string }
  }
  reminders?: {
    useDefault: boolean
    overrides?: Array<{ method: 'email' | 'popup'; minutes: number }>
  }
  status?: 'confirmed' | 'tentative' | 'cancelled'
  htmlLink?: string
}

export interface WatchChannel {
  id: string
  type: 'web_hook'
  address: string
  expiration?: number
  resourceId?: string
  resourceUri?: string
}

export class GoogleCalendarClient {
  constructor(private accessToken: string) {}

  private async fetch<T>(
    method: string,
    path: string,
    body?: unknown,
    params: Record<string, string> = {}
  ): Promise<T> {
    const url = new URL(`${CALENDAR_BASE}${path}`)
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))

    const res = await fetch(url.toString(), {
      method,
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(`Google Calendar API error ${res.status}: ${JSON.stringify(err)}`)
    }

    if (res.status === 204) return undefined as unknown as T
    return res.json() as Promise<T>
  }

  async listCalendars(): Promise<Array<{ id: string; summary: string; primary?: boolean }>> {
    const data = await this.fetch<{ items: Array<{ id: string; summary: string; primary?: boolean }> }>(
      'GET', '/users/me/calendarList'
    )
    return data.items ?? []
  }

  /** Create calendar event with Google Meet link */
  async createEvent(calendarId: string, event: CalendarEvent): Promise<CalendarEvent> {
    return this.fetch<CalendarEvent>(
      'POST',
      `/calendars/${encodeURIComponent(calendarId)}/events`,
      event,
      { conferenceDataVersion: '1', sendUpdates: 'all' }
    )
  }

  async updateEvent(calendarId: string, eventId: string, event: Partial<CalendarEvent>): Promise<CalendarEvent> {
    return this.fetch<CalendarEvent>(
      'PATCH',
      `/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`,
      event,
      { conferenceDataVersion: '1', sendUpdates: 'all' }
    )
  }

  async deleteEvent(calendarId: string, eventId: string): Promise<void> {
    await this.fetch<void>(
      'DELETE',
      `/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`,
      undefined,
      { sendUpdates: 'all' }
    )
  }

  async getEvent(calendarId: string, eventId: string): Promise<CalendarEvent> {
    return this.fetch<CalendarEvent>(
      'GET',
      `/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`
    )
  }

  async listEvents(
    calendarId: string,
    timeMin: string,
    timeMax: string
  ): Promise<CalendarEvent[]> {
    const data = await this.fetch<{ items: CalendarEvent[] }>(
      'GET',
      `/calendars/${encodeURIComponent(calendarId)}/events`,
      undefined,
      { timeMin, timeMax, singleEvents: 'true', orderBy: 'startTime', maxResults: '250' }
    )
    return data.items ?? []
  }

  /** Register webhook push notifications — expires every 7 days */
  async watchCalendar(calendarId: string, channelId: string, webhookUrl: string): Promise<WatchChannel> {
    const expiration = Date.now() + 7 * 24 * 60 * 60 * 1000 // 7 days

    return this.fetch<WatchChannel>(
      'POST',
      `/calendars/${encodeURIComponent(calendarId)}/events/watch`,
      {
        id: channelId,
        type: 'web_hook',
        address: webhookUrl,
        expiration: expiration.toString(),
      }
    )
  }

  /** Stop watching a channel */
  async stopWatch(channelId: string, resourceId: string): Promise<void> {
    await this.fetch<void>('POST', '/channels/stop', { id: channelId, resourceId })
  }

  /** Build a HYPE Flow call event */
  static buildCallEvent(params: {
    callId: string
    leadName: string
    agentEmail: string
    leadEmail?: string
    scheduledAt: string
    durationMin: number
    context?: string
    agencyName?: string
  }): CalendarEvent {
    const start = new Date(params.scheduledAt)
    const end = new Date(start.getTime() + params.durationMin * 60000)

    const attendees: Array<{ email: string }> = [{ email: params.agentEmail }]
    if (params.leadEmail) attendees.push({ email: params.leadEmail })

    return {
      summary: `Call HYPE Flow — ${params.leadName}`,
      description: [
        `Lead: ${params.leadName}`,
        params.context ? `Contexto: ${params.context}` : '',
        '',
        `Gerido por ${params.agencyName ?? 'HYPE Flow OS'}`,
        `ID: ${params.callId}`,
      ].filter(Boolean).join('\n'),
      start: { dateTime: start.toISOString(), timeZone: 'Europe/Lisbon' },
      end: { dateTime: end.toISOString(), timeZone: 'Europe/Lisbon' },
      attendees,
      conferenceData: {
        createRequest: {
          requestId: `hypeflow-${params.callId}`,
          conferenceSolutionKey: { type: 'hangoutsMeet' },
        },
      },
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 60 },
          { method: 'popup', minutes: 15 },
        ],
      },
    }
  }

  /** Extract Meet link from created event */
  static getMeetLink(event: CalendarEvent): string | null {
    return event.conferenceData?.entryPoints
      ?.find(e => e.entryPointType === 'video')
      ?.uri ?? null
  }
}

/** Exchange Google auth code for tokens */
export async function exchangeGoogleCode(code: string, redirectUri: string): Promise<{
  access_token: string
  refresh_token: string
  expires_in: number
  token_type: string
}> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  })
  if (!res.ok) throw new Error('Failed to exchange Google code')
  return res.json()
}

/** Refresh Google access token using refresh token */
export async function refreshGoogleToken(refreshToken: string): Promise<{
  access_token: string
  expires_in: number
}> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      grant_type: 'refresh_token',
    }),
  })
  if (!res.ok) throw new Error('Failed to refresh Google token')
  return res.json()
}
