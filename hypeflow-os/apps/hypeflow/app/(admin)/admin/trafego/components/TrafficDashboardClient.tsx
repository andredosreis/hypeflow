'use client'

import { useState, useMemo, useEffect } from 'react'
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import { TrendingUp, TrendingDown, Download, Euro, Users, MousePointer, Target, Award, ChevronRight } from 'lucide-react'
import { PlatformIcon } from '@/components/icons/PlatformIcons'
import { api } from '@/lib/trpc/client'

/* ──────────────────────── CONFIG ──────────────────────── */

const CHANNEL_COLORS: Record<string, string> = {
  meta:       '#1877F2',
  instagram:  '#E1306C',
  google_ads: '#4285F4',
  linkedin:   '#0A66C2',
  tiktok:     '#69C9D0',
  whatsapp:   '#25D366',
  organic:    '#1EC87A',
}

const CHANNEL_LABELS: Record<string, string> = {
  meta:       'Facebook Ads',
  instagram:  'Instagram Ads',
  google_ads: 'Google Ads',
  linkedin:   'LinkedIn',
  tiktok:     'TikTok Ads',
  whatsapp:   'WhatsApp',
  organic:    'Orgânico',
}

/* Map channel key → platform icon key */
const CHANNEL_ICON: Record<string, string> = {
  meta:       'facebook',
  instagram:  'instagram',
  google_ads: 'google_ads',
  linkedin:   'linkedin',
  tiktok:     'tiktok',
  whatsapp:   'whatsapp',
  organic:    'organic',
}

const WEEKDAY_LABELS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']

/* Attribution model mock — per-channel ROAS + funnel conversion */
type AttributionModel = 'last_click' | 'first_click' | 'linear'

const ATTRIBUTION_MOCK: Record<string, {
  roas: Record<AttributionModel, number>
  funnel: { leads: number; qualified: number; call: number; closed: number }
  revenue: number
}> = {
  meta:       { roas: { last_click: 4.2, first_click: 3.1, linear: 3.7 }, funnel: { leads: 48, qualified: 31, call: 18, closed: 9  }, revenue: 22500 },
  instagram:  { roas: { last_click: 3.1, first_click: 3.8, linear: 3.4 }, funnel: { leads: 22, qualified: 13, call: 7,  closed: 3  }, revenue: 7500  },
  google_ads: { roas: { last_click: 5.8, first_click: 5.2, linear: 5.5 }, funnel: { leads: 27, qualified: 21, call: 14, closed: 8  }, revenue: 28000 },
  linkedin:   { roas: { last_click: 2.4, first_click: 2.9, linear: 2.6 }, funnel: { leads: 8,  qualified: 7,  call: 5,  closed: 2  }, revenue: 9000  },
  tiktok:     { roas: { last_click: 2.1, first_click: 1.8, linear: 2.0 }, funnel: { leads: 19, qualified: 8,  call: 3,  closed: 1  }, revenue: 2500  },
  organic:    { roas: { last_click: 8.0, first_click: 8.0, linear: 8.0 }, funnel: { leads: 12, qualified: 9,  call: 6,  closed: 4  }, revenue: 12000 },
}

/* ──────────────────────── MOCK DATA ──────────────────────── */

function generateDailyData(days: number, clientMult = 1) {
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(Date.now() - (days - 1 - i) * 86400000)
    const label = `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}`
    const base = 0.6 + Math.sin(i / 3) * 0.3 + Math.random() * 0.2
    return {
      date: label,
      meta:       Math.round(8  * base * clientMult),
      instagram:  Math.round(5  * base * clientMult),
      google_ads: Math.round(6  * base * clientMult),
      linkedin:   Math.round(3  * base * clientMult),
      tiktok:     Math.round(4  * base * clientMult),
      organic:    Math.round(2  * base * clientMult),
    }
  })
}

const MOCK_BY_CLIENT: Record<string, {
  channels: Array<{ key: string; leads: number; spend: number; impressions: number; clicks: number }>
  weekday: number[]
  mult: number
}> = {
  'preview-client-1': {
    mult: 1.0,
    channels: [
      { key: 'meta',       leads: 48, spend: 180, impressions: 42000, clicks: 890 },
      { key: 'instagram',  leads: 22, spend: 85,  impressions: 28000, clicks: 540 },
      { key: 'google_ads', leads: 27, spend: 140, impressions: 15000, clicks: 720 },
      { key: 'linkedin',   leads: 8,  spend: 60,  impressions: 8000,  clicks: 180 },
      { key: 'tiktok',     leads: 19, spend: 75,  impressions: 62000, clicks: 1450 },
      { key: 'organic',    leads: 12, spend: 0,   impressions: 5000,  clicks: 320 },
    ],
    weekday: [14, 18, 16, 22, 19, 10, 6],
  },
  'preview-client-2': {
    mult: 0.7,
    channels: [
      { key: 'meta',       leads: 35, spend: 130, impressions: 32000, clicks: 680 },
      { key: 'instagram',  leads: 28, spend: 95,  impressions: 24000, clicks: 620 },
      { key: 'tiktok',     leads: 24, spend: 70,  impressions: 48000, clicks: 1100 },
      { key: 'google_ads', leads: 14, spend: 80,  impressions: 10000, clicks: 380 },
      { key: 'organic',    leads: 9,  spend: 0,   impressions: 4200,  clicks: 210 },
    ],
    weekday: [12, 15, 14, 18, 16, 11, 5],
  },
  'preview-client-3': {
    mult: 1.3,
    channels: [
      { key: 'meta',       leads: 18, spend: 250, impressions: 55000, clicks: 420 },
      { key: 'google_ads', leads: 32, spend: 310, impressions: 18000, clicks: 870 },
      { key: 'linkedin',   leads: 14, spend: 180, impressions: 12000, clicks: 340 },
      { key: 'tiktok',     leads: 11, spend: 90,  impressions: 38000, clicks: 820 },
      { key: 'organic',    leads: 6,  spend: 0,   impressions: 3000,  clicks: 140 },
    ],
    weekday: [8, 12, 11, 15, 14, 6, 3],
  },
}

