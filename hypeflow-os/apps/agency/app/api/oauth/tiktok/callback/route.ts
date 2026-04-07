/**
 * GET /api/oauth/tiktok/callback
 *
 * Handles TikTok Marketing API OAuth callback.
 * Exchanges auth_code for access_token and saves integration.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

interface TikTokTokenResponse {
  code: number
  message: string
  data: {
    access_token: string
    advertiser_ids: string[]
    scope: string[]
  }
}

interface TikTokAdvertiserInfo {
  advertiser_id: string
  advertiser_name: string
  currency: string
  timezone: string
}

async function exchangeTikTokCode(authCode: string): Promise<TikTokTokenResponse> {
  const res = await fetch('https://business-api.tiktok.com/open_api/v1.3/oauth2/access_token/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      app_id:     process.env.TIKTOK_APP_ID,
      secret:     process.env.TIKTOK_APP_SECRET,
      auth_code:  authCode,
    }),
  })

  if (!res.ok) throw new Error(`TikTok token exchange failed: ${await res.text()}`)
  return res.json()
}

async function getAdvertiserInfo(accessToken: string, advertiserId: string): Promise<TikTokAdvertiserInfo | null> {
  const res = await fetch(
    `https://business-api.tiktok.com/open_api/v1.3/advertiser/info/?advertiser_ids=["${advertiserId}"]`,
    { headers: { 'Access-Token': accessToken } }
  )
  if (!res.ok) return null
  const json = await res.json()
  return json.data?.list?.[0] ?? null
}

export async function GET(request: NextRequest) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3010'

  try {
    const { searchParams } = new URL(request.url)
    const authCode = searchParams.get('auth_code')
    const state    = searchParams.get('state')

    if (!authCode || !state) {
      return NextResponse.redirect(`${appUrl}/config?tab=integracoes&status=error&reason=missing_params`)
    }

    let stateData: { client_id: string; agency_id: string }
    try {
      stateData = JSON.parse(Buffer.from(state, 'base64url').toString())
    } catch {
      return NextResponse.redirect(`${appUrl}/config?tab=integracoes&status=error&reason=invalid_state`)
    }

    const tokenRes = await exchangeTikTokCode(authCode)
    if (tokenRes.code !== 0) {
      throw new Error(`TikTok auth failed: ${tokenRes.message}`)
    }

    const { access_token, advertiser_ids } = tokenRes.data
    const advertiserId = advertiser_ids[0]

    let advertiserName = `TikTok Ads`
    if (advertiserId) {
      const info = await getAdvertiserInfo(access_token, advertiserId)
      if (info) advertiserName = info.advertiser_name
    }

    // TikTok access tokens last 24h — refresh logic needed in production
    // For now, store with 24h expiry and handle renewal via renew-google-webhooks pattern
    const tokenExpiry = new Date(Date.now() + 24 * 3600 * 1000)

    const supabase = await createServiceClient()

    await supabase.from('integrations').upsert({
      agency_id:            stateData.agency_id,
      client_id:            stateData.client_id,
      provider:             'tiktok',
      access_token,
      token_expiry:         tokenExpiry.toISOString(),
      external_account_id:  advertiserId ?? null,
      external_account_name: advertiserName,
      status:               'active',
      error_message:        null,
      metadata:             { advertiser_ids, scopes: tokenRes.data.scope },
    }, { onConflict: 'client_id,provider' })

    // Trigger initial TikTok sync
    await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/sync-tiktok-ads`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
      },
    }).catch(console.error)

    console.log('[tiktok-callback] Integration saved for client', stateData.client_id)
    return NextResponse.redirect(`${appUrl}/config?tab=integracoes&status=connected&provider=tiktok`)
  } catch (err) {
    console.error('[tiktok-callback] Error:', err)
    return NextResponse.redirect(`${appUrl}/config?tab=integracoes&status=error&reason=exception`)
  }
}
