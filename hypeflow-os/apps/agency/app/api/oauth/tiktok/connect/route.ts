/**
 * GET /api/oauth/tiktok/connect
 *
 * Initiates TikTok Marketing API OAuth 2.0 flow.
 * Docs: https://business-api.tiktok.com/portal/docs?id=1738373141733378
 */

import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const clientId = searchParams.get('client_id')
  const agencyId = searchParams.get('agency_id')

  if (!clientId || !agencyId) {
    return NextResponse.json({ error: 'client_id and agency_id are required' }, { status: 400 })
  }

  const appId      = process.env.TIKTOK_APP_ID
  const redirectUri = process.env.TIKTOK_REDIRECT_URI

  if (!appId || !redirectUri) {
    return NextResponse.json({ error: 'TIKTOK_APP_ID or TIKTOK_REDIRECT_URI not configured' }, { status: 500 })
  }

  const state = Buffer.from(JSON.stringify({ client_id: clientId, agency_id: agencyId })).toString('base64url')

  // TikTok uses a different auth URL structure
  const authUrl = new URL('https://business-api.tiktok.com/portal/auth')
  authUrl.searchParams.set('app_id', appId)
  authUrl.searchParams.set('state', state)
  authUrl.searchParams.set('redirect_uri', redirectUri)

  return NextResponse.redirect(authUrl.toString())
}