function getMockData(clientId: string, days: '7' | '30' | '90') {
  const client = MOCK_BY_CLIENT[clientId] ?? MOCK_BY_CLIENT['preview-client-1']!
  const mult   = days === '7' ? 0.25 : days === '30' ? 1 : 3
  const channels = client.channels.map(ch => ({
    ...ch,
    leads:       Math.round(ch.leads       * mult),
    spend:       Math.round(ch.spend       * mult),
    impressions: Math.round(ch.impressions * mult),
    clicks:      Math.round(ch.clicks      * mult),
  }))

  const totals = channels.reduce((acc, ch) => ({
    leads:       acc.leads       + ch.leads,
    spend:       acc.spend       + ch.spend,
    impressions: acc.impressions + ch.impressions,
    clicks:      acc.clicks      + ch.clicks,
  }), { leads: 0, spend: 0, impressions: 0, clicks: 0 })

  const cpl    = totals.spend > 0 ? totals.spend / totals.leads : 0
  const ctr    = totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0

  // Previous period comparison (mock: slightly worse)
  const prevMult = 0.88
  const comparison = {
    changeLeads: Math.round(((1 - prevMult) / prevMult) * 100 * 10) / 10,
    changeSpend: Math.round(((1.05 - prevMult) / prevMult) * 100 * 10) / 10,
    changeCpl:   Math.round(-8.3 * 10) / 10,
    changeCtr:   Math.round(5.2  * 10) / 10,
  }

  const dailyDays = days === '7' ? 7 : days === '30' ? 30 : 90
  const dailyTrend = generateDailyData(dailyDays, client.mult)

  const weekday = client.weekday.map((leads, i) => ({
    label: WEEKDAY_LABELS[i]!,
    leads: Math.round(leads * mult),
    cpl:   totals.spend > 0 ? Math.round((totals.spend / totals.leads) * 10) / 10 : 0,
  }))

  return { channels, totals, cpl, ctr, comparison, dailyTrend, weekday }
}

/* ──────────────────────── COMPONENTS ──────────────────────── */

interface Props {
  agencyId: string
  clients: Array<{ id: string; name: string; niche: string }>
  demoMode?: boolean
}

function StatCard({ label, value, change, prefix = '', suffix = '', icon: Icon, color }: {
  label: string; value: number; change?: number; prefix?: string; suffix?: string
  icon: typeof Users; color: string
}) {
  const fmt = value >= 1000
    ? `${(value / 1000).toFixed(1)}k`
    : value % 1 !== 0 ? value.toFixed(2) : String(value)

  return (
    <div className="bg-[var(--s2)] border border-white/5 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] font-700 uppercase tracking-widest text-[#7FA8C4]">{label}</p>
        <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: `${color}22` }}>
          <Icon size={14} style={{ color }} />
        </div>
      </div>
      <p className="metric-hero">{prefix}{fmt}{suffix}</p>
      {change !== undefined && (
        <div className={`flex items-center gap-1 mt-2 text-xs font-700 ${change >= 0 ? 'text-[#1EC87A]' : 'text-[#E84545]'}`}>
          {change >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
          {Math.abs(change)}% vs período anterior
        </div>
      )}
    </div>
  )
}

function ChartTip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[var(--s1)] border border-white/10 rounded-xl px-3 py-2 text-xs">
      <p className="font-700 text-white mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color ?? p.fill }}>
          {p.name}: {typeof p.value === 'number' && p.value > 100 ? `€${p.value}` : p.value}
        </p>
      ))}
    </div>
  )
}

/* ──────────────────────── PAGE ──────────────────────── */

