'use client'

import { useState, useMemo, useEffect } from 'react'
import {
  Phone, Plus, ChevronLeft, ChevronRight, Calendar,
  Video, Clock, User, CheckCircle2, XCircle, AlertCircle,
  TrendingUp, PhoneCall, PhoneOff, X, Star, ChevronDown,
  Bell, Filter,
} from 'lucide-react'

/* ─────────────────────────── types ─────────────────────────── */

type CallStatus  = 'scheduled' | 'completed' | 'no_show' | 'cancelled'
type CallType    = 'discovery' | 'proposal' | 'follow_up' | 'onboarding'
type CallOutcome = 'closed' | 'follow_up' | 'not_qualified' | 'thinking' | 'no_show' | null

interface MockCall {
  id: string
  lead_name: string
  lead_email: string
  lead_score: number
  agent: string
  date: string        // ISO
  duration_min: number
  status: CallStatus
  type: CallType
  outcome: CallOutcome
  meet_link: string | null
  notes: string | null
}

/* ─────────────────────────── mock data ─────────────────────────── */

const TODAY = new Date()
const pad = (n: number) => String(n).padStart(2, '0')
const isoDate = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

function addDays(d: Date, n: number) {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}

const LEADS = [
  'João Silva', 'Ana Ferreira', 'Carlos Mendes', 'Sofia Lopes',
  'Miguel Costa', 'Rita Oliveira', 'Pedro Santos', 'Inês Rodrigues',
]
const AGENTS = ['Dex Silva', 'Quinn Costa', 'River Lopes']
const HOURS  = [9, 10, 11, 14, 15, 16, 17]
const TYPES: CallType[] = ['discovery', 'proposal', 'follow_up', 'onboarding']

const MOCK_CALLS: MockCall[] = Array.from({ length: 28 }, (_, i) => {
  const dayOffset = Math.floor(i / 3) - 2
  const d = addDays(TODAY, dayOffset)
  const h = HOURS[i % HOURS.length]!
  const dt = new Date(d)
  dt.setHours(h, 0, 0, 0)

  const isPast = dt < TODAY
  const status: CallStatus = isPast
    ? (['completed', 'completed', 'no_show', 'completed'][i % 4] as CallStatus)
    : 'scheduled'
  const outcome: CallOutcome = status === 'completed'
    ? (['closed', 'follow_up', 'not_qualified', 'thinking'][i % 4] as CallOutcome)
    : status === 'no_show' ? 'no_show' : null

  return {
    id: `call-${i}`,
    lead_name: LEADS[i % LEADS.length]!,
    lead_email: `lead${i}@email.com`,
    lead_score: 40 + (i * 7) % 55,
    agent: AGENTS[i % AGENTS.length]!,
    date: dt.toISOString(),
    duration_min: status === 'completed' ? 20 + (i % 5) * 5 : 30,
    status,
    type: TYPES[i % TYPES.length]!,
    outcome,
    meet_link: `https://meet.google.com/abc-${i}def`,
    notes: status === 'completed' ? 'Chamada correu bem. Lead mostrou interesse.' : null,
  }
})

/* ─────────────────────────── config maps ─────────────────────────── */

const STATUS_MAP: Record<CallStatus, { label: string; color: string; icon: typeof CheckCircle2 }> = {
  scheduled:  { label: 'Agendada',   color: '#21A0C4', icon: Clock },
  completed:  { label: 'Realizada',  color: '#1EC87A', icon: CheckCircle2 },
  no_show:    { label: 'Faltou',     color: '#E84545', icon: XCircle },
  cancelled:  { label: 'Cancelada',  color: '#3D6080', icon: AlertCircle },
}

const OUTCOME_MAP: Record<NonNullable<CallOutcome>, { label: string; color: string }> = {
  closed:         { label: 'Fechado ✓',       color: '#1EC87A' },
  follow_up:      { label: 'Follow-up',        color: '#21A0C4' },
  not_qualified:  { label: 'Não qualificado',  color: '#E84545' },
  thinking:       { label: 'A pensar',         color: '#F5A623' },
  no_show:        { label: 'Não apareceu',     color: '#E84545' },
}

const TYPE_MAP: Record<CallType, string> = {
  discovery:  'Descoberta',
  proposal:   'Proposta',
  follow_up:  'Follow-up',
  onboarding: 'Onboarding',
}

/* ─────────────────────────── helpers ─────────────────────────── */

function formatTime(iso: string) {
  const d = new Date(iso)
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function getWeekDays(base: Date) {
  const monday = new Date(base)
  const day = monday.getDay() || 7
  monday.setDate(monday.getDate() - day + 1)
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i))
}

const WEEK_LABELS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']

/* ─────────────────────────── metrics banner ─────────────────────────── */

