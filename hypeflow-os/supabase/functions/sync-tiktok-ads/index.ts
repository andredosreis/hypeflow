/**
 * sync-tiktok-ads — Supabase Edge Function
 *
 * Triggered by: pg_cron schedule (daily at 03:00 UTC via automation-scheduler)
 *
 * Responsibilities:
 *   1. Find all active TikTok integrations
 *   2. Call TikTok Marketing API (v1.3) for each ad account
 *   3. Fetch campaign-level insights for the last 7 days
 *   4. Upsert rows into traffic_metrics
 *
 * TikTok API docs: https://business-api.tiktok.com/portal/docs
 *
 * ENV vars required:
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *   TIKTOK_APP_ID, TIKTOK_APP_SECRET (for token refresh)
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

const TIKTOK_API = 'https://business-api.tiktok.com/open_api/v1.3'

/* ─── types ─── */

interface TikTokIntegration {
  id: string
  agency_id: string
  client_id: string
  access_token: string
  external_account_id: string   // TikTok Advertiser ID
  external_account_name: string
}

interface TikTokInsightRow {
  campaign_id: string
  campaign_name: string
  stat_time_day: string
  impressions: string
  clicks: string
  spend: string
  ctr: string
  conversion?: string
  cost_per_conversion?: string
}

/* ─── API helpers ─── */

async function fetchTikTokInsights(
  accessToken: string,
  advertiserId: string,
  dateFrom: string,
  dateTo: string
): Promise<TikTokInsightRow[]> {
  const url = `${TIKTOK_API}/report/integrated/get/`

  const body = {
    advertiser_id: advertiserId,
    report_type: 'BASIC',
    dimensions: ['campaign_id', 'stat_time_day'],
    metrics: ['impressions', 'clicks', 'spend', 'ctr', 'conversion', 'cost_per_conversion', 'campaign_name'],
    start_date: dateFrom,
    end_date: dateTo,
    page_size: 1000,
    page: 1,
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Access-Token': accessToken,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`TikTok API error: ${err}`)
  }

  const json = await res.json()

  if (json.code !== 0) {
    throw new Error(`TikTok API code ${json.code}: ${json.message}`)
  }

  return (json.data?.list ?? []) as TikTokInsightRow[]
}

/* ─── Sync one integration ─── */

async function syncTikTokIntegration(integration: TikTokIntegration): Promise<number> {
  const today    = new Date()
  const dateFrom = new Date(today)
  dateFrom.setDate(today.getDate() - 7)

  const fmt = (d: Date) => d.toISOString().split('T')[0]

  const insights = await fetchTikTokInsights(
    integration.access_token,
    integration.external_account_id,
    fmt(dateFrom),
    fmt(today)
  )

  if (!insights.length) return 0

  const rows = insights.map(row => {
    const spend       = parseFloat(row.spend ?? '0')
    const leads       = parseInt(row.conversion ?? '0')
    const clicks      = parseInt(row.clicks ?? '0')
    const impressions = parseInt(row.impressions ?? '0')
    const ctr         = parseFloat(row.ctr ?? '0')
    const cpl         = leads > 0 ? spend / leads : null

    return {
      agency_id:      integration.agency_id,
      client_id:      integration.client_id,
      integration_id: integration.id,
      date:           row.stat_time_day,
      platform:       'tiktok',
      source_type:    'paid',
      impressions,
      clicks,
      leads,
      conversions:    leads,
      spend,
      ctr,
      cpl,
      platform_metrics: {
        campaign_id:   row.campaign_id,
        campaign_name: row.campaign_name,
        cost_per_conversion: row.cost_per_conversion,
      },
    }
  })

  // Upsert — on conflict update metrics
  // Note: UNIQUE constraint is (client_id, date, platform, campaign_id)
  const { error } = await supabase
    .from('traffic_metrics')
    .upsert(rows, {
      onConflict: 'client_id,date,platform',
      ignoreDuplicates: false,
    })

  if (error) throw error

  // Update integration last_sync
  await supabase
    .from('integrations')
    .update({ last_sync: new Date().toISOString(), error_message: null })
    .eq('id', integration.id)

  console.log(`[sync-tiktok-ads] ${integration.external_account_name}: ${rows.length} rows upserted`)
  return rows.length
}

/* ─── Main ─── */

serve(async () => {
  try {
    const { data: integrations, error } = await supabase
      .from('integrations')
      .select('id, agency_id, client_id, access_token, external_account_id, external_account_name')
      .eq('provider', 'tiktok')
      .eq('status', 'active')

    if (error) throw error
    if (!integrations?.length) {
      return new Response(JSON.stringify({ success: true, synced: 0, message: 'No active TikTok integrations' }), {
        headers: { 'Content-Type': 'application/json' },
      })
    }

    let totalRows = 0
    const results: Array<{ account: string; rows: number; error?: string }> = []

    for (const integration of integrations as TikTokIntegration[]) {
      try {
        const rows = await syncTikTokIntegration(integration)
        totalRows += rows
        results.push({ account: integration.external_account_name, rows })
      } catch (err) {
        const msg = String(err)
        console.error(`[sync-tiktok-ads] Error for ${integration.external_account_name}:`, msg)

        // Log error to integration
        await supabase
          .from('integrations')
          .update({ error_message: msg })
          .eq('id', integration.id)

        results.push({ account: integration.external_account_name, rows: 0, error: msg })
      }
    }

    return new Response(JSON.stringify({ success: true, totalRows, results }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('[sync-tiktok-ads] Fatal error:', err)
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
