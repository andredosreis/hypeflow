/**
 * Meta Marketing API client
 * Docs: https://developers.facebook.com/docs/marketing-api
 */

export interface MetaInsight {
  date_start: string
  date_stop: string
  impressions: string
  clicks: string
  spend: string
  actions?: Array<{ action_type: string; value: string }>
  cost_per_action_type?: Array<{ action_type: string; value: string }>
  ctr: string
  cpm: string
  campaign_id: string
  campaign_name: string
  adset_id?: string
  adset_name?: string
}

export interface MetaCampaign {
  id: string
  name: string
  status: 'ACTIVE' | 'PAUSED' | 'ARCHIVED' | 'DELETED'
  objective: string
  daily_budget?: string
  lifetime_budget?: string
  start_time?: string
  stop_time?: string
}

const META_API_VERSION = 'v19.0'
const META_BASE = `https://graph.facebook.com/${META_API_VERSION}`

export class MetaClient {
  constructor(private accessToken: string) {}

  private async fetch<T>(path: string, params: Record<string, string> = {}): Promise<T> {
    const url = new URL(`${META_BASE}${path}`)
    url.searchParams.set('access_token', this.accessToken)
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))

    const res = await fetch(url.toString())
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(`Meta API error: ${JSON.stringify(err)}`)
    }
    return res.json() as Promise<T>
  }

  async getAdAccounts(): Promise<Array<{ id: string; name: string; account_status: number }>> {
    const data = await this.fetch<{ data: Array<{ id: string; name: string; account_status: number }> }>(
      '/me/adaccounts',
      { fields: 'id,name,account_status', limit: '50' }
    )
    return data.data
  }

  async getCampaigns(adAccountId: string): Promise<MetaCampaign[]> {
    const cleanId = adAccountId.replace('act_', '')
    const data = await this.fetch<{ data: MetaCampaign[] }>(
      `/act_${cleanId}/campaigns`,
      {
        fields: 'id,name,status,objective,daily_budget,lifetime_budget,start_time,stop_time',
        limit: '100',
      }
    )
    return data.data
  }

  async getInsights(
    adAccountId: string,
    dateFrom: string,
    dateTo: string,
    level: 'account' | 'campaign' | 'adset' = 'campaign'
  ): Promise<MetaInsight[]> {
    const cleanId = adAccountId.replace('act_', '')

    const data = await this.fetch<{ data: MetaInsight[] }>(
      `/act_${cleanId}/insights`,
      {
        fields: 'impressions,clicks,spend,actions,cost_per_action_type,ctr,cpm,campaign_id,campaign_name',
        time_range: JSON.stringify({ since: dateFrom, until: dateTo }),
        level,
        time_increment: '1',
        limit: '500',
      }
    )
    return data.data
  }

  /** Normalise Meta insights → traffic_metrics rows */
  normaliseInsights(
    insights: MetaInsight[],
    agencyId: string,
    clientId: string,
    integrationId: string,
    campaignMap: Map<string, string> // externalId → internal UUID
  ) {
    return insights.map(row => {
      const leads = row.actions
        ?.filter(a => a.action_type === 'lead' || a.action_type === 'onsite_conversion.lead_grouped')
        .reduce((sum, a) => sum + parseInt(a.value), 0) ?? 0

      const conversions = row.actions
        ?.filter(a => a.action_type === 'purchase' || a.action_type === 'complete_registration')
        .reduce((sum, a) => sum + parseInt(a.value), 0) ?? 0

      const spend = parseFloat(row.spend)
      const clicks = parseInt(row.clicks)
      const impressions = parseInt(row.impressions)
      const cpl = leads > 0 ? spend / leads : null
      const ctr = parseFloat(row.ctr) / 100

      return {
        agency_id: agencyId,
        client_id: clientId,
        integration_id: integrationId,
        campaign_id: campaignMap.get(row.campaign_id) ?? null,
        date: row.date_start,
        platform: 'meta' as const,
        source_type: 'paid' as const,
        impressions,
        clicks,
        leads,
        conversions,
        spend,
        ctr,
        cpl,
        roas: null,
        platform_metrics: { campaign_name: row.campaign_name, cpm: row.cpm },
      }
    })
  }
}

/** Exchange OAuth code for long-lived token */
export async function exchangeMetaCode(code: string): Promise<{
  access_token: string
  token_type: string
  expires_in: number
}> {
  const url = new URL(`https://graph.facebook.com/${META_API_VERSION}/oauth/access_token`)
  url.searchParams.set('client_id', process.env.META_APP_ID!)
  url.searchParams.set('client_secret', process.env.META_APP_SECRET!)
  url.searchParams.set('redirect_uri', process.env.META_REDIRECT_URI!)
  url.searchParams.set('code', code)

  const res = await fetch(url.toString())
  if (!res.ok) throw new Error('Failed to exchange Meta code')
  return res.json()
}
