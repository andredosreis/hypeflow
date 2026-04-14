'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import {
  X, Phone, Mail, MessageSquare, Calendar,
  Activity, Target, FileText, ArrowRight,
  ExternalLink, Clock,
} from 'lucide-react'
import type { Lead } from '@/lib/types'

interface LeadSlideOverProps {
  lead: Lead | null
  onClose: () => void
}

const TEMP_COLOR: Record<string, string> = {
  cold: '#4A6680', warm: '#F5A623', hot: '#E84545',
}

const INTERACTION_CONFIG = {
  call:          { color: '#D1FF00', label: 'Call' },
  email:         { color: '#EA4335', label: 'Email' },
  whatsapp:      { color: '#25D366', label: 'WhatsApp' },
  note:          { color: 'var(--t3)', label: 'Nota' },
  status_change: { color: 'var(--cyan)', label: 'Fase' },
}

const MOCK_RECENT: { type: keyof typeof INTERACTION_CONFIG; text: string; time: string }[] = [
  { type: 'whatsapp', text: 'Mensagem enviada via WhatsApp', time: '2h' },
  { type: 'call',     text: 'Call realizada — 12min',        time: '1d' },
  { type: 'email',    text: 'Email de follow-up enviado',    time: '3d' },
]

export function LeadSlideOver({ lead, onClose }: LeadSlideOverProps) {
  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  if (!lead) return null

  const temp = lead.temperature ?? 'cold'
  const tempColor = TEMP_COLOR[temp] ?? '#4A6680'
  const score = lead.score ?? 0
  const scoreColor = score >= 80 ? '#00E5A0' : score >= 50 ? '#F5A623' : '#4A6680'
  const initials = lead.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
  const phone = (lead.phone ?? '').replace(/\D/g, '')

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        style={{ background: 'rgba(0,0,0,0.4)' }}
        onClick={onClose}
      />

      {/* Slide-over panel */}
      <div
        className="fixed right-0 top-0 h-full w-96 z-50 flex flex-col overflow-hidden"
        style={{
          background: 'var(--s1)',
          borderLeft: '1px solid rgba(255,255,255,0.07)',
          boxShadow: '-24px 0 64px rgba(0,0,0,0.5)',
          animation: 'slideInRight 250ms cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        <style>{`
          @keyframes slideInRight {
            from { transform: translateX(100%); }
            to   { transform: translateX(0); }
          }
        `}</style>

        {/* Header */}
        <div
          className="flex items-center gap-3 px-5 py-4 flex-shrink-0"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
        >
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0"
            style={{ background: `${tempColor}18`, color: tempColor }}
          >
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold truncate" style={{ color: 'var(--t1)' }}>{lead.full_name}</p>
            {lead.company && <p className="text-xs truncate" style={{ color: 'var(--t3)' }}>{lead.company}</p>}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg tonal-hover flex-shrink-0"
            style={{ color: 'var(--t3)' }}
          >
            <X size={15} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-5">

          {/* Score + Temp */}
          <div className="flex items-center gap-2">
            <div
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl"
              style={{ background: `${tempColor}18` }}
            >
              <Activity size={12} style={{ color: tempColor }} />
              <span className="text-xs font-bold" style={{ color: tempColor }}>{temp.toUpperCase()}</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl flex-1" style={{ background: 'var(--s2)' }}>
              <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--s3)' }}>
                <div className="h-1.5 rounded-full" style={{ width: `${score}%`, background: scoreColor }} />
              </div>
              <span className="text-xs font-bold" style={{ color: scoreColor }}>{score}</span>
            </div>
          </div>

          {/* Stage */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: 'var(--s2)' }}>
            <Target size={13} style={{ color: 'var(--cyan)' }} />
            <span className="text-sm" style={{ color: 'var(--t2)' }}>{lead.pipeline_stage_id ? 'Fase activa' : 'Sem fase'}</span>
          </div>

          {/* Quick actions */}
          <div className="grid grid-cols-3 gap-2">
            <a
              href={phone ? `https://wa.me/${phone}` : '#'}
              target="_blank"
              rel="noreferrer"
              className="flex flex-col items-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold"
              style={{ background: 'rgba(37,211,102,0.1)', color: '#25D366' }}
              onClick={e => !phone && e.preventDefault()}
            >
              <MessageSquare size={16} />
              WhatsApp
            </a>
            <a
              href={phone ? `tel:${phone}` : '#'}
              className="flex flex-col items-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold"
              style={{ background: 'rgba(209,255,0,0.1)', color: '#D1FF00' }}
              onClick={e => !phone && e.preventDefault()}
            >
              <Phone size={16} />
              Ligar
            </a>
            <a
              href={lead.email ? `mailto:${lead.email}` : '#'}
              className="flex flex-col items-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold"
              style={{ background: 'rgba(234,67,53,0.1)', color: '#EA4335' }}
              onClick={e => !lead.email && e.preventDefault()}
            >
              <Mail size={16} />
              Email
            </a>
          </div>

          {/* Recent activity */}
          <div>
            <p className="text-xs uppercase tracking-wider mb-3" style={{ color: 'var(--t3)' }}>Últimas actividades</p>
            <div className="flex flex-col gap-1">
              {MOCK_RECENT.map((item, i) => {
                const cfg = INTERACTION_CONFIG[item.type]
                return (
                  <div key={i} className="flex items-center gap-3 py-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded" style={{ background: `${cfg.color}18`, color: cfg.color }}>
                      {cfg.label}
                    </span>
                    <p className="flex-1 text-xs truncate" style={{ color: 'var(--t2)' }}>{item.text}</p>
                    <div className="flex items-center gap-1" style={{ color: 'var(--t3)' }}>
                      <Clock size={10} />
                      <span className="text-[10px]">{item.time}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Quick note */}
          <div>
            <p className="text-xs uppercase tracking-wider mb-2" style={{ color: 'var(--t3)' }}>Nota rápida</p>
            <textarea
              placeholder="Adicionar nota... (Enter para guardar)"
              rows={2}
              className="w-full px-3 py-2 rounded-xl text-sm outline-none resize-none"
              style={{ background: 'var(--s2)', color: 'var(--t1)', border: '1px solid rgba(255,255,255,0.05)' }}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  ;(e.target as HTMLTextAreaElement).value = ''
                }
              }}
            />
          </div>
        </div>

        {/* Footer — Ver Perfil Completo */}
        <div
          className="flex-shrink-0 p-4"
          style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
        >
          <Link
            href={`/admin/contactos/${lead.id}`}
            onClick={onClose}
            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-semibold transition-all"
            style={{ background: 'var(--cyan)', color: '#0D1117' }}
          >
            Ver Perfil Completo <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </>
  )
}
