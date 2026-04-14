'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { differenceInHours } from 'date-fns'
import { Phone, Calendar, MessageSquare, User, ArrowRight } from 'lucide-react'
import type { Lead, PipelineStage } from '@/lib/types'

const SOURCE_LABELS: Record<string, string> = {
  facebook: 'FB', instagram: 'IG', google: 'GG',
  linkedin: 'LI', whatsapp: 'WA', email: 'EM',
  manychat: 'MC', organic: 'ORG', manual: 'MN',
}

const TEMP_CONFIG: Record<string, { color: string; label: string }> = {
  cold: { color: '#3D5570', label: 'COLD' },
  warm: { color: '#F5A623', label: 'WARM' },
  hot:  { color: '#E84545', label: 'HOT'  },
}

interface KanbanCardProps {
  lead: Lead
  stage?: PipelineStage
  isDragging?: boolean
  onAdvance?: (leadId: string) => void
}

export function KanbanCard({ lead, stage, isDragging = false, onAdvance }: KanbanCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging: isSortableDragging } =
    useSortable({ id: lead.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isSortableDragging ? 0.2 : 1,
  }

  const hoursInStage = lead.stage_entered_at
    ? differenceInHours(new Date(), new Date(lead.stage_entered_at))
    : 0

  const isSlaBreached = stage?.sla_hours ? hoursInStage > stage.sla_hours : false
  const temp = lead.temperature ?? 'cold'
  const tempCfg = TEMP_CONFIG[temp] ?? TEMP_CONFIG.cold!
  const score = lead.score ?? 0

  const scoreColor = score >= 80 ? 'var(--success)' : score >= 50 ? '#F5A623' : 'var(--t3)'
  const normalizedPhone = (lead.phone ?? '').replace(/\D/g, '')
  const whatsappUrl = normalizedPhone
    ? `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(`Ola ${lead.full_name}, vi o seu interesse na Hype Flow e podemos avancar com o diagnostico.`)}`
    : `https://wa.me/?text=${encodeURIComponent(`Ola ${lead.full_name}, vi o seu interesse na Hype Flow e podemos avancar com o diagnostico.`)}`
  const linkedinUrl = `https://www.linkedin.com/search/results/all/?keywords=${encodeURIComponent(lead.full_name)}`

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        background: 'var(--s2)',
        boxShadow: isDragging ? 'var(--shadow-float)' : 'var(--shadow-card)',
        borderLeft: `3px solid ${isSlaBreached ? 'var(--danger)' : tempCfg.color}`,
      }}
      {...attributes}
      {...listeners}
      className={`
        group relative rounded-xl p-3 cursor-grab active:cursor-grabbing
        select-none transition-all duration-150
        ${isSlaBreached ? 'sla-breached' : ''}
        ${isDragging ? 'scale-105' : ''}
      `}
    >
      {/* SLA breach badge */}
      {isSlaBreached && (
        <div
          className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full flex items-center justify-center"
          style={{ background: 'var(--danger)' }}
        >
          <span className="text-[8px] text-white font-black">!</span>
        </div>
      )}

      {/* Name + source */}
      <div className="flex items-start justify-between gap-2 mb-2.5">
        <p className="text-sm font-manrope font-600 leading-tight truncate" style={{ color: 'var(--t1)' }}>
          {lead.full_name}
        </p>
        <span
          className="text-[9px] font-manrope font-700 px-1.5 py-0.5 rounded flex-shrink-0"
          style={{ background: 'var(--s3)', color: 'var(--t3)' }}
        >
          {SOURCE_LABELS[lead.source] ?? 'SRC'}
        </span>
      </div>

      {/* Score bar */}
      <div className="flex items-center gap-2 mb-2">
        <div className="flex-1 h-1 rounded-full" style={{ background: 'var(--s3)' }}>
          <div
            className="h-1 rounded-full"
            style={{ width: `${score}%`, background: scoreColor }}
          />
        </div>
        <span className="text-xs font-manrope font-700 w-8 text-right" style={{ color: scoreColor }}>
          {score}
        </span>
      </div>

      {/* Temp + time */}
      <div className="flex items-center justify-between">
        <span
          className="text-[9px] font-manrope font-700 px-1.5 py-0.5 rounded"
          style={{ background: `${tempCfg.color}18`, color: tempCfg.color }}
        >
          {tempCfg.label}
        </span>
        <span
          className="text-[10px] font-manrope"
          style={{ color: isSlaBreached ? 'var(--danger)' : 'var(--t3)' }}
        >
          {hoursInStage < 24 ? `${hoursInStage}h` : `${Math.floor(hoursInStage / 24)}d`}
          {isSlaBreached && ' ⚠'}
        </span>
      </div>

      {/* Quick actions — hover reveal */}
      <div className="flex gap-1.5 mt-2.5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none group-hover:pointer-events-auto">
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noreferrer"
          title="Abrir WhatsApp"
          onPointerDown={e => e.stopPropagation()}
          className="p-1.5 rounded-lg transition-all tonal-hover"
          style={{ background: 'var(--s3)', color: 'var(--t3)' }}
        >
          <MessageSquare size={11} />
        </a>
        <a
          href={linkedinUrl}
          target="_blank"
          rel="noreferrer"
          title="Abrir LinkedIn"
          onPointerDown={e => e.stopPropagation()}
          className="p-1.5 rounded-lg transition-all tonal-hover"
          style={{ background: 'var(--s3)', color: 'var(--t3)' }}
        >
          <User size={11} />
        </a>
        <button
          title="Agendar Call"
          onPointerDown={e => e.stopPropagation()}
          className="p-1.5 rounded-lg transition-all tonal-hover"
          style={{ background: 'var(--s3)', color: 'var(--t3)' }}
        >
          <Calendar size={11} />
        </button>
        <button
          title="Mover para proxima fase"
          onPointerDown={e => e.stopPropagation()}
          onClick={() => onAdvance?.(lead.id)}
          className="p-1.5 rounded-lg transition-all tonal-hover"
          style={{ background: 'var(--s3)', color: 'var(--t3)' }}
        >
          <ArrowRight size={11} />
        </button>
        <a
          href={normalizedPhone ? `tel:${normalizedPhone}` : '#'}
          title="Ligar"
          onPointerDown={e => e.stopPropagation()}
          className="p-1.5 rounded-lg transition-all tonal-hover"
          style={{ background: 'var(--s3)', color: 'var(--t3)' }}
        >
          <Phone size={11} />
        </a>
      </div>
    </div>
  )
}
