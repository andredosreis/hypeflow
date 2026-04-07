/**
 * GET /api/oauth/meta/connect
 *
 * Initiates the Meta (Facebook) OAuth 2.0 flow.
 * Redirects the browser to Meta's authorization URL.
 *
 * Query params:
 *   client_id  — HYPE Flow client UUID to associate the integration with
 *   agency_id  — Agency UUID
 *
 * Scopes requested:
 *   ads_read, ads_management, business_management, pages_read_engagement
 */

import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const clientId = searchParams.get('client_id')
  const agencyId = searchParams.get('agency_id')

  if (!clientId || !agencyId) {
    return NextResponse.json({ error: 'client_id and agency_id are required' }, { status: 400 })
  }

  const appId       = process.env.META_APP_ID
  const redirectUri = process.env.META_REDIRECT_URI

  if (!appId || !redirectUri) {
    return NextResponse.json({ error: 'META_APP_ID or META_REDIRECT_URI not configured' }, { status: 500 })
  }

  // Encode state to recover client+agency after callback
  const state = Buffer.from(JSON.stringify({ client_id: clientId, agency_id: agencyId })).toString('base64url')

  const scopes = [
    'ads_read',
    'ads_management',
    'business_management',
    'pages_read_engagement',
    'instagram_basic',
  ].join(',')

  const authUrl = new URL('https://www.facebook.com/v19.0/dialog/oauth')
  authUrl.searchParams.set('client_id', appId)
  authUrl.searchParams.set('redirect_uri', redirectUri)
  authUrl.searchParams.set('scope', scopes)
  authUrl.searchParams.set('state', state)
  authUrl.searchParams.set('response_type', 'code')

  return NextResponse.redirect(authUrl.toString())
}
