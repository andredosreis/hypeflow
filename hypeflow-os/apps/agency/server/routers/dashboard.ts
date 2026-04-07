import { startOfDay, endOfDay, subDays } from 'date-fns'
import { createTRPCRouter, protectedProcedure } from '../trpc'

const STAGE_COLORS = ['#21A0C4', '#F5A623', '#4FC8EA', '#D1FF00', '#00E5A0']

const SOURCE_SHORT: Record<string, string> = {
  facebook: 'FB',
  meta: 'FB',
  instagram: 'IG',
  google_ads: 'GG',
  google: 'GG',
  linkedin: 'LI',
  whatsapp: 'WA',
  manychat: 'MC',
  organic: 'ORG',
}

const CHANNEL_LABEL: Record<string, string> = {
  facebook: 'Meta',
  meta: 'Meta',
  instagram: 'Insta',
  google_ads: 'Google',
  google: 'Google',
  linkedin: 'LI',
  whatsapp: 'WA',
  organic: 'Org',
}

function relativeTime(dateISO: string) {
  const diffMs = Date.now() - new Date(dateISO).getTime()
  const mins = Math.max(0, Math.floor(diffMs / 60000))
  if (mins < 60) return `${mins}m`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  return `${days}d`
}

export const dashboardRouter = createTRPCRouter({
  getOverview: protectedProcedure.query(async ({ ctx }) => {
    const { supabase, user } = ctx

    const { data: profile } = await supabase
      .from('users')
      .select('agency_id')
      .eq('id', user.id)
      .maybeSingle()

    const agencyId = profile?.agency_id
    if (!agencyId) {
      return {
        kpis: { leadsToday: 0, callsToday: 0, pipeline: 0, mrr: 0 },
        leadsWeek: [],
        pipelineStages: [],
        todayCalls: [],
        recentLeads: [],
        channelData: [],
        revData: [],
        execution: { tfcMinutes: 0, hotWithoutContact: 0, conversionByChannel: [] as Array<{ channel: string; rate: number }> },
        focusCards: [],
      }
    }

    const now = new Date()
    const todayStart = startOfDay(now).toISOString()
    const todayEnd = endOfDay(now).toISOString()
    const weekStart = subDays(startOfDay(now), 6).toISOString()
    const monthWindowStart = subDays(startOfDay(now), 180).toISOString()

    const [
      leadsTodayCount,
      callsTodayCount,
      pipelineCount,
      clients,
      leadsWeekRows,
      stages,
      stageLeads,
      todayCallsRows,
      recentLeadsRows,
      leadSources,
      revenueRows,
      conversionRows,
      tfcRows,
      hotNoContactRows,
      focusRows,
    ] = await Promise.all([
      supabase.from('leads').select('id', { count: 'exact', head: true }).eq('agency_id', agencyId).gte('created_at', todayStart).lte('created_at', todayEnd),
      supabase.from('calls').select('id', { count: 'exact', head: true }).eq('agency_id', agencyId).gte('scheduled_at', todayStart).lte('scheduled_at', todayEnd),
      supabase.from('leads').select('id', { count: 'exact', head: true }).eq('agency_id', agencyId).neq('status', 'lost'),
      supabase.from('clients').select('mrr').eq('agency_id', agencyId).eq('status', 'active'),
      supabase.from('leads').select('created_at').eq('agency_id', agencyId).gte('created_at', weekStart).lte('created_at', todayEnd),
      supabase.from('pipeline_stages').select('id, name, color, position').eq('agency_id', agencyId).order('position', { ascending: true }),
      supabase.from('leads').select('pipeline_stage_id, status').eq('agency_id', agencyId),
      supabase
        .from('calls')
        .select('scheduled_at, status, meet_link, lead:leads(full_name, score)')
        .eq('agency_id', agencyId)
        .gte('scheduled_at', todayStart)
        .lte('scheduled_at', todayEnd)
        .order('scheduled_at', { ascending: true })
        .limit(4),
      supabase
        .from('leads')
        .select('full_name, source, score, temperature, created_at, stage:pipeline_stages(name)')
        .eq('agency_id', agencyId)
        .order('created_at', { ascending: false })
        .limit(5),
      supabase.from('leads').select('source').eq('agency_id', agencyId).gte('created_at', subDays(startOfDay(now), 30).toISOString()).lte('created_at', todayEnd),
      supabase
        .from('traffic_metrics')
        .select('date, conversions, spend')
        .eq('agency_id', agencyId)
        .gte('date', monthWindowStart.split('T')[0])
        .order('date', { ascending: true }),
      supabase
        .from('traffic_metrics')
        .select('platform, leads, conversions')
        .eq('agency_id', agencyId)
        .eq('source_type', 'paid')
        .gte('date', subDays(startOfDay(now), 30).toISOString().slice(0, 10)),
      supabase
        .from('leads')
        .select('created_at, first_contact_at')
        .eq('agency_id', agencyId)
        .not('first_contact_at', 'is', null)
        .order('created_at', { ascending: false })
        .limit(200),
      supabase
        .from('leads')
        .select('id')
        .eq('agency_id', agencyId)
        .gte('score', 80)
        .is('last_contact_at', null),
      supabase
        .from('leads')
        .select('id, full_name, score, source, stage_entered_at, pipeline_stage_id')
        .eq('agency_id', agencyId)
        .neq('status', 'lost')
        .order('score', { ascending: false })
        .limit(30),
    ])

    const mrr = (clients.data ?? []).reduce((acc, c) => acc + Number(c.mrr ?? 0), 0)

    const weekMap = new Map<string, number>()
    for (let i = 0; i < 7; i += 1) {
      const date = subDays(startOfDay(now), 6 - i)
      weekMap.set(date.toISOString().slice(0, 10), 0)
    }
    for (const row of leadsWeekRows.data ?? []) {
      const key = new Date(row.created_at).toISOString().slice(0, 10)
      weekMap.set(key, (weekMap.get(key) ?? 0) + 1)
    }
    const weekLabels = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab']
    const leadsWeek = Array.from(weekMap.entries()).map(([key, v]) => {
      const day = new Date(`${key}T12:00:00.000Z`).getUTCDay()
      return { d: weekLabels[day] ?? '', v }
    })

    const stageCount = new Map<string, number>()
    for (const row of stageLeads.data ?? []) {
      if (row.status === 'lost') continue
      if (!row.pipeline_stage_id) continue
      stageCount.set(row.pipeline_stage_id, (stageCount.get(row.pipeline_stage_id) ?? 0) + 1)
    }
    const pipelineStages = (stages.data ?? []).map((s, idx) => ({
      name: s.name,
      count: stageCount.get(s.id) ?? 0,
      color: s.color ?? STAGE_COLORS[idx % STAGE_COLORS.length],
    }))

    const todayCalls = (todayCallsRows.data ?? []).map((c) => {
      const lead = Array.isArray(c.lead) ? c.lead[0] : c.lead
      return {
      name: lead?.full_name ?? 'Lead sem nome',
      time: new Date(c.scheduled_at).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' }),
      type: c.status === 'completed' ? 'Concluida' : 'Agendada',
      score: lead?.score ?? 0,
      meet: Boolean(c.meet_link),
    }})

    const recentLeads = (recentLeadsRows.data ?? []).map((lead) => {
      const stageObj = (Array.isArray(lead.stage) ? lead.stage[0] : lead.stage) as { name?: string } | null
      return {
        name: lead.full_name,
        source: SOURCE_SHORT[lead.source ?? ''] ?? (lead.source ?? 'N/A').slice(0, 2).toUpperCase(),
        score: lead.score ?? 0,
        temp: lead.temperature ?? 'cold',
        stage: stageObj?.name ?? 'Nova Lead',
        time: relativeTime(lead.created_at),
      }
    })

    const sourceCount = new Map<string, number>()
    for (const row of leadSources.data ?? []) {
      const source = row.source ?? 'organic'
      sourceCount.set(source, (sourceCount.get(source) ?? 0) + 1)
    }
    const channelData = Array.from(sourceCount.entries())
      .map(([key, v], idx) => ({
        name: CHANNEL_LABEL[key] ?? key.slice(0, 6),
        v,
        color: STAGE_COLORS[idx % STAGE_COLORS.length],
      }))
      .sort((a, b) => b.v - a.v)
      .slice(0, 5)

    const monthMap = new Map<string, number>()
    for (const row of revenueRows.data ?? []) {
      const month = new Date(`${row.date}T12:00:00.000Z`).toLocaleDateString('pt-PT', { month: 'short' })
      const value = Number(row.conversions ?? 0) * 500
      monthMap.set(month, (monthMap.get(month) ?? 0) + value)
    }
    let revData = Array.from(monthMap.entries()).map(([m, v]) => ({ m, v: Math.round(v) }))
    if (revData.length === 0) {
      revData = [{ m: 'Atual', v: Math.round(mrr) }]
    }

    const tfcMinutesRaw = (tfcRows.data ?? []).map((row) => {
      const created = new Date(row.created_at).getTime()
      const first = row.first_contact_at ? new Date(row.first_contact_at).getTime() : created
      return Math.max(0, Math.round((first - created) / 60000))
    })
    const tfcMinutes = tfcMinutesRaw.length
      ? Math.round(tfcMinutesRaw.reduce((acc, current) => acc + current, 0) / tfcMinutesRaw.length)
      : 0

    const conversionAgg = new Map<string, { leads: number; conversions: number }>()
    for (const row of conversionRows.data ?? []) {
      const current = conversionAgg.get(row.platform) ?? { leads: 0, conversions: 0 }
      current.leads += row.leads ?? 0
      current.conversions += row.conversions ?? 0
      conversionAgg.set(row.platform, current)
    }
    const conversionByChannel = Array.from(conversionAgg.entries())
      .map(([channel, values]) => ({
        channel,
        rate: values.leads > 0 ? Math.round((values.conversions / values.leads) * 1000) / 10 : 0,
      }))
      .sort((a, b) => b.rate - a.rate)

    const stageIndex = new Map((stages.data ?? []).map((stage) => [stage.id, stage.position]))
    const focusCards = (focusRows.data ?? [])
      .map((lead) => {
        const ageHours = lead.stage_entered_at
          ? Math.round((Date.now() - new Date(lead.stage_entered_at).getTime()) / 3600000)
          : 0
        return {
          id: lead.id,
          name: lead.full_name,
          score: lead.score ?? 0,
          source: lead.source,
          ageHours,
          urgency: (lead.score ?? 0) * 100 + ageHours,
        }
      })
      .sort((a, b) => b.urgency - a.urgency)
      .slice(0, 5)

    return {
      kpis: {
        leadsToday: leadsTodayCount.count ?? 0,
        callsToday: callsTodayCount.count ?? 0,
        pipeline: pipelineCount.count ?? 0,
        mrr,
      },
      leadsWeek,
      pipelineStages,
      todayCalls,
      recentLeads,
      channelData,
      revData,
      execution: {
        tfcMinutes,
        hotWithoutContact: hotNoContactRows.data?.length ?? 0,
        conversionByChannel,
      },
      focusCards,
    }
  }),
})