export function TrafficDashboardClient({ clients, demoMode = false }: Props) {
  const utils = api.useUtils()
  const [selectedClientId, setSelectedClientId] = useState(clients[0]?.id ?? '')
  const [days, setDays] = useState<'7' | '30' | '90'>('30')
  const [activeChannels, setActiveChannels] = useState<Set<string>>(new Set())
  const [attributionModel, setAttributionModel] = useState<AttributionModel>('last_click')

  const dashboardQuery = api.admin.trafego.getDashboard.useQuery(
    { clientId: selectedClientId, days, sourceType: 'paid' },
    { enabled: Boolean(selectedClientId) && !demoMode }
  )

  const comparisonQuery = api.admin.trafego.getPreviousPeriodComparison.useQuery(
    { clientId: selectedClientId, days, sourceType: 'paid' },
    { enabled: Boolean(selectedClientId) && !demoMode }
  )

  const syncPaidTrafficMutation = api.admin.trafego.syncPaidTraffic.useMutation({
    onSuccess: async () => {
      await utils.admin.trafego.getDashboard.invalidate()
      await utils.admin.trafego.getPreviousPeriodComparison.invalidate()
    },
  })

  const fallback = useMemo(() => getMockData(selectedClientId || 'preview-client-1', days), [selectedClientId, days])

  const channels = useMemo(() => {
    if (demoMode || dashboardQuery.error) return fallback.channels
    const byPlatform = dashboardQuery.data?.byPlatform ?? {}
    return Object.entries(byPlatform).map(([key, value]) => ({
      key,
      leads: value.leads ?? 0,
      spend: Number(value.spend ?? 0),
      impressions: value.impressions ?? 0,
      clicks: value.clicks ?? 0,
    }))
  }, [dashboardQuery.data?.byPlatform, dashboardQuery.error, demoMode, fallback.channels])

  const totals = useMemo(() => {
    if (demoMode || dashboardQuery.error) return fallback.totals
    const t = dashboardQuery.data?.totals
    return {
      leads: t?.leads ?? 0,
      spend: Number(t?.spend ?? 0),
      impressions: t?.impressions ?? 0,
      clicks: t?.clicks ?? 0,
    }
  }, [dashboardQuery.data?.totals, dashboardQuery.error, demoMode, fallback.totals])

  const cpl = demoMode || dashboardQuery.error ? fallback.cpl : dashboardQuery.data?.totals?.cpl ?? 0
  const ctr = totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0
  const cpaReal = demoMode || dashboardQuery.error ? 0 : dashboardQuery.data?.totals?.cpaReal ?? 0
  const closedRevenue = demoMode || dashboardQuery.error ? 0 : dashboardQuery.data?.totals?.closedRevenue ?? 0
  const efficiencyHeatmap = demoMode || dashboardQuery.error ? [] : (dashboardQuery.data?.efficiencyHeatmap ?? [])
  const bestEfficiency = demoMode || dashboardQuery.error ? null : (dashboardQuery.data?.efficiencyBest ?? null)
  const worstEfficiency = demoMode || dashboardQuery.error ? null : (dashboardQuery.data?.efficiencyWorst ?? null)

  const comparison = demoMode || dashboardQuery.error
    ? fallback.comparison
    : {
        changeLeads: comparisonQuery.data?.changeLeads ?? 0,
        changeSpend: comparisonQuery.data?.changeSpend ?? 0,
        changeCpl: comparisonQuery.data?.changeCpl ?? 0,
        changeCtr: undefined,
      }

  const dailyTrend = useMemo(
    () => (demoMode || dashboardQuery.error ? fallback.dailyTrend : dashboardQuery.data?.dailyTrend ?? []),
    [dashboardQuery.data?.dailyTrend, dashboardQuery.error, demoMode, fallback.dailyTrend]
  )

  const weekday = useMemo(
    () => (demoMode || dashboardQuery.error
      ? fallback.weekday
      : (dashboardQuery.data?.weekdayHeatmap ?? []).map(item => ({
          label: item.label,
          leads: item.leads,
          cpl,
        }))),
    [dashboardQuery.data?.weekdayHeatmap, cpl, dashboardQuery.error, demoMode, fallback.weekday]
  )

  useEffect(() => {
    setActiveChannels(new Set(channels.map(ch => ch.key)))
  }, [selectedClientId, channels])

  const channelBarData = channels.map(ch => ({
    name:  CHANNEL_LABELS[ch.key] ?? ch.key,
    key:   ch.key,
    CPL:   ch.leads > 0 && ch.spend > 0 ? Number((ch.spend / ch.leads).toFixed(2)) : 0,
    Leads: ch.leads,
    Gasto: ch.spend,
    color: CHANNEL_COLORS[ch.key] ?? '#21A0C4',
  }))

  const maxWeekday = Math.max(...weekday.map(d => d.leads), 1)

  const lastSyncLabel = dashboardQuery.data?.lastSync
    ? new Date(dashboardQuery.data.lastSync).toLocaleString('pt-PT', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'sem sincronizacao recente'

  const toggleChannel = (key: string) =>
    setActiveChannels(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="display-title" style={{ fontSize: '2.75rem' }}>Tráfego</h1>
          <p className="text-sm text-[#7FA8C4] mt-0.5">Performance paga por canal · {totals.leads} leads · €{totals.spend} investidos</p>
          <p className="text-[11px] text-[#3D6080] mt-1">Última sync: {lastSyncLabel}</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedClientId}
            onChange={e => setSelectedClientId(e.target.value)}
            className="bg-[var(--s2)] border border-white/5 text-white text-sm rounded-xl px-4 py-2 focus:outline-none focus:border-[#21A0C4]"
          >
            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <div className="flex bg-[var(--s2)] border border-white/5 rounded-xl overflow-hidden">
            {(['7', '30', '90'] as const).map(d => (
              <button key={d} onClick={() => setDays(d)}
                className={`px-4 py-2 text-xs font-700 transition-colors ${days === d ? 'bg-[#21A0C4] text-[#050D14]' : 'text-[#7FA8C4] hover:text-white'}`}>
                {d}d
              </button>
            ))}
          </div>
          <button
            onClick={() => {
              if (!selectedClientId || syncPaidTrafficMutation.isPending || demoMode) return
              syncPaidTrafficMutation.mutate({ clientId: selectedClientId })
            }}
            disabled={!selectedClientId || syncPaidTrafficMutation.isPending || demoMode}
            className="flex items-center gap-2 text-xs font-700 text-[#050D14] bg-[#1EC87A] px-3 py-2 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-60"
          >
            {demoMode ? 'Sync indisponivel (demo)' : (syncPaidTrafficMutation.isPending ? 'Sincronizando...' : 'Sincronizar Ads')}
          </button>
          <button className="flex items-center gap-2 text-xs font-700 text-[#7FA8C4] bg-[var(--s2)] border border-white/5 px-3 py-2 rounded-xl hover:border-white/10 transition-colors">
            <Download size={12} /> Exportar
          </button>
        </div>
      </div>

      {syncPaidTrafficMutation.data?.message && (
        <div className="bg-[var(--s2)] border border-[#1EC87A]/40 rounded-2xl p-4 text-sm text-[#9BE7C2]">
          {syncPaidTrafficMutation.data.message}
        </div>
      )}

      {syncPaidTrafficMutation.error && (
        <div className="bg-[var(--s2)] border border-[#E84545]/40 rounded-2xl p-4 text-sm text-[#E84545]">
          {syncPaidTrafficMutation.error.message}
        </div>
      )}

      {dashboardQuery.isLoading && !demoMode && (
        <div className="bg-[var(--s2)] border border-white/5 rounded-2xl p-6 text-sm text-[#7FA8C4]">
          A carregar métricas de tráfego...
        </div>
      )}

      {dashboardQuery.error && !demoMode && (
        <div className="bg-[var(--s2)] border border-[#E84545]/40 rounded-2xl p-6 text-sm text-[#E84545]">
          Sem conexão com Supabase. Exibindo dados demo locais.
        </div>
      )}

      {!dashboardQuery.isLoading && !dashboardQuery.error && channels.length === 0 && (
        <div className="bg-[var(--s2)] border border-white/5 rounded-2xl p-6 text-sm text-[#7FA8C4]">
          Ainda não existem métricas para este cliente no período selecionado.
        </div>
      )}

      {/* KPI cards */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard label="Total Leads"  value={totals.leads}       change={comparison.changeLeads} icon={Users}        color="#21A0C4" />
        <StatCard label="Total Gasto"  value={totals.spend}       change={comparison.changeSpend} prefix="€" icon={Euro} color="#F5A623" />
        <StatCard label="CPL Médio"    value={cpl}                change={comparison.changeCpl}   prefix="€" icon={TrendingDown} color="#1EC87A" />
        <StatCard label="CPA Real"     value={cpaReal}            change={undefined}              prefix="€" icon={MousePointer} color="#E84545" />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-[var(--s2)] border border-white/5 rounded-2xl p-4">
          <p className="text-[10px] uppercase tracking-widest text-[#7FA8C4]">Receita fechada atribuída</p>
          <p className="metric-hero">€{Math.round(closedRevenue).toLocaleString('pt-PT')}</p>
        </div>
        <div className="bg-[var(--s2)] border border-[#1EC87A]/30 rounded-2xl p-4">
          <p className="text-[10px] uppercase tracking-widest text-[#7FA8C4]">Canal mais eficiente</p>
          <p className="text-lg font-800 text-[#1EC87A]">{bestEfficiency?.platform ?? 'n/d'} {bestEfficiency ? `(${bestEfficiency.roi}%)` : ''}</p>
        </div>
        <div className="bg-[var(--s2)] border border-[#E84545]/30 rounded-2xl p-4">
          <p className="text-[10px] uppercase tracking-widest text-[#7FA8C4]">Maior desperdício</p>
          <p className="text-lg font-800 text-[#E84545]">{worstEfficiency?.platform ?? 'n/d'} {worstEfficiency ? `(${worstEfficiency.roi}%)` : ''}</p>
        </div>
      </div>

      {efficiencyHeatmap.length > 0 && (
        <div className="bg-[var(--s2)] border border-white/5 rounded-2xl p-5">
          <p className="text-sm font-display font-800 text-white mb-3">Efficiency Heatmap (ROI por canal)</p>
          <div className="grid grid-cols-4 gap-2">
            {efficiencyHeatmap.map((item) => {
              const tone = item.roi >= 20 ? 'rgba(30,200,122,0.2)' : item.roi <= 0 ? 'rgba(232,69,69,0.2)' : 'rgba(245,166,35,0.18)'
              const color = item.roi >= 20 ? '#1EC87A' : item.roi <= 0 ? '#E84545' : '#F5A623'
              return (
                <div key={item.platform} className="rounded-xl p-3" style={{ background: tone }}>
                  <p className="text-xs text-[#7FA8C4]">{item.platform}</p>
                  <p className="text-sm font-800" style={{ color }}>ROI {item.roi}%</p>
                  <p className="text-[11px] text-[#B8C7D3]">CPA €{item.cpaReal}</p>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Channel toggle + breakdown table */}
      <div className="bg-[var(--s2)] border border-white/5 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-display font-800 text-white">Performance por Canal</p>
          <div className="flex gap-2 flex-wrap">
            {channels.map(ch => (
              <button key={ch.key} onClick={() => toggleChannel(ch.key)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-700 transition-all border ${
                  activeChannels.has(ch.key) ? 'border-transparent' : 'border-white/5 opacity-40'
                }`}
                style={{ background: activeChannels.has(ch.key) ? `${CHANNEL_COLORS[ch.key]}22` : undefined,
                         color: CHANNEL_COLORS[ch.key] }}>
                <PlatformIcon platform={CHANNEL_ICON[ch.key] ?? ch.key} size={14} />
                {CHANNEL_LABELS[ch.key]}
              </button>
            ))}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                {['Canal', 'Leads', 'Gasto', 'CPL', 'Impressões', 'Clicks', 'CTR'].map(h => (
                  <th key={h} className="text-left label-system px-3 py-2.5 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {channels.filter(ch => activeChannels.has(ch.key)).map(ch => {
                const chCpl = ch.leads > 0 && ch.spend > 0 ? (ch.spend / ch.leads).toFixed(2) : '—'
                const chCtr = ch.impressions > 0 ? ((ch.clicks / ch.impressions) * 100).toFixed(2) : '—'
                return (
                  <tr key={ch.key} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2.5">
                        <PlatformIcon platform={CHANNEL_ICON[ch.key] ?? ch.key} size={22} />
                        <span className="text-sm font-700 text-white">{CHANNEL_LABELS[ch.key]}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-sm font-700 text-[#21A0C4]">{ch.leads}</td>
                    <td className="px-3 py-3 text-sm text-[#7FA8C4]">{ch.spend > 0 ? `€${ch.spend}` : <span className="text-[#1EC87A]">Grátis</span>}</td>
                    <td className="px-3 py-3 text-sm font-700 text-white">{ch.spend > 0 ? `€${chCpl}` : '—'}</td>
                    <td className="px-3 py-3 text-sm text-[#7FA8C4]">{ch.impressions.toLocaleString()}</td>
                    <td className="px-3 py-3 text-sm text-[#7FA8C4]">{ch.clicks.toLocaleString()}</td>
                    <td className="px-3 py-3 text-sm text-[#7FA8C4]">{chCtr !== '—' ? `${chCtr}%` : '—'}</td>
                  </tr>
                )
              })}
              {/* Total row */}
              <tr className="bg-[var(--s1)]">
                <td className="px-3 py-3 text-xs font-700 text-[#3D6080] uppercase tracking-widest">Total</td>
                <td className="px-3 py-3 text-sm font-800 text-[#21A0C4]">{totals.leads}</td>
                <td className="px-3 py-3 text-sm font-800 text-white">€{totals.spend}</td>
                <td className="px-3 py-3 text-sm font-800 text-[#1EC87A]">€{cpl.toFixed(2)}</td>
                <td className="px-3 py-3 text-sm font-800 text-white">{totals.impressions.toLocaleString()}</td>
                <td className="px-3 py-3 text-sm font-800 text-white">{totals.clicks.toLocaleString()}</td>
                <td className="px-3 py-3 text-sm font-800 text-white">{ctr.toFixed(2)}%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-2 gap-4">
        {/* CPL by channel bar */}
        <div className="bg-[var(--s2)] border border-white/5 rounded-2xl p-5">
          <p className="text-sm font-display font-800 text-white mb-4">CPL por Canal</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={channelBarData.filter(d => d.CPL > 0)} barSize={28}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="name" tick={{ fill: '#3D6080', fontSize: 9 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#3D6080', fontSize: 10 }} axisLine={false} tickLine={false} width={32} />
              <Tooltip content={<ChartTip />} />
              <Bar dataKey="CPL" radius={[4,4,0,0]} name="CPL €">
                {channelBarData.filter(d => d.CPL > 0).map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Leads volume bar */}
        <div className="bg-[var(--s2)] border border-white/5 rounded-2xl p-5">
          <p className="text-sm font-display font-800 text-white mb-4">Leads por Canal</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={channelBarData} barSize={28}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="name" tick={{ fill: '#3D6080', fontSize: 9 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#3D6080', fontSize: 10 }} axisLine={false} tickLine={false} width={25} />
              <Tooltip content={<ChartTip />} />
              <Bar dataKey="Leads" radius={[4,4,0,0]} name="Leads">
                {channelBarData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Trend line */}
      <div className="bg-[var(--s2)] border border-white/5 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-display font-800 text-white">Leads ao Longo do Tempo</p>
          <div className="flex gap-3 flex-wrap">
            {channels.filter(ch => activeChannels.has(ch.key)).map(ch => (
              <span key={ch.key} className="flex items-center gap-1.5 text-[10px] font-700" style={{ color: CHANNEL_COLORS[ch.key] }}>
                <PlatformIcon platform={CHANNEL_ICON[ch.key] ?? ch.key} size={14} />
                {CHANNEL_LABELS[ch.key]}
              </span>
            ))}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={dailyTrend}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis dataKey="date" tick={{ fill: '#3D6080', fontSize: 9 }} axisLine={false} tickLine={false}
              interval={days === '7' ? 0 : days === '30' ? 4 : 9} />
            <YAxis tick={{ fill: '#3D6080', fontSize: 10 }} axisLine={false} tickLine={false} width={25} />
            <Tooltip content={<ChartTip />} />
            {channels.filter(ch => activeChannels.has(ch.key)).map(ch => (
              <Line key={ch.key} type="monotone" dataKey={ch.key}
                name={CHANNEL_LABELS[ch.key]} stroke={CHANNEL_COLORS[ch.key]}
                strokeWidth={2} dot={false} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Weekday heatmap */}
      <div className="bg-[var(--s2)] border border-white/5 rounded-2xl p-5">
        <p className="text-sm font-display font-800 text-white mb-4">Melhor Dia da Semana para Captar Leads</p>
        <div className="flex gap-3">
          {weekday.map((day, i) => {
            const intensity = day.leads / maxWeekday
            const isTop = day.leads === Math.max(...weekday.map(d => d.leads))
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-2">
                <div className="w-full rounded-xl flex flex-col items-center justify-end transition-all relative overflow-hidden"
                  style={{ height: 80, background: `rgba(33,160,196,${0.08 + intensity * 0.62})` }}>
                  {isTop && (
                    <div className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-[#21A0C4]" />
                  )}
                  <span className="text-sm font-800 text-white pb-2">{day.leads}</span>
                </div>
                <span className={`text-[10px] font-700 ${isTop ? 'text-[#21A0C4]' : 'text-[#7FA8C4]'}`}>{day.label}</span>
              </div>
            )
          })}
        </div>
        <p className="text-[10px] text-[#3D6080] mt-3">
          Melhor dia: <span className="text-[#21A0C4] font-700">{weekday.find(d => d.leads === Math.max(...weekday.map(x => x.leads)))?.label}</span>
          {' '}· CPL médio nesse dia: <span className="text-[#1EC87A] font-700">€{cpl.toFixed(2)}</span>
        </p>
      </div>

      {/* ── CONVERSION ATTRIBUTION ── */}
      <div className="bg-[var(--s2)] border border-white/5 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(209,255,0,0.1)' }}>
              <Target size={14} style={{ color: '#D1FF00' }} />
            </div>
            <p className="text-sm font-display font-800 text-white">Atribuição de Conversão</p>
          </div>
          <div className="flex bg-[var(--s1)] rounded-xl overflow-hidden">
            {([
              { id: 'last_click',  label: 'Último clique' },
              { id: 'first_click', label: 'Primeiro clique' },
              { id: 'linear',      label: 'Linear' },
            ] as const).map(({ id, label }) => (
              <button key={id} onClick={() => setAttributionModel(id)}
                className="px-3 py-1.5 text-[10px] font-bold transition-all"
                style={{
                  background: attributionModel === id ? 'var(--s3)' : 'transparent',
                  color: attributionModel === id ? 'var(--t1)' : 'var(--t3)',
                }}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* ROAS per channel */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          {channels.filter(ch => ATTRIBUTION_MOCK[ch.key]).map(ch => {
            const attr = ATTRIBUTION_MOCK[ch.key]!
            const roas = attr.roas[attributionModel]
            const isTop = roas === Math.max(...channels.filter(c => ATTRIBUTION_MOCK[c.key]).map(c => ATTRIBUTION_MOCK[c.key]!.roas[attributionModel]))
            return (
              <div key={ch.key} className="rounded-xl p-3 flex flex-col gap-2"
                style={{
                  background: isTop ? 'rgba(209,255,0,0.06)' : 'var(--s1)',
                  border: isTop ? '1px solid rgba(209,255,0,0.2)' : '1px solid transparent',
                }}>
                <div className="flex items-center justify-between">
                  <PlatformIcon platform={CHANNEL_ICON[ch.key] ?? ch.key} size={20} />
                  {isTop && <Award size={11} style={{ color: '#D1FF00' }} />}
                </div>
                <div>
                  <p className="text-base font-bold leading-none" style={{ color: isTop ? '#D1FF00' : 'var(--t1)' }}>
                    {roas.toFixed(1)}×
                  </p>
                  <p className="text-[9px] mt-0.5" style={{ color: 'var(--t3)' }}>ROAS</p>
                </div>
                <p className="text-[10px]" style={{ color: 'var(--t3)' }}>
                  €{attr.revenue.toLocaleString('pt-PT')} receita
                </p>
              </div>
            )
          })}
        </div>

        {/* Revenue share bar */}
        <div className="mb-2">
          <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--t3)' }}>Quota de receita atribuída</p>
          <div className="flex h-6 rounded-xl overflow-hidden gap-px">
            {(() => {
              const total = channels.filter(ch => ATTRIBUTION_MOCK[ch.key]).reduce((s, ch) => s + ATTRIBUTION_MOCK[ch.key]!.revenue, 0)
              return channels.filter(ch => ATTRIBUTION_MOCK[ch.key]).map(ch => {
                const pct = (ATTRIBUTION_MOCK[ch.key]!.revenue / total) * 100
                return (
                  <div key={ch.key} title={`${CHANNEL_LABELS[ch.key]}: ${pct.toFixed(1)}%`}
                    style={{ width: `${pct}%`, background: CHANNEL_COLORS[ch.key] ?? '#21A0C4', minWidth: pct > 2 ? undefined : 2 }}
                  />
                )
              })
            })()}
          </div>
          <div className="flex flex-wrap gap-3 mt-2">
            {channels.filter(ch => ATTRIBUTION_MOCK[ch.key]).map(ch => {
              const total = channels.filter(c => ATTRIBUTION_MOCK[c.key]).reduce((s, c) => s + ATTRIBUTION_MOCK[c.key]!.revenue, 0)
              const pct = (ATTRIBUTION_MOCK[ch.key]!.revenue / total) * 100
              return (
                <span key={ch.key} className="flex items-center gap-1.5 text-[10px]" style={{ color: 'var(--t3)' }}>
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: CHANNEL_COLORS[ch.key] }} />
                  {CHANNEL_LABELS[ch.key]} {pct.toFixed(0)}%
                </span>
              )
            })}
          </div>
        </div>
      </div>

      {/* ── CONVERSION FUNNEL ── */}
      <div className="bg-[var(--s2)] border border-white/5 rounded-2xl p-5">
        <p className="text-sm font-display font-800 text-white mb-4">Funil de Conversão por Canal</p>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                {['Canal', 'Leads', 'Qualificadas', 'Calls', 'Fechadas', 'Conv. Lead→Fecho'].map(h => (
                  <th key={h} className="text-left label-system px-3 py-2.5 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {channels.filter(ch => ATTRIBUTION_MOCK[ch.key]).map(ch => {
                const f = ATTRIBUTION_MOCK[ch.key]!.funnel
                const convRate = f.leads > 0 ? ((f.closed / f.leads) * 100).toFixed(1) : '0'
                const FUNNEL_STEPS = [f.leads, f.qualified, f.call, f.closed]
                return (
                  <tr key={ch.key} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2.5">
                        <PlatformIcon platform={CHANNEL_ICON[ch.key] ?? ch.key} size={20} />
                        <span className="text-sm font-700 text-white">{CHANNEL_LABELS[ch.key]}</span>
                      </div>
                    </td>
                    {FUNNEL_STEPS.map((v, i) => (
                      <td key={i} className="px-3 py-3">
                        <div className="flex items-center gap-1.5">
                          {i > 0 && <ChevronRight size={9} style={{ color: 'var(--t3)' }} />}
                          <span className="text-sm font-700" style={{ color: CHANNEL_COLORS[ch.key] }}>{v}</span>
                          {i > 0 && (
                            <span className="text-[9px]" style={{ color: 'var(--t3)' }}>
                              ({((v / FUNNEL_STEPS[i - 1]!) * 100).toFixed(0)}%)
                            </span>
                          )}
                        </div>
                      </td>
                    ))}
                    <td className="px-3 py-3">
                      <span className="text-sm font-bold" style={{ color: Number(convRate) >= 15 ? '#1EC87A' : Number(convRate) >= 8 ? '#F5A623' : 'var(--t3)' }}>
                        {convRate}%
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── ROI CALCULATOR ── */}
      <RoiCalculator channels={channels} />
    </div>
  )
}

/* ─── ROI Calculator ─── */
type ChannelOption = { key: string }

function RoiCalculator({ channels }: { channels: ChannelOption[] }) {
  const [spend, setSpend]         = useState('2000')
  const [dealValue, setDealValue] = useState('1500')
  const [closeRate, setCloseRate] = useState('15')
  const [cpl, setCpl]             = useState('18')
  const [refChannel, setRefChannel] = useState(channels[0]?.key ?? 'meta')

  const s = Number(spend) || 0
  const dv = Number(dealValue) || 0
  const cr = Number(closeRate) / 100 || 0
  const c = Number(cpl) || 1

  const projLeads   = s / c
  const projClosed  = projLeads * cr
  const projRevenue = projClosed * dv
  const projRoas    = s > 0 ? projRevenue / s : 0
  const projRoi     = s > 0 ? ((projRevenue - s) / s) * 100 : 0

  const refAttr     = ATTRIBUTION_MOCK[refChannel]
  const benchRoas   = refAttr ? refAttr.roas.last_click : 0
  const roasGap     = projRoas - benchRoas
  const isAhead     = roasGap >= 0

  return (
    <div className="bg-[var(--s2)] border border-white/5 rounded-2xl p-5">
      <div className="flex items-center gap-2.5 mb-5">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(209,255,0,0.1)' }}>
          <Euro size={14} style={{ color: '#D1FF00' }} />
        </div>
        <p className="text-sm font-display font-800 text-white">Calculadora ROI de Campanha</p>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Inputs */}
        <div className="flex flex-col gap-4">
          <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--t3)' }}>Parâmetros</p>
          {[
            { label: 'Investimento (€)', value: spend,     set: setSpend,     placeholder: '2000' },
            { label: 'Valor médio deal (€)', value: dealValue, set: setDealValue, placeholder: '1500' },
            { label: 'Taxa de fecho (%)', value: closeRate, set: setCloseRate, placeholder: '15' },
            { label: 'CPL médio (€)',    value: cpl,       set: setCpl,       placeholder: '18' },
          ].map(({ label, value, set, placeholder }) => (
            <div key={label} className="flex flex-col gap-1.5">
              <label className="text-[10px] font-medium" style={{ color: 'var(--t3)' }}>{label}</label>
              <input
                type="number"
                value={value}
                onChange={e => set(e.target.value)}
                placeholder={placeholder}
                className="w-full rounded-xl px-3 py-2 text-sm font-bold focus:outline-none"
                style={{ background: 'var(--s1)', border: '1px solid rgba(255,255,255,0.07)', color: 'var(--t1)' }}
              />
            </div>
          ))}

          {/* Benchmark channel selector */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-medium" style={{ color: 'var(--t3)' }}>Comparar com canal</label>
            <select
              value={refChannel}
              onChange={e => setRefChannel(e.target.value)}
              className="w-full rounded-xl px-3 py-2 text-sm focus:outline-none"
              style={{ background: 'var(--s1)', border: '1px solid rgba(255,255,255,0.07)', color: 'var(--t1)' }}
            >
              {channels.filter(ch => ATTRIBUTION_MOCK[ch.key]).map(ch => (
                <option key={ch.key} value={ch.key}>{CHANNEL_LABELS[ch.key] ?? ch.key}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Results */}
        <div className="flex flex-col gap-3">
          <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--t3)' }}>Projeção</p>

          {[
            { label: 'Leads estimadas',       value: projLeads.toFixed(0),     unit: 'leads',   color: 'var(--cyan)'    },
            { label: 'Negócios fechados',      value: projClosed.toFixed(1),    unit: 'deals',   color: '#F5A623'        },
            { label: 'Receita projetada',      value: `€${projRevenue >= 1000 ? `${(projRevenue/1000).toFixed(1)}k` : projRevenue.toFixed(0)}`, unit: '', color: '#D1FF00' },
            { label: 'ROAS projetado',         value: `${projRoas.toFixed(2)}×`, unit: '',       color: projRoas >= benchRoas ? '#1EC87A' : '#E84545' },
            { label: 'ROI projetado',          value: `${projRoi.toFixed(1)}%`, unit: '',        color: projRoi >= 0 ? '#1EC87A' : '#E84545' },
          ].map(({ label, value, unit, color }) => (
            <div key={label} className="flex items-center justify-between rounded-xl px-3 py-2.5"
              style={{ background: 'var(--s1)' }}>
              <span className="text-xs" style={{ color: 'var(--t3)' }}>{label}</span>
              <span className="text-sm font-black tabular-nums" style={{ color }}>
                {value}{unit ? ` ${unit}` : ''}
              </span>
            </div>
          ))}

          {/* ROAS vs benchmark */}
          <div className="rounded-xl p-3 mt-1"
            style={{ background: isAhead ? 'rgba(30,200,122,0.08)' : 'rgba(232,69,69,0.08)', border: `1px solid ${isAhead ? 'rgba(30,200,122,0.2)' : 'rgba(232,69,69,0.2)'}` }}>
            <p className="text-[10px]" style={{ color: 'var(--t3)' }}>
              vs. {CHANNEL_LABELS[refChannel] ?? refChannel} benchmark ({benchRoas.toFixed(1)}× ROAS)
            </p>
            <p className="text-sm font-bold mt-0.5" style={{ color: isAhead ? '#1EC87A' : '#E84545' }}>
              {isAhead ? `+${roasGap.toFixed(2)}× acima` : `${roasGap.toFixed(2)}× abaixo`} do benchmark
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
