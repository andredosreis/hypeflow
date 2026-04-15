'use client'

import { useState, useRef } from 'react'
import {
  Search, Plus, Phone, Calendar, MessageSquare,
  ChevronRight, Download, TrendingUp, TrendingDown,
  FileText, Upload, X, Check, Trophy, Star, Activity,
} from 'lucide-react'
import { PlatformIcon } from '@/components/icons/PlatformIcons'

/* ─── Agent metrics mock data ─── */
const MOCK_AGENTS = [
  {
    id: 'a1', name: 'Ana Silva',    avatar: 'AS',
    leads: 34, contacted: 28, closed: 8, callsThisWeek: 12,
    avgScore: 78, convRate: 23.5, revenue: 18400, trend: 'up'   as const,
  },
  {
    id: 'a2', name: 'Carlos Mendes', avatar: 'CM',
    leads: 28, contacted: 22, closed: 6, callsThisWeek: 9,
    avgScore: 72, convRate: 21.4, revenue: 14200, trend: 'up'   as const,
  },
  {
    id: 'a3', name: 'River Lopes',   avatar: 'RL',
    leads: 19, contacted: 14, closed: 3, callsThisWeek: 7,
    avgScore: 65, convRate: 15.8, revenue: 8600, trend: 'down' as const,
  },
]