function MetricCard({ label, value, sub, icon: Icon, color }: {
  label: string; value: string; sub: string
  icon: typeof Phone; color: string
}) {
  return (
    <div className="bg-[var(--s2)] border border-white/5 rounded-2xl p-4 flex items-center gap-4">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${color}22` }}>
        <Icon size={18} style={{ color }} />
      </div>
      <div>
        <p className="metric-xl">{value}</p>
        <p className="text-xs text-[#7FA8C4]">{label}</p>
        <p className="text-[10px] text-[#3D6080]">{sub}</p>
      </div>
    </div>
  )
}

/* ─────────────────────────── schedule modal ─────────────────────────── */

function ScheduleCallModal({ onClose, onScheduled }: { onClose: () => void; onScheduled?: () => void }) {
  const [form, setForm] = useState({
    lead: '',
    agent: AGENTS[0]!,
    date: isoDate(TODAY),
    time: '10:00',
    type: 'discovery' as CallType,
    duration: 30,
  })

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[var(--s1)] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-white/5">
          <h2 className="section-title">Agendar Call</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/5 text-[#3D6080] hover:text-white transition-colors">
            <X size={15} />
          </button>
        </div>

        <div className="p-5 flex flex-col gap-4">
          {/* Lead */}
          <div>
            <label className="label-system block mb-1.5">Lead</label>
            <input
              value={form.lead}
              onChange={e => setForm(p => ({ ...p, lead: e.target.value }))}
              placeholder="Nome ou email da lead..."
              className="w-full bg-[var(--s2)] border border-white/5 rounded-xl px-3 py-2.5 text-sm text-white placeholder-[#3D6080] focus:outline-none focus:border-[#21A0C4]"
            />
          </div>

          {/* Type + Agent row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-system block mb-1.5">Tipo</label>
              <select
                value={form.type}
                onChange={e => setForm(p => ({ ...p, type: e.target.value as CallType }))}
                className="w-full bg-[var(--s2)] border border-white/5 rounded-xl px-3 py-2.5 text-sm text-[#7FA8C4] focus:outline-none focus:border-[#21A0C4]"
              >
                {(Object.entries(TYPE_MAP) as [CallType, string][]).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label-system block mb-1.5">Agente</label>
              <select
                value={form.agent}
                onChange={e => setForm(p => ({ ...p, agent: e.target.value }))}
                className="w-full bg-[var(--s2)] border border-white/5 rounded-xl px-3 py-2.5 text-sm text-[#7FA8C4] focus:outline-none focus:border-[#21A0C4]"
              >
                {AGENTS.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
          </div>

          {/* Date + Time row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-system block mb-1.5">Data</label>
              <input
                type="date"
                value={form.date}
                onChange={e => setForm(p => ({ ...p, date: e.target.value }))}
                className="w-full bg-[var(--s2)] border border-white/5 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#21A0C4]"
              />
            </div>
            <div>
              <label className="label-system block mb-1.5">Hora</label>
              <input
                type="time"
                value={form.time}
                onChange={e => setForm(p => ({ ...p, time: e.target.value }))}
                className="w-full bg-[var(--s2)] border border-white/5 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#21A0C4]"
              />
            </div>
          </div>

          {/* Duration */}
          <div>
            <label className="label-system block mb-1.5">Duração</label>
            <div className="flex gap-2">
              {[15, 30, 45, 60].map(d => (
                <button
                  key={d}
                  onClick={() => setForm(p => ({ ...p, duration: d }))}
                  className={`flex-1 py-2 rounded-xl text-xs font-700 transition-colors ${
                    form.duration === d
                      ? 'bg-[#21A0C4] text-[#050D14]'
                      : 'bg-[var(--s2)] border border-white/5 text-[#7FA8C4] hover:border-white/10'
                  }`}
                >
                  {d}min
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="p-5 pt-0 flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-white/5 text-sm text-[#7FA8C4] hover:border-white/10 transition-colors">
            Cancelar
          </button>
          <button
            disabled={!form.lead}
            onClick={() => {
              if (!form.lead.trim()) return
              // In production: POST to /api/calls with form data + create Google Calendar event
              console.log('[SCHEDULE]', form)
              onScheduled?.()
              onClose()
            }}
            className="flex-1 py-2.5 rounded-xl bg-[#21A0C4] text-sm font-700 text-[#050D14] hover:bg-[#4FC8EA] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Agendar + Google Meet
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────── outcome modal ─────────────────────────── */

function OutcomeModal({ call, onClose, onSave }: { call: MockCall; onClose: () => void; onSave?: (id: string, outcome: CallOutcome, notes: string, duration: number) => void }) {
  const [outcome, setOutcome] = useState<CallOutcome>(call.outcome)
  const [notes, setNotes] = useState(call.notes ?? '')
  const [duration, setDuration] = useState(call.duration_min)

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[var(--s1)] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-white/5">
          <div>
            <h2 className="section-title">Resultado da Call</h2>
            <p className="text-xs text-[#7FA8C4] mt-0.5">{call.lead_name} · {formatTime(call.date)}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/5 text-[#3D6080] hover:text-white transition-colors">
            <X size={15} />
          </button>
        </div>

        <div className="p-5 flex flex-col gap-4">
          {/* Outcome */}
          <div>
            <label className="label-system block mb-2">Resultado</label>
            <div className="grid grid-cols-2 gap-2">
              {(Object.entries(OUTCOME_MAP) as [NonNullable<CallOutcome>, { label: string; color: string }][]).map(([k, v]) => (
                <button
                  key={k}
                  onClick={() => setOutcome(k)}
                  className={`py-2.5 rounded-xl text-xs font-700 transition-all border ${
                    outcome === k
                      ? 'border-[#21A0C4] bg-[#21A0C422]'
                      : 'border-white/5 hover:border-white/10'
                  }`}
                  style={{ color: outcome === k ? v.color : '#7FA8C4' }}
                >
                  {v.label}
                </button>
              ))}
            </div>
          </div>

          {/* Duration */}
          <div>
            <label className="label-system block mb-1.5">
              Duração real (min)
            </label>
            <input
              type="number"
              value={duration}
              onChange={e => setDuration(Number(e.target.value))}
              min={1}
              className="w-full bg-[var(--s2)] border border-white/5 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#21A0C4]"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="label-system block mb-1.5">Notas</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              placeholder="Resumo da chamada, próximos passos..."
              className="w-full bg-[var(--s2)] border border-white/5 rounded-xl px-3 py-2.5 text-sm text-white placeholder-[#3D6080] focus:outline-none focus:border-[#21A0C4] resize-none"
            />
          </div>
        </div>

        <div className="p-5 pt-0 flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-white/5 text-sm text-[#7FA8C4] hover:border-white/10 transition-colors">
            Cancelar
          </button>
          <button
            onClick={() => { onSave?.(call.id, outcome, notes, duration); onClose() }}
            className="flex-1 py-2.5 rounded-xl bg-[#1EC87A] text-sm font-700 text-[#050D14] hover:opacity-90 transition-opacity"
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────── mock form answers per lead ─────────────────────────── */

interface FormAnswer { question: string; answer: string }

const MOCK_FORM_ANSWERS: Record<string, FormAnswer[]> = {
  'João Silva': [
    { question: 'Sector de actividade',     answer: 'SaaS B2B' },
    { question: 'Maior desafio de marketing', answer: 'Gerar leads qualificados de forma consistente. Temos tentado Meta Ads mas o CPL está muito alto (~€80/lead).' },
    { question: 'Orçamento mensal',         answer: '€1.500 – €5.000' },
    { question: 'Como nos encontrou?',      answer: 'LinkedIn' },
  ],
  'Ana Ferreira': [
    { question: 'Sector de actividade',     answer: 'Saúde & Beleza' },
    { question: 'Maior desafio de marketing', answer: 'Aumentar visibilidade local e converter visitas ao Instagram em marcações reais.' },
    { question: 'Orçamento mensal',         answer: '€500 – €1.500' },
    { question: 'Como nos encontrou?',      answer: 'Instagram' },
  ],
  'Carlos Mendes': [
    { question: 'Sector de actividade',     answer: 'Imobiliário' },
    { question: 'Maior desafio de marketing', answer: 'Precisamos de leads qualificados para imóveis acima de €300k. O retargeting atual tem CTR baixo.' },
    { question: 'Orçamento mensal',         answer: '€5.000 – €15.000' },
    { question: 'Como nos encontrou?',      answer: 'Google' },
    { question: 'Informação adicional',     answer: 'Temos 120 imóveis em carteira, foco em Lisboa e Cascais.' },
  ],
  'Sofia Lopes': [
    { question: 'Sector de actividade',     answer: 'E-commerce' },
    { question: 'Maior desafio de marketing', answer: 'Reduzir o CAC e melhorar o ROAS das campanhas Meta.' },
    { question: 'Orçamento mensal',         answer: '€1.500 – €5.000' },
    { question: 'Como nos encontrou?',      answer: 'Recomendação' },
  ],
}

/* ─────────────────────────── briefing panel ─────────────────────────── */

function BriefingPanel({ call, onClose }: { call: MockCall; onClose: () => void }) {
  const [tab, setTab] = useState<'briefing' | 'form'>('briefing')
  const formAnswers = MOCK_FORM_ANSWERS[call.lead_name] ?? null
  const temperature = call.lead_score >= 75 ? 'hot' : call.lead_score >= 50 ? 'warm' : 'cold'
  const tempColor = temperature === 'hot' ? '#E84545' : temperature === 'warm' ? '#F5A623' : '#21A0C4'
  const tempEmoji = temperature === 'hot' ? '🔥' : temperature === 'warm' ? '🌡️' : '🧊'

  /* ── Countdown to call ── */
  const [secondsUntil, setSecondsUntil] = useState(() => {
    const diff = Math.floor((new Date(call.date).getTime() - Date.now()) / 1000)
    return diff
  })
  useEffect(() => {
    if (call.status !== 'scheduled') return
    const id = setInterval(() => {
      setSecondsUntil(Math.floor((new Date(call.date).getTime() - Date.now()) / 1000))
    }, 1000)
    return () => clearInterval(id)
  }, [call.date, call.status])

  const countdownLabel = (() => {
    if (call.status !== 'scheduled') return null
    if (secondsUntil < 0) return 'A decorrer agora'
    if (secondsUntil < 60) return `${secondsUntil}s`
    if (secondsUntil < 3600) return `${Math.floor(secondsUntil / 60)}min ${secondsUntil % 60}s`
    const h = Math.floor(secondsUntil / 3600)
    const m = Math.floor((secondsUntil % 3600) / 60)
    return `${h}h ${m}min`
  })()
  const isImminent = secondsUntil >= 0 && secondsUntil <= 1800

  return (
    <div className="w-80 flex-shrink-0 bg-[var(--s1)] border-l border-white/5 flex flex-col">
      <div className="flex items-start justify-between p-5 border-b border-white/5">
        <div className="flex-1 min-w-0">
          <h3 className="font-manrope font-700 text-base" style={{ color: 'var(--t1)' }}>Pré-briefing</h3>
          <p className="text-xs text-[#7FA8C4] mt-0.5">{call.lead_name}</p>
          {countdownLabel && (
            <div
              className="inline-flex items-center gap-1.5 mt-2 px-2 py-1 rounded-lg text-[10px] font-bold"
              style={{
                background: isImminent ? 'rgba(232,69,69,0.12)' : 'rgba(33,160,196,0.12)',
                color: isImminent ? '#E84545' : '#21A0C4',
                border: `1px solid ${isImminent ? 'rgba(232,69,69,0.25)' : 'rgba(33,160,196,0.25)'}`,
              }}
            >
              <Clock size={9} />
              {isImminent && secondsUntil > 0 ? '⚡ ' : ''}{countdownLabel}
            </div>
          )}
        </div>
        <button onClick={onClose} className="p-1 text-[#3D6080] hover:text-white transition-colors flex-shrink-0">
          <X size={14} />
        </button>
      </div>

      {/* Tabs */}
      {formAnswers && (
        <div className="flex border-b border-white/5">
          {(['briefing', 'form'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2.5 text-xs font-700 transition-colors ${
                tab === t ? 'text-[#21A0C4] border-b-2 border-[#21A0C4]' : 'text-[#3D6080] hover:text-[#7FA8C4]'
              }`}
            >
              {t === 'briefing' ? 'Briefing' : '📋 Respostas do Form'}
            </button>
          ))}
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-5">

        {/* ── FORM ANSWERS TAB ── */}
        {tab === 'form' && formAnswers && (
          <>
            {/* Temperature badge */}
            <div
              className="rounded-xl p-3 flex items-center gap-3 border"
              style={{ background: `${tempColor}15`, borderColor: `${tempColor}30` }}
            >
              <span className="text-2xl">{tempEmoji}</span>
              <div>
                <p className="text-xs font-800" style={{ color: tempColor }}>
                  {temperature.toUpperCase()} — Score {call.lead_score}/100
                </p>
                <p className="text-[10px] text-[#7FA8C4]">Calculado automaticamente pelo formulário</p>
              </div>
            </div>

            {/* Form answers */}
            <div className="flex flex-col gap-4">
              {formAnswers.map(({ question, answer }, i) => (
                <div key={i} className="bg-[var(--s2)] rounded-xl p-3 flex flex-col gap-1.5">
                  <p className="label-system">{question}</p>
                  <p className="text-xs text-white leading-relaxed">{answer}</p>
                </div>
              ))}
            </div>

            {/* Quick insights */}
            <div className="bg-[#21A0C411] border border-[#21A0C430] rounded-xl p-3">
              <p className="text-[10px] font-700 text-[#21A0C4] uppercase tracking-widest mb-2">💡 Insights IA</p>
              <ul className="flex flex-col gap-1.5">
                {[
                  'Orçamento compatível com serviço premium',
                  'Dor clara — CPL alto é o principal blocker',
                  'Abordagem: mostrar ROAS alcançado neste sector',
                ].map((ins, i) => (
                  <li key={i} className="text-xs text-[#7FA8C4] flex items-start gap-2">
                    <span className="text-[#21A0C4] flex-shrink-0">•</span> {ins}
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}

        {/* ── BRIEFING TAB (default) ── */}
        {tab === 'briefing' && (
          <>
            {/* Score */}
            <div className="bg-[var(--s2)] rounded-xl p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-[#21A0C422] flex items-center justify-center">
                <span className="metric-lg" style={{ color: 'var(--cyan)' }}>{call.lead_score}</span>
              </div>
              <div>
                <p className="text-xs font-800 text-white">Score da Lead</p>
                <div className="flex gap-1 mt-1">
                  {Array.from({ length: 5 }, (_, i) => (
                    <Star
                      key={i}
                      size={10}
                      fill={i < Math.round(call.lead_score / 20) ? '#F5A623' : 'transparent'}
                      stroke="#F5A623"
                    />
                  ))}
                </div>
              </div>
              {formAnswers && (
                <span className="ml-auto text-[10px] font-700 text-[#1EC87A] bg-[#1EC87A20] px-2 py-0.5 rounded-full">
                  Form ✓
                </span>
              )}
            </div>

            {/* Call info */}
            <div>
              <p className="label-system mb-2">Detalhes</p>
              <div className="flex flex-col gap-2">
                {[
                  { label: 'Tipo', value: TYPE_MAP[call.type] },
                  { label: 'Agente', value: call.agent },
                  { label: 'Hora', value: formatTime(call.date) },
                  { label: 'Duração', value: `${call.duration_min} min` },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between items-center">
                    <span className="text-xs text-[#7FA8C4]">{label}</span>
                    <span className="text-xs font-700 text-white">{value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Talking points — dynamic based on form answers */}
            <div>
              <p className="label-system mb-2">Pontos a abordar</p>
              <div className="flex flex-col gap-2">
                {(formAnswers ? [
                  `Sector: ${formAnswers.find(a => a.question === 'Sector de actividade')?.answer ?? 'a confirmar'}`,
                  `Desafio: ${(formAnswers.find(a => a.question.includes('desafio'))?.answer ?? '').slice(0, 60)}...`,
                  'Orçamento e ROI esperado — alinhar expectativas',
                  'Apresentar casos de sucesso no mesmo sector',
                  'Propor próximos passos e prazo de implementação',
                ] : [
                  'Entender o estado atual da presença digital',
                  'Identificar objetivo principal (leads vs. vendas)',
                  'Orçamento disponível para paid media',
                  'Timeline e urgência do projeto',
                  'Apresentar cases de sucesso do sector',
                ]).map((point, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <div className="w-4 h-4 rounded-md bg-[#21A0C422] flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-[9px] font-800 text-[#21A0C4]">{i + 1}</span>
                    </div>
                    <p className="text-xs text-[#7FA8C4] leading-relaxed">{point}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* History */}
            <div>
              <p className="label-system mb-2">Histórico</p>
              <div className="flex flex-col gap-2">
                {[
                  { icon: '📥', text: 'Lead criada via Facebook Ads', time: '5 dias atrás' },
                  formAnswers && { icon: '📋', text: 'Formulário de qualificação preenchido', time: '3 dias atrás' },
                  { icon: '💬', text: 'WhatsApp automático enviado', time: '4 dias atrás' },
                  { icon: '📞', text: 'Call agendada — interesse confirmado', time: '2 dias atrás' },
                ].filter(Boolean).map((item, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <div className="w-6 h-6 rounded-lg bg-[var(--s2)] flex items-center justify-center text-xs flex-shrink-0">
                      {(item as { icon: string }).icon}
                    </div>
                    <div>
                      <p className="text-xs font-700 text-white">{(item as { text: string }).text}</p>
                      <p className="text-[10px] text-[#3D6080]">{(item as { time: string }).time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Form CTA if no answers */}
            {!formAnswers && (
              <div className="bg-[#F5A62311] border border-[#F5A62330] rounded-xl p-3">
                <p className="text-xs text-[#F5A623] font-700 mb-1">⚠️ Sem respostas de formulário</p>
                <p className="text-[10px] text-[#7FA8C4]">Esta lead não preencheu nenhum formulário. Envie o link antes da call.</p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Meet link */}
      {call.meet_link && (
        <div className="p-4 border-t border-white/5 flex flex-col gap-2">
          {formAnswers && (
            <button
              onClick={() => setTab('form')}
              className="flex items-center justify-center gap-2 py-2 rounded-xl border border-[#21A0C430] text-xs font-700 text-[#21A0C4] hover:bg-[#21A0C411] transition-colors"
            >
              📋 Ver respostas do formulário
            </button>
          )}
          <a
            href={call.meet_link}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#1EC87A] text-sm font-700 text-[#050D14] hover:opacity-90 transition-opacity"
          >
            <Video size={14} /> Entrar no Google Meet
          </a>
        </div>
      )}
    </div>
  )
}

/* ─────────────────────────── weekly calendar ─────────────────────────── */

function WeekCalendar({
  weekDays,
  calls,
  selectedCall,
  onSelectCall,
  onOpenOutcome,
}: {
  weekDays: Date[]
  calls: MockCall[]
  selectedCall: MockCall | null
  onSelectCall: (c: MockCall | null) => void
  onOpenOutcome: (c: MockCall) => void
}) {
  const callsByDay = useMemo(() => {
    const map: Record<string, MockCall[]> = {}
    for (const c of calls) {
      const key = isoDate(new Date(c.date))
      ;(map[key] ??= []).push(c)
    }
    return map
  }, [calls])

  return (
    <div className="bg-[var(--s2)] border border-white/5 rounded-2xl overflow-hidden flex-1">
      {/* Day headers */}
      <div className="grid border-b border-white/5" style={{ gridTemplateColumns: `repeat(7, 1fr)` }}>
        {weekDays.map((day, idx) => {
          const isToday = isoDate(day) === isoDate(TODAY)
          return (
            <div key={idx} className={`p-3 text-center border-r border-white/5 last:border-r-0 ${isToday ? 'bg-[#21A0C410]' : ''}`}>
              <p className="text-[10px] font-700 text-[#3D6080] uppercase">{WEEK_LABELS[idx]}</p>
              <p className={`text-sm font-800 mt-0.5 ${isToday ? 'text-[#21A0C4]' : 'text-white'}`}>
                {pad(day.getDate())}
              </p>
            </div>
          )
        })}
      </div>

      {/* Calls grid */}
      <div className="grid min-h-64" style={{ gridTemplateColumns: `repeat(7, 1fr)` }}>
        {weekDays.map((day, idx) => {
          const key = isoDate(day)
          const dayCalls = callsByDay[key] ?? []
          return (
            <div key={idx} className="border-r border-white/5 last:border-r-0 p-2 flex flex-col gap-1.5 min-h-[12rem]">
              {dayCalls.map(call => {
                const s = STATUS_MAP[call.status]
                const isSelected = selectedCall?.id === call.id
                return (
                  <button
                    key={call.id}
                    onClick={() => onSelectCall(isSelected ? null : call)}
                    className={`w-full text-left rounded-xl p-2 border transition-all ${
                      isSelected
                        ? 'border-[#21A0C4] bg-[#21A0C415]'
                        : 'border-white/5 hover:border-white/10 bg-[var(--s1)] hover:bg-[var(--s2)]'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: s.color }} />
                      <span className="text-[10px] font-700 text-white truncate">{formatTime(call.date)}</span>
                    </div>
                    <p className="text-[10px] text-[#7FA8C4] truncate leading-snug">{call.lead_name}</p>
                    <p className="text-[9px] text-[#3D6080] mt-0.5">{TYPE_MAP[call.type]}</p>
                    {call.status === 'completed' && call.outcome && (
                      <p className="text-[9px] font-700 mt-1" style={{ color: OUTCOME_MAP[call.outcome]?.color }}>
                        {OUTCOME_MAP[call.outcome]?.label}
                      </p>
                    )}
                    {call.status === 'scheduled' && (
                      <button
                        onClick={e => { e.stopPropagation(); onOpenOutcome(call) }}
                        className="mt-1.5 w-full text-[9px] font-700 text-[#1EC87A] bg-[#1EC87A15] rounded-lg py-0.5 hover:bg-[#1EC87A25] transition-colors"
                      >
                        + Resultado
                      </button>
                    )}
                  </button>
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ─────────────────────────── list view ─────────────────────────── */

function CallListItem({ call, selected, onClick, onOutcome }: {
  call: MockCall
  selected: boolean
  onClick: () => void
  onOutcome: () => void
}) {
  const s = STATUS_MAP[call.status]
  const StatusIcon = s.icon
  return (
    <tr
      onClick={onClick}
      className={`border-b border-white/5 cursor-pointer transition-colors ${selected ? 'bg-[#21A0C410]' : 'hover:bg-white/[0.02]'}`}
    >
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#21A0C422] flex items-center justify-center text-xs font-800 text-[#21A0C4]">
            {call.lead_name.charAt(0)}
          </div>
          <div>
            <p className="text-sm font-700 text-white">{call.lead_name}</p>
            <p className="text-[11px] text-[#3D6080]">{call.lead_email}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3 text-xs text-[#7FA8C4]">{TYPE_MAP[call.type]}</td>
      <td className="px-4 py-3 text-xs text-[#7FA8C4]">{call.agent}</td>
      <td className="px-4 py-3 text-xs text-[#7FA8C4]">
        {new Date(call.date).toLocaleDateString('pt-PT')} {formatTime(call.date)}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1.5">
          <StatusIcon size={12} style={{ color: s.color }} />
          <span className="text-xs font-700" style={{ color: s.color }}>{s.label}</span>
        </div>
      </td>
      <td className="px-4 py-3">
        {call.outcome
          ? <span className="text-xs font-700" style={{ color: OUTCOME_MAP[call.outcome]?.color }}>{OUTCOME_MAP[call.outcome]?.label}</span>
          : <span className="text-xs text-[#3D6080]">—</span>}
      </td>
      <td className="px-4 py-3">
        {call.status === 'scheduled' && (
          <button
            onClick={e => { e.stopPropagation(); onOutcome() }}
            className="text-[10px] font-700 text-[#1EC87A] px-2 py-1 rounded-lg bg-[#1EC87A15] hover:bg-[#1EC87A25] transition-colors"
          >
            Registar
          </button>
        )}
      </td>
    </tr>
  )
}

/* ─────────────────────────── main page ─────────────────────────── */

export default function CallsPage() {
  const [weekBase, setWeekBase] = useState(TODAY)
  const [view, setView] = useState<'week' | 'list'>('week')
  const [showSchedule, setShowSchedule] = useState(false)
  const [outcomeCall, setOutcomeCall] = useState<MockCall | null>(null)
  const [selectedCall, setSelectedCall] = useState<MockCall | null>(null)

  const weekDays = getWeekDays(weekBase)

  /* metrics */
  const pastCalls   = MOCK_CALLS.filter(c => c.status === 'completed' || c.status === 'no_show')
  const completed   = pastCalls.filter(c => c.status === 'completed').length
  const noShows     = pastCalls.filter(c => c.status === 'no_show').length
  const showUpRate  = pastCalls.length ? Math.round((completed / pastCalls.length) * 100) : 0
  const closedCalls = pastCalls.filter(c => c.outcome === 'closed').length
  const convRate    = completed ? Math.round((closedCalls / completed) * 100) : 0
  const avgDur      = completed
    ? Math.round(MOCK_CALLS.filter(c => c.status === 'completed').reduce((s, c) => s + c.duration_min, 0) / completed)
    : 0
  const upcoming    = MOCK_CALLS.filter(c => c.status === 'scheduled').length

  const weekLabel = `${pad(weekDays[0]!.getDate())}/${pad(weekDays[0]!.getMonth() + 1)} – ${pad(weekDays[6]!.getDate())}/${pad(weekDays[6]!.getMonth() + 1)}`

  /* List filters */
  const [listStatus, setListStatus] = useState<CallStatus | 'all'>('all')
  const [listType, setListType]     = useState<CallType | 'all'>('all')
  const filteredCalls = MOCK_CALLS.filter(c => {
    if (listStatus !== 'all' && c.status !== listStatus) return false
    if (listType   !== 'all' && c.type   !== listType)   return false
    return true
  })

  /* Upcoming call alert — next scheduled call within 30 min */
  const nextCall = useMemo(() => {
    const now = Date.now()
    return MOCK_CALLS
      .filter(c => c.status === 'scheduled')
      .map(c => ({ ...c, ms: new Date(c.date).getTime() - now }))
      .filter(c => c.ms >= 0 && c.ms <= 1800000)
      .sort((a, b) => a.ms - b.ms)[0] ?? null
  }, [])

  /* Outcome breakdown for the visual bar */
  const outcomeBreakdown = useMemo(() => {
    const total = pastCalls.length || 1
    return (Object.entries(OUTCOME_MAP) as [NonNullable<CallOutcome>, { label: string; color: string }][])
      .map(([key, cfg]) => ({
        key, label: cfg.label, color: cfg.color,
        count: pastCalls.filter(c => c.outcome === key).length,
        pct: (pastCalls.filter(c => c.outcome === key).length / total) * 100,
      }))
      .filter(o => o.count > 0)
  }, [pastCalls])

  return (
    <>
      {showSchedule && <ScheduleCallModal onClose={() => setShowSchedule(false)} />}
      {outcomeCall  && <OutcomeModal call={outcomeCall} onClose={() => setOutcomeCall(null)} />}

      <div className="flex h-full gap-0">
        {/* Main */}
        <div className="flex-1 flex flex-col gap-5 min-w-0">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="display-title" style={{ fontSize: '2.75rem' }}>Calls</h1>
              <p className="text-sm text-[#7FA8C4] mt-0.5">{upcoming} agendadas esta semana</p>
            </div>
            <div className="flex gap-3">
              {/* View toggle */}
              <div className="flex bg-[var(--s2)] border border-white/5 rounded-xl overflow-hidden">
                {(['week', 'list'] as const).map(v => (
                  <button
                    key={v}
                    onClick={() => setView(v)}
                    className={`px-4 py-2 text-xs font-700 transition-colors ${
                      view === v ? 'bg-[#21A0C4] text-[#050D14]' : 'text-[#7FA8C4] hover:text-white'
                    }`}
                  >
                    {v === 'week' ? 'Semana' : 'Lista'}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setShowSchedule(true)}
                className="flex items-center gap-2 text-xs font-700 text-[#050D14] bg-[#21A0C4] px-4 py-2 rounded-xl hover:bg-[#4FC8EA] transition-colors"
              >
                <Plus size={13} /> Agendar Call
              </button>
            </div>
          </div>

          {/* Upcoming call alert */}
          {nextCall && (
            <div
              className="flex items-center gap-3 rounded-2xl px-4 py-3"
              style={{ background: 'rgba(232,69,69,0.08)', border: '1px solid rgba(232,69,69,0.25)' }}
            >
              <Bell size={14} style={{ color: '#E84545', flexShrink: 0 }} />
              <span className="text-sm font-semibold" style={{ color: '#E84545' }}>
                Call com {nextCall.lead_name} em {Math.ceil(nextCall.ms / 60000)}min
              </span>
              <span className="text-xs ml-auto" style={{ color: 'var(--t3)' }}>
                {formatTime(nextCall.date)} · {TYPE_MAP[nextCall.type]}
              </span>
              {nextCall.meet_link && (
                <a
                  href={nextCall.meet_link}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold flex-shrink-0"
                  style={{ background: '#1EC87A', color: '#050D14' }}
                >
                  <Video size={11} /> Entrar
                </a>
              )}
            </div>
          )}

          {/* Metrics */}
          <div className="grid grid-cols-4 gap-4">
            <MetricCard label="Taxa de show-up" value={`${showUpRate}%`} sub={`${completed} de ${pastCalls.length} calls`} icon={PhoneCall} color="#1EC87A" />
            <MetricCard label="Taxa de conversão" value={`${convRate}%`} sub={`${closedCalls} fechados`} icon={TrendingUp} color="#21A0C4" />
            <MetricCard label="Duração média" value={`${avgDur}min`} sub="Por call realizada" icon={Clock} color="#F5A623" />
            <MetricCard label="No-shows" value={String(noShows)} sub="Esta semana" icon={PhoneOff} color="#E84545" />
          </div>

          {/* Outcome breakdown bar */}
          {outcomeBreakdown.length > 0 && (
            <div className="bg-[var(--s2)] border border-white/5 rounded-2xl p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--t3)' }}>Resultado das calls realizadas</p>
              <div className="flex h-5 rounded-xl overflow-hidden gap-px mb-3">
                {outcomeBreakdown.map(o => (
                  <div key={o.key} title={`${o.label}: ${o.pct.toFixed(0)}%`}
                    style={{ width: `${o.pct}%`, background: o.color, minWidth: o.pct > 3 ? undefined : 4 }} />
                ))}
              </div>
              <div className="flex flex-wrap gap-4">
                {outcomeBreakdown.map(o => (
                  <div key={o.key} className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: o.color }} />
                    <span className="text-xs" style={{ color: 'var(--t2)' }}>{o.label}</span>
                    <span className="text-xs font-bold" style={{ color: o.color }}>{o.count}</span>
                    <span className="text-[10px]" style={{ color: 'var(--t3)' }}>({o.pct.toFixed(0)}%)</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Week nav (only in week view) */}
          {view === 'week' && (
            <div className="flex items-center gap-3">
              <button
                onClick={() => setWeekBase(d => addDays(d, -7))}
                className="p-2 rounded-xl bg-[var(--s2)] border border-white/5 hover:border-white/10 transition-colors text-[#7FA8C4] hover:text-white"
              >
                <ChevronLeft size={14} />
              </button>
              <span className="text-sm font-700 text-white">{weekLabel}</span>
              <button
                onClick={() => setWeekBase(d => addDays(d, 7))}
                className="p-2 rounded-xl bg-[var(--s2)] border border-white/5 hover:border-white/10 transition-colors text-[#7FA8C4] hover:text-white"
              >
                <ChevronRight size={14} />
              </button>
              <button
                onClick={() => setWeekBase(TODAY)}
                className="px-3 py-2 rounded-xl text-xs font-700 text-[#7FA8C4] bg-[var(--s2)] border border-white/5 hover:border-white/10 transition-colors"
              >
                Hoje
              </button>
            </div>
          )}

          {/* Calendar / List */}
          {view === 'week' ? (
            <WeekCalendar
              weekDays={weekDays}
              calls={MOCK_CALLS}
              selectedCall={selectedCall}
              onSelectCall={setSelectedCall}
              onOpenOutcome={setOutcomeCall}
            />
          ) : (
            <div className="flex flex-col gap-3 flex-1">
              {/* List filters */}
              <div className="flex items-center gap-3">
                <Filter size={13} style={{ color: 'var(--t3)', flexShrink: 0 }} />
                <div className="flex items-center gap-1 px-1 py-1 rounded-xl" style={{ background: 'var(--s2)' }}>
                  {([['all', 'Todos'], ['scheduled', 'Agendadas'], ['completed', 'Realizadas'], ['no_show', 'Faltou']] as const).map(([k, l]) => (
                    <button key={k} onClick={() => setListStatus(k as CallStatus | 'all')}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                      style={{
                        background: listStatus === k ? (k === 'all' ? 'var(--s3)' : `${STATUS_MAP[k as CallStatus]?.color ?? '#21A0C4'}18`) : 'transparent',
                        color: listStatus === k ? (k === 'all' ? 'var(--t1)' : STATUS_MAP[k as CallStatus]?.color) : 'var(--t3)',
                      }}>
                      {l}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-1 px-1 py-1 rounded-xl" style={{ background: 'var(--s2)' }}>
                  {([['all', 'Todos tipos'], ...Object.entries(TYPE_MAP)] as [string, string][]).map(([k, l]) => (
                    <button key={k} onClick={() => setListType(k as CallType | 'all')}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                      style={{
                        background: listType === k ? 'var(--s3)' : 'transparent',
                        color: listType === k ? 'var(--t1)' : 'var(--t3)',
                      }}>
                      {l}
                    </button>
                  ))}
                </div>
                <span className="text-xs ml-auto" style={{ color: 'var(--t3)' }}>{filteredCalls.length} calls</span>
              </div>

              <div className="bg-[var(--s2)] border border-white/5 rounded-2xl overflow-hidden flex-1">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-white/5">
                        {['Lead', 'Tipo', 'Agente', 'Data & Hora', 'Estado', 'Resultado', ''].map(h => (
                          <th key={h} className="text-left label-system px-4 py-3 whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCalls.map(call => (
                        <CallListItem
                          key={call.id}
                          call={call}
                          selected={selectedCall?.id === call.id}
                          onClick={() => setSelectedCall(selectedCall?.id === call.id ? null : call)}
                          onOutcome={() => setOutcomeCall(call)}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Briefing panel */}
        {selectedCall && (
          <BriefingPanel
            call={selectedCall}
            onClose={() => setSelectedCall(null)}
          />
        )}
      </div>
    </>
  )
}
