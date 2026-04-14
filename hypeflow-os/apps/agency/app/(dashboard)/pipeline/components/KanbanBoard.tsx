'use client'

import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  closestCorners,
} from '@dnd-kit/core'
import { useState, useCallback, useEffect, useMemo } from 'react'
import { KanbanColumn } from './KanbanColumn'
import { KanbanCard } from './KanbanCard'
import type { PipelineStage, Lead } from '@/lib/types'
import { api } from '@/lib/trpc/client'
import { Flame, Filter } from 'lucide-react'

type StageWithLeads = PipelineStage & { leads: Lead[] }

const h = (n: number) => new Date(Date.now() - n * 3600000).toISOString()
const mkLead = (id: string, full_name: string, source: string, temperature: Lead['temperature'], score: number, stageId: string, hoursAgo: number): Lead => ({
  id,
  full_name,
  source,
  temperature,
  score,
  agency_id: 'demo',
  client_id: 'demo-client',
  status: 'active',
  pipeline_stage_id: stageId,
  stage_entered_at: h(hoursAgo),
  created_at: h(hoursAgo + 48),
  updated_at: h(hoursAgo),
})

const MOCK_STAGES: StageWithLeads[] = [
  {
    id: 'stage-1', name: 'Nova', color: '#7FA8C4', position: 0,
    agency_id: 'demo', sla_hours: 24, is_terminal: false, is_won: false, created_at: '',
    leads: [mkLead('l1', 'Joao Silva', 'meta', 'hot', 87, 'stage-1', 2), mkLead('l2', 'Ana Ferreira', 'instagram', 'warm', 62, 'stage-1', 8)],
  },
  {
    id: 'stage-2', name: 'Qualificando', color: '#F5A623', position: 1,
    agency_id: 'demo', sla_hours: 48, is_terminal: false, is_won: false, created_at: '',
    leads: [mkLead('l3', 'Carlos Mendes', 'google_ads', 'hot', 91, 'stage-2', 5)],
  },
  {
    id: 'stage-3', name: 'Proposta', color: '#D1FF00', position: 2,
    agency_id: 'demo', sla_hours: 72, is_terminal: false, is_won: false, created_at: '',
    leads: [mkLead('l4', 'Sofia Lopes', 'meta', 'warm', 74, 'stage-3', 10)],
  },
]

interface KanbanBoardProps {
  agencyId: string
  clientId?: string
  agentId?: string
  demoMode?: boolean
  initialHotFilter?: boolean
}

