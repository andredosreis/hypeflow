/**
 * GET /api/oauth/meta/callback
 *
 * Handles the Meta OAuth 2.0 authorization callback.
 *
 * Flow:
 *   1. Receives `code` + `state` from Meta
 *   2. Exchanges `code` for a short-lived access token
 *   3. Exchanges short-lived token for a long-lived token (60 days)
 *   4. Fetches the associated ad account(s)
 *   5. Upserts an `integrations` row in Supabase
 *   6. Redirects to /config?tab=integracoes&status=success
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

const META_API = 'https://graph.facebook.com/v19.0'

interface MetaTokenResponse {
  access_token: string
  token_type: string
  expires_in?: number
}

interface MetaAdAccount {
  account_id: string
  name: string
}

interface MetaAdAccountsResponse {
  data: Array<{ id: string; name: string; account_id: string }>
}

async function exchangeCodeForToken(
  code: string,
  redirectUri: string,
  appId: string,
  appSecret: string
): Promise<MetaTokenResponse> {
  const url = new URL(`${META_API}/oauth/access_token`)
  url.searchParams.set('client_id', appId)
  url.searchParams.set('client_secret', appSecret)
  url.searchParams.set('redirect_uri', redirectUri)
  url.searchParams.set('code', code)

  const res = await fetch(url.toString())
  if (!res.ok) throw new Error(`Meta token exchange failed: ${await res.text()}`)
  return res.json()
}

async function getLongLivedToken(
  shortToken: string,
  appId: string,
  appSecret: string
): Promise<MetaTokenResponse> {
  const url = new URL(`${META_API}/oauth/access_token`)
  url.searchParams.set('grant_type', 'fb_exchange_token')
  url.searchParams.set('client_id', appId)
  url.searchParams.set('client_secret', appSecret)
  url.searchParams.set('fb_exchange_token', shortToken)

  const res = await fetch(url.toString())
  if (!res.ok) throw new Error(`Meta long-lived token failed: ${await res.text()}`)
  return res.json()
}

async function getAdAccounts(token: string): Promise<MetaAdAccount[]> {
  const url = new URL(`${META_API}/me/adaccounts`)
  url.searchParams.set('access_token', token)
  url.searchParams.set('fields', 'account_id,name,account_status')

  const res = await fetch(url.toString())
  if (!res.ok) return []

  const json: MetaAdAccountsResponse = await res.json()
  return (json.data ?? []).map(a => ({ account_id: a.account_id, name: a.name }))
}

export async function GET(request: NextRequest) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3010'

  try {
    const { searchParams } = new URL(request.url)
    const code  = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')

    // User denied access
    if (error) {
      console.warn('[meta-callback] User denied:', error)
      return NextResponse.redirect(`${appUrl}/config?tab=integracoes&status=denied`)
    }

    if (!code || !state) {
      return NextResponse.redirect(`${appUrl}/config?tab=integracoes&status=error&reason=missing_params`)
    }

    // Decode state
    let stateData: { client_id: string; agency_id: string }
    try {
      stateData = JSON.parse(Buffer.from(state, 'base64url').toString())
    } catch {
      return NextResponse.redirect(`${appUrl}/config?tab=integracoes&status=error&reason=invalid_state`)
    }

    const appId       = process.env.META_APP_ID!
    const appSecret   = process.env.META_APP_SECRET!
    const redirectUri = process.env.META_REDIRECT_URI!

    // Exchange code → short token → long token
    const shortToken = await exchangeCodeForToken(code, redirectUri, appId, appSecret)
    const longToken  = await getLongLivedToken(shortToken.access_token, appId, appSecret)

    // Get ad accounts
    const accounts = await getAdAccounts(longToken.access_token)
    const account  = accounts[0] // use first account; in future show account picker UI

    // Token expires in 60 days
    const tokenExpiry = new Date()
    tokenExpiry.setDate(tokenExpiry.getDate() + 60)

    // Upsert integration
    const supabase = await createServiceClient()

    const { error: dbError } = await supabase
      .from('integrations')
      .upsert({
        agency_id:            stateData.agency_id,
        client_id:            stateData.client_id,
        provider:             'meta',
        access_token:         longToken.access_token,
        token_expiry:         tokenExpiry.toISOString(),
        external_account_id:  account?.account_id ?? null,
        external_account_name: account?.name ?? 'Meta Ads',
        status:               'active',
        error_message:        null,
        metadata:             { accounts, scopes: ['ads_read', 'ads_management'] },
      }, { onConflict: 'client_id,provider' })

    if (dbError) {
      console.error('[meta-callback] DB error:', dbError)
      return NextResponse.redirect(`${appUrl}/config?tab=integracoes&status=error&reason=db_error`)
    }

    console.log('[meta-callback] Integration saved for client', stateData.client_id)

    // Trigger initial sync
    await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/sync-meta-ads`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ client_id: stateData.client_id }),
    }).catch(console.error)

    return NextResponse.redirect(`${appUrl}/config?tab=integracoes&status=connected&provider=meta`)
  } catch (err) {
    console.error('[meta-callback] Error:', err)
    return NextResponse.redirect(`${appUrl}/config?tab=integracoes&status=error&reason=exception`)
  }
}
