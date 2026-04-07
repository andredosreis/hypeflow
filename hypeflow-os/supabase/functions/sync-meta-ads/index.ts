import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

const META_API_VERSION = 'v19.0'

async function refreshMetaToken(integration: { id: string; access_token: string }) {
  // Meta long-lived tokens last 60 days — check and refresh if needed
  // For simplicity, log the status; in production add rotation logic
  return integration.access_token
}

async function syncMetaAds(integration: {
  id: string
  agency_id: string
  client_id: string
  access_token: string
  external_account_id: string
}) {
  const today = new Date()
  const dateFrom = new Date(today)
  dateFrom.setDate(today.getDate() - 7)

  const fmt = (d: Date) => d.toISOString().split('T')[0]

  const token = await refreshMetaToken(integration)

  // Fetch insights
  const url = new URL(`https://graph.facebook.com/${META_API_VERSION}/act_${integration.external_account_id}/insights`)
  url.searchParams.set('access_token', token)
  url.searchParams.set('fields', 'impressions,clicks,spend,actions,cost_per_action_type,ctr,cpm,campaign_id,campaign_name')
  url.searchParams.set('time_range', JSON.stringify({ since: fmt(dateFrom), until: fmt(today) }))
  url.searchParams.set('level', 'campaign')
  url.searchParams.set('time_increment', '1')
  url.searchParams.set('limit', '500')

  const res = await fetch(url.toString())
  if (!res.ok) throw new Error(`Meta API failed: ${await res.text()}`)
  const { data: insights } = await res.json()

  if (!insights?.length) return 0

  const rows = insights.map((row: Record<string, unknown>) => {
    const actions = (row.actions as Array<{ action_type: string; value: string }>) ?? []
    const leads = actions
      .filter((a) => a.action_type === 'lead' || a.action_type === 'onsite_conversion.lead_grouped')
      .reduce((s, a) => s + parseInt(a.value), 0)

    const spend = parseFloat(row.spend as string)
    const clicks = parseInt(row.clicks as string)
    const impressions = parseInt(row.impressions as string)

    const campaignId = (row.campaign_id as string | undefined) ?? null

    return {
      agency_id: integration.agency_id,
      client_id: integration.client_id,
      integration_id: integration.id,
      campaign_id: campaignId,
      date: (row.date_start as string),
      platform: 'meta',
      source_type: 'paid',
      impressions,
      clicks,
      leads,
      conversions: 0,
      spend,
      ctr: parseFloat(row.ctr as string) / 100,
      cpl: leads > 0 ? spend / leads : null,
      roas: null,
      platform_metrics: { campaign_id: campaignId, campaign_name: row.campaign_name },
    }
  })

  const { error } = await supabase
    .from('traffic_metrics')
    .upsert(rows, { onConflict: 'client_id,date,platform,campaign_id' })

  if (error) throw new Error(`DB upsert failed: ${error.message}`)

  // Update last_sync
  await supabase
    .from('integrations')
    .update({ last_sync: new Date().toISOString(), status: 'active', error_message: null })
    .eq('id', integration.id)

  return rows.length
}

serve(async (req) => {
  try {
    let clientId: string | null = null
    if (req.method !== 'GET') {
      try {
        const body = await req.json()
        clientId = typeof body?.clientId === 'string' ? body.clientId : null
      } catch {
        clientId = null
      }
    }

    // Get all active Meta integrations
    let integrationsQuery = supabase
      .from('integrations')
      .select('id, agency_id, client_id, access_token, external_account_id')
      .eq('provider', 'meta')
      .eq('status', 'active')

    if (clientId) {
      integrationsQuery = integrationsQuery.eq('client_id', clientId)
    }

    const { data: integrations, error } = await integrationsQuery

    if (error) throw error
    if (!integrations?.length) {
      return new Response(JSON.stringify({ synced: 0, message: 'No active Meta integrations' }), {
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const results = await Promise.allSettled(
      integrations.map((i) => syncMetaAds(i))
    )

    const succeeded = results.filter((r) => r.status === 'fulfilled').length
    const failed = results.filter((r) => r.status === 'rejected')

    // Log failures
    for (const fail of failed) {
      if (fail.status === 'rejected') {
        console.error('Meta sync failed:', fail.reason)
      }
    }

    return new Response(
      JSON.stringify({ synced: succeeded, failed: failed.length }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('sync-meta-ads error:', err)
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