export function KanbanBoard({ agencyId, clientId, agentId, demoMode = false, initialHotFilter = false }: KanbanBoardProps) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const [stages, setStages] = useState<StageWithLeads[]>(demoMode ? MOCK_STAGES : [])
  const [focusMode, setFocusMode] = useState(false)
  const [showHotNoContact, setShowHotNoContact] = useState(initialHotFilter)

  const boardQuery = api.pipeline.getBoard.useQuery(
    { agencyId, clientId, agentId },
    { enabled: Boolean(agencyId) && !demoMode }
  )
  const updateStageMutation = api.pipeline.updateLeadStage.useMutation()

  useEffect(() => {
    if (boardQuery.data && !demoMode) {
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

  const findLeadById = useCallback(
    (leadId: string) => {
      for (const stage of stages) {
        const lead = stage.leads.find(l => l.id === leadId)
        if (lead) return lead
      }
      return null
    },
    [stages]
  )

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }, [])

  const moveLeadToStage = useCallback(async (
    leadId: string,
    targetStageId: string,
    checklist?: { estimatedValue: number; closeDate: string; diagnosticLink: string }
  ) => {
    const sourceStage = findStageByLeadId(leadId)
    const targetStage = stages.find(stage => stage.id === targetStageId)
    if (!sourceStage || !targetStage || sourceStage.id === targetStage.id) return

    const snapshot = stages

    setStages(prev =>
      prev.map(stage => {
        if (stage.id === sourceStage.id) {
          return { ...stage, leads: stage.leads.filter(lead => lead.id !== leadId) }
        }
        if (stage.id === targetStage.id) {
          const lead = sourceStage.leads.find(item => item.id === leadId)
          return lead ? { ...stage, leads: [...stage.leads, lead] } : stage
        }
        return stage
      })
    )

    if (demoMode) return

    try {
      await updateStageMutation.mutateAsync({ leadId, stageId: targetStage.id, checklist })
    } catch (error) {
      setStages(snapshot)
      if (error instanceof Error && error.message.includes('CHECKLIST_REQUIRED')) {
        window.alert('Transicao bloqueada: preencha Valor Estimado, Data de Fechamento e Link de Diagnostico.')
      }
    }
  }, [demoMode, findStageByLeadId, stages, updateStageMutation])

  const handleAdvanceLead = useCallback((leadId: string) => {
    const current = findStageByLeadId(leadId)
    if (!current) return
    const sortedStages = [...stages].sort((a, b) => a.position - b.position)
    const idx = sortedStages.findIndex(stage => stage.id === current.id)
    const next = idx >= 0 ? sortedStages[idx + 1] : null
    if (!next) return

    const needsChecklist = ['Diagnostico/Demo', 'Follow-up Ativo'].includes(next.name)
    if (!needsChecklist) {
      void moveLeadToStage(leadId, next.id)
      return
    }

    const estimatedValueRaw = window.prompt('Valor estimado do negocio (EUR):')
    const closeDate = window.prompt('Data estimada de fechamento (YYYY-MM-DD):')
    const diagnosticLink = window.prompt('Link do diagnostico/demo:')

    const estimatedValue = estimatedValueRaw ? Number(estimatedValueRaw) : NaN
    if (!Number.isFinite(estimatedValue) || estimatedValue <= 0 || !closeDate || !diagnosticLink) {
      window.alert('Checklist incompleto. Movimento cancelado.')
      return
    }

    void moveLeadToStage(leadId, next.id, {
      estimatedValue,
      closeDate,
      diagnosticLink,
    })
  }, [findStageByLeadId, stages, moveLeadToStage])

  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      const { active, over } = event
      if (!over) return

      const activeLeadId = active.id as string
      const overId = over.id as string

      const activeStage = findStageByLeadId(activeLeadId)
      const overStage = stages.find(s => s.id === overId) ?? findStageByLeadId(overId)

      if (!activeStage || !overStage || activeStage.id === overStage.id) return

      void moveLeadToStage(activeLeadId, overStage.id)
    },
    [stages, findStageByLeadId, moveLeadToStage]
  )

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event
      setActiveId(null)

      if (!over) return

      const activeLeadId = active.id as string
      const overId = over.id as string
      const targetStage = stages.find(s => s.id === overId) ?? findStageByLeadId(overId)
      if (!targetStage) return
      await moveLeadToStage(activeLeadId, targetStage.id)
    },
    [stages, findStageByLeadId, moveLeadToStage]
  )

  const activeLead = activeId ? findLeadById(activeId) : null

  const displayedStages = useMemo(() => {
    let mapped = stages.map(stage => ({
      ...stage,
      leads: stage.leads.filter(lead => {
        if (!showHotNoContact) return true
        return (lead.score ?? 0) >= 80 && !lead.last_contact_at
      }),
    }))

    if (focusMode) {
      const topLeads = mapped
        .flatMap(stage => stage.leads)
        .sort((a, b) => {
          const scoreA = a.score ?? 0
          const scoreB = b.score ?? 0
          const ageA = a.stage_entered_at ? Date.now() - new Date(a.stage_entered_at).getTime() : 0
          const ageB = b.stage_entered_at ? Date.now() - new Date(b.stage_entered_at).getTime() : 0
          return (scoreB * 10000 + ageB) - (scoreA * 10000 + ageA)
        })
        .slice(0, 5)

      const topIds = new Set(topLeads.map(lead => lead.id))
      mapped = mapped.map(stage => ({
        ...stage,
        leads: stage.leads.filter(lead => topIds.has(lead.id)),
      }))
    }

    return mapped
  }, [stages, showHotNoContact, focusMode])

  const inboundCount = displayedStages
    .flatMap(stage => stage.leads)
    .filter(lead => ['google_ads', 'meta', 'instagram'].includes(lead.source) || lead.source_type === 'paid').length

  const volumeCount = displayedStages.flatMap(stage => stage.leads).length - inboundCount

  return (
    <>
      {boardQuery.isLoading && !demoMode && (
        <div className="bg-[#0C1824] border border-white/5 rounded-2xl p-6 text-sm text-[#7FA8C4]">
          A carregar pipeline...
        </div>
      )}
      {boardQuery.error && !demoMode && (
        <div className="bg-[#0C1824] border border-[#E84545]/40 rounded-2xl p-6 text-sm text-[#E84545]">
          Falha ao carregar pipeline: {boardQuery.error.message}
        </div>
      )}
      {!boardQuery.isLoading && !boardQuery.error && stages.length === 0 && (
        <div className="bg-[#0C1824] border border-white/5 rounded-2xl p-6 text-sm text-[#7FA8C4]">
          Ainda nao existem etapas no pipeline para esta agencia.
        </div>
      )}

      {!boardQuery.isLoading && !boardQuery.error && stages.length > 0 && (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowHotNoContact(v => !v)}
            className={`px-3 py-1.5 rounded-xl text-xs font-700 border transition-colors ${showHotNoContact ? 'bg-[#E84545]/20 border-[#E84545]/40 text-[#FFB2B2]' : 'bg-[#0C1824] border-white/10 text-[#7FA8C4]'}`}
          >
            <Flame size={12} className="inline mr-1" /> Hot Leads Sem Contacto
          </button>
          <button
            onClick={() => setFocusMode(v => !v)}
            className={`px-3 py-1.5 rounded-xl text-xs font-700 border transition-colors ${focusMode ? 'bg-[#21A0C4]/20 border-[#21A0C4]/40 text-[#9FE3F5]' : 'bg-[#0C1824] border-white/10 text-[#7FA8C4]'}`}
          >
            <Filter size={12} className="inline mr-1" /> Focus Mode (Top 5)
          </button>
        </div>
        <div className="text-[11px] text-[#7FA8C4] flex items-center gap-3">
          <span>Alta Intenção: <b className="text-[#21A0C4]">{inboundCount}</b></span>
          <span>Volume: <b className="text-[#F5A623]">{volumeCount}</b></span>
        </div>
      </div>

    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-6 min-h-[calc(100vh-200px)]">
        {displayedStages.map(stage => (
          <KanbanColumn
            key={stage.id}
            stage={stage}
            leads={stage.leads}
            activeId={activeId}
            onAdvanceLead={handleAdvanceLead}
          />
        ))}
      </div>

      <DragOverlay>
        {activeLead && (
          <div className="kanban-drag-overlay">
            <KanbanCard lead={activeLead} isDragging />
          </div>
        )}
      </DragOverlay>
    </DndContext>
    </div>
      )}
    </>
  )
}
