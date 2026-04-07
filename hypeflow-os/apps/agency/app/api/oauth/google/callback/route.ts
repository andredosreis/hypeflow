/**
 * GET /api/oauth/google/callback
 *
 * Handles Google OAuth 2.0 callback.
 *
 * Flow:
 *   1. Receives `code` + `state`
 *   2. Exchanges code for access_token + refresh_token
 *   3. Fetches user profile (email, name)
 *   4. Upserts integrations row (provider='google')
 *   5. If scope includes 'ads', upserts a second row (provider='google_ads')
 *   6. Triggers initial sync for Google Ads
 *   7. Redirects to /config?tab=integracoes&status=connected
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

interface GoogleTokenResponse {
  access_token: string
  refresh_token?: string
  expires_in: number
  token_type: string
  scope: string
}

interface GoogleUserInfo {
  email: string
  name: string
}

async function exchangeCode(code: string, redirectUri: string): Promise<GoogleTokenResponse> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id:     process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri:  redirectUri,
      grant_type:    'authorization_code',
    }),
  })

  if (!res.ok) throw new Error(`Google token exchange failed: ${await res.text()}`)
  return res.json()
}

async function getUserInfo(accessToken: string): Promise<GoogleUserInfo> {
  const res = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) return { email: 'unknown', name: 'Google User' }
  return res.json()
}

export async function GET(request: NextRequest) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3010'

  try {
    const { searchParams } = new URL(request.url)
    const code  = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')

    if (error) {
      return NextResponse.redirect(`${appUrl}/config?tab=integracoes&status=denied`)
    }

    if (!code || !state) {
      return NextResponse.redirect(`${appUrl}/config?tab=integracoes&status=error&reason=missing_params`)
    }

    let stateData: { client_id: string; agency_id: string; scope: string }
    try {
      stateData = JSON.parse(Buffer.from(state, 'base64url').toString())
    } catch {
      return NextResponse.redirect(`${appUrl}/config?tab=integracoes&status=error&reason=invalid_state`)
    }

    const redirectUri = process.env.GOOGLE_REDIRECT_URI!
    const tokens      = await exchangeCode(code, redirectUri)
    const userInfo    = await getUserInfo(tokens.access_token)

    // Token expiry
    const tokenExpiry = new Date(Date.now() + tokens.expires_in * 1000)

    const supabase = await createServiceClient()

    const baseIntegration = {
      agency_id:            stateData.agency_id,
      client_id:            stateData.client_id,
      access_token:         tokens.access_token,
      refresh_token:        tokens.refresh_token ?? null,
      token_expiry:         tokenExpiry.toISOString(),
      external_account_name: userInfo.email,
      status:               'active',
      error_message:        null,
    }

    // Always upsert Google Calendar integration
    if (stateData.scope === 'calendar' || stateData.scope === 'both') {
      await supabase.from('integrations').upsert({
        ...baseIntegration,
        provider:            'google_calendar',
        external_account_id: userInfo.email,
        metadata:            { scopes: tokens.scope },
      }, { onConflict: 'client_id,provider' })
    }

    // Upsert Google Ads integration
    if (stateData.scope === 'ads' || stateData.scope === 'both') {
      await supabase.from('integrations').upsert({
        ...baseIntegration,
        provider:            'google_ads',
        external_account_id: userInfo.email,
        metadata:            { developer_token: process.env.GOOGLE_ADS_DEVELOPER_TOKEN, scopes: tokens.scope },
      }, { onConflict: 'client_id,provider' })

      // Trigger initial Google Ads sync
      await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/sync-google-ads`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ client_id: stateData.client_id }),
      }).catch(console.error)
    }

    console.log('[google-callback] Integration saved for client', stateData.client_id, 'scope:', stateData.scope)
    return NextResponse.redirect(`${appUrl}/config?tab=integracoes&status=connected&provider=google`)
  } catch (err) {
    console.error('[google-callback] Error:', err)
    return NextResponse.redirect(`${appUrl}/config?tab=integracoes&status=error&reason=exception`)
  }
}
