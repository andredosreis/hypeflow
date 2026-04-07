import { z } from 'zod'
import { createTRPCRouter, protectedProcedure } from '../trpc'
import { subDays, format } from 'date-fns'

const DateRangeSchema = z.object({
  clientId: z.string().uuid(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  platforms: z.array(z.string()).optional(),
  sourceType: z.enum(['paid', 'organic', 'all']).optional().default('paid'),
  days: z.enum(['7', '30', '90']).optional().default('30'),
})

export const trafegoRouter = createTRPCRouter({
  getDashboard: protectedProcedure
    .input(DateRangeSchema)
    .query(async ({ ctx, input }) => {
      const { supabase } = ctx
      const dateTo = input.dateTo ?? new Date().toISOString()
      const dateFrom = input.dateFrom ?? subDays(new Date(), parseInt(input.days)).toISOString()

      // Aggregate metrics
      let query = supabase
        .from('traffic_metrics')
        .select('*')
        .eq('client_id', input.clientId)
        .gte('date', dateFrom.split('T')[0])
        .lte('date', dateTo.split('T')[0])

      if (input.platforms?.length) {
        query = query.in('platform', input.platforms)
      }

      if (input.sourceType !== 'all') {
        query = query.eq('source_type', input.sourceType)
      }

      const { data: metrics, error } = await query.order('date', { ascending: true })

      const { data: integrationSync } = await supabase
        .from('integrations')
        .select('last_sync')
        .eq('client_id', input.clientId)
        .in('provider', ['meta', 'google_ads'])
        .order('last_sync', { ascending: false })
        .limit(1)

      if (error) throw new Error(error.message)

      // Aggregate totals
      const totals = (metrics ?? []).reduce(
        (acc, m) => ({
          impressions: acc.impressions + (m.impressions ?? 0),
          clicks: acc.clicks + (m.clicks ?? 0),
          leads: acc.leads + (m.leads ?? 0),
          spend: acc.spend + Number(m.spend ?? 0),
          conversions: acc.conversions + (m.conversions ?? 0),
        }),
        { impressions: 0, clicks: 0, leads: 0, spend: 0, conversions: 0 }
      )

      const cpl = totals.leads > 0 ? totals.spend / totals.leads : 0
      const roas = totals.spend > 0 ? (totals.conversions * 100) / totals.spend : 0

      const { data: clientMeta } = await supabase
        .from('clients')
        .select('agency_id')
        .eq('id', input.clientId)
        .maybeSingle()

      const [{ data: wonStages }, { data: wonLeads }] = await Promise.all([
        supabase
          .from('pipeline_stages')
          .select('id')
          .eq('agency_id', clientMeta?.agency_id ?? '')
          .eq('is_won', true),
        supabase
          .from('leads')
          .select('source, tags, pipeline_stage_id, status')
          .eq('client_id', input.clientId),
      ])

      const wonStageIds = new Set((wonStages ?? []).map(s => s.id))
      const closedLeads = (wonLeads ?? []).filter(lead =>
        (lead.pipeline_stage_id && wonStageIds.has(lead.pipeline_stage_id))
        || ['closed', 'won', 'fechada'].includes((lead.status ?? '').toLowerCase())
      )

      const dealValueOf = (tags: string[] | null | undefined) => {
        const tag = tags?.find(item => item.startsWith('deal_value:'))
        if (!tag) return 0
        const value = Number(tag.replace('deal_value:', ''))
        return Number.isFinite(value) ? value : 0
      }

      const acquisitions = closedLeads.length
      let closedRevenue = closedLeads.reduce((acc, lead) => acc + dealValueOf(lead.tags), 0)
      if (closedRevenue === 0 && acquisitions > 0) {
        closedRevenue = acquisitions * 1200
      }
      const cpaReal = acquisitions > 0 ? totals.spend / acquisitions : 0

      const byPlatform: Record<string, typeof totals> = {}
      for (const m of metrics ?? []) {
        const p = m.platform
        if (!byPlatform[p]) {
          byPlatform[p] = { impressions: 0, clicks: 0, leads: 0, spend: 0, conversions: 0 }
        }
        const platform = byPlatform[p]!
        platform.impressions += m.impressions ?? 0
        platform.clicks += m.clicks ?? 0
        platform.leads += m.leads ?? 0
        platform.spend += Number(m.spend ?? 0)
        platform.conversions += m.conversions ?? 0
      }

      const conversionsByPlatform: Record<string, number> = {}
      for (const lead of closedLeads) {
        const source = (lead.source ?? 'organic').toLowerCase()
        const key = source === 'facebook' ? 'meta' : source
        conversionsByPlatform[key] = (conversionsByPlatform[key] ?? 0) + 1
      }

      const efficiencyHeatmap = Object.entries(byPlatform).map(([platform, values]) => {
        const platformSpend = Number(values.spend ?? 0)
        const platformAcq = conversionsByPlatform[platform] ?? 0
        const platformRevenue = platformAcq > 0 ? Math.max(platformAcq, 1) * (closedRevenue / Math.max(acquisitions, 1)) : 0
        const roi = platformSpend > 0 ? ((platformRevenue - platformSpend) / platformSpend) * 100 : 0
        const platformCpa = platformAcq > 0 ? platformSpend / platformAcq : 0
        return {
          platform,
          spend: platformSpend,
          acquisitions: platformAcq,
          roi: Math.round(roi * 10) / 10,
          cpaReal: Math.round(platformCpa * 100) / 100,
        }
      })

      const best = [...efficiencyHeatmap].sort((a, b) => b.roi - a.roi)[0] ?? null
      const worst = [...efficiencyHeatmap].sort((a, b) => a.roi - b.roi)[0] ?? null

      // Daily trend
      const dailyTrend: Array<{ date: string; [key: string]: number | string }> = []
      const dateMap = new Map<string, Record<string, number>>()

      for (const m of metrics ?? []) {
        const dateKey = m.date
        if (!dateMap.has(dateKey)) dateMap.set(dateKey, {})
        const day = dateMap.get(dateKey)!
        day[m.platform] = (day[m.platform] ?? 0) + (m.leads ?? 0)
      }

      dateMap.forEach((platforms, date) => {
        dailyTrend.push({ date, ...platforms })
      })
      dailyTrend.sort((a, b) => String(a.date).localeCompare(String(b.date)))

      // Weekday heatmap
      const weekdayHeatmap = Array.from({ length: 7 }, (_, i) => ({
        day: i,
        label: ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'][i] ?? '',
        leads: 0,
      }))

      for (const m of metrics ?? []) {
        const dayOfWeek = new Date(m.date).getDay()
        const entry = weekdayHeatmap[dayOfWeek]
        if (entry) entry.leads += m.leads ?? 0
      }

      return {
        totals: { ...totals, cpl, roas, cpaReal, closedRevenue, acquisitions },
        byPlatform,
        dailyTrend,
        weekdayHeatmap,
        lastSync: integrationSync?.[0]?.last_sync ?? null,
        efficiencyHeatmap,
        efficiencyBest: best,
        efficiencyWorst: worst,
        rawMetrics: metrics ?? [],
      }
    }),

  syncPaidTraffic: protectedProcedure
    .input(z.object({ clientId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { supabase, user } = ctx

      const { data: profile } = await supabase
        .from('users')
        .select('agency_id')
        .eq('id', user.id)
        .maybeSingle()

      if (!profile?.agency_id) {
        throw new Error('Utilizador sem agencia associada')
      }

      const { data: integrations, error: integrationsError } = await supabase
        .from('integrations')
        .select('id, provider, status')
        .eq('agency_id', profile.agency_id)
        .eq('client_id', input.clientId)
        .in('provider', ['meta', 'google_ads'])
        .eq('status', 'active')

      if (integrationsError) throw new Error(integrationsError.message)

      if (!integrations?.length) {
        return {
          triggered: false,
          message: 'Nenhuma integracao ativa de trafego pago para este cliente.',
          syncedAt: null,
        }
      }

      const { error: invokeError } = await supabase.functions.invoke('sync-meta-ads', {
        body: { clientId: input.clientId },
      })

      if (invokeError) {
        throw new Error(`Falha ao sincronizar Meta Ads: ${invokeError.message}`)
      }

      return {
        triggered: true,
        message: 'Sincronizacao de trafego pago iniciada.',
        syncedAt: new Date().toISOString(),
      }
    }),

  getCampaigns: protectedProcedure
    .input(z.object({
      clientId: z.string().uuid(),
      platform: z.string().optional(),
      limit: z.number().min(1).max(100).default(50),
    }))
    .query(async ({ ctx, input }) => {
      const { supabase } = ctx

      let query = supabase
        .from('ad_campaigns')
        .select('*, traffic_metrics(impressions, clicks, leads, spend, conversions)')
        .eq('client_id', input.clientId)

      if (input.platform) query = query.eq('platform', input.platform)

      const { data, error } = await query.limit(input.limit)
      if (error) throw new Error(error.message)
      return data ?? []
    }),

  getPreviousPeriodComparison: protectedProcedure
    .input(DateRangeSchema)
    .query(async ({ ctx, input }) => {
      const { supabase } = ctx
      const days = parseInt(input.days)
      const currentEnd = new Date()
      const currentStart = subDays(currentEnd, days)
      const prevEnd = subDays(currentStart, 1)
      const prevStart = subDays(prevEnd, days)

      let currentQuery = supabase
        .from('traffic_metrics')
        .select('leads, spend, conversions')
        .eq('client_id', input.clientId)
        .gte('date', format(currentStart, 'yyyy-MM-dd'))
        .lte('date', format(currentEnd, 'yyyy-MM-dd'))

      let previousQuery = supabase
        .from('traffic_metrics')
        .select('leads, spend, conversions')
        .eq('client_id', input.clientId)
        .gte('date', format(prevStart, 'yyyy-MM-dd'))
        .lte('date', format(prevEnd, 'yyyy-MM-dd'))

      if (input.sourceType !== 'all') {
        currentQuery = currentQuery.eq('source_type', input.sourceType)
        previousQuery = previousQuery.eq('source_type', input.sourceType)
      }

      const [current, previous] = await Promise.all([currentQuery, previousQuery])

      const agg = (rows: typeof current.data) =>
        (rows ?? []).reduce(
          (a, m) => ({ leads: a.leads + (m.leads ?? 0), spend: a.spend + Number(m.spend ?? 0) }),
          { leads: 0, spend: 0 }
        )

      const curr = agg(current.data)
      const prev = agg(previous.data)

      const pct = (a: number, b: number) =>
        b === 0 ? null : Math.round(((a - b) / b) * 100)

      return {
        current: curr,
        previous: prev,
        changeLeads: pct(curr.leads, prev.leads),
        changeSpend: pct(curr.spend, prev.spend),
        changeCpl: pct(
          curr.leads > 0 ? curr.spend / curr.leads : 0,
          prev.leads > 0 ? prev.spend / prev.leads : 0
        ),
      }
    }),
})
