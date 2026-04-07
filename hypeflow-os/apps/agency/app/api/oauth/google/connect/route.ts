/**
 * GET /api/oauth/google/connect
 *
 * Initiates the Google OAuth 2.0 flow for Google Ads + Calendar access.
 *
 * Query params:
 *   client_id  — HYPE Flow client UUID
 *   agency_id  — Agency UUID
 *   scope      — 'ads' | 'calendar' | 'both' (default: 'both')
 */

import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const clientId = searchParams.get('client_id')
  const agencyId = searchParams.get('agency_id')
  const scope    = searchParams.get('scope') ?? 'both'

  if (!clientId || !agencyId) {
    return NextResponse.json({ error: 'client_id and agency_id are required' }, { status: 400 })
  }

  const googleClientId  = process.env.GOOGLE_CLIENT_ID
  const redirectUri     = process.env.GOOGLE_REDIRECT_URI

  if (!googleClientId || !redirectUri) {
    return NextResponse.json({ error: 'GOOGLE_CLIENT_ID or GOOGLE_REDIRECT_URI not configured' }, { status: 500 })
  }

  const state = Buffer.from(JSON.stringify({ client_id: clientId, agency_id: agencyId, scope })).toString('base64url')

  // Build scopes based on requested access
  const scopes: string[] = [
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile',
  ]

  if (scope === 'ads' || scope === 'both') {
    scopes.push('https://www.googleapis.com/auth/adwords')
  }

  if (scope === 'calendar' || scope === 'both') {
    scopes.push('https://www.googleapis.com/auth/calendar.events')
    scopes.push('https://www.googleapis.com/auth/calendar.readonly')
  }

  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  authUrl.searchParams.set('client_id', googleClientId)
  authUrl.searchParams.set('redirect_uri', redirectUri)
  authUrl.searchParams.set('response_type', 'code')
  authUrl.searchParams.set('scope', scopes.join(' '))
  authUrl.searchParams.set('state', state)
  authUrl.searchParams.set('access_type', 'offline')     // needed to get refresh_token
  authUrl.searchParams.set('prompt', 'consent')           // always show consent to get refresh_token

  return NextResponse.redirect(authUrl.toString())
}
