'use client'

import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { KanbanCard } from './KanbanCard'
import type { PipelineStage, Lead } from '@/lib/types'
import { Plus } from 'lucide-react'

interface KanbanColumnProps {
  stage: PipelineStage
  leads: Lead[]
  activeId: string | null
  onAdvanceLead?: (leadId: string) => void
  onCardClick?: (lead: Lead) => void
}

export function KanbanColumn({ stage, leads, activeId, onAdvanceLead, onCardClick }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id })

  const dealValue = leads.reduce((acc, l) => {
    const tag = l.tags?.find(t => t.startsWith('deal_value:'))
    return acc + (tag ? Number(tag.replace('deal_value:', '')) : 0)
  }, 0)

  const slaBreached = leads.filter(l => {
    if (!stage.sla_hours || !l.stage_entered_at) return false
    return (Date.now() - new Date(l.stage_entered_at).getTime()) / 3600000 > stage.sla_hours
  }).length

  const hotCount = leads.filter(l => l.temperature === 'hot').length

  return (
    <div className="flex flex-col flex-shrink-0" style={{ width: 280 }}>
      {/* Column header */}
      <div className="mb-2 px-1">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <div
              className="w-2.5 h-2.5 rounded-full"
              style={{ background: stage.color, boxShadow: `0 0 8px ${stage.color}60` }}
            />
            <span className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--t2)' }}>
              {stage.name}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            {slaBreached > 0 && (
              <span
                className="text-[10px] font-bold px-1.5 py-0.5 rounded-md"
                style={{ background: 'rgba(232,69,69,0.12)', color: '#E84545' }}
              >
                {slaBreached}⏰
              </span>
            )}
            {hotCount > 0 && (
              <span
                className="text-[10px] font-bold px-1.5 py-0.5 rounded-md"
                style={{ background: 'rgba(232,69,69,0.08)', color: '#E84545' }}
              >
                🔥{hotCount}
              </span>
            )}
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{ background: 'var(--s2)', color: 'var(--t3)' }}
            >
              {leads.length}
            </span>
          </div>
        </div>

        {/* Value bar */}
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px]" style={{ color: 'var(--t3)' }}>
            {dealValue > 0 ? `€${dealValue.toLocaleString('pt-PT')}` : '—'}
          </span>
          {stage.is_won && (
            <span className="text-[10px] font-bold" style={{ color: '#D1FF00' }}>✓ WON</span>
          )}
        </div>

        {/* Stage color bar */}
        <div className="h-0.5 rounded-full" style={{ background: stage.color, opacity: 0.4 }} />
      </div>

      {/* Drop zone */}
      <div
        ref={setNodeRef}
        className="flex-1 rounded-2xl p-2 transition-all"
        style={{
          background: isOver ? `${stage.color}10` : 'var(--s1)',
          border: `1px solid ${isOver ? stage.color + '40' : 'rgba(255,255,255,0.04)'}`,
          minHeight: 420,
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
                onClick={onCardClick}
              />
            ))}

            {leads.length === 0 && (
              <div
                className="flex flex-col items-center justify-center py-12 rounded-xl"
                style={{ border: `1px dashed ${isOver ? stage.color + '60' : 'rgba(255,255,255,0.06)'}` }}
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center mb-2"
                  style={{ background: `${stage.color}15` }}
                >
                  <Plus size={14} style={{ color: stage.color }} />
                </div>
                <span className="text-xs" style={{ color: 'var(--t3)' }}>Arrastar aqui</span>
              </div>
            )}
          </div>
        </SortableContext>
      </div>
    </div>
  )
}
