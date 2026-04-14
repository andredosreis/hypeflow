'use client'

import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { KanbanCard } from './KanbanCard'
import type { PipelineStage, Lead } from '@/lib/types'

interface KanbanColumnProps {
  stage: PipelineStage
  leads: Lead[]
  activeId: string | null
  onAdvanceLead?: (leadId: string) => void
}

export function KanbanColumn({ stage, leads, activeId, onAdvanceLead }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id })

  const stageDealValue = leads.reduce((acc, lead) => {
    const valueTag = lead.tags?.find(tag => tag.startsWith('deal_value:'))
    const value = valueTag ? Number(valueTag.replace('deal_value:', '')) : 0
    return acc + (Number.isFinite(value) ? value : 0)
  }, 0)

  const slaBreachedCount = leads.filter(lead => {
    if (!stage.sla_hours || !lead.stage_entered_at) return false
    const hoursInStage = (Date.now() - new Date(lead.stage_entered_at).getTime()) / 3600000
    return hoursInStage > stage.sla_hours
  }).length

  return (
    <div className="flex flex-col w-68 flex-shrink-0" style={{ width: '272px' }}>
      {/* Column header — tonal, no hard border */}
      <div className="flex items-center justify-between mb-3 px-2">
        <div className="flex items-center gap-2">
          {/* Stage color accent dot */}
          <div
            className="w-2 h-2 rounded-full"
            style={{ background: stage.color ?? 'var(--cyan)', boxShadow: `0 0 6px ${stage.color ?? 'var(--cyan)'}60` }}
          />
          <span className="label-system text-[11px]">{stage.name.toUpperCase()}</span>
          <span
            className="text-[10px] font-manrope font-700 px-2 py-0.5 rounded-full"
            style={{ background: 'var(--s2)', color: 'var(--t3)' }}
          >
            {leads.length}
          </span>
        </div>
        {slaBreachedCount > 0 && (
          <span
            className="text-[10px] font-manrope font-700 px-2 py-0.5 rounded-full"
            style={{ background: 'rgba(232,69,69,0.12)', color: 'var(--danger)' }}
          >
            {slaBreachedCount} ⏰
          </span>
        )}
      </div>
      <div className="px-2 mb-2">
        <div className="text-[10px] font-700 rounded-lg px-2 py-1 inline-flex" style={{ background: 'var(--s2)', color: '#9BD6E8' }}>
          Valor em coluna: €{Math.round(stageDealValue).toLocaleString('pt-PT')}
        </div>
      </div>

      {/* Drop zone — tonal background, no border */}
      <div
        ref={setNodeRef}
        className="flex-1 rounded-2xl p-2.5 transition-all min-h-[120px]"
        style={{
          background: isOver ? 'rgba(33,160,196,0.08)' : 'var(--s1)',
          boxShadow: isOver ? 'inset 0 0 0 2px rgba(33,160,196,0.3)' : 'var(--shadow-card)',
        }}
      >
        <SortableContext items={leads.map(l => l.id)} strategy={verticalListSortingStrategy}>
          <div className="flex flex-col gap-2">
            {leads.map(lead => (
              <KanbanCard
                key={lead.id}
                lead={lead}
                stage={stage}
                isDragging={activeId === lead.id}
                onAdvance={onAdvanceLead}
              />
            ))}
            {leads.length === 0 && (
              <div
                className="text-center py-10 label-system"
                style={{ color: 'var(--t3)' }}
              >
                ARRASTAR AQUI
              </div>
            )}
          </div>
        </SortableContext>
      </div>
    </div>
  )
}
