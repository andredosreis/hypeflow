'use client'

import React, { useState, useCallback, useEffect } from 'react'
import {
  Search, TrendingUp, TrendingDown, ExternalLink,
  Phone, MessageSquare, X, Plus, Upload, Download,
  RefreshCw, Kanban, BarChart2, Users, Euro,
  Check, ChevronRight, ArrowRight, Zap, LayoutGrid, List,
  AlertTriangle, Clock, ChevronDown,
  Eye, EyeOff, Send, Globe,
} from 'lucide-react'
import { PlatformIcon } from '@/components/icons/PlatformIcons'
import { api } from '@/lib/trpc/client'

/* ─────────────────────── types ─────────────────────── */

interface Client {
  id: string
  name: string
  logo: string
  niche: string
  mrr: number
  health_score: number
  active_leads: number
  closed_leads_month: number
  cpl: number
  cpl_change: number
  status: 'active' | 'at_risk' | 'churned'
  since: string
  manager: string
  channels: string[]
  phone?: string
  email?: string
}

interface PipelineLead {
  id: string
  name: string
  score: number
  temperature: 'cold' | 'warm' | 'hot'
  stage: string
  source: string
  last_contact: string
}

type PipelineStage = { id: string; name: string; color: string; leads: PipelineLead[] }

/* ─────────────────────── mock data ─────────────────────── */

const MOCK_CLIENTS: Client[] = [
  {
    id: 'c1', name: 'TechnoSpark Lda', logo: 'T', niche: 'SaaS B2B',
    mrr: 2400, health_score: 92, active_leads: 47, closed_leads_month: 12,
    cpl: 4.20, cpl_change: -8.3, status: 'active', since: '2023-06-01', manager: 'Dex Silva',
    channels: ['facebook', 'google_ads', 'linkedin'],
  },
  {
    id: 'c2', name: 'Clínica Estética Silva', logo: 'C', niche: 'Saúde & Beleza',
    mrr: 1800, health_score: 78, active_leads: 63, closed_leads_month: 9,
    cpl: 6.80, cpl_change: 12.1, status: 'active', since: '2023-09-15', manager: 'Quinn Costa',
    channels: ['instagram', 'tiktok', 'facebook'],
  },
  {
    id: 'c3', name: 'Imobiliária Horizonte', logo: 'I', niche: 'Imobiliário',
    mrr: 3200, health_score: 85, active_leads: 28, closed_leads_month: 6,
    cpl: 18.50, cpl_change: -3.2, status: 'active', since: '2023-03-20', manager: 'Dex Silva',
    channels: ['google_ads', 'facebook', 'linkedin'],
  },
  {
    id: 'c4', name: 'FitZone Gym', logo: 'F', niche: 'Fitness',
    mrr: 900, health_score: 41, active_leads: 15, closed_leads_month: 2,
    cpl: 9.30, cpl_change: 31.4, status: 'at_risk', since: '2024-01-10', manager: 'River Lopes',
    channels: ['instagram', 'tiktok'],
  },
  {
    id: 'c5', name: 'AutoPremium', logo: 'A', niche: 'Automóveis',
    mrr: 4100, health_score: 88, active_leads: 34, closed_leads_month: 15,
    cpl: 22.10, cpl_change: -5.7, status: 'active', since: '2022-11-01', manager: 'Quinn Costa',
    channels: ['google_ads', 'facebook', 'instagram'],
  },
  {
    id: 'c6', name: 'EduLearn Academy', logo: 'E', niche: 'Educação Online',
    mrr: 0, health_score: 0, active_leads: 0, closed_leads_month: 0,
    cpl: 0, cpl_change: 0, status: 'churned', since: '2023-07-05', manager: 'Dex Silva',
    channels: ['facebook'],
  },
]

function buildClientPipeline(clientId: string): PipelineStage[] {
  const bases: PipelineStage[] = [
    { id: 'novo', name: 'Nova', color: '#7FA8C4', leads: [] },
    { id: 'qualif', name: 'Qualificação', color: '#F5A623', leads: [] },
    { id: 'proposta', name: 'Proposta', color: '#21A0C4', leads: [] },
    { id: 'negociacao', name: 'Negociação', color: '#D1FF00', leads: [] },
    { id: 'fechado', name: 'Fechado', color: '#1EC87A', leads: [] },
  ]
  const names = ['João Silva', 'Ana Ferreira', 'Carlos Mendes', 'Sofia Lopes', 'Miguel Costa', 'Rita Oliveira', 'Pedro Santos']
  const sources = ['facebook', 'instagram', 'google', 'linkedin', 'tiktok']
  const seed = clientId.charCodeAt(clientId.length - 1)
  let idx = 0
  bases.forEach((stage, si) => {
    const count = [3, 4, 2, 2, 2][si] ?? 2
    for (let i = 0; i < count; i++) {
      stage.leads.push({
        id: `${clientId}-${stage.id}-${i}`,
        name: names[(idx + seed) % names.length]!,
        score: 30 + ((idx * 13 + seed * 7) % 65),
        temperature: (['cold', 'warm', 'hot'] as const)[(idx + si) % 3]!,
        stage: stage.id,
        source: sources[(idx + seed) % sources.length]!,
        last_contact: `${1 + (idx % 14)} dias atrás`,
      })
      idx++
    }
  })
  return bases
}

/* ─────────────────────── config ─────────────────────── */

const STATUS_CFG: Record<Client['status'], { label: string; color: string }> = {
  active:  { label: 'Activo',   color: '#1EC87A' },
  at_risk: { label: 'Em risco', color: '#F5A623' },
  churned: { label: 'Perdido',  color: '#E84545' },
}

const NICHE_COLORS: Record<string, string> = {
  'SaaS B2B': '#21A0C4', 'Saúde & Beleza': '#E8A838', 'Imobiliário': '#1EC87A',
  'Fitness': '#A855F7', 'Automóveis': '#F5A623', 'Educação Online': '#3D6080',
}

function healthColor(score: number) {
  if (score >= 80) return '#1EC87A'
  if (score >= 60) return '#F5A623'
  return '#E84545'
}

function HealthRing({ score }: { score: number }) {
  const r = 18, circ = 2 * Math.PI * r
  const color = healthColor(score)
  return (
    <div className="relative w-12 h-12">
      <svg viewBox="0 0 44 44" className="w-full h-full -rotate-90">
        <circle cx="22" cy="22" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="4" />
        <circle cx="22" cy="22" r={r} fill="none" stroke={color} strokeWidth="4"
          strokeDasharray={circ} strokeDashoffset={circ * (1 - score / 100)}
          strokeLinecap="round" />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-[10px] font-bold" style={{ color }}>{score}</span>
      </div>
    </div>
  )
}

