/**
 * GET /api/oauth/linkedin/connect
 *
 * Initiates the LinkedIn OAuth 2.0 flow.
 *
 * Scopes requested:
 *   - r_ads           — read ad accounts and campaigns
 *   - r_ads_reporting — read reporting metrics
 *   - r_organization_social — basic org profile (name, logo)
 *
 * State: base64url-encoded JSON { agencyId, userId, ts }
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const LINKEDIN_AUTH_URL = 'https://www.linkedin.com/oauth/v2/authorization'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Resolve agency_id for this user
  const { data: profile } = await supabase
    .from('users')
    .select('agency_id')
    .eq('id', user.id)
    .single()

  const agencyId = profile?.agency_id ?? 'unknown'

  const state = Buffer.from(
    JSON.stringify({ agencyId, userId: user.id, ts: Date.now() })
  ).toString('base64url')

  const params = new URLSearchParams({
    response_type: 'code',
    client_id:     process.env.LINKEDIN_CLIENT_ID!,
    redirect_uri:  `${process.env.NEXT_PUBLIC_APP_URL}/api/oauth/linkedin/callback`,
    state,
    scope:         'r_ads r_ads_reporting r_organization_social',
  })

  return NextResponse.redirect(`${LINKEDIN_AUTH_URL}?${params.toString()}`)
}
