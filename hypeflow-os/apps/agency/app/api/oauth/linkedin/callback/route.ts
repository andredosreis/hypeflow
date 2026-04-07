/**
 * GET /api/oauth/linkedin/callback
 *
 * Handles the LinkedIn OAuth 2.0 authorization callback.
 *
 * Flow:
 *   1. Receives `code` + `state` from LinkedIn
 *   2. Exchanges `code` for access_token (60-day expiry)
 *   3. Fetches ad accounts via LinkedIn Marketing API v2
 *   4. Upserts an `integrations` row in Supabase (provider='linkedin')
 *   5. Triggers initial sync of LinkedIn campaign data
 *   6. Redirects to /config?tab=integracoes&status=connected&provider=linkedin
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

const LINKEDIN_TOKEN_URL = 'https://www.linkedin.com/oauth/v2/accessToken'
const LINKEDIN_API       = 'https://api.linkedin.com/v2'

interface LinkedInTokenResponse {
  access_token:  string
  expires_in:    number   // seconds — typically 5184000 (60 days)
  refresh_token?: string
  refresh_token_expires_in?: number
  scope:         string
}

interface LinkedInAdAccount {
  id:     string
  name:   string
  status: string
  type:   string
  currency: string
}

interface LinkedInOrgProfile {
  localizedName: string
  id:            string
}

async function exchangeLinkedInCode(
  code: string,
  redirectUri: string
): Promise<LinkedInTokenResponse> {
  const body = new URLSearchParams({
    grant_type:    'authorization_code',
    code,
    redirect_uri:  redirectUri,
    client_id:     process.env.LINKEDIN_CLIENT_ID!,
    client_secret: process.env.LINKEDIN_CLIENT_SECRET!,
  })

  const res = await fetch(LINKEDIN_TOKEN_URL, {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body:    body.toString(),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`LinkedIn token exchange failed: ${err}`)
  }

  return res.json()
}

async function getAdAccounts(accessToken: string): Promise<LinkedInAdAccount[]> {
  const res = await fetch(
    `${LINKEDIN_API}/adAccountsV2?q=search&search.type.values[0]=BUSINESS&search.status.values[0]=ACTIVE`,
    { headers: { Authorization: `Bearer ${accessToken}`, 'LinkedIn-Version': '202401' } }
  )

  if (!res.ok) return []

  const data = await res.json()
  return (data.elements ?? []).map((el: Record<string, unknown>) => ({
    id:       String(el.id ?? ''),
    name:     String(el.name ?? ''),
    status:   String(el.status ?? ''),
    type:     String(el.type ?? ''),
    currency: String(el.currency ?? 'EUR'),
  }))
}

async function getOrgProfile(accessToken: string): Promise<LinkedInOrgProfile | null> {
  const res = await fetch(`${LINKEDIN_API}/me`, {
    headers: { Authorization: `Bearer ${accessToken}`, 'LinkedIn-Version': '202401' },
  })

  if (!res.ok) return null

  const data = await res.json()
  return {
    id:            String(data.id ?? ''),
    localizedName: data.localizedFirstName
      ? `${data.localizedFirstName} ${data.localizedLastName ?? ''}`.trim()
      : String(data.localizedName ?? 'LinkedIn Account'),
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code  = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  if (error) {
    console.error('[LINKEDIN OAUTH] Error from LinkedIn:', error, searchParams.get('error_description'))
    return NextResponse.redirect(
      new URL('/config?tab=integracoes&status=error&provider=linkedin', request.url)
    )
  }

  if (!code || !state) {
    return NextResponse.redirect(
      new URL('/config?tab=integracoes&status=error&provider=linkedin', request.url)
    )
  }

  // Decode state
  let agencyId: string
  try {
    const decoded = JSON.parse(Buffer.from(state, 'base64url').toString('utf-8'))
    agencyId = decoded.agencyId
  } catch {
    return NextResponse.redirect(
      new URL('/config?tab=integracoes&status=error&provider=linkedin', request.url)
    )
  }

  try {
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/oauth/linkedin/callback`

    // 1. Exchange code for token
    const tokenData = await exchangeLinkedInCode(code, redirectUri)

    // 2. Fetch ad accounts + profile in parallel
    const [adAccounts, profile] = await Promise.all([
      getAdAccounts(tokenData.access_token),
      getOrgProfile(tokenData.access_token),
    ])

    const tokenExpiry = new Date(Date.now() + tokenData.expires_in * 1000).toISOString()

    // 3. Upsert integration row
    const supabase = await createServiceClient()

    await supabase
      .from('integrations')
      .upsert(
        {
          agency_id:    agencyId,
          provider:     'linkedin',
          access_token: tokenData.access_token,
          token_expiry: tokenExpiry,
          ...(tokenData.refresh_token && { refresh_token: tokenData.refresh_token }),
          account_id:   adAccounts[0]?.id ?? null,
          account_name: profile?.localizedName ?? 'LinkedIn',
          scopes:       tokenData.scope,
          metadata: {
            ad_accounts: adAccounts,
            profile,
          },
          last_sync:    null,
          is_active:    true,
        },
        { onConflict: 'agency_id,provider' }
      )

    // 4. Trigger initial LinkedIn Ads sync (fire-and-forget)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (supabaseUrl && serviceKey) {
      fetch(`${supabaseUrl}/functions/v1/sync-linkedin-ads`, {
        method:  'POST',
        headers: {
          Authorization:  `Bearer ${serviceKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ agency_id: agencyId }),
      }).catch(err => console.error('[LINKEDIN] Sync trigger error:', err))
    }

    return NextResponse.redirect(
      new URL('/config?tab=integracoes&status=connected&provider=linkedin', request.url)
    )
  } catch (err) {
    console.error('[LINKEDIN OAUTH] Callback error:', err)
    return NextResponse.redirect(
      new URL('/config?tab=integracoes&status=error&provider=linkedin', request.url)
    )
  }
}
