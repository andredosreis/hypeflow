'use client'

import {
  DndContext, DragEndEvent, DragOverEvent, DragOverlay, DragStartEvent,
  MouseSensor, TouchSensor, useSensor, useSensors, closestCorners,
} from '@dnd-kit/core'
import { useState, useCallback, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { KanbanColumn } from './KanbanColumn'
import { KanbanCard } from './KanbanCard'
import type { PipelineStage, Lead } from '@/lib/types'
import { api } from '@/lib/trpc/client'
import {
  Flame, Filter, Search, Plus, X, Phone, Mail, MessageSquare,
  Globe, Tag, Clock, TrendingUp, Users, DollarSign, ChevronRight,
  Calendar, ArrowRight, Star, Zap,
} from 'lucide-react'

type StageWithLeads = PipelineStage & { leads: Lead[] }

/* ─── rich mock data ─── */
const h = (n: number) => new Date(Date.now() - n * 3600000).toISOString()

const MOCK_STAGES: StageWithLeads[] = [
  {
    id: 's1', name: 'Novo Lead', color: '#21A0C4', position: 0,
    agency_id: 'demo', sla_hours: 1, is_terminal: false, is_won: false, created_at: '',
    leads: [
      { id: 'l1', full_name: 'Tiago Fonseca', source: 'meta', temperature: 'hot', score: 94, agency_id: 'demo', client_id: 'c1', status: 'active', pipeline_stage_id: 's1', stage_entered_at: h(0.5), created_at: h(2), updated_at: h(0.5), email: 'tiago@empresa.pt', phone: '351912345678', company: 'Tech Lda', source_type: 'paid' },
      { id: 'l2', full_name: 'Ana Ferreira', source: 'instagram', temperature: 'hot', score: 88, agency_id: 'demo', client_id: 'c1', status: 'active', pipeline_stage_id: 's1', stage_entered_at: h(1.2), created_at: h(4), updated_at: h(1.2), email: 'ana@negocio.pt', phone: '351933456789', company: 'Moda Ana', source_type: 'paid' },
      { id: 'l3', full_name: 'Pedro Gomes', source: 'google_ads', temperature: 'warm', score: 71, agency_id: 'demo', client_id: 'c1', status: 'active', pipeline_stage_id: 's1', stage_entered_at: h(2), created_at: h(6), updated_at: h(2), email: 'pedro@gmail.com', phone: '', company: '', source_type: 'paid' },
      { id: 'l4', full_name: 'Mariana Costa', source: 'linkedin', temperature: 'warm', score: 65, agency_id: 'demo', client_id: 'c1', status: 'active', pipeline_stage_id: 's1', stage_entered_at: h(3), created_at: h(8), updated_at: h(3), email: 'mariana@corp.pt', phone: '351966789012', company: 'Corp SA', source_type: 'organic' },
    ],
  },
  {
    id: 's2', name: 'Qualificando', color: '#F5A623', position: 1,
    agency_id: 'demo', sla_hours: 24, is_terminal: false, is_won: false, created_at: '',
    leads: [
      { id: 'l5', full_name: 'Carlos Mendes', source: 'meta', temperature: 'hot', score: 91, agency_id: 'demo', client_id: 'c1', status: 'active', pipeline_stage_id: 's2', stage_entered_at: h(5), created_at: h(12), updated_at: h(5), email: 'carlos@mendes.pt', phone: '351921234567', company: 'CM Digital', source_type: 'paid', tags: ['deal_value:4500'] },
      { id: 'l6', full_name: 'Sofia Lopes', source: 'whatsapp', temperature: 'warm', score: 76, agency_id: 'demo', client_id: 'c1', status: 'active', pipeline_stage_id: 's2', stage_entered_at: h(8), created_at: h(20), updated_at: h(8), email: 'sofia@lopes.com', phone: '351955678901', company: '', source_type: 'organic', tags: ['deal_value:2800'] },
      { id: 'l7', full_name: 'Miguel Rocha', source: 'organic', temperature: 'cold', score: 45, agency_id: 'demo', client_id: 'c1', status: 'active', pipeline_stage_id: 's2', stage_entered_at: h(30), created_at: h(40), updated_at: h(30), email: 'miguel@rocha.pt', phone: '', company: 'Rocha & Filhos', source_type: 'organic' },
    ],
  },
  {
    id: 's3', name: 'Call Agendada', color: '#9B59B6', position: 2,
    agency_id: 'demo', sla_hours: 48, is_terminal: false, is_won: false, created_at: '',
    leads: [
      { id: 'l8', full_name: 'João Silva', source: 'meta', temperature: 'hot', score: 96, agency_id: 'demo', client_id: 'c1', status: 'active', pipeline_stage_id: 's3', stage_entered_at: h(18), created_at: h(48), updated_at: h(18), email: 'joao@silva.pt', phone: '351912000111', company: 'Silva Corp', source_type: 'paid', tags: ['deal_value:8000'] },
      { id: 'l9', full_name: 'Rita Barbosa', source: 'google_ads', temperature: 'hot', score: 83, agency_id: 'demo', client_id: 'c1', status: 'active', pipeline_stage_id: 's3', stage_entered_at: h(22), created_at: h(50), updated_at: h(22), email: 'rita@barbosa.pt', phone: '351944321654', company: 'RB Store', source_type: 'paid', tags: ['deal_value:3200'] },
    ],
  },
  {
    id: 's4', name: 'Proposta Enviada', color: '#D1FF00', position: 3,
    agency_id: 'demo', sla_hours: 72, is_terminal: false, is_won: false, created_at: '',
    leads: [
      { id: 'l10', full_name: 'Luísa Pinto', source: 'instagram', temperature: 'warm', score: 79, agency_id: 'demo', client_id: 'c1', status: 'active', pipeline_stage_id: 's4', stage_entered_at: h(36), created_at: h(72), updated_at: h(36), email: 'luisa@pinto.pt', phone: '351933100200', company: 'Pinto Atelier', source_type: 'paid', tags: ['deal_value:5500'] },
      { id: 'l11', full_name: 'André Matos', source: 'linkedin', temperature: 'hot', score: 85, agency_id: 'demo', client_id: 'c1', status: 'active', pipeline_stage_id: 's4', stage_entered_at: h(48), created_at: h(96), updated_at: h(48), email: 'andre@matos.pt', phone: '351912555666', company: 'Matos Tech', source_type: 'organic', tags: ['deal_value:12000'] },
    ],
  },
  {
    id: 's5', name: 'Fechado Won', color: '#00E5A0', position: 4,
    agency_id: 'demo', sla_hours: 0, is_terminal: true, is_won: true, created_at: '',
    leads: [
      { id: 'l12', full_name: 'Beatriz Carvalho', source: 'meta', temperature: 'hot', score: 99, agency_id: 'demo', client_id: 'c1', status: 'active', pipeline_stage_id: 's5', stage_entered_at: h(72), created_at: h(120), updated_at: h(72), email: 'beatriz@carvalho.pt', phone: '351922000333', company: 'BC Events', source_type: 'paid', tags: ['deal_value:6800'] },
    ],
  },
]

const TEMP_CONFIG: Record<string, { color: string; label: string; glow: string }> = {
  hot:  { color: '#E84545', label: 'HOT',  glow: 'rgba(232,69,69,0.25)' },
  warm: { color: '#F5A623', label: 'WARM', glow: 'rgba(245,166,35,0.2)' },
  cold: { color: '#4A6680', label: 'COLD', glow: 'rgba(74,102,128,0.2)' },
}

const SOURCE_MAP: Record<string, { label: string; color: string }> = {
  meta:       { label: 'META',    color: '#1877F2' },
  instagram:  { label: 'IG',     color: '#E1306C' },
  google_ads: { label: 'GG ADS', color: '#4285F4' },
  linkedin:   { label: 'LI',     color: '#0A66C2' },
  whatsapp:   { label: 'WA',     color: '#25D366' },
  organic:    { label: 'ORG',    color: '#00E5A0' },
  email:      { label: 'EMAIL',  color: '#F5A623' },
}

interface KanbanBoardProps {
  agencyId: string
  demoMode?: boolean
  initialHotFilter?: boolean
}

export function KanbanBoard({ agencyId, demoMode = false, initialHotFilter = false }: KanbanBoardProps) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const [stages, setStages] = useState<StageWithLeads[]>(MOCK_STAGES)
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [selectedLeadStage, setSelectedLeadStage] = useState<StageWithLeads | null>(null)
  const [search, setSearch] = useState('')
  const [filterTemp, setFilterTemp] = useState<string>('')
  const [filterSource, setFilter] = useState<string>('')
  const [showHot, setShowHot] = useState(initialHotFilter)
  const [focusMode, setFocusMode] = useState(false)

  const boardQuery = api.admin.pipeline.getBoard.useQuery(
    { agencyId },
    { enabled: !demoMode && Boolean(agencyId) }
  )
  const updateStageMutation = api.admin.pipeline.updateLeadStage.useMutation()

  useEffect(() => {
    if (!demoMode && boardQuery.data && boardQuery.data.length > 0) {
      setStages(boardQuery.data as StageWithLeads[])
    }
  }, [boardQuery.data, demoMode])

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } })
  )

  const findStageByLeadId = useCallback(
    (leadId: string) => stages.find(s => s.leads.some(l => l.id === leadId)),
    [stages]
  )

  const findLeadById = useCallback((leadId: string) => {
    for (const stage of stages) {
      const lead = stage.leads.find(l => l.id === leadId)
      if (lead) return lead
    }
    return null
  }, [stages])

  const moveLeadToStage = useCallback(async (leadId: string, targetStageId: string) => {
    const sourceStage = findStageByLeadId(leadId)
    const targetStage = stages.find(s => s.id === targetStageId)
    if (!sourceStage || !targetStage || sourceStage.id === targetStage.id) return

    const snapshot = stages
    setStages(prev => prev.map(stage => {
      if (stage.id === sourceStage.id) return { ...stage, leads: stage.leads.filter(l => l.id !== leadId) }
      if (stage.id === targetStage.id) {
        const lead = sourceStage.leads.find(l => l.id === leadId)
        return lead ? { ...stage, leads: [...stage.leads, { ...lead, pipeline_stage_id: targetStageId, stage_entered_at: new Date().toISOString() }] } : stage
      }
      return stage
    }))

    if (demoMode) return

    try {
      await updateStageMutation.mutateAsync({ leadId, stageId: targetStage.id })
    } catch {
      setStages(snapshot)
    }
  }, [demoMode, findStageByLeadId, stages, updateStageMutation])

  const handleDragStart = useCallback((e: DragStartEvent) => setActiveId(e.active.id as string), [])

  const handleDragOver = useCallback((e: DragOverEvent) => {
    const { active, over } = e
    if (!over) return
    const leadId = active.id as string
    const overId = over.id as string
    const activeStage = findStageByLeadId(leadId)
    const overStage = stages.find(s => s.id === overId) ?? findStageByLeadId(overId)
    if (!activeStage || !overStage || activeStage.id === overStage.id) return
    void moveLeadToStage(leadId, overStage.id)
  }, [stages, findStageByLeadId, moveLeadToStage])

  const handleDragEnd = useCallback(async (e: DragEndEvent) => {
    const { active, over } = e
    setActiveId(null)
    if (!over) return
    const leadId = active.id as string
    const overId = over.id as string
    const targetStage = stages.find(s => s.id === overId) ?? findStageByLeadId(overId)
    if (targetStage) await moveLeadToStage(leadId, targetStage.id)
  }, [stages, findStageByLeadId, moveLeadToStage])

  const handleAdvanceLead = useCallback((leadId: string) => {
    const current = findStageByLeadId(leadId)
    if (!current) return
    const sorted = [...stages].sort((a, b) => a.position - b.position)
    const idx = sorted.findIndex(s => s.id === current.id)
    const next = idx >= 0 ? sorted[idx + 1] : null
    if (next) void moveLeadToStage(leadId, next.id)
  }, [findStageByLeadId, stages, moveLeadToStage])

  const handleCardClick = useCallback((lead: Lead) => {
    const stage = findStageByLeadId(lead.id)
    setSelectedLead(lead)
    setSelectedLeadStage(stage ?? null)
  }, [findStageByLeadId])

  const displayedStages = useMemo(() => {
    return stages.map(stage => ({
      ...stage,
      leads: stage.leads.filter(lead => {
        if (search && !lead.full_name.toLowerCase().includes(search.toLowerCase()) &&
            !(lead.company ?? '').toLowerCase().includes(search.toLowerCase())) return false
        if (filterTemp && lead.temperature !== filterTemp) return false
        if (filterSource && lead.source !== filterSource) return false
        if (showHot && (lead.score < 80 || lead.last_contact_at)) return false
        return true
      }),
    }))
  }, [stages, search, filterTemp, filterSource, showHot])

  const focusStages = useMemo(() => {
    if (!focusMode) return displayedStages
    const top = displayedStages
      .flatMap(s => s.leads)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
    const topIds = new Set(top.map(l => l.id))
    return displayedStages.map(s => ({ ...s, leads: s.leads.filter(l => topIds.has(l.id)) }))
  }, [displayedStages, focusMode])

  const allLeads = stages.flatMap(s => s.leads)
  const totalValue = allLeads.reduce((acc, l) => {
    const tag = l.tags?.find(t => t.startsWith('deal_value:'))
    return acc + (tag ? Number(tag.replace('deal_value:', '')) : 0)
  }, 0)
  const hotCount = allLeads.filter(l => l.temperature === 'hot').length
  const activeLead = activeId ? findLeadById(activeId) : null

  return (
    <div className="flex flex-col h-full gap-0">

      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="page-title">Pipeline</h1>
          <p className="text-sm" style={{ color: 'var(--t3)' }}>
            {allLeads.length} leads · €{totalValue.toLocaleString('pt-PT')} em pipeline
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-lime gap-2 px-4 py-2 rounded-xl text-sm">
            <Plus size={14} /> Novo Lead
          </button>
        </div>
      </div>

      {/* ── KPI strip ── */}
      <div className="grid grid-cols-4 gap-3 mb-4">
        {[
          { label: 'Total Leads', value: allLeads.length, icon: Users, color: 'var(--cyan)' },
          { label: 'Hot Leads', value: hotCount, icon: Flame, color: '#E84545' },
          { label: 'Pipeline Value', value: `€${Math.round(totalValue / 1000)}k`, icon: DollarSign, color: '#D1FF00' },
          { label: 'Taxa Conversão', value: '24%', icon: TrendingUp, color: 'var(--success)' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="card px-4 py-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(255,255,255,0.04)' }}>
              <Icon size={14} style={{ color }} />
            </div>
            <div>
              <p className="text-xs" style={{ color: 'var(--t3)' }}>{label}</p>
              <p className="text-lg font-bold leading-tight" style={{ color: 'var(--t1)' }}>{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Toolbar ── */}
      <div className="flex items-center gap-2 mb-4">
        {/* Search */}
        <div className="relative flex-1 max-w-xs">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--t3)' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Pesquisar lead..."
            className="w-full pl-8 pr-3 py-2 text-sm rounded-xl outline-none"
            style={{ background: 'var(--s1)', border: '1px solid rgba(255,255,255,0.06)', color: 'var(--t1)' }}
          />
        </div>

        {/* Temp filter */}
        {(['hot', 'warm', 'cold'] as const).map(t => {
          const cfg = TEMP_CONFIG[t]!
          const active = filterTemp === t
          return (
            <button
              key={t}
              onClick={() => setFilterTemp(active ? '' : t)}
              className="px-3 py-2 rounded-xl text-xs font-bold transition-all"
              style={{
                background: active ? `${cfg.color}22` : 'var(--s1)',
                border: `1px solid ${active ? cfg.color + '60' : 'rgba(255,255,255,0.06)'}`,
                color: active ? cfg.color : 'var(--t3)',
              }}
            >
              {cfg.label}
            </button>
          )
        })}

        <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.06)' }} />

        <button
          onClick={() => setShowHot(v => !v)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all"
          style={{
            background: showHot ? 'rgba(232,69,69,0.12)' : 'var(--s1)',
            border: `1px solid ${showHot ? 'rgba(232,69,69,0.4)' : 'rgba(255,255,255,0.06)'}`,
            color: showHot ? '#E84545' : 'var(--t3)',
          }}
        >
          <Flame size={12} /> Sniper
        </button>

        <button
          onClick={() => setFocusMode(v => !v)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all"
          style={{
            background: focusMode ? 'rgba(209,255,0,0.08)' : 'var(--s1)',
            border: `1px solid ${focusMode ? 'rgba(209,255,0,0.3)' : 'rgba(255,255,255,0.06)'}`,
            color: focusMode ? '#D1FF00' : 'var(--t3)',
          }}
        >
          <Zap size={12} /> Focus Top 5
        </button>

        <button
          onClick={() => { setSearch(''); setFilterTemp(''); setFilter(''); setShowHot(false); setFocusMode(false) }}
          className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs transition-all"
          style={{ background: 'var(--s1)', border: '1px solid rgba(255,255,255,0.06)', color: 'var(--t3)' }}
        >
          <Filter size={12} /> Limpar
        </button>
      </div>

      {/* ── Kanban Board ── */}
      <div className="flex-1 overflow-hidden">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-3 overflow-x-auto pb-4 h-full" style={{ minHeight: 480 }}>
            {focusStages.map(stage => (
              <KanbanColumn
                key={stage.id}
                stage={stage}
                leads={stage.leads}
                activeId={activeId}
                onAdvanceLead={handleAdvanceLead}
                onCardClick={handleCardClick}
              />
            ))}
          </div>

          <DragOverlay>
            {activeLead && <KanbanCard lead={activeLead} isDragging />}
          </DragOverlay>
        </DndContext>
      </div>

      {/* ── Lead Detail Panel ── */}
      {selectedLead && (
        <LeadDetailPanel
          lead={selectedLead}
          stage={selectedLeadStage}
          stages={stages}
          onClose={() => { setSelectedLead(null); setSelectedLeadStage(null) }}
          onMoveTo={(stageId) => {
            void moveLeadToStage(selectedLead.id, stageId)
            setSelectedLead(null)
            setSelectedLeadStage(null)
          }}
          onAdvance={() => {
            handleAdvanceLead(selectedLead.id)
            setSelectedLead(null)
            setSelectedLeadStage(null)
          }}
        />
      )}
    </div>
  )
}

/* ─── Lead Detail Side Panel ─── */
function LeadDetailPanel({
  lead, stage, stages, onClose, onMoveTo, onAdvance,
}: {
  lead: Lead
  stage: StageWithLeads | null
  stages: StageWithLeads[]
  onClose: () => void
  onMoveTo: (stageId: string) => void
  onAdvance: () => void
}) {
  const temp = lead.temperature ?? 'cold'
  const tempCfg = TEMP_CONFIG[temp] ?? TEMP_CONFIG.cold!
  const src = SOURCE_MAP[lead.source] ?? { label: lead.source.toUpperCase(), color: 'var(--t3)' }
  const score = lead.score ?? 0
  const scoreColor = score >= 80 ? 'var(--success)' : score >= 50 ? '#F5A623' : 'var(--t3)'
  const phone = (lead.phone ?? '').replace(/\D/g, '')

  const sortedStages = [...stages].sort((a, b) => a.position - b.position)
  const currentIdx = sortedStages.findIndex(s => s.id === stage?.id)
  const hasNext = currentIdx >= 0 && currentIdx < sortedStages.length - 1

  const tagValue = lead.tags?.find(t => t.startsWith('deal_value:'))
  const dealValue = tagValue ? Number(tagValue.replace('deal_value:', '')) : null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        style={{ background: 'rgba(0,0,0,0.5)' }}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className="fixed right-0 top-0 bottom-0 z-50 flex flex-col overflow-y-auto"
        style={{
          width: 420,
          background: 'var(--s1)',
          borderLeft: '1px solid rgba(255,255,255,0.06)',
          boxShadow: '-24px 0 64px rgba(0,0,0,0.4)',
        }}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded"
                style={{ background: `${tempCfg.color}20`, color: tempCfg.color }}
              >
                {tempCfg.label}
              </span>
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded"
                style={{ background: `${src.color}20`, color: src.color }}
              >
                {src.label}
              </span>
            </div>
            <h2 className="text-lg font-bold truncate" style={{ color: 'var(--t1)', fontFamily: 'var(--font-syne)' }}>
              {lead.full_name}
            </h2>
            {lead.company && (
              <p className="text-sm" style={{ color: 'var(--t3)' }}>{lead.company}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl transition-colors"
            style={{ color: 'var(--t3)' }}
            onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = 'var(--t1)')}
            onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = 'var(--t3)')}
          >
            <X size={18} />
          </button>
        </div>

        {/* Score + stage */}
        <div className="px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs" style={{ color: 'var(--t3)' }}>Score</span>
            <span className="text-sm font-bold" style={{ color: scoreColor }}>{score}/100</span>
          </div>
          <div className="h-2 rounded-full mb-4" style={{ background: 'var(--s3)' }}>
            <div className="h-2 rounded-full" style={{ width: `${score}%`, background: scoreColor, transition: 'width 0.4s' }} />
          </div>

          {/* Stage progress */}
          <div className="flex items-center gap-1">
            {sortedStages.map((s, i) => (
              <div key={s.id} className="flex-1 flex flex-col items-center gap-1">
                <button
                  onClick={() => { if (s.id !== stage?.id) onMoveTo(s.id) }}
                  className="w-full h-1.5 rounded-full transition-all"
                  style={{
                    background: i <= currentIdx ? s.color : 'var(--s3)',
                    opacity: i <= currentIdx ? 1 : 0.4,
                  }}
                />
                {i === currentIdx && (
                  <span className="text-[8px] font-bold" style={{ color: s.color }}>{s.name}</span>
                )}
              </div>
            ))}
          </div>

          {stage && (
            <p className="text-xs mt-2" style={{ color: 'var(--t3)' }}>
              Etapa: <span style={{ color: 'var(--t2)' }}>{stage.name}</span>
            </p>
          )}
        </div>

        {/* Quick actions */}
        <div className="px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--t3)' }}>Acções Rápidas</p>
          <div className="grid grid-cols-4 gap-2">
            {[
              { icon: Phone, label: 'Ligar', href: phone ? `tel:${phone}` : undefined, color: '#D1FF00' },
              { icon: MessageSquare, label: 'WhatsApp', href: phone ? `https://wa.me/${phone}` : undefined, color: '#25D366' },
              { icon: Mail, label: 'Email', href: lead.email ? `mailto:${lead.email}` : undefined, color: 'var(--cyan)' },
              { icon: Calendar, label: 'Agendar', href: undefined, color: '#9B59B6' },
            ].map(({ icon: Icon, label, href, color }) => (
              <a
                key={label}
                href={href ?? '#'}
                target={href?.startsWith('http') ? '_blank' : undefined}
                rel="noreferrer"
                className="flex flex-col items-center gap-1.5 p-3 rounded-xl transition-all"
                style={{ background: 'var(--s2)', cursor: href ? 'pointer' : 'not-allowed', opacity: href ? 1 : 0.4 }}
                onMouseEnter={e => { if (href) (e.currentTarget as HTMLElement).style.background = 'var(--s3)' }}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'var(--s2)'}
              >
                <Icon size={16} style={{ color }} />
                <span className="text-[10px]" style={{ color: 'var(--t3)' }}>{label}</span>
              </a>
            ))}
          </div>
        </div>

        {/* Contact info */}
        <div className="px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--t3)' }}>Contacto</p>
          <div className="flex flex-col gap-2">
            {lead.email && (
              <div className="flex items-center gap-2">
                <Mail size={13} style={{ color: 'var(--t3)' }} />
                <span className="text-sm" style={{ color: 'var(--t2)' }}>{lead.email}</span>
              </div>
            )}
            {lead.phone && (
              <div className="flex items-center gap-2">
                <Phone size={13} style={{ color: 'var(--t3)' }} />
                <span className="text-sm" style={{ color: 'var(--t2)' }}>{lead.phone}</span>
              </div>
            )}
            {lead.company && (
              <div className="flex items-center gap-2">
                <Globe size={13} style={{ color: 'var(--t3)' }} />
                <span className="text-sm" style={{ color: 'var(--t2)' }}>{lead.company}</span>
              </div>
            )}
          </div>
        </div>

        {/* Deal info */}
        <div className="px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--t3)' }}>Negócio</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl p-3" style={{ background: 'var(--s2)' }}>
              <p className="text-xs mb-1" style={{ color: 'var(--t3)' }}>Valor Estimado</p>
              <p className="text-base font-bold" style={{ color: dealValue ? '#D1FF00' : 'var(--t3)' }}>
                {dealValue ? `€${dealValue.toLocaleString('pt-PT')}` : '—'}
              </p>
            </div>
            <div className="rounded-xl p-3" style={{ background: 'var(--s2)' }}>
              <p className="text-xs mb-1" style={{ color: 'var(--t3)' }}>Na Etapa</p>
              <p className="text-base font-bold" style={{ color: 'var(--t1)' }}>
                {lead.stage_entered_at
                  ? `${Math.floor((Date.now() - new Date(lead.stage_entered_at).getTime()) / 3600000)}h`
                  : '—'}
              </p>
            </div>
          </div>
        </div>

        {/* Tags */}
        {lead.tags && lead.tags.length > 0 && (
          <div className="px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--t3)' }}>Tags</p>
            <div className="flex flex-wrap gap-2">
              {lead.tags.filter(t => !t.startsWith('deal_value:')).map(tag => (
                <span
                  key={tag}
                  className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg"
                  style={{ background: 'var(--s2)', color: 'var(--t2)' }}
                >
                  <Tag size={10} /> {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Move to stage */}
        <div className="px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--t3)' }}>Mover para Etapa</p>
          <div className="flex flex-col gap-1.5">
            {sortedStages.map((s, i) => (
              <button
                key={s.id}
                onClick={() => { if (s.id !== stage?.id) onMoveTo(s.id) }}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all text-left"
                style={{
                  background: s.id === stage?.id ? `${s.color}15` : 'var(--s2)',
                  border: `1px solid ${s.id === stage?.id ? s.color + '40' : 'transparent'}`,
                  color: s.id === stage?.id ? s.color : 'var(--t2)',
                  cursor: s.id === stage?.id ? 'default' : 'pointer',
                }}
                onMouseEnter={e => { if (s.id !== stage?.id) (e.currentTarget as HTMLElement).style.background = 'var(--s3)' }}
                onMouseLeave={e => { if (s.id !== stage?.id) (e.currentTarget as HTMLElement).style.background = 'var(--s2)' }}
              >
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: s.color }} />
                <span className="flex-1">{s.name}</span>
                {s.id === stage?.id && <span className="text-[10px] font-bold opacity-60">ATUAL</span>}
                {s.is_won && <Star size={11} style={{ color: '#D1FF00' }} />}
              </button>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="p-5 mt-auto">
          {hasNext && (
            <button
              onClick={onAdvance}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm mb-2"
              style={{ background: 'var(--cyan)', color: '#0F1318' }}
            >
              <ArrowRight size={16} /> Avançar para próxima etapa
            </button>
          )}
          <div className="flex gap-2">
            <button
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold"
              style={{ background: 'var(--s2)', color: 'var(--t2)' }}
            >
              <Clock size={13} /> Actividade
            </button>
            <Link
              href={`/admin/contactos/${lead.id}`}
              onClick={onClose}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold"
              style={{ background: 'var(--cyan)', color: '#0D1117' }}
            >
              <ChevronRight size={13} /> Ver Perfil
            </Link>
          </div>
        </div>
      </div>
    </>
  )
}
