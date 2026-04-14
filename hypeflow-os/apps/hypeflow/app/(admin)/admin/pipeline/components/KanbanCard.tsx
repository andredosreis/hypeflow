'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { differenceInHours } from 'date-fns'
import { Phone, Calendar, MessageSquare, ArrowRight, Mail } from 'lucide-react'
import type { Lead, PipelineStage } from '@/lib/types'

const SOURCE_MAP: Record<string, { label: string; color: string }> = {
  meta:       { label: 'META',    color: '#1877F2' },
  instagram:  { label: 'IG',     color: '#E1306C' },
  google_ads: { label: 'GG',     color: '#4285F4' },
  linkedin:   { label: 'LI',     color: '#0A66C2' },
  whatsapp:   { label: 'WA',     color: '#25D366' },
  organic:    { label: 'ORG',    color: '#00E5A0' },
  email:      { label: 'EMAIL',  color: '#F5A623' },
}

const TEMP_CONFIG: Record<string, { color: string; label: string }> = {
  cold: { color: '#4A6680', label: 'COLD' },
  warm: { color: '#F5A623', label: 'WARM' },
  hot:  { color: '#E84545', label: 'HOT'  },
}

interface KanbanCardProps {
  lead: Lead
  stage?: PipelineStage
  isDragging?: boolean
  onAdvance?: (leadId: string) => void
  onClick?: (lead: Lead) => void
}

export function KanbanCard({ lead, stage, isDragging = false, onAdvance, onClick }: KanbanCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging: isSortableDragging } =
    useSortable({ id: lead.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isSortableDragging ? 0.15 : 1,
  }

  const hoursInStage = lead.stage_entered_at
    ? differenceInHours(new Date(), new Date(lead.stage_entered_at))
    : 0
  const isSlaBreached = stage?.sla_hours ? hoursInStage > stage.sla_hours : false

  const temp = lead.temperature ?? 'cold'
  const tempCfg = TEMP_CONFIG[temp] ?? TEMP_CONFIG.cold!
  const src = SOURCE_MAP[lead.source] ?? { label: lead.source?.slice(0, 3).toUpperCase() ?? 'SRC', color: 'var(--t3)' }
  const score = lead.score ?? 0
  const scoreColor = score >= 80 ? '#00E5A0' : score >= 50 ? '#F5A623' : '#4A6680'
  const phone = (lead.phone ?? '').replace(/\D/g, '')

  const tagValue = lead.tags?.find(t => t.startsWith('deal_value:'))
  const dealValue = tagValue ? Number(tagValue.replace('deal_value:', '')) : null

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        background: isDragging ? 'var(--s3)' : 'var(--s2)',
        borderLeft: `3px solid ${isSlaBreached ? '#E84545' : tempCfg.color}`,
        boxShadow: isDragging
          ? '0 16px 48px rgba(0,0,0,0.5)'
          : isSlaBreached
          ? '0 0 0 1px rgba(232,69,69,0.2)'
          : '0 1px 3px rgba(0,0,0,0.2)',
      }}
      {...attributes}
      {...listeners}
      className="group relative rounded-xl p-3 cursor-grab active:cursor-grabbing select-none"
      onClick={() => onClick?.(lead)}
    >
      {/* SLA badge */}
      {isSlaBreached && (
        <div
          className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full flex items-center justify-center"
          style={{ background: '#E84545', zIndex: 1 }}
        >
          <span className="text-[8px] text-white font-black leading-none">!</span>
        </div>
      )}

      {/* Header row: name + source */}
      <div className="flex items-start justify-between gap-1.5 mb-2">
        <p className="text-sm font-semibold leading-tight flex-1 min-w-0 truncate" style={{ color: 'var(--t1)' }}>
          {lead.full_name}
        </p>
        <span
          className="text-[9px] font-bold px-1.5 py-0.5 rounded flex-shrink-0"
          style={{ background: `${src.color}18`, color: src.color }}
        >
          {src.label}
        </span>
      </div>

      {/* Company */}
      {lead.company && (
        <p className="text-[11px] mb-2 truncate" style={{ color: 'var(--t3)' }}>{lead.company}</p>
      )}

      {/* Score bar */}
      <div className="flex items-center gap-2 mb-2">
        <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: 'var(--s3)' }}>
          <div
            className="h-1 rounded-full"
            style={{ width: `${score}%`, background: scoreColor }}
          />
        </div>
        <span className="text-[11px] font-bold w-7 text-right" style={{ color: scoreColor }}>{score}</span>
      </div>

      {/* Footer: temp + time + deal value */}
      <div className="flex items-center justify-between">
        <span
          className="text-[9px] font-bold px-1.5 py-0.5 rounded"
          style={{ background: `${tempCfg.color}18`, color: tempCfg.color }}
        >
          {tempCfg.label}
        </span>
        <div className="flex items-center gap-2">
          {dealValue && (
            <span className="text-[10px] font-bold" style={{ color: '#D1FF00' }}>
              €{dealValue >= 1000 ? `${(dealValue / 1000).toFixed(1)}k` : dealValue}
            </span>
          )}
          <span
            className="text-[10px]"
            style={{ color: isSlaBreached ? '#E84545' : 'var(--t3)' }}
          >
            {hoursInStage < 24 ? `${hoursInStage}h` : `${Math.floor(hoursInStage / 24)}d`}
            {isSlaBreached && ' ⚠'}
          </span>
        </div>
      </div>

      {/* Quick actions — hover reveal */}
      <div
        className="flex gap-1 mt-2.5 opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ pointerEvents: 'none' }}
        onMouseEnter={e => ((e.currentTarget as HTMLElement).style.pointerEvents = 'auto')}
      >
        <a
          href={phone ? `https://wa.me/${phone}` : '#'}
          target="_blank"
          rel="noreferrer"
          title="WhatsApp"
          onPointerDown={e => e.stopPropagation()}
          className="p-1.5 rounded-lg"
          style={{ background: 'var(--s3)', color: '#25D366' }}
        >
          <MessageSquare size={11} />
        </a>
        <a
          href={phone ? `tel:${phone}` : '#'}
          title="Ligar"
          onPointerDown={e => e.stopPropagation()}
          className="p-1.5 rounded-lg"
          style={{ background: 'var(--s3)', color: '#D1FF00' }}
        >
          <Phone size={11} />
        </a>
        <a
          href={lead.email ? `mailto:${lead.email}` : '#'}
          title="Email"
          onPointerDown={e => e.stopPropagation()}
          className="p-1.5 rounded-lg"
          style={{ background: 'var(--s3)', color: 'var(--cyan)' }}
        >
          <Mail size={11} />
        </a>
        <button
          title="Agendar"
          onPointerDown={e => e.stopPropagation()}
          className="p-1.5 rounded-lg"
          style={{ background: 'var(--s3)', color: '#9B59B6' }}
        >
          <Calendar size={11} />
        </button>
        <button
          title="Avançar etapa"
          onPointerDown={e => e.stopPropagation()}
          onClick={e => { e.stopPropagation(); onAdvance?.(lead.id) }}
          className="p-1.5 rounded-lg ml-auto"
          style={{ background: 'rgba(33,160,196,0.15)', color: 'var(--cyan)' }}
        >
          <ArrowRight size={11} />
        </button>
      </div>
    </div>
  )
}
