/**
 * Google Ads API client (REST)
 * Using Google Ads Query Language (GAQL)
 */

const GOOGLE_ADS_API_VERSION = 'v17'

export class GoogleAdsClient {
  constructor(
    private accessToken: string,
    private developerToken: string,
    private customerId: string
  ) {}

  private get headers() {
    return {
      Authorization: `Bearer ${this.accessToken}`,
      'developer-token': this.developerToken,
      'Content-Type': 'application/json',
    }
  }

  private get baseUrl() {
    const cleanId = this.customerId.replace(/-/g, '')
    return `https://googleads.googleapis.com/${GOOGLE_ADS_API_VERSION}/customers/${cleanId}`
  }

  async search<T>(query: string): Promise<T[]> {
    const res = await fetch(`${this.baseUrl}/googleAds:search`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({ query }),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(`Google Ads API error: ${JSON.stringify(err)}`)
    }

    const data = await res.json()
    return data.results ?? []
  }

  async getCampaignMetrics(dateFrom: string, dateTo: string) {
    const query = `
      SELECT
        campaign.id,
        campaign.name,
        campaign.status,
        metrics.impressions,
        metrics.clicks,
        metrics.cost_micros,
        metrics.conversions,
        metrics.ctr,
        segments.date
      FROM campaign
      WHERE segments.date BETWEEN '${dateFrom}' AND '${dateTo}'
        AND campaign.status != 'REMOVED'
      ORDER BY metrics.impressions DESC
    `

    const results = await this.search<{
      campaign: { id: string; name: string; status: string }
      metrics: {
        impressions: string
        clicks: string
        cost_micros: string
        conversions: string
        ctr: string
      }
      segments: { date: string }
    }>(query)

    return results.map(r => ({
      campaignId: r.campaign.id,
      campaignName: r.campaign.name,
      status: r.campaign.status,
      date: r.segments.date,
      impressions: parseInt(r.metrics.impressions ?? '0'),
      clicks: parseInt(r.metrics.clicks ?? '0'),
      spend: parseInt(r.metrics.cost_micros ?? '0') / 1_000_000, // micros → €
      conversions: parseFloat(r.metrics.conversions ?? '0'),
      ctr: parseFloat(r.metrics.ctr ?? '0'),
    }))
  }

  async getTopKeywords(dateFrom: string, dateTo: string, limit = 10) {
    const query = `
      SELECT
        ad_group_criterion.keyword.text,
        ad_group_criterion.keyword.match_type,
        ad_group_criterion.quality_info.quality_score,
        metrics.clicks,
        metrics.cost_micros,
        metrics.conversions,
        metrics.impressions,
        segments.date
      FROM keyword_view
      WHERE segments.date BETWEEN '${dateFrom}' AND '${dateTo}'
        AND ad_group_criterion.status != 'REMOVED'
      ORDER BY metrics.clicks DESC
      LIMIT ${limit}
    `

    const results = await this.search<{
      ad_group_criterion: {
        keyword: { text: string; match_type: string }
        quality_info: { quality_score: number }
      }
      metrics: {
        clicks: string
        cost_micros: string
        conversions: string
        impressions: string
      }
      segments: { date: string }
    }>(query)

    return results.map(r => ({
      keyword: r.ad_group_criterion.keyword.text,
      matchType: r.ad_group_criterion.keyword.match_type,
      qualityScore: r.ad_group_criterion.quality_info?.quality_score ?? null,
      clicks: parseInt(r.metrics.clicks ?? '0'),
      spend: parseInt(r.metrics.cost_micros ?? '0') / 1_000_000,
      conversions: parseFloat(r.metrics.conversions ?? '0'),
      impressions: parseInt(r.metrics.impressions ?? '0'),
      date: r.segments.date,
    }))
  }

  async listAccessibleCustomers(): Promise<string[]> {
    const res = await fetch(
      `https://googleads.googleapis.com/${GOOGLE_ADS_API_VERSION}/customers:listAccessibleCustomers`,
      { headers: this.headers }
    )
    if (!res.ok) throw new Error('Failed to list Google Ads customers')
    const data = await res.json()
    return data.resourceNames ?? []
  }

  /** Normalise Google Ads campaign metrics → traffic_metrics rows */
  normaliseMetrics(
    metrics: Awaited<ReturnType<GoogleAdsClient['getCampaignMetrics']>>,
    agencyId: string,
    clientId: string,
    integrationId: string
  ) {
    return metrics.map(m => ({
      agency_id: agencyId,
      client_id: clientId,
      integration_id: integrationId,
      campaign_id: null,
      date: m.date,
      platform: 'google_ads' as const,
      source_type: 'paid' as const,
      impressions: m.impressions,
      clicks: m.clicks,
      leads: 0, // Google Ads doesn't natively track "leads" — use conversions
      conversions: Math.round(m.conversions),
      spend: m.spend,
      ctr: m.ctr,
      cpl: null,
      roas: null,
      platform_metrics: { campaign_name: m.campaignName, campaign_id: m.campaignId },
    }))
  }
}