function AgentMetrics() {
  const top = MOCK_AGENTS[0]!
  const medals = ['🥇', '🥈', '🥉']
  const COLS: { key: keyof typeof MOCK_AGENTS[0]; label: string; fmt?: (v: number) => string; color?: string }[] = [
    { key: 'leads',         label: 'Leads',        color: 'var(--cyan)' },
    { key: 'contacted',     label: 'Contactadas',  color: '#F5A623' },
    { key: 'closed',        label: 'Fechadas',     color: 'var(--success)' },
    { key: 'callsThisWeek', label: 'Calls / Sem',  color: '#D1FF00' },
    { key: 'avgScore',      label: 'Score Médio',  color: '#9B59B6' },
    { key: 'convRate',      label: 'Conversão',    fmt: (v) => `${v}%`, color: '#25D366' },
    { key: 'revenue',       label: 'Receita',      fmt: (v) => `€${(v/1000).toFixed(1)}k`, color: 'var(--lime)' },
  ]

  return (
    <div className="flex flex-col gap-5">
      {/* Leader highlight */}
      <div className="card p-5 flex items-center gap-5" style={{ background: 'rgba(209,255,0,0.04)', borderColor: 'rgba(209,255,0,0.12)' }}>
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-base font-bold" style={{ background: 'rgba(209,255,0,0.1)', color: '#D1FF00' }}>
          {top.avatar}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <p className="font-bold" style={{ color: 'var(--t1)' }}>{top.name}</p>
            <span className="text-sm">🥇</span>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(209,255,0,0.1)', color: '#D1FF00' }}>
              LÍDER DO MÊS
            </span>
          </div>
          <p className="text-xs mt-0.5" style={{ color: 'var(--t3)' }}>
            {top.closed} fechadas · {top.convRate}% conversão · €{(top.revenue/1000).toFixed(1)}k receita
          </p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold font-display" style={{ color: '#D1FF00' }}>{top.convRate}%</p>
          <p className="text-xs" style={{ color: 'var(--t3)' }}>taxa conversão</p>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--s1)', border: '1px solid rgba(255,255,255,0.05)' }}>
        <table className="w-full">
          <thead>
            <tr style={{ background: 'var(--s2)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--t3)' }}>#</th>
              <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--t3)' }}>Agente</th>
              {COLS.map(c => (
                <th key={c.key as string} className="text-right px-4 py-3 text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--t3)' }}>
                  {c.label}
                </th>
              ))}
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {MOCK_AGENTS.map((agent, i) => (
              <tr key={agent.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <td className="px-4 py-3.5 text-lg">{medals[i]}</td>
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold" style={{ background: 'var(--s2)', color: 'var(--t2)' }}>
                      {agent.avatar}
                    </div>
                    <p className="text-sm font-semibold" style={{ color: 'var(--t1)' }}>{agent.name}</p>
                  </div>
                </td>
                {COLS.map(c => {
                  const raw = agent[c.key as keyof typeof agent] as number
                  const pct = top[c.key as keyof typeof top] as number
                  return (
                    <td key={c.key as string} className="px-4 py-3.5 text-right">
                      <div className="flex flex-col items-end gap-0.5">
                        <span className="text-sm font-bold" style={{ color: c.color }}>
                          {c.fmt ? c.fmt(raw) : raw}
                        </span>
                        <div className="w-16 h-1 rounded-full overflow-hidden" style={{ background: 'var(--s3)' }}>
                          <div className="h-1 rounded-full" style={{ width: `${(raw / pct) * 100}%`, background: c.color }} />
                        </div>
                      </div>
                    </td>
                  )
                })}
                <td className="px-4 py-3.5">
                  <span className="text-lg">{agent.trend === 'up' ? '📈' : '📉'}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

const SOURCE_LABELS: Record<string, string> = {
  facebook: 'FB', instagram: 'IG', google: 'GG',
  linkedin: 'LI', whatsapp: 'WA', tiktok: 'TT',
  email: 'EM', manual: 'MN', organic: 'ORG',
}

const PLATFORM_SOURCES = new Set(['facebook', 'instagram', 'google', 'linkedin', 'whatsapp', 'tiktok', 'meta'])

const TEMP_CONFIG = {
  cold:  { label: 'COLD', color: '#3D5570' },
  warm:  { label: 'WARM', color: '#F5A623' },
  hot:   { label: 'HOT',  color: '#E84545' },
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  new:        { label: 'Nova',          color: '#7FA8C4' },
  qualifying: { label: 'Qualificando',  color: '#F5A623' },
  qualified:  { label: 'Qualificada',   color: '#21A0C4' },
  contacted:  { label: 'Contactada',    color: '#4FC8EA' },
  scheduled:  { label: 'Agendada',      color: '#00E5A0' },
  proposal:   { label: 'Proposta',      color: '#D1FF00' },
  closed:     { label: 'Fechada ✓',     color: '#00E5A0' },
  lost:       { label: 'Perdida ✗',     color: '#E84545' },
}

const MOCK_LEADS = Array.from({ length: 24 }, (_, i) => ({
  id: `lead-${i}`,
  full_name: ['João Silva', 'Ana Ferreira', 'Carlos Mendes', 'Sofia Lopes', 'Miguel Costa',
    'Rita Oliveira', 'Pedro Santos', 'Inês Rodrigues', 'Rui Carvalho', 'Marta Pereira'][i % 10]!,
  email: `lead${i}@email.com`,
  phone: `+351 9${String(Math.floor(Math.random() * 89999999 + 10000000))}`,
  source: ['facebook', 'instagram', 'google', 'linkedin', 'whatsapp', 'tiktok'][i % 6]!,
  temperature: ['cold', 'warm', 'hot'][i % 3] as 'cold' | 'warm' | 'hot',
  score: 30 + ((i * 13 + 7) % 65),
  status: Object.keys(STATUS_CONFIG)[i % 8]!,
  created_at: new Date(Date.now() - i * 3600000 * 8).toISOString(),
  last_contact_at: i % 3 === 0 ? null : new Date(Date.now() - i * 3600000 * 2).toISOString(),
  agent: { full_name: ['Dex Silva', 'Quinn Costa', 'River Lopes'][i % 3]! },
}))

type Lead = typeof MOCK_LEADS[number]

/* ─── detail panel ─── */
function LeadDetailPanel({ lead, onClose }: { lead: Lead; onClose: () => void }) {
  const temp = TEMP_CONFIG[lead.temperature]
  const status = STATUS_CONFIG[lead.status]

  return (
    <div
      className="w-96 flex-shrink-0 flex flex-col animate-slide-in"
      style={{ background: 'var(--s1)', borderLeft: '1px solid rgba(255,255,255,0.04)' }}
    >
      {/* Header */}
      <div className="flex items-start justify-between p-6">
        <div>
          <h2 className="display-title text-xl" style={{ color: 'var(--t1)' }}>{lead.full_name}</h2>
          <p className="text-sm mt-1" style={{ color: 'var(--t2)' }}>{lead.email}</p>
        </div>
        <button
          onClick={onClose}
          className="tonal-hover p-2 rounded-xl transition-colors text-lg leading-none"
          style={{ color: 'var(--t3)' }}
        >
          ✕
        </button>
      </div>

      {/* Score + temp + status row */}
      <div className="grid grid-cols-3 gap-2 px-6 pb-5">
        {[
          { label: 'SCORE', value: String(lead.score), color: lead.score >= 80 ? 'var(--success)' : lead.score >= 50 ? '#F5A623' : 'var(--t3)' },
          { label: 'TEMP', value: temp.label, color: temp.color },
          { label: 'ESTADO', value: status?.label ?? '—', color: status?.color ?? 'var(--t3)' },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-xl p-3 text-center" style={{ background: 'var(--s2)' }}>
            <p className="font-manrope font-800 text-base" style={{ color }}>{value}</p>
            <p className="label-system mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Details */}
      <div className="flex-1 overflow-y-auto px-6 flex flex-col gap-5">
        <div>
          <p className="label-system mb-3">DETALHES</p>
          <div className="flex flex-col gap-2.5">
            {([
              { label: 'Telefone',        value: lead.phone,        isSource: false },
              { label: 'Fonte',           value: lead.source,       isSource: true  },
              { label: 'Agente',          value: lead.agent.full_name, isSource: false },
              { label: 'Criada',          value: new Date(lead.created_at).toLocaleDateString('pt-PT'), isSource: false },
              { label: 'Último Contacto', value: lead.last_contact_at ? new Date(lead.last_contact_at).toLocaleDateString('pt-PT') : '—', isSource: false },
            ] as { label: string; value: string; isSource: boolean }[]).map(({ label, value, isSource }) => (
              <div key={label} className="flex items-center justify-between py-1" style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                <span className="text-xs" style={{ color: 'var(--t3)' }}>{label}</span>
                {isSource && PLATFORM_SOURCES.has(value) ? (
                  <div className="flex items-center gap-1.5">
                    <PlatformIcon platform={value} size={16} />
                    <span className="text-xs font-manrope font-600 capitalize" style={{ color: 'var(--t1)' }}>{value}</span>
                  </div>
                ) : (
                  <span className="text-xs font-manrope font-600" style={{ color: 'var(--t1)' }}>{value}</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Timeline */}
        <div>
          <p className="label-system mb-3">TIMELINE</p>
          <div className="flex flex-col gap-3">
            {[
              { icon: '📞', text: 'Call realizada — avançou para proposta', time: '2h atrás', color: 'var(--success)' },
              { icon: '💬', text: 'WhatsApp enviado automaticamente', time: '1 dia', color: '#25D366' },
              { icon: '📥', text: 'Lead criada via Facebook Ads', time: '3 dias', color: '#1877F2' },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center text-sm flex-shrink-0" style={{ background: 'var(--s2)' }}>
                  {item.icon}
                </div>
                <div className="flex-1">
                  <p className="text-xs font-manrope font-600 leading-snug" style={{ color: 'var(--t1)' }}>{item.text}</p>
                  <p className="text-[10px] mt-0.5" style={{ color: 'var(--t3)' }}>{item.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Form answers indicator */}
        <div className="rounded-xl p-3 flex items-center gap-3" style={{ background: 'rgba(33,160,196,0.06)', border: '1px solid rgba(33,160,196,0.15)' }}>
          <FileText size={14} style={{ color: 'var(--cyan)' }} />
          <p className="text-xs font-manrope flex-1" style={{ color: 'var(--t2)' }}>Formulário de qualificação preenchido</p>
          <ChevronRight size={12} style={{ color: 'var(--t3)' }} />
        </div>
      </div>

      {/* Actions */}
      <div className="p-4 grid grid-cols-3 gap-2" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
        {[
          { icon: Phone, label: 'Ligar', color: 'var(--cyan)' },
          { icon: Calendar, label: 'Agendar', color: 'var(--success)' },
          { icon: MessageSquare, label: 'WhatsApp', color: '#25D366' },
        ].map(({ icon: Icon, label, color }) => (
          <button
            key={label}
            className="flex flex-col items-center gap-1.5 p-3 rounded-xl tonal-hover transition-all"
            style={{ background: 'var(--s2)' }}
          >
            <Icon size={16} style={{ color }} />
            <span className="label-system" style={{ fontSize: '0.58rem' }}>{label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

/* ─── score preview helper ─── */
type AddLeadForm = { name: string; email: string; phone: string; company: string; source: string; budget: string; notes: string }

function estimateScore(f: AddLeadForm): { score: number; temp: 'cold' | 'warm' | 'hot'; factors: { label: string; pts: number }[] } {
  const factors: { label: string; pts: number }[] = []
  if (f.name.trim().length > 2)   factors.push({ label: 'Nome preenchido',   pts: 5  })
  if (f.email.includes('@'))       factors.push({ label: 'Email válido',       pts: 10 })
  if (f.phone.replace(/\D/g,'').length >= 9) factors.push({ label: 'Telefone',  pts: 15 })
  if (f.company.trim().length > 1) factors.push({ label: 'Empresa',            pts: 10 })
  const srcPts: Record<string, number> = { linkedin: 25, meta: 20, google_ads: 20, instagram: 15, whatsapp: 10, organic: 5 }
  if (f.source && srcPts[f.source]) factors.push({ label: `Fonte (${f.source})`, pts: srcPts[f.source]! })
  const budget = Number(f.budget)
  if (budget > 5000)      factors.push({ label: 'Budget > €5k',  pts: 25 })
  else if (budget > 2000) factors.push({ label: 'Budget > €2k',  pts: 15 })
  else if (budget > 1000) factors.push({ label: 'Budget > €1k',  pts: 10 })
  else if (budget > 0)    factors.push({ label: 'Budget indicado', pts: 5 })
  if (f.notes.trim().length > 40) factors.push({ label: 'Notas detalhadas', pts: 5 })
  const raw = factors.reduce((s, f) => s + f.pts, 0)
  const score = Math.min(100, Math.round((raw / 90) * 100))
  const temp = score >= 70 ? 'hot' : score >= 40 ? 'warm' : 'cold'
  return { score, temp, factors }
}

/* ─── add lead modal ─── */
function AddLeadModal({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState<AddLeadForm>({ name: '', email: '', phone: '', company: '', source: '', budget: '', notes: '' })
  const upd = (k: keyof AddLeadForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }))

  const { score, temp, factors } = estimateScore(form)
  const tempColor = temp === 'hot' ? '#E84545' : temp === 'warm' ? '#F5A623' : '#4A6680'
  const tempLabel = temp === 'hot' ? 'HOT' : temp === 'warm' ? 'WARM' : 'COLD'
  const scoreColor = score >= 70 ? '#1EC87A' : score >= 40 ? '#F5A623' : '#4A6680'

  const SOURCES = [
    { value: 'meta',       label: 'Facebook/Meta Ads' },
    { value: 'instagram',  label: 'Instagram Ads' },
    { value: 'google_ads', label: 'Google Ads' },
    { value: 'linkedin',   label: 'LinkedIn' },
    { value: 'whatsapp',   label: 'WhatsApp' },
    { value: 'organic',    label: 'Orgânico / Referência' },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)' }}>
      <div className="w-full max-w-2xl rounded-2xl flex overflow-hidden" style={{ background: 'var(--s1)', boxShadow: 'var(--shadow-float)', maxHeight: '90vh' }}>

        {/* Form column */}
        <div className="flex-1 flex flex-col overflow-y-auto">
          <div className="flex items-center justify-between p-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <p className="text-sm font-bold" style={{ color: 'var(--t1)' }}>Nova Lead</p>
            <button onClick={onClose} className="tonal-hover p-1.5 rounded-lg" style={{ color: 'var(--t3)' }}><X size={14} /></button>
          </div>
          <div className="p-5 flex flex-col gap-4">
            {/* Name + Phone */}
            <div className="grid grid-cols-2 gap-3">
              {([['name','Nome *','text','João Silva'],['phone','Telefone','tel','+351 9xx xxx xxx']] as const).map(([k,l,t,ph]) => (
                <div key={k}>
                  <label className="text-[10px] font-bold uppercase tracking-widest block mb-1.5" style={{ color: 'var(--t3)' }}>{l}</label>
                  <input type={t} value={form[k]} onChange={upd(k)} placeholder={ph}
                    className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
                    style={{ background: 'var(--s2)', border: '1px solid rgba(255,255,255,0.06)', color: 'var(--t1)' }} />
                </div>
              ))}
            </div>
            {/* Email + Company */}
            <div className="grid grid-cols-2 gap-3">
              {([['email','Email','email','nome@empresa.pt'],['company','Empresa','text','Empresa Lda']] as const).map(([k,l,t,ph]) => (
                <div key={k}>
                  <label className="text-[10px] font-bold uppercase tracking-widest block mb-1.5" style={{ color: 'var(--t3)' }}>{l}</label>
                  <input type={t} value={form[k]} onChange={upd(k)} placeholder={ph}
                    className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
                    style={{ background: 'var(--s2)', border: '1px solid rgba(255,255,255,0.06)', color: 'var(--t1)' }} />
                </div>
              ))}
            </div>
            {/* Source + Budget */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest block mb-1.5" style={{ color: 'var(--t3)' }}>Fonte</label>
                <select value={form.source} onChange={upd('source')}
                  className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
                  style={{ background: 'var(--s2)', border: '1px solid rgba(255,255,255,0.06)', color: form.source ? 'var(--t1)' : 'var(--t3)' }}>
                  <option value="">Seleccionar fonte...</option>
                  {SOURCES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest block mb-1.5" style={{ color: 'var(--t3)' }}>Budget estimado (€)</label>
                <input type="number" value={form.budget} onChange={upd('budget')} placeholder="0"
                  className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
                  style={{ background: 'var(--s2)', border: '1px solid rgba(255,255,255,0.06)', color: 'var(--t1)' }} />
              </div>
            </div>
            {/* Notes */}
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest block mb-1.5" style={{ color: 'var(--t3)' }}>Notas</label>
              <textarea value={form.notes} onChange={upd('notes')} rows={3} placeholder="Contexto inicial, canal de contacto, observações..."
                className="w-full rounded-xl px-3 py-2.5 text-sm outline-none resize-none"
                style={{ background: 'var(--s2)', border: '1px solid rgba(255,255,255,0.06)', color: 'var(--t1)' }} />
            </div>
          </div>
          <div className="p-5 pt-0 flex gap-3">
            <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm" style={{ background: 'var(--s2)', color: 'var(--t3)' }}>Cancelar</button>
            <button
              disabled={!form.name.trim()}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-opacity disabled:opacity-40"
              style={{ background: 'var(--cyan)', color: '#050D14' }}
              onClick={onClose}
            >
              Criar Lead
            </button>
          </div>
        </div>

        {/* Score preview column */}
        <div className="w-64 flex-shrink-0 flex flex-col gap-4 p-5" style={{ borderLeft: '1px solid rgba(255,255,255,0.05)', background: 'var(--s0)' }}>
          <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--t3)' }}>Score Estimado</p>

          {/* Big score ring */}
          <div className="flex flex-col items-center gap-2">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center"
              style={{
                background: `conic-gradient(${scoreColor} ${score * 3.6}deg, rgba(255,255,255,0.06) 0deg)`,
                boxShadow: `0 0 20px ${scoreColor}30`,
              }}
            >
              <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: 'var(--s0)' }}>
                <span className="text-2xl font-black" style={{ color: scoreColor }}>{score}</span>
              </div>
            </div>
            <span
              className="text-xs font-bold px-3 py-1 rounded-full"
              style={{ background: `${tempColor}18`, color: tempColor }}
            >
              {tempLabel}
            </span>
          </div>

          {/* Score bar */}
          <div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--s2)' }}>
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{ width: `${score}%`, background: scoreColor }}
              />
            </div>
          </div>

          {/* Factors breakdown */}
          <div className="flex flex-col gap-2 flex-1">
            <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: 'var(--t3)' }}>Factores activos</p>
            {factors.length === 0 ? (
              <p className="text-[10px]" style={{ color: 'var(--t3)' }}>Preencha o formulário para ver a estimativa de score.</p>
            ) : factors.map(f => (
              <div key={f.label} className="flex items-center justify-between">
                <span className="text-[10px]" style={{ color: 'var(--t2)' }}>{f.label}</span>
                <span className="text-[10px] font-bold" style={{ color: scoreColor }}>+{f.pts}</span>
              </div>
            ))}
          </div>

          {/* Missing factors hint */}
          {score < 60 && (
            <div className="rounded-xl p-3" style={{ background: 'rgba(245,166,35,0.08)', border: '1px solid rgba(245,166,35,0.15)' }}>
              <p className="text-[9px] font-bold" style={{ color: '#F5A623' }}>💡 Para melhorar o score:</p>
              <ul className="mt-1 flex flex-col gap-1">
                {!form.phone && <li className="text-[9px]" style={{ color: 'var(--t3)' }}>• Adicione o telefone (+15)</li>}
                {!form.company && <li className="text-[9px]" style={{ color: 'var(--t3)' }}>• Adicione a empresa (+10)</li>}
                {!form.source && <li className="text-[9px]" style={{ color: 'var(--t3)' }}>• Seleccione a fonte (+20)</li>}
                {!form.budget && <li className="text-[9px]" style={{ color: 'var(--t3)' }}>• Indique o budget (+25)</li>}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ─── import modal ─── */
function ImportModal({ onClose }: { onClose: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [step, setStep] = useState<'upload' | 'preview' | 'done'>('upload')

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) { setFile(f); setStep('preview') }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}>
      <div className="w-full max-w-md rounded-2xl flex flex-col overflow-hidden" style={{ background: 'var(--s1)', boxShadow: 'var(--shadow-float)' }}>
        <div className="flex items-center justify-between p-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <p className="text-sm font-bold" style={{ color: 'var(--t1)' }}>Importar Leads</p>
          <button onClick={onClose} className="tonal-hover p-1.5 rounded-lg" style={{ color: 'var(--t3)' }}>
            <X size={14} />
          </button>
        </div>

        <div className="p-5 flex flex-col gap-4">
          {step === 'upload' && (
            <>
              <div
                onClick={() => fileRef.current?.click()}
                className="border-2 border-dashed rounded-2xl p-8 flex flex-col items-center gap-3 cursor-pointer transition-all"
                style={{ borderColor: 'rgba(33,160,196,0.3)', background: 'rgba(33,160,196,0.04)' }}
              >
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(33,160,196,0.1)' }}>
                  <Upload size={20} style={{ color: 'var(--cyan)' }} />
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold" style={{ color: 'var(--t1)' }}>Arraste um ficheiro CSV ou clique</p>
                  <p className="text-xs mt-1" style={{ color: 'var(--t3)' }}>Suporta .csv · máx 10 MB</p>
                </div>
              </div>
              <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFile} />
              <div className="rounded-xl p-3" style={{ background: 'var(--s2)' }}>
                <p className="text-xs font-semibold mb-2" style={{ color: 'var(--t2)' }}>Colunas esperadas:</p>
                <div className="flex flex-wrap gap-1.5">
                  {['nome', 'email', 'telefone', 'fonte', 'score', 'temperatura'].map(c => (
                    <span key={c} className="text-[10px] px-2 py-0.5 rounded-lg font-mono" style={{ background: 'var(--s3)', color: 'var(--t3)' }}>{c}</span>
                  ))}
                </div>
              </div>
            </>
          )}

          {step === 'preview' && file && (
            <>
              <div className="flex items-center gap-3 rounded-xl p-3" style={{ background: 'var(--s2)' }}>
                <FileText size={16} style={{ color: 'var(--cyan)' }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: 'var(--t1)' }}>{file.name}</p>
                  <p className="text-xs" style={{ color: 'var(--t3)' }}>{(file.size / 1024).toFixed(1)} KB</p>
                </div>
                <Check size={16} style={{ color: 'var(--success)' }} />
              </div>
              <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.05)' }}>
                <table className="w-full text-[10px]">
                  <thead style={{ background: 'var(--s2)' }}>
                    <tr>
                      {['Nome', 'Email', 'Fonte', 'Score'].map(h => (
                        <th key={h} className="text-left px-3 py-2 font-bold" style={{ color: 'var(--t3)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ['Marta Alves', 'marta@email.com', 'facebook', '72'],
                      ['Paulo Gomes', 'paulo@email.com', 'google', '58'],
                      ['Ana Simões', 'ana@email.com', 'instagram', '81'],
                    ].map((row, i) => (
                      <tr key={i} style={{ borderTop: '1px solid rgba(255,255,255,0.03)' }}>
                        {row.map((cell, j) => (
                          <td key={j} className="px-3 py-2" style={{ color: 'var(--t2)' }}>{cell}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-center" style={{ color: 'var(--t3)' }}>Pré-visualização — 3 de 24 registos</p>
            </>
          )}

          {step === 'done' && (
            <div className="flex flex-col items-center gap-3 py-6">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(0,229,160,0.1)' }}>
                <Check size={24} style={{ color: 'var(--success)' }} />
              </div>
              <p className="text-sm font-bold" style={{ color: 'var(--t1)' }}>24 leads importadas com sucesso!</p>
              <p className="text-xs" style={{ color: 'var(--t3)' }}>Duplicados removidos · Score calculado automaticamente</p>
            </div>
          )}
        </div>

        <div className="flex gap-3 p-5 pt-0">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-semibold tonal-hover" style={{ background: 'var(--s2)', color: 'var(--t2)' }}>
            {step === 'done' ? 'Fechar' : 'Cancelar'}
          </button>
          {step === 'preview' && (
            <button onClick={() => setStep('done')} className="flex-1 btn-lime py-2.5 rounded-xl text-sm">
              Importar 24 leads
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function exportCSV(leads: typeof MOCK_LEADS) {
  const headers = ['Nome', 'Email', 'Telefone', 'Fonte', 'Score', 'Temperatura', 'Estado', 'Agente', 'Criada']
  const rows = leads.map(l => [
    l.full_name, l.email, l.phone, l.source, l.score, l.temperature, l.status, l.agent.full_name,
    new Date(l.created_at).toLocaleDateString('pt-PT'),
  ])
  const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a'); a.href = url; a.download = 'leads.csv'; a.click()
  URL.revokeObjectURL(url)
}

/* ─── main page ─── */
export default function ComercialPage() {
  const [view, setView] = useState<'leads' | 'agents'>('leads')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [tempFilter, setTempFilter] = useState('all')
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [searchFocus, setSearchFocus] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [showAdd, setShowAdd] = useState(false)

  const filtered = MOCK_LEADS.filter(l => {
    const matchSearch = !search || l.full_name.toLowerCase().includes(search.toLowerCase()) || l.email.includes(search)
    const matchStatus = statusFilter === 'all' || l.status === statusFilter
    const matchTemp = tempFilter === 'all' || l.temperature === tempFilter
    return matchSearch && matchStatus && matchTemp
  })

  const hotCount = MOCK_LEADS.filter(l => l.temperature === 'hot').length
  const noContactCount = MOCK_LEADS.filter(l => !l.last_contact_at).length

  return (
    <>
      {showImport && <ImportModal onClose={() => setShowImport(false)} />}
      {showAdd    && <AddLeadModal onClose={() => setShowAdd(false)} />}
    <div className="flex h-full gap-0 overflow-hidden animate-fade-in">
      {/* Main panel */}
      <div className="flex-1 flex flex-col gap-5 min-w-0 overflow-hidden">

        {/* Header */}
        <div className="flex items-end justify-between">
          <div>
            <p className="label-system mb-1">CRM · {filtered.length} LEADS ACTIVAS</p>
            <h1 className="page-title">Comercial</h1>
          </div>
          <div className="flex gap-2">
            {/* View toggle */}
            <div className="flex rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
              <button
                onClick={() => setView('leads')}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold transition-colors"
                style={{ background: view === 'leads' ? 'var(--s3)' : 'var(--s1)', color: view === 'leads' ? 'var(--t1)' : 'var(--t3)' }}
              >
                <Activity size={12} /> Leads
              </button>
              <button
                onClick={() => setView('agents')}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold transition-colors"
                style={{ background: view === 'agents' ? 'var(--s3)' : 'var(--s1)', color: view === 'agents' ? '#D1FF00' : 'var(--t3)' }}
              >
                <Trophy size={12} /> Agentes
              </button>
            </div>
            <button
              onClick={() => setShowImport(true)}
              className="flex items-center gap-2 text-xs font-semibold px-4 py-2.5 rounded-xl tonal-hover transition-colors"
              style={{ background: 'var(--s1)', color: 'var(--t2)' }}
            >
              <Upload size={13} /> Importar
            </button>
            <button
              onClick={() => exportCSV(filtered)}
              className="flex items-center gap-2 text-xs font-semibold px-4 py-2.5 rounded-xl tonal-hover transition-colors"
              style={{ background: 'var(--s1)', color: 'var(--t2)' }}
            >
              <Download size={13} /> Exportar CSV
            </button>
            <button
              onClick={() => setShowAdd(true)}
              className="btn-lime flex items-center gap-2 px-5 py-2.5 text-sm rounded-xl"
            >
              <Plus size={14} /> Nova Lead
            </button>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: 'TOTAL LEADS',    value: MOCK_LEADS.length,              delta: '+8', up: true,  color: 'var(--cyan)' },
            { label: 'HOT LEADS',      value: hotCount,                        delta: '+3', up: true,  color: '#E84545' },
            { label: 'SEM CONTACTO',   value: noContactCount,                  delta: '+2', up: false, color: '#F5A623' },
            { label: 'FECHADAS (MÊS)', value: MOCK_LEADS.filter(l => l.status === 'closed').length, delta: '+1', up: true, color: 'var(--success)' },
          ].map(({ label, value, delta, up, color }) => (
            <div key={label} className="rounded-2xl p-4 flex items-center justify-between" style={{ background: 'var(--s1)', boxShadow: 'var(--shadow-card)' }}>
              <div>
                <p className="label-system mb-1">{label}</p>
                <p className="metric-xl" style={{ fontSize: '2rem' }}>{value}</p>
              </div>
              <span
                className="flex items-center gap-1 text-xs font-manrope font-700 px-2 py-1 rounded-lg"
                style={{ background: up ? 'rgba(0,229,160,0.1)' : 'rgba(232,69,69,0.1)', color: up ? 'var(--success)' : 'var(--danger)' }}
              >
                {up ? <TrendingUp size={10} /> : <TrendingDown size={10} />} {delta}
              </span>
            </div>
          ))}
        </div>

        {view === 'agents' && <AgentMetrics />}

        {/* Leads view */}
        {view === 'leads' && <>
        {/* Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Search */}
          <div
            className="flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 flex-1 max-w-xs transition-all"
            style={{
              background: 'var(--s1)',
              border: searchFocus ? '1px solid rgba(33,160,196,0.3)' : '1px solid transparent',
              boxShadow: searchFocus ? '0 0 0 3px rgba(33,160,196,0.1)' : 'none',
            }}
          >
            <Search size={14} style={{ color: searchFocus ? 'var(--cyan)' : 'var(--t3)' }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              onFocus={() => setSearchFocus(true)}
              onBlur={() => setSearchFocus(false)}
              placeholder="Pesquisar leads..."
              className="bg-transparent text-sm outline-none w-full"
              style={{ color: 'var(--t1)', caretColor: 'var(--cyan)' }}
            />
          </div>

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="text-sm rounded-xl px-3 py-2.5 outline-none"
            style={{ background: 'var(--s1)', color: 'var(--t2)', border: '1px solid transparent' }}
          >
            <option value="all">Todos os estados</option>
            {Object.entries(STATUS_CONFIG).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>

          {/* Temp filter */}
          <div className="flex rounded-xl overflow-hidden" style={{ background: 'var(--s1)' }}>
            {(['all', 'hot', 'warm', 'cold'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTempFilter(t)}
                className="px-3 py-2.5 text-xs font-manrope font-600 transition-all"
                style={{
                  background: tempFilter === t ? 'var(--s3)' : 'transparent',
                  color: tempFilter === t
                    ? (t === 'hot' ? '#E84545' : t === 'warm' ? '#F5A623' : t === 'cold' ? '#3D5570' : 'var(--lime)')
                    : 'var(--t3)',
                }}
              >
                {t === 'all' ? 'Todos' : TEMP_CONFIG[t].label}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="rounded-2xl flex-1 overflow-hidden" style={{ background: 'var(--s1)', boxShadow: 'var(--shadow-card)' }}>
          <div className="overflow-auto h-full">
            <table className="w-full">
              <thead className="sticky top-0" style={{ background: 'var(--s1)' }}>
                <tr>
                  {['LEAD', 'CANAL', 'SCORE', 'TEMP', 'ESTADO', 'AGENTE', 'CONTACTO', ''].map(h => (
                    <th
                      key={h}
                      className="text-left px-4 py-3 whitespace-nowrap label-system"
                      style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(lead => {
                  const temp = TEMP_CONFIG[lead.temperature]
                  const status = STATUS_CONFIG[lead.status]
                  const isSelected = selectedLead?.id === lead.id
                  const scoreColor = lead.score >= 80 ? 'var(--success)' : lead.score >= 50 ? '#F5A623' : 'var(--t3)'
                  return (
                    <tr
                      key={lead.id}
                      onClick={() => setSelectedLead(isSelected ? null : lead)}
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
                            className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-manrope font-700 flex-shrink-0"
                            style={{ background: 'rgba(33,160,196,0.1)', color: 'var(--cyan)' }}
                          >
                            {lead.full_name.charAt(0)}
                          </div>
                          <div>
                            <p className="text-sm font-manrope font-600" style={{ color: 'var(--t1)' }}>{lead.full_name}</p>
                            <p className="text-[10px]" style={{ color: 'var(--t3)' }}>{lead.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {PLATFORM_SOURCES.has(lead.source) ? (
                          <PlatformIcon platform={lead.source} size={22} />
                        ) : (
                          <span className="text-[10px] font-manrope font-700 px-2 py-1 rounded-lg" style={{ background: 'var(--s2)', color: 'var(--t3)' }}>
                            {SOURCE_LABELS[lead.source] ?? '?'}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1 rounded-full" style={{ background: 'var(--s3)' }}>
                            <div className="h-1 rounded-full" style={{ width: `${lead.score}%`, background: scoreColor }} />
                          </div>
                          <span className="text-xs font-manrope font-700" style={{ color: scoreColor }}>{lead.score}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="text-[9px] font-manrope font-700 px-2 py-1 rounded"
                          style={{ background: `${temp.color}18`, color: temp.color }}
                        >
                          {temp.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-manrope font-600" style={{ color: status?.color }}>{status?.label}</span>
                      </td>
                      <td className="px-4 py-3 text-xs font-manrope" style={{ color: 'var(--t2)' }}>{lead.agent.full_name}</td>
                      <td className="px-4 py-3 text-xs font-manrope" style={{ color: lead.last_contact_at ? 'var(--t3)' : 'var(--danger)' }}>
                        {lead.last_contact_at ? new Date(lead.last_contact_at).toLocaleDateString('pt-PT') : 'Sem contacto'}
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
        </div>
        </>}
      </div>

      {/* Detail panel */}
      {selectedLead && (
        <LeadDetailPanel lead={selectedLead} onClose={() => setSelectedLead(null)} />
      )}
    </div>
    </>
  )
}