/* ─────────────────────── pipeline mini-kanban ─────────────────────── */

const TEMP_COLORS: Record<string, string> = { cold: '#3D5570', warm: '#F5A623', hot: '#E84545' }

function ClientPipeline({ clientId }: { clientId: string }) {
  const [stages, setStages] = useState(() => buildClientPipeline(clientId))
  const [syncing, setSyncing] = useState(false)
  const [lastSync, setLastSync] = useState(new Date())
  const [dragging, setDragging] = useState<{ lead: PipelineLead; fromStage: string } | null>(null)
  const [dragOver, setDragOver] = useState<string | null>(null)

  // Auto-refresh every 30s (simulated)
  useEffect(() => {
    const interval = setInterval(() => {
      setLastSync(new Date())
    }, 30000)
    return () => clearInterval(interval)
  }, [])

  const refresh = () => {
    setSyncing(true)
    setTimeout(() => {
      setStages(buildClientPipeline(clientId))
      setLastSync(new Date())
      setSyncing(false)
    }, 800)
  }

  const moveLead = useCallback((lead: PipelineLead, toStageId: string) => {
    if (lead.stage === toStageId) return
    setSyncing(true)
    setStages(prev => {
      const next = prev.map(s => ({
        ...s,
        leads: s.leads.filter(l => l.id !== lead.id),
      }))
      const toStage = next.find(s => s.id === toStageId)
      if (toStage) toStage.leads.push({ ...lead, stage: toStageId })
      return [...next]
    })
    // Simulate sync pulse
    setTimeout(() => {
      setSyncing(false)
      setLastSync(new Date())
    }, 600)
  }, [])

  const onDragStart = (lead: PipelineLead, fromStage: string) => setDragging({ lead, fromStage })
  const onDrop = (toStageId: string) => {
    if (dragging) moveLead(dragging.lead, toStageId)
    setDragging(null)
    setDragOver(null)
  }

  const totalLeads = stages.reduce((s, st) => s + st.leads.length, 0)

  return (
    <div className="flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Kanban size={14} style={{ color: 'var(--cyan)' }} />
          <p className="text-xs font-semibold" style={{ color: 'var(--t2)' }}>{totalLeads} leads no pipeline</p>
          {syncing && (
            <div className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'var(--lime)' }} />
              <span className="text-[10px]" style={{ color: 'var(--lime)' }}>A sincronizar...</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px]" style={{ color: 'var(--t3)' }}>
            Última sync: {lastSync.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}
          </span>
          <button
            onClick={refresh}
            className="p-1.5 rounded-lg tonal-hover transition-all"
            style={{ color: syncing ? 'var(--lime)' : 'var(--t3)' }}
          >
            <RefreshCw size={12} className={syncing ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Kanban columns (horizontal scroll) */}
      <div className="flex gap-3 overflow-x-auto pb-2">
        {stages.map(stage => (
          <div
            key={stage.id}
            className="flex-shrink-0 flex flex-col rounded-xl overflow-hidden transition-all"
            style={{
              width: '180px',
              background: dragOver === stage.id ? 'rgba(33,160,196,0.08)' : 'var(--s1)',
              boxShadow: dragOver === stage.id ? 'inset 0 0 0 2px rgba(33,160,196,0.3)' : 'var(--shadow-card)',
            }}
            onDragOver={e => { e.preventDefault(); setDragOver(stage.id) }}
            onDragLeave={() => setDragOver(null)}
            onDrop={() => onDrop(stage.id)}
          >
            {/* Stage header */}
            <div className="flex items-center justify-between px-3 py-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: stage.color }} />
                <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--t2)' }}>{stage.name}</span>
              </div>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: 'var(--s2)', color: 'var(--t3)' }}>
                {stage.leads.length}
              </span>
            </div>

            {/* Cards */}
            <div className="flex flex-col gap-1.5 p-2 min-h-[120px]">
              {stage.leads.map(lead => (
                <div
                  key={lead.id}
                  draggable
                  onDragStart={() => onDragStart(lead, stage.id)}
                  className="rounded-xl p-2.5 cursor-grab active:cursor-grabbing transition-all tonal-hover"
                  style={{
                    background: 'var(--s2)',
                    borderLeft: `3px solid ${TEMP_COLORS[lead.temperature] ?? 'var(--t3)'}`,
                    opacity: dragging?.lead.id === lead.id ? 0.4 : 1,
                  }}
                >
                  <p className="text-[11px] font-semibold leading-snug" style={{ color: 'var(--t1)' }}>{lead.name}</p>
                  <div className="flex items-center justify-between mt-1.5">
                    <PlatformIcon platform={lead.source} size={14} />
                    <span className="text-[10px] font-bold" style={{ color: lead.score >= 70 ? '#1EC87A' : lead.score >= 50 ? '#F5A623' : 'var(--t3)' }}>
                      {lead.score}
                    </span>
                  </div>
                </div>
              ))}
              {stage.leads.length === 0 && (
                <div className="flex items-center justify-center h-20">
                  <p className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--t3)' }}>Arrastar aqui</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Quick move buttons */}
      <div className="flex gap-2 flex-wrap">
        {stages.map(stage => (
          <button
            key={stage.id}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-semibold tonal-hover transition-colors"
            style={{ background: 'var(--s2)', color: 'var(--t2)', borderLeft: `3px solid ${stage.color}` }}
          >
            <span>{stage.name}</span>
            <span style={{ color: stage.color }}>{stage.leads.length}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

/* ─────────────────────── import modal ─────────────────────── */

function ImportModal({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState<'upload' | 'done'>('upload')
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}>
      <div className="w-full max-w-md rounded-2xl flex flex-col overflow-hidden" style={{ background: 'var(--s1)', boxShadow: 'var(--shadow-float)' }}>
        <div className="flex items-center justify-between p-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <p className="text-sm font-bold" style={{ color: 'var(--t1)' }}>Importar Clientes</p>
          <button onClick={onClose} className="tonal-hover p-1.5 rounded-lg" style={{ color: 'var(--t3)' }}><X size={14} /></button>
        </div>
        <div className="p-5 flex flex-col gap-4">
          {step === 'upload' ? (
            <>
              <div
                onClick={() => setStep('done')}
                className="border-2 border-dashed rounded-2xl p-8 flex flex-col items-center gap-3 cursor-pointer transition-all"
                style={{ borderColor: 'rgba(33,160,196,0.3)', background: 'rgba(33,160,196,0.04)' }}
              >
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(33,160,196,0.1)' }}>
                  <Upload size={20} style={{ color: 'var(--cyan)' }} />
                </div>
                <p className="text-sm font-semibold" style={{ color: 'var(--t1)' }}>Clique para seleccionar CSV</p>
                <p className="text-xs" style={{ color: 'var(--t3)' }}>nome, niche, mrr, gestor, estado</p>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center gap-3 py-6">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(0,229,160,0.1)' }}>
                <Check size={24} style={{ color: 'var(--success)' }} />
              </div>
              <p className="text-sm font-bold" style={{ color: 'var(--t1)' }}>6 clientes importados com sucesso!</p>
            </div>
          )}
        </div>
        <div className="p-5 pt-0">
          <button onClick={onClose} className="w-full py-2.5 rounded-xl text-sm font-semibold tonal-hover" style={{ background: 'var(--s2)', color: 'var(--t2)' }}>
            {step === 'done' ? 'Fechar' : 'Cancelar'}
          </button>
        </div>
      </div>
    </div>
  )
}

function exportClientsCSV(clients: Client[]) {
  const headers = ['Nome', 'Sector', 'MRR', 'Saúde', 'Leads Activas', 'CPL', 'Gestor', 'Estado', 'Cliente desde']
  const rows = clients.map(c => [
    c.name, c.niche, c.mrr, c.health_score, c.active_leads, c.cpl.toFixed(2), c.manager, c.status,
    new Date(c.since).toLocaleDateString('pt-PT'),
  ])
  const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url  = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href = url; a.download = 'clientes.csv'; a.click()
  URL.revokeObjectURL(url)
}

/* ─────────────────────── client panel ─────────────────────── */

// Portal tokens are now random opaque strings stored hashed in the
// `portal_tokens` table. The raw value is generated server-side via
// `api.admin.portalTokens.generate` and shown to the agency user once.
// See story 01.13 / audit C5.

/* ─── Door (F05) types ─── */
interface Door { id: string; label: string; url: string; favicon?: string }

const DOOR_PRESETS: { label: string; icon: string }[] = [
  { label: 'Google Analytics', icon: '📊' },
  { label: 'Meta Ads Manager', icon: '📘' },
  { label: 'Google Ads',       icon: '🔍' },
  { label: 'Google Drive',     icon: '📁' },
  { label: 'LinkedIn Ads',     icon: '💼' },
  { label: 'Landing Page',     icon: '🌐' },
  { label: 'Site do Cliente',  icon: '🏠' },
  { label: 'Notion',           icon: '📝' },
]

/* ─── Message Board (F11) types ─── */
interface BoardThread {
  id: string; subject: string; type: 'briefing' | 'aprovacao' | 'relatorio' | 'estrategia' | 'outro'
  body: string; author: string; created_at: string; replies: number; visible_to_client: boolean
}

const BOARD_TYPE_CFG = {
  briefing:   { label: 'Briefing',   color: '#21A0C4' },
  aprovacao:  { label: 'Aprovação',  color: '#F5A623' },
  relatorio:  { label: 'Relatório',  color: '#00E5A0' },
  estrategia: { label: 'Estratégia', color: '#D1FF00' },
  outro:      { label: 'Outro',      color: '#7FA8C4' },
} as const

const MOCK_THREADS: BoardThread[] = [
  { id: 'bt1', subject: 'Estratégia Q2 2026', type: 'estrategia', body: 'Proponho aumentar o orçamento em Meta em 20% com foco em lookalike audiences. Qual a vossa opinião?', author: 'Dex Silva', created_at: '2026-04-10', replies: 2, visible_to_client: true },
  { id: 'bt2', subject: 'Briefing Campanha Primavera', type: 'briefing', body: 'Partilho o briefing da campanha de Primavera para aprovação.', author: 'Dex Silva', created_at: '2026-04-05', replies: 0, visible_to_client: false },
  { id: 'bt3', subject: 'Relatório Março 2026', type: 'relatorio', body: 'Relatório mensal em anexo. Mês excelente — superámos a meta em 12%.', author: 'Dex Silva', created_at: '2026-04-01', replies: 1, visible_to_client: true },
]

const MOCK_DOORS: Door[] = [
  { id: 'd1', label: 'Meta Ads Manager',  url: 'https://business.facebook.com',    favicon: '📘' },
  { id: 'd2', label: 'Google Analytics',  url: 'https://analytics.google.com',      favicon: '📊' },
  { id: 'd3', label: 'Google Drive',      url: 'https://drive.google.com',          favicon: '📁' },
]

type PanelTab = 'overview' | 'pipeline' | 'mensagens' | 'recursos'

function ClientPanel({ client, onClose }: { client: Client; onClose: () => void }) {
  const [panelTab, setPanelTab] = useState<PanelTab>('overview')
  const [copied, setCopied] = useState(false)
  const [threads, setThreads] = useState<BoardThread[]>(MOCK_THREADS)
  const [doors, setDoors]     = useState<Door[]>(MOCK_DOORS)
  const [newDoorLabel, setNewDoorLabel] = useState('')
  const [newDoorUrl, setNewDoorUrl]     = useState('')
  const [showNewThread, setShowNewThread] = useState(false)
  const [ntSubject, setNtSubject] = useState('')
  const [ntBody, setNtBody]       = useState('')
  const [ntType, setNtType]       = useState<BoardThread['type']>('outro')
  const [ntVisible, setNtVisible] = useState(false)

  // Portal token: only the just-generated raw value lives in client state.
  // Once dismissed, only the hash remains in DB.
  const [latestToken, setLatestToken] = useState<{ id: string; rawToken: string; expiresAt: string } | null>(null)
  const tokensQuery = api.admin.portalTokens.list.useQuery(
    { clientId: client.id },
    { enabled: typeof client.id === 'string' && /^[0-9a-f-]{36}$/i.test(client.id) },
  )
  const generateMutation = api.admin.portalTokens.generate.useMutation({
    onSuccess: (res) => {
      setLatestToken(res)
      tokensQuery.refetch()
    },
  })
  const revokeMutation = api.admin.portalTokens.revoke.useMutation({
    onSuccess: () => tokensQuery.refetch(),
  })

  const portalUrl = latestToken && typeof window !== 'undefined'
    ? `${window.location.origin}/portal/${latestToken.rawToken}`
    : null

  const copyPortalLink = () => {
    if (!portalUrl) return
    navigator.clipboard.writeText(portalUrl).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }
  const st = STATUS_CFG[client.status]

  return (
    <div className="w-[520px] flex-shrink-0 flex flex-col animate-slide-in" style={{ background: 'var(--s1)', borderLeft: '1px solid rgba(255,255,255,0.04)' }}>
      {/* Header */}
      <div className="flex items-start justify-between p-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold"
            style={{ background: `${NICHE_COLORS[client.niche] ?? '#21A0C4'}18`, color: NICHE_COLORS[client.niche] ?? '#21A0C4' }}
          >
            {client.logo}
          </div>
          <div>
            <h3 className="font-semibold text-base" style={{ color: 'var(--t1)' }}>{client.name}</h3>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[10px] font-bold" style={{ color: NICHE_COLORS[client.niche] ?? '#7FA8C4' }}>{client.niche}</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold" style={{ background: `${st.color}18`, color: st.color }}>
                {st.label}
              </span>
            </div>
          </div>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg tonal-hover" style={{ color: 'var(--t3)' }}>
          <X size={14} />
        </button>
      </div>

      {/* Tab nav */}
      <div className="flex px-5 pt-3 gap-1" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
        {([
          { id: 'overview',  label: 'Visão Geral', icon: BarChart2     },
          { id: 'pipeline',  label: 'Pipeline',    icon: Kanban        },
          { id: 'mensagens', label: 'Mensagens',   icon: MessageSquare },
          { id: 'recursos',  label: 'Recursos',    icon: Globe         },
        ] as { id: PanelTab; label: string; icon: React.ElementType }[]).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setPanelTab(id)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-t-lg transition-all"
            style={{
              color: panelTab === id ? 'var(--cyan)' : 'var(--t3)',
              borderBottom: panelTab === id ? '2px solid var(--cyan)' : '2px solid transparent',
            }}
          >
            <Icon size={12} />
            {label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-5">
        {panelTab === 'overview' && (
          <div className="flex flex-col gap-5">
            {/* KPI row */}
            <div className="grid grid-cols-4 gap-3">
              {[
                { label: 'MRR', value: client.mrr > 0 ? `€${client.mrr.toLocaleString()}` : '—', color: 'var(--cyan)' },
                { label: 'Health', value: String(client.health_score), color: healthColor(client.health_score) },
                { label: 'Leads', value: String(client.active_leads), color: 'var(--t1)' },
                { label: 'CPL', value: client.cpl > 0 ? `€${client.cpl.toFixed(2)}` : '—', color: '#F5A623' },
              ].map(({ label, value, color }) => (
                <div key={label} className="rounded-xl p-3 text-center" style={{ background: 'var(--s2)' }}>
                  <p className="num-md" style={{ color }}>{value}</p>
                  <p className="text-[10px] mt-1" style={{ color: 'var(--t3)' }}>{label}</p>
                </div>
              ))}
            </div>

            {/* Health ring + details */}
            <div className="rounded-xl p-4 flex items-center gap-4" style={{ background: 'var(--s2)' }}>
              <HealthRing score={client.health_score} />
              <div className="flex-1">
                <p className="text-xs font-semibold" style={{ color: 'var(--t1)' }}>Saúde da Conta</p>
                <div className="flex gap-4 mt-2">
                  {[
                    { label: 'Fechados/mês', value: client.closed_leads_month },
                    { label: 'Gestor', value: client.manager },
                  ].map(({ label, value }) => (
                    <div key={label}>
                      <p className="text-[10px]" style={{ color: 'var(--t3)' }}>{label}</p>
                      <p className="text-xs font-semibold" style={{ color: 'var(--t1)' }}>{value}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                {client.cpl_change < 0
                  ? <TrendingDown size={14} style={{ color: 'var(--success)' }} />
                  : <TrendingUp size={14} style={{ color: 'var(--danger)' }} />}
                <span className="text-sm font-bold" style={{ color: client.cpl_change < 0 ? 'var(--success)' : 'var(--danger)' }}>
                  {client.cpl_change > 0 ? '+' : ''}{client.cpl_change.toFixed(1)}% CPL
                </span>
              </div>
            </div>

            {/* Channels */}
            <div>
              <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--t3)' }}>Canais activos</p>
              <div className="flex gap-2">
                {client.channels.map(ch => (
                  <div key={ch} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl" style={{ background: 'var(--s2)' }}>
                    <PlatformIcon platform={ch} size={18} />
                    <span className="text-xs capitalize" style={{ color: 'var(--t2)' }}>{ch.replace('_', ' ')}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Client Portal section — story 01.13 / audit C5 */}
            <div className="rounded-xl p-3 flex flex-col gap-2" style={{ background: 'var(--s2)', border: '1px solid rgba(33,160,196,0.15)' }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ExternalLink size={13} style={{ color: 'var(--cyan)' }} />
                  <span className="text-xs font-bold" style={{ color: 'var(--t1)' }}>Portal do Cliente</span>
                </div>
                <button
                  onClick={() => generateMutation.mutate({ clientId: client.id })}
                  disabled={generateMutation.isPending}
                  className="text-[10px] font-bold px-2.5 py-1 rounded-lg transition-all"
                  style={{ background: 'rgba(33,160,196,0.12)', color: 'var(--cyan)' }}
                >
                  {generateMutation.isPending ? 'A gerar…' : 'Gerar token'}
                </button>
              </div>

              {latestToken && portalUrl && (
                <div className="flex flex-col gap-1.5 mt-1 p-2 rounded-lg" style={{ background: 'rgba(33,160,196,0.08)', border: '1px solid rgba(33,160,196,0.25)' }}>
                  <p className="text-[10px] font-bold" style={{ color: 'var(--cyan)' }}>
                    ⚠ Token mostrado uma única vez — copia agora
                  </p>
                  <p className="text-[10px] font-mono break-all px-2 py-1.5 rounded-lg" style={{ background: 'var(--s3)', color: 'var(--t1)' }}>
                    {portalUrl}
                  </p>
                  <div className="flex gap-1.5">
                    <button
                      onClick={copyPortalLink}
                      className="flex-1 text-[10px] font-bold px-2 py-1 rounded-lg"
                      style={{ background: copied ? 'rgba(0,229,160,0.15)' : 'rgba(33,160,196,0.18)', color: copied ? 'var(--success)' : 'var(--cyan)' }}
                    >
                      {copied ? '✓ Copiado' : 'Copiar URL'}
                    </button>
                    <button
                      onClick={() => setLatestToken(null)}
                      className="text-[10px] font-semibold px-2 py-1 rounded-lg tonal-hover"
                      style={{ color: 'var(--t3)' }}
                    >
                      Já guardei
                    </button>
                  </div>
                  <p className="text-[10px]" style={{ color: 'var(--t3)' }}>
                    Expira em {new Date(latestToken.expiresAt).toLocaleDateString('pt-PT')}
                  </p>
                </div>
              )}

              {/* Active tokens list */}
              {tokensQuery.data && tokensQuery.data.length > 0 && (
                <div className="flex flex-col gap-1 mt-1">
                  <p className="text-[9px] font-bold uppercase tracking-wider" style={{ color: 'var(--t3)' }}>
                    Tokens activos
                  </p>
                  {tokensQuery.data
                    .filter(t => !t.revoked_at && new Date(t.expires_at) > new Date())
                    .map(t => (
                      <div key={t.id} className="flex items-center justify-between p-1.5 rounded-lg" style={{ background: 'var(--s3)' }}>
                        <div className="flex flex-col">
                          <span className="text-[10px] font-semibold" style={{ color: 'var(--t1)' }}>
                            {t.label ?? 'Sem etiqueta'}
                          </span>
                          <span className="text-[9px]" style={{ color: 'var(--t3)' }}>
                            Expira {new Date(t.expires_at).toLocaleDateString('pt-PT')}
                            {t.last_used_at && ` · usado ${new Date(t.last_used_at).toLocaleDateString('pt-PT')}`}
                          </span>
                        </div>
                        <button
                          onClick={() => revokeMutation.mutate({ tokenId: t.id })}
                          disabled={revokeMutation.isPending}
                          className="text-[9px] font-bold px-2 py-0.5 rounded-lg"
                          style={{ background: 'rgba(232,69,69,0.12)', color: 'var(--danger)' }}
                        >
                          Revogar
                        </button>
                      </div>
                    ))}
                </div>
              )}

              <p className="text-[10px]" style={{ color: 'var(--t3)' }}>
                Acesso read-only · sem login · TTL 30 dias · revogável
              </p>
            </div>

            {/* Details */}
            <div className="flex flex-col gap-2">
              {[
                { label: 'Cliente desde', value: new Date(client.since).toLocaleDateString('pt-PT') },
                { label: 'Estado', value: st.label },
                { label: 'Gestor de conta', value: client.manager },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between py-1.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                  <span className="text-xs" style={{ color: 'var(--t3)' }}>{label}</span>
                  <span className="text-xs font-semibold" style={{ color: 'var(--t1)' }}>{value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {panelTab === 'pipeline' && (
          <ClientPipeline clientId={client.id} />
        )}

        {/* ── F11 Message Board ── */}
        {panelTab === 'mensagens' && (
          <div className="flex flex-col gap-4">
            {/* Header */}
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--t3)' }}>
                {threads.length} tópico{threads.length !== 1 ? 's' : ''}
              </p>
              <button
                onClick={() => setShowNewThread(v => !v)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
                style={{ background: showNewThread ? 'rgba(33,160,196,0.12)' : 'var(--s2)', color: 'var(--cyan)' }}
              >
                <Plus size={12} />
                {showNewThread ? 'Cancelar' : 'Novo tópico'}
              </button>
            </div>

            {/* New thread form */}
            {showNewThread && (
              <div className="rounded-xl p-4 flex flex-col gap-3" style={{ background: 'var(--s2)', border: '1px solid rgba(33,160,196,0.12)' }}>
                <input
                  type="text"
                  placeholder="Assunto"
                  value={ntSubject}
                  onChange={e => setNtSubject(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs outline-none"
                  style={{ background: 'var(--s3)', color: 'var(--t1)', border: '1px solid rgba(255,255,255,0.06)' }}
                />
                {/* Type selector */}
                <div className="flex gap-2 flex-wrap">
                  {(Object.entries(BOARD_TYPE_CFG) as [BoardThread['type'], { label: string; color: string }][]).map(([key, cfg]) => (
                    <button
                      key={key}
                      onClick={() => setNtType(key)}
                      className="px-2.5 py-1 rounded-full text-[10px] font-bold transition-all"
                      style={{
                        background: ntType === key ? `${cfg.color}20` : 'var(--s3)',
                        color: ntType === key ? cfg.color : 'var(--t3)',
                        border: ntType === key ? `1px solid ${cfg.color}40` : '1px solid transparent',
                      }}
                    >
                      {cfg.label}
                    </button>
                  ))}
                </div>
                <textarea
                  rows={3}
                  placeholder="Escreve a mensagem..."
                  value={ntBody}
                  onChange={e => setNtBody(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs outline-none resize-none"
                  style={{ background: 'var(--s3)', color: 'var(--t1)', border: '1px solid rgba(255,255,255,0.06)' }}
                />
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => setNtVisible(v => !v)}
                    className="flex items-center gap-1.5 text-[10px]"
                    style={{ color: ntVisible ? 'var(--cyan)' : 'var(--t3)' }}
                  >
                    {ntVisible ? <Eye size={12} /> : <EyeOff size={12} />}
                    {ntVisible ? 'Visível ao cliente' : 'Apenas interna'}
                  </button>
                  <button
                    disabled={!ntSubject.trim() || !ntBody.trim()}
                    onClick={() => {
                      if (!ntSubject.trim() || !ntBody.trim()) return
                      const newThread: BoardThread = {
                        id: `bt${Date.now()}`,
                        subject: ntSubject,
                        type: ntType,
                        body: ntBody,
                        author: 'Eu',
                        created_at: new Date().toISOString().slice(0, 10),
                        replies: 0,
                        visible_to_client: ntVisible,
                      }
                      setThreads(prev => [newThread, ...prev])
                      setNtSubject('')
                      setNtBody('')
                      setNtType('outro')
                      setNtVisible(false)
                      setShowNewThread(false)
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-semibold transition-all"
                    style={{
                      background: 'rgba(33,160,196,0.15)',
                      color: 'var(--cyan)',
                      opacity: !ntSubject.trim() || !ntBody.trim() ? 0.4 : 1,
                      cursor: !ntSubject.trim() || !ntBody.trim() ? 'not-allowed' : 'pointer',
                    }}
                  >
                    <Send size={11} />
                    Publicar
                  </button>
                </div>
              </div>
            )}

            {/* Thread list */}
            <div className="flex flex-col gap-2">
              {threads.map(t => {
                const cfg = BOARD_TYPE_CFG[t.type]
                return (
                  <div
                    key={t.id}
                    className="rounded-xl p-3 flex flex-col gap-2"
                    style={{ background: 'var(--s2)' }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span
                          className="text-[9px] font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                          style={{ background: `${cfg.color}18`, color: cfg.color }}
                        >
                          {cfg.label}
                        </span>
                        <p className="text-xs font-semibold truncate" style={{ color: 'var(--t1)' }}>{t.subject}</p>
                      </div>
                      {t.visible_to_client && (
                        <Eye size={11} style={{ color: 'var(--cyan)', flexShrink: 0, marginTop: 2 }} />
                      )}
                    </div>
                    <p className="text-[11px] leading-relaxed" style={{ color: 'var(--t2)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{t.body}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px]" style={{ color: 'var(--t3)' }}>{t.author} · {t.created_at}</span>
                      {t.replies > 0 && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: 'var(--s3)', color: 'var(--t3)' }}>
                          {t.replies} resposta{t.replies !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ── F05 Doors / Recursos ── */}
        {panelTab === 'recursos' && (
          <div className="flex flex-col gap-5">
            {/* Quick preset chips */}
            <div>
              <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--t3)' }}>Adicionar porta rápida</p>
              <div className="flex flex-wrap gap-2">
                {DOOR_PRESETS.map(preset => {
                  const added = doors.some(d => d.label === preset.label)
                  return (
                    <button
                      key={preset.label}
                      onClick={() => {
                        if (added) return
                        setNewDoorLabel(preset.label)
                      }}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-semibold tonal-hover transition-all"
                      style={{
                        background: added ? 'rgba(0,229,160,0.08)' : 'var(--s2)',
                        color: added ? 'var(--success)' : 'var(--t2)',
                        cursor: added ? 'default' : 'pointer',
                      }}
                    >
                      <span>{preset.icon}</span>
                      {preset.label}
                      {added && <Check size={10} />}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Custom door form */}
            <div className="rounded-xl p-3 flex flex-col gap-2" style={{ background: 'var(--s2)' }}>
              <p className="text-xs font-semibold" style={{ color: 'var(--t2)' }}>Porta personalizada</p>
              <input
                type="text"
                placeholder="Nome (ex: Landing Page)"
                value={newDoorLabel}
                onChange={e => setNewDoorLabel(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-xs outline-none"
                style={{ background: 'var(--s3)', color: 'var(--t1)', border: '1px solid rgba(255,255,255,0.06)' }}
              />
              <input
                type="url"
                placeholder="URL (https://…)"
                value={newDoorUrl}
                onChange={e => setNewDoorUrl(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-xs outline-none"
                style={{ background: 'var(--s3)', color: 'var(--t1)', border: '1px solid rgba(255,255,255,0.06)' }}
              />
              <button
                disabled={!newDoorLabel.trim() || !newDoorUrl.trim()}
                onClick={() => {
                  if (!newDoorLabel.trim() || !newDoorUrl.trim()) return
                  setDoors(prev => [
                    ...prev,
                    { id: `d${Date.now()}`, label: newDoorLabel.trim(), url: newDoorUrl.trim(), favicon: '🔗' },
                  ])
                  setNewDoorLabel('')
                  setNewDoorUrl('')
                }}
                className="flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-all"
                style={{
                  background: 'rgba(33,160,196,0.12)',
                  color: 'var(--cyan)',
                  opacity: !newDoorLabel.trim() || !newDoorUrl.trim() ? 0.4 : 1,
                  cursor: !newDoorLabel.trim() || !newDoorUrl.trim() ? 'not-allowed' : 'pointer',
                }}
              >
                <Plus size={12} />
                Adicionar
              </button>
            </div>

            {/* Doors list */}
            <div>
              <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--t3)' }}>
                {doors.length} porta{doors.length !== 1 ? 's' : ''} activa{doors.length !== 1 ? 's' : ''}
              </p>
              <div className="flex flex-col gap-2">
                {doors.map(door => (
                  <div
                    key={door.id}
                    className="flex items-center gap-3 p-3 rounded-xl"
                    style={{ background: 'var(--s2)' }}
                  >
                    <span className="text-lg flex-shrink-0">{door.favicon ?? '🔗'}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold truncate" style={{ color: 'var(--t1)' }}>{door.label}</p>
                      <p className="text-[10px] truncate" style={{ color: 'var(--t3)' }}>{door.url}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <a
                        href={door.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded-lg tonal-hover"
                        style={{ color: 'var(--cyan)' }}
                      >
                        <ExternalLink size={12} />
                      </a>
                      <button
                        onClick={() => setDoors(prev => prev.filter(d => d.id !== door.id))}
                        className="p-1.5 rounded-lg tonal-hover"
                        style={{ color: 'var(--t3)' }}
                      >
                        <X size={12} />
                      </button>
                    </div>
                  </div>
                ))}
                {doors.length === 0 && (
                  <p className="text-xs text-center py-6" style={{ color: 'var(--t3)' }}>Nenhuma porta adicionada</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="p-4 grid grid-cols-3 gap-2" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
        {latestToken && portalUrl ? (
          <a
            href={portalUrl}
            target="_blank"
            rel="noreferrer"
            className="flex flex-col items-center gap-1.5 p-3 rounded-xl tonal-hover transition-all"
            style={{ background: 'var(--s2)' }}
          >
            <ExternalLink size={15} style={{ color: 'var(--cyan)' }} />
            <span className="text-[9px] font-semibold" style={{ color: 'var(--t3)' }}>Portal</span>
          </a>
        ) : (
          <button
            onClick={() => generateMutation.mutate({ clientId: client.id })}
            disabled={generateMutation.isPending}
            className="flex flex-col items-center gap-1.5 p-3 rounded-xl tonal-hover transition-all"
            style={{ background: 'var(--s2)', opacity: generateMutation.isPending ? 0.6 : 1 }}
          >
            <ExternalLink size={15} style={{ color: 'var(--cyan)' }} />
            <span className="text-[9px] font-semibold" style={{ color: 'var(--t3)' }}>
              {generateMutation.isPending ? 'A gerar…' : 'Gerar Portal'}
            </span>
          </button>
        )}
        <a
          href={client.phone ? `tel:${client.phone}` : undefined}
          onClick={!client.phone ? (e) => e.preventDefault() : undefined}
          className="flex flex-col items-center gap-1.5 p-3 rounded-xl tonal-hover transition-all"
          style={{ background: 'var(--s2)', opacity: client.phone ? 1 : 0.4, cursor: client.phone ? 'pointer' : 'default' }}
        >
          <Phone size={15} style={{ color: 'var(--success)' }} />
          <span className="text-[9px] font-semibold" style={{ color: 'var(--t3)' }}>Ligar</span>
        </a>
        <a
          href={client.phone ? `https://wa.me/${client.phone.replace(/\D/g, '')}` : undefined}
          target="_blank"
          rel="noopener noreferrer"
          onClick={!client.phone ? (e) => e.preventDefault() : undefined}
          className="flex flex-col items-center gap-1.5 p-3 rounded-xl tonal-hover transition-all"
          style={{ background: 'var(--s2)', opacity: client.phone ? 1 : 0.4, cursor: client.phone ? 'pointer' : 'default' }}
        >
          <MessageSquare size={15} style={{ color: '#25D366' }} />
          <span className="text-[9px] font-semibold" style={{ color: 'var(--t3)' }}>WhatsApp</span>
        </a>
      </div>
    </div>
  )
}

/* ─────────────────────── mission control ─────────────────────── */

const NEXT_ACTIONS: Record<string, string> = {
  c1: 'Enviar relatório de Abril',
  c2: 'Call de estratégia — esta semana',
  c3: 'Proposta de upsell por enviar',
  c4: 'Reunião de recuperação urgente',
  c5: 'Revisão de performance Q1',
  c6: 'Reactivação — sem contacto há 45 dias',
}

function MissionControlGrid({
  clients,
  onSelect,
}: {
  clients: Client[]
  onSelect: (c: Client) => void
}) {
  const sorted = [...clients].sort((a, b) => {
    const statusOrder = { at_risk: 0, churned: 1, active: 2 }
    if (statusOrder[a.status] !== statusOrder[b.status])
      return statusOrder[a.status] - statusOrder[b.status]
    return a.health_score - b.health_score
  })

  return (
    <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
      {sorted.map(client => {
        const st   = STATUS_CFG[client.status]
        const hc   = healthColor(client.health_score)
        const next = NEXT_ACTIONS[client.id] ?? 'Sem acção pendente'
        const isRisk = client.status === 'at_risk'

        return (
          <button
            key={client.id}
            onClick={() => onSelect(client)}
            className="text-left rounded-2xl flex flex-col gap-3 p-4 transition-all tonal-hover"
            style={{
              background: 'var(--s1)',
              boxShadow: isRisk
                ? '0 0 0 1.5px rgba(245,166,35,0.35)'
                : '0 1px 4px rgba(0,0,0,0.2)',
            }}
          >
            {/* Top row: avatar + name + status */}
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0"
                style={{ background: `${NICHE_COLORS[client.niche] ?? '#21A0C4'}18`, color: NICHE_COLORS[client.niche] ?? '#21A0C4' }}
              >
                {client.logo}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate" style={{ color: 'var(--t1)' }}>{client.name}</p>
                <p className="text-[10px] truncate" style={{ color: 'var(--t3)' }}>{client.niche}</p>
              </div>
              <span
                className="text-[9px] font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                style={{ background: `${st.color}18`, color: st.color }}
              >
                {st.label}
              </span>
            </div>

            {/* Health bar */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px]" style={{ color: 'var(--t3)' }}>Health Score</span>
                <span className="text-[11px] font-bold" style={{ color: hc }}>{client.health_score}</span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--s3)' }}>
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${client.health_score}%`, background: hc }}
                />
              </div>
            </div>

            {/* MRR + trend */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px]" style={{ color: 'var(--t3)' }}>MRR</p>
                <p className="text-sm font-bold" style={{ color: 'var(--cyan)' }}>
                  {client.mrr > 0 ? `€${client.mrr.toLocaleString()}` : '—'}
                </p>
              </div>
              <div className="flex items-center gap-1">
                {client.cpl_change < 0
                  ? <TrendingDown size={13} style={{ color: 'var(--success)' }} />
                  : <TrendingUp size={13} style={{ color: 'var(--danger)' }} />}
                <span className="text-[11px] font-semibold" style={{ color: client.cpl_change < 0 ? 'var(--success)' : 'var(--danger)' }}>
                  {Math.abs(client.cpl_change).toFixed(1)}%
                </span>
              </div>
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold" style={{ background: 'var(--s3)', color: 'var(--t2)' }}>
                {client.manager.split(' ').map(n => n[0]).join('').slice(0, 2)}
              </div>
            </div>

            {/* Next action */}
            <div
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl"
              style={{ background: isRisk ? 'rgba(245,166,35,0.08)' : 'var(--s2)' }}
            >
              {isRisk
                ? <AlertTriangle size={10} style={{ color: '#F5A623', flexShrink: 0 }} />
                : <Clock size={10} style={{ color: 'var(--t3)', flexShrink: 0 }} />}
              <p className="text-[10px] truncate" style={{ color: isRisk ? '#F5A623' : 'var(--t3)' }}>{next}</p>
            </div>
          </button>
        )
      })}
    </div>
  )
}

/* ─────────────────────── main page ─────────────────────── */

export default function ClientesPage() {
  const [search, setSearch]         = useState('')
  const [statusFilter, setStatusFilter] = useState<Client['status'] | 'all'>('all')
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [showImport, setShowImport] = useState(false)
  const [searchFocus, setSearchFocus] = useState(false)
  const [viewMode, setViewMode]     = useState<'list' | 'mission'>('list')

  const filtered = MOCK_CLIENTS.filter(c => {
    const matchSearch = !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.niche.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'all' || c.status === statusFilter
    return matchSearch && matchStatus
  })

  const totalMRR = MOCK_CLIENTS.filter(c => c.status !== 'churned').reduce((s, c) => s + c.mrr, 0)
  const atRisk   = MOCK_CLIENTS.filter(c => c.status === 'at_risk').length
  const active   = MOCK_CLIENTS.filter(c => c.status === 'active').length

  return (
    <>
      {showImport && <ImportModal onClose={() => setShowImport(false)} />}

      <div className="flex h-full gap-0 overflow-hidden animate-fade-in">
        {/* Main panel */}
        <div className="flex-1 flex flex-col gap-5 min-w-0 overflow-hidden">

          {/* Header */}
          <div className="flex items-end justify-between">
            <div>
              <p className="tag-label mb-1">AGÊNCIA · {filtered.length} CLIENTES</p>
              <h1 className="page-title">Clientes</h1>
              <p className="text-sm mt-1" style={{ color: 'var(--t2)' }}>
                €{totalMRR.toLocaleString()}/mês
                {atRisk > 0 && <span style={{ color: '#F5A623' }} className="ml-2">· {atRisk} em risco</span>}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowImport(true)}
                className="flex items-center gap-2 text-xs font-semibold px-4 py-2.5 rounded-xl tonal-hover"
                style={{ background: 'var(--s1)', color: 'var(--t2)' }}
              >
                <Upload size={13} /> Importar
              </button>
              <button
                onClick={() => exportClientsCSV(filtered)}
                className="flex items-center gap-2 text-xs font-semibold px-4 py-2.5 rounded-xl tonal-hover"
                style={{ background: 'var(--s1)', color: 'var(--t2)' }}
              >
                <Download size={13} /> Exportar CSV
              </button>
              {/* View mode toggle */}
              <div className="flex rounded-xl overflow-hidden" style={{ background: 'var(--s1)' }}>
                <button
                  onClick={() => setViewMode('list')}
                  title="Vista de tabela"
                  className="p-2.5 transition-colors"
                  style={{ background: viewMode === 'list' ? 'var(--s3)' : 'transparent', color: viewMode === 'list' ? 'var(--t1)' : 'var(--t3)' }}
                >
                  <List size={14} />
                </button>
                <button
                  onClick={() => setViewMode('mission')}
                  title="Mission Control"
                  className="p-2.5 transition-colors"
                  style={{ background: viewMode === 'mission' ? 'rgba(33,160,196,0.15)' : 'transparent', color: viewMode === 'mission' ? 'var(--cyan)' : 'var(--t3)' }}
                >
                  <LayoutGrid size={14} />
                </button>
              </div>
              <button
                onClick={() => setShowImport(true)}
                className="btn-lime flex items-center gap-2 px-5 py-2.5 text-sm rounded-xl"
              >
                <Plus size={14} /> Novo Cliente
              </button>
            </div>
          </div>

          {/* KPI cards */}
          <div className="grid grid-cols-4 gap-4">
            {[
              { label: 'MRR Total',    value: `€${totalMRR.toLocaleString()}`, icon: Euro,    color: 'var(--cyan)' },
              { label: 'Activos',      value: String(active),                   icon: Users,   color: 'var(--success)' },
              { label: 'Em risco',     value: String(atRisk),                   icon: Zap,     color: '#F5A623' },
              { label: 'Perdidos',     value: String(MOCK_CLIENTS.filter(c=>c.status==='churned').length), icon: ArrowRight, color: 'var(--danger)' },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="rounded-2xl p-4 flex items-center gap-4 card">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${color === 'var(--cyan)' ? 'rgba(33,160,196,0.12)' : color === 'var(--success)' ? 'rgba(0,229,160,0.1)' : color === '#F5A623' ? 'rgba(245,166,35,0.1)' : 'rgba(232,69,69,0.1)'}` }}>
                  <Icon size={16} style={{ color }} />
                </div>
                <div>
                  <p className="num-lg" style={{ color }}>{value}</p>
                  <p className="text-xs" style={{ color: 'var(--t2)' }}>{label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div className="flex items-center gap-3">
            <div
              className="flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 flex-1 max-w-xs transition-all"
              style={{
                background: 'var(--s1)',
                outline: searchFocus ? '1px solid var(--cyan-border)' : '1px solid transparent',
              }}
            >
              <Search size={14} style={{ color: searchFocus ? 'var(--cyan)' : 'var(--t3)' }} />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                onFocus={() => setSearchFocus(true)}
                onBlur={() => setSearchFocus(false)}
                placeholder="Pesquisar clientes..."
                className="bg-transparent text-sm outline-none w-full"
                style={{ color: 'var(--t1)', caretColor: 'var(--cyan)' }}
              />
            </div>
            <div className="flex rounded-xl overflow-hidden" style={{ background: 'var(--s1)' }}>
              {(['all', 'active', 'at_risk', 'churned'] as const).map(s => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className="px-3 py-2.5 text-xs font-semibold transition-colors"
                  style={{ background: statusFilter === s ? 'var(--s3)' : 'transparent', color: statusFilter === s ? 'var(--t1)' : 'var(--t3)' }}
                >
                  {s === 'all' ? 'Todos' : STATUS_CFG[s].label}
                </button>
              ))}
            </div>
          </div>

          {/* Mission Control grid */}
          {viewMode === 'mission' && (
            <div className="flex-1 overflow-y-auto">
              {filtered.length === 0 ? (
                <div className="flex items-center justify-center h-40">
                  <p className="text-sm" style={{ color: 'var(--t3)' }}>Nenhum cliente encontrado</p>
                </div>
              ) : (
                <MissionControlGrid
                  clients={filtered}
                  onSelect={c => setSelectedClient(selectedClient?.id === c.id ? null : c)}
                />
              )}
            </div>
          )}

          {/* Table */}
          {viewMode === 'list' && <div className="rounded-2xl flex-1 overflow-hidden card">
            <div className="overflow-auto h-full">
              <table className="w-full">
                <thead className="sticky top-0" style={{ background: 'var(--s1)' }}>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    {['CLIENTE', 'SECTOR', 'SAÚDE', 'MRR', 'LEADS', 'CPL', 'CANAIS', 'GESTOR', 'ESTADO', ''].map(h => (
                      <th key={h} className="text-left px-4 py-3 whitespace-nowrap tag-label">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(client => {
                    const st = STATUS_CFG[client.status]
                    const isSelected = selectedClient?.id === client.id
                    return (
                      <tr
                        key={client.id}
                        onClick={() => setSelectedClient(isSelected ? null : client)}
                        className="cursor-pointer transition-colors tonal-hover"
                        style={{
                          background: isSelected ? 'rgba(33,160,196,0.06)' : undefined,
                          borderLeft: isSelected ? '2px solid var(--cyan)' : '2px solid transparent',
                          borderBottom: '1px solid rgba(255,255,255,0.03)',
                        }}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0"
                              style={{ background: `${NICHE_COLORS[client.niche] ?? '#21A0C4'}18`, color: NICHE_COLORS[client.niche] ?? '#21A0C4' }}
                            >
                              {client.logo}
                            </div>
                            <p className="text-sm font-semibold" style={{ color: 'var(--t1)' }}>{client.name}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg" style={{ background: `${NICHE_COLORS[client.niche] ?? '#21A0C4'}18`, color: NICHE_COLORS[client.niche] ?? '#7FA8C4' }}>
                            {client.niche}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2 w-24">
                            <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--s3)' }}>
                              <div className="h-full rounded-full" style={{ width: `${client.health_score}%`, background: healthColor(client.health_score) }} />
                            </div>
                            <span className="text-[10px] font-bold" style={{ color: healthColor(client.health_score) }}>{client.health_score}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm font-bold" style={{ color: 'var(--t1)' }}>
                          {client.mrr > 0 ? `€${client.mrr.toLocaleString()}` : <span style={{ color: 'var(--t3)' }}>—</span>}
                        </td>
                        <td className="px-4 py-3 text-sm" style={{ color: 'var(--t2)' }}>{client.active_leads}</td>
                        <td className="px-4 py-3">
                          {client.cpl > 0 ? (
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm font-bold" style={{ color: 'var(--t1)' }}>€{client.cpl.toFixed(2)}</span>
                              {client.cpl_change < 0
                                ? <TrendingDown size={11} style={{ color: 'var(--success)' }} />
                                : <TrendingUp size={11} style={{ color: 'var(--danger)' }} />}
                            </div>
                          ) : <span style={{ color: 'var(--t3)' }}>—</span>}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            {client.channels.slice(0, 3).map(ch => (
                              <PlatformIcon key={ch} platform={ch} size={18} />
                            ))}
                            {client.channels.length > 3 && (
                              <span className="text-[10px] font-bold" style={{ color: 'var(--t3)' }}>+{client.channels.length - 3}</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs" style={{ color: 'var(--t2)' }}>{client.manager}</td>
                        <td className="px-4 py-3">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${st.color}18`, color: st.color }}>
                            {st.label}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <ChevronRight size={14} style={{ color: isSelected ? 'var(--cyan)' : 'var(--t3)' }} />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>}
        </div>

        {/* Detail panel */}
        {selectedClient && (
          <ClientPanel client={selectedClient} onClose={() => setSelectedClient(null)} />
        )}
      </div>
    </>
  )
}
