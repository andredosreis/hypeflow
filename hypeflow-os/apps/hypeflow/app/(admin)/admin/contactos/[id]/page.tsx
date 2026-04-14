'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft, Phone, Mail, MessageSquare, Calendar,
  Target, Activity, Clock, Tag, Edit2, Plus,
  ChevronDown, ChevronUp, Star, ExternalLink,
  Users, Zap, TrendingUp, FileText, BarChart2,
  CheckCircle, XCircle, AlertCircle, X,
} from 'lucide-react'

/* ─── Types ─── */
type Temp = 'hot' | 'warm' | 'cold'
type Tab = 'overview' | 'conversations' | 'calls' | 'campaigns' | 'deals' | 'notes'

interface ScoreEvent {
  event: string
  points: number
  channel: string
  ts: string
}

interface Interaction {
  id: string
  type: 'call' | 'email' | 'whatsapp' | 'note' | 'status_change' | 'automation'
  content: string
  outcome?: string
  created_at: string
  user?: { full_name: string }
}

interface Deal {
  id: string
  name: string
  value: number
  status: 'open' | 'won' | 'lost' | 'negotiating'
  created_at: string
}

interface Contact {
  id: string
  full_name: string
  email?: string
  phone?: string
  company?: string
  score: number
  temperature: Temp
  stage: string
  source: string
  assignee: string
  tags: string[]
  created_at: string
  last_contact_at?: string
  notes?: string
}

/* ─── Mock Data ─── */
const MOCK_CONTACTS: Record<string, Contact> = {
  '1': { id: '1', full_name: 'Tiago Fonseca', email: 'tiago@empresa.pt', phone: '+351 912 345 678', company: 'TF Digital', score: 87, temperature: 'hot', stage: 'Call Agendada', source: 'meta', assignee: 'Ana Silva', tags: ['marketing', 'e-commerce'], created_at: '2024-03-01', last_contact_at: '2024-04-12', notes: 'Cliente interessado em pacote Enterprise.' },
  '2': { id: '2', full_name: 'Ana Ferreira', email: 'ana@ferreira.pt', phone: '+351 913 456 789', company: 'Ferreira & Co', score: 72, temperature: 'warm', stage: 'Proposta', source: 'google', assignee: 'Carlos M.', tags: ['b2b', 'consulting'], created_at: '2024-02-20', last_contact_at: '2024-04-11', notes: '' },
  '3': { id: '3', full_name: 'Carlos Mendes', email: 'carlos@mendes.pt', phone: '+351 914 567 890', score: 91, temperature: 'hot', stage: 'Negociação', source: 'instagram', assignee: 'Ana Silva', tags: ['urgente', 'premium'], created_at: '2024-02-15', last_contact_at: '2024-04-13', notes: '' },
  '4': { id: '4', full_name: 'Sofia Lopes', email: 'sofia@lopes.pt', phone: '+351 915 678 901', company: 'SL Ventures', score: 65, temperature: 'warm', stage: 'Qualificando', source: 'linkedin', assignee: 'Ana Silva', tags: ['linkedin', 'b2b'], created_at: '2024-02-10', last_contact_at: '2024-04-10', notes: '' },
  '5': { id: '5', full_name: 'Miguel Costa', email: 'miguel@costa.pt', phone: '+351 916 789 012', score: 44, temperature: 'cold', stage: 'Nova Lead', source: 'organic', assignee: 'Carlos M.', tags: [], created_at: '2024-02-05', last_contact_at: '2024-04-09', notes: '' },
}

const MOCK_INTERACTIONS: Interaction[] = [
  { id: 'i1', type: 'whatsapp', content: 'Mensagem de boas-vindas enviada via WhatsApp', created_at: '2024-04-12T14:32:00', user: { full_name: 'Ana Silva' } },
  { id: 'i2', type: 'call', content: 'Call realizada — 18 minutos', outcome: 'Interessado, aguarda proposta', created_at: '2024-04-10T10:00:00', user: { full_name: 'Carlos M.' } },
  { id: 'i3', type: 'email', content: 'Email de follow-up com case study enviado', created_at: '2024-04-08T09:15:00', user: { full_name: 'Ana Silva' } },
  { id: 'i4', type: 'automation', content: 'Automação "Boas-vindas" executada', created_at: '2024-04-05T08:00:00' },
  { id: 'i5', type: 'status_change', content: 'Lead movido para Call Agendada', created_at: '2024-04-03T16:20:00', user: { full_name: 'Ana Silva' } },
  { id: 'i6', type: 'note', content: 'Cliente interessado em pacote Enterprise. Mencionar desconto de 20%.', created_at: '2024-04-01T11:30:00', user: { full_name: 'Carlos M.' } },
]

const MOCK_DEALS: Deal[] = [
  { id: 'd1', name: 'Pacote Growth — TF Digital', value: 2400, status: 'negotiating', created_at: '2024-04-08' },
]

const MOCK_SCORE_EVENTS: ScoreEvent[] = [
  { event: 'WhatsApp respondido', points: +20, channel: 'WhatsApp', ts: '12 Abr' },
  { event: 'Call realizada (18min)', points: +30, channel: 'Telefone', ts: '10 Abr' },
  { event: 'Email clicado', points: +15, channel: 'Email', ts: '8 Abr' },
  { event: 'Formulário preenchido', points: +25, channel: 'Web', ts: '5 Abr' },
  { event: 'Sem actividade 24h', points: -3, channel: 'Sistema', ts: '4 Abr' },
  { event: 'Call agendada', points: +20, channel: 'Calendário', ts: '3 Abr' },
  { event: 'Email aberto', points: +8, channel: 'Email', ts: '2 Abr' },
  { event: 'Lead criada via Meta', points: +10, channel: 'Meta Ads', ts: '1 Abr' },
]

/* ─── Config ─── */
const tempColor: Record<Temp, string> = { cold: '#4A6680', warm: '#F5A623', hot: '#E84545' }
const tempLabel: Record<Temp, string> = { cold: 'COLD', warm: 'WARM', hot: 'HOT' }

const INTERACTION_CONFIG = {
  call:          { icon: Phone,         color: '#D1FF00', label: 'Call' },
  email:         { icon: Mail,          color: '#EA4335', label: 'Email' },
  whatsapp:      { icon: MessageSquare, color: '#25D366', label: 'WhatsApp' },
  note:          { icon: FileText,      color: 'var(--t3)', label: 'Nota' },
  status_change: { icon: Activity,      color: 'var(--cyan)', label: 'Mudança de fase' },
  automation:    { icon: Zap,           color: '#D1FF00', label: 'Automação' },
}

const SOURCE_LABELS: Record<string, string> = {
  meta: 'Meta Ads', google: 'Google Ads', instagram: 'Instagram',
  linkedin: 'LinkedIn', organic: 'Orgânico', whatsapp: 'WhatsApp', referral: 'Referência',
}

function relativeTime(isoDate: string) {
  const diff = Date.now() - new Date(isoDate).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m atrás`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h atrás`
  return `${Math.floor(hours / 24)}d atrás`
}

/* ─── Score Breakdown Component ─── */
function ScoreBreakdown({ score, events }: { score: number; events: ScoreEvent[] }) {
  const [expanded, setExpanded] = useState(false)
  const scoreColor = score >= 70 ? '#00E5A0' : score >= 40 ? '#F5A623' : '#E84545'
  const top3 = events.slice(0, 3)

  return (
    <div className="flex flex-col gap-3">
      {/* Score visual bar */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs uppercase tracking-wider" style={{ color: 'var(--t3)' }}>Score Comportamental</span>
          <span className="text-xs font-bold" style={{ color: scoreColor }}>{score}/100</span>
        </div>
        <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--s3)' }}>
          <div
            className="h-2 rounded-full transition-all duration-700"
            style={{ width: `${score}%`, background: `linear-gradient(90deg, ${scoreColor}88, ${scoreColor})` }}
          />
        </div>
      </div>

      {/* Top 3 factors */}
      <div className="flex flex-col gap-1.5">
        {top3.map((e, i) => (
          <div key={i} className="flex items-center justify-between px-2.5 py-1.5 rounded-lg" style={{ background: 'var(--s3)' }}>
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-[10px]" style={{ color: 'var(--t3)' }}>{e.channel}</span>
              <span className="text-xs truncate" style={{ color: 'var(--t2)' }}>{e.event}</span>
            </div>
            <span
              className="text-xs font-bold ml-2 flex-shrink-0"
              style={{ color: e.points > 0 ? '#00E5A0' : '#E84545' }}
            >
              {e.points > 0 ? '+' : ''}{e.points}
            </span>
          </div>
        ))}
      </div>

      {/* Expandable history */}
      <button
        onClick={() => setExpanded(q => !q)}
        className="flex items-center gap-1.5 text-xs self-start"
        style={{ color: 'var(--cyan)' }}
      >
        {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        {expanded ? 'Ocultar histórico' : `Ver todos os ${events.length} eventos`}
      </button>

      {expanded && (
        <div className="flex flex-col gap-1">
          {events.slice(3).map((e, i) => (
            <div key={i} className="flex items-center justify-between px-2.5 py-1.5 rounded-lg" style={{ background: 'var(--s3)' }}>
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-[10px] w-14 flex-shrink-0" style={{ color: 'var(--t3)' }}>{e.ts}</span>
                <span className="text-xs truncate" style={{ color: 'var(--t2)' }}>{e.event}</span>
              </div>
              <span
                className="text-xs font-bold ml-2 flex-shrink-0"
                style={{ color: e.points > 0 ? '#00E5A0' : '#E84545' }}
              >
                {e.points > 0 ? '+' : ''}{e.points}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ─── Timeline Item ─── */
function TimelineItem({ item }: { item: Interaction }) {
  const [expanded, setExpanded] = useState(false)
  const cfg = INTERACTION_CONFIG[item.type]
  const Icon = cfg.icon

  return (
    <div
      className="flex items-start gap-3 py-3 cursor-pointer group"
      style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
      onClick={() => setExpanded(q => !q)}
    >
      <div
        className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
        style={{ background: `${cfg.color}18` }}
      >
        <Icon size={13} style={{ color: cfg.color }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: cfg.color }}>{cfg.label}</span>
          {item.user && <span className="text-[10px]" style={{ color: 'var(--t3)' }}>por {item.user.full_name}</span>}
        </div>
        <p className="text-sm mt-0.5" style={{ color: 'var(--t2)' }}>{item.content}</p>
        {expanded && item.outcome && (
          <div className="mt-2 px-3 py-2 rounded-lg text-xs" style={{ background: 'var(--s3)', color: 'var(--t2)' }}>
            <span style={{ color: 'var(--t3)' }}>Outcome: </span>{item.outcome}
          </div>
        )}
      </div>
      <span className="text-[11px] flex-shrink-0 mt-0.5" style={{ color: 'var(--t3)' }}>
        {relativeTime(item.created_at)}
      </span>
    </div>
  )
}

/* ─── Main Page ─── */
export default function ContactProfilePage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const [newNote, setNewNote] = useState('')
  const [showDealModal, setShowDealModal] = useState(false)

  // Try to get from mock data — production would use tRPC
  const contact = MOCK_CONTACTS[id]

  useEffect(() => {
    // In production: fetch via api.admin.leads.getById.useQuery({ id })
  }, [id])

  if (!contact) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-lg font-semibold" style={{ color: 'var(--t2)' }}>Contacto não encontrado</p>
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm"
          style={{ background: 'var(--s2)', color: 'var(--t2)' }}
        >
          <ArrowLeft size={14} /> Voltar
        </button>
      </div>
    )
  }

  const scoreColor = contact.score >= 70 ? '#00E5A0' : contact.score >= 40 ? '#F5A623' : '#E84545'
  const initials = contact.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()

  const TABS: { id: Tab; label: string }[] = [
    { id: 'overview', label: 'Visão Geral' },
    { id: 'conversations', label: 'Conversas' },
    { id: 'calls', label: 'Calls' },
    { id: 'campaigns', label: 'Campanhas' },
    { id: 'deals', label: `Negócios (${MOCK_DEALS.length})` },
    { id: 'notes', label: 'Notas' },
  ]

  return (
    <div className="flex flex-col gap-0 -m-6 h-full" style={{ minHeight: 'calc(100vh - 56px)' }}>

      {/* ── Top bar ── */}
      <div
        className="flex items-center gap-4 px-6 py-4 flex-shrink-0"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'var(--s0)' }}
      >
        <button
          onClick={() => router.back()}
          className="p-2 rounded-xl tonal-hover"
          style={{ color: 'var(--t3)' }}
        >
          <ArrowLeft size={16} />
        </button>
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0"
            style={{ background: `${tempColor[contact.temperature]}18`, color: tempColor[contact.temperature] }}
          >
            {initials}
          </div>
          <div className="min-w-0">
            <h1 className="text-base font-bold truncate" style={{ color: 'var(--t1)' }}>{contact.full_name}</h1>
            {contact.company && <p className="text-xs truncate" style={{ color: 'var(--t3)' }}>{contact.company}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={contact.phone ? `https://wa.me/${contact.phone.replace(/\D/g, '')}` : '#'}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold"
            style={{ background: 'rgba(37,211,102,0.12)', color: '#25D366' }}
          >
            <MessageSquare size={13} /> WhatsApp
          </a>
          <a
            href={contact.phone ? `tel:${contact.phone}` : '#'}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold"
            style={{ background: 'var(--cyan)', color: '#0D1117' }}
          >
            <Phone size={13} /> Call
          </a>
        </div>
      </div>

      {/* ── 3-column layout ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* LEFT COLUMN — Identity */}
        <div
          className="w-64 flex-shrink-0 flex flex-col gap-4 p-5 overflow-y-auto"
          style={{ borderRight: '1px solid rgba(255,255,255,0.05)', background: 'var(--s0)' }}
        >
          {/* Avatar + score */}
          <div className="flex flex-col items-center gap-3 py-4">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-bold"
              style={{ background: `${tempColor[contact.temperature]}18`, color: tempColor[contact.temperature] }}
            >
              {initials}
            </div>
            <div className="text-center">
              <p className="font-bold" style={{ color: 'var(--t1)' }}>{contact.full_name}</p>
              {contact.company && <p className="text-xs" style={{ color: 'var(--t3)' }}>{contact.company}</p>}
            </div>

            {/* Score ring */}
            <div className="flex flex-col items-center gap-1 w-full">
              <div className="flex items-center justify-between w-full">
                <span className="text-xs" style={{ color: 'var(--t3)' }}>Score</span>
                <span className="text-sm font-bold" style={{ color: scoreColor }}>{contact.score}</span>
              </div>
              <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: 'var(--s3)' }}>
                <div
                  className="h-2 rounded-full transition-all"
                  style={{ width: `${contact.score}%`, background: scoreColor }}
                />
              </div>
            </div>
          </div>

          {/* Badges */}
          <div className="flex flex-col gap-2">
            <div
              className="flex items-center gap-2 px-3 py-2 rounded-xl"
              style={{ background: `${tempColor[contact.temperature]}12` }}
            >
              <Activity size={13} style={{ color: tempColor[contact.temperature] }} />
              <span className="text-sm font-bold" style={{ color: tempColor[contact.temperature] }}>
                {tempLabel[contact.temperature]}
              </span>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: 'var(--s2)' }}>
              <Target size={13} style={{ color: 'var(--cyan)' }} />
              <span className="text-sm" style={{ color: 'var(--t2)' }}>{contact.stage}</span>
            </div>
          </div>

          {/* Info fields */}
          <div className="flex flex-col gap-2">
            {[
              { label: 'Email', value: contact.email, icon: Mail },
              { label: 'Telefone', value: contact.phone, icon: Phone },
              { label: 'Fonte', value: SOURCE_LABELS[contact.source] ?? contact.source, icon: ExternalLink },
              { label: 'Responsável', value: contact.assignee, icon: Users },
              { label: 'Criado em', value: contact.created_at, icon: Calendar },
              ...(contact.last_contact_at ? [{ label: 'Último contacto', value: relativeTime(contact.last_contact_at + 'T00:00:00'), icon: Clock }] : []),
            ].map(({ label, value, icon: Icon }) => value ? (
              <div key={label} className="px-3 py-2 rounded-xl" style={{ background: 'var(--s2)' }}>
                <div className="flex items-center gap-2">
                  <Icon size={11} style={{ color: 'var(--t3)', flexShrink: 0 }} />
                  <p className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--t3)' }}>{label}</p>
                </div>
                <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--t1)' }}>{value}</p>
              </div>
            ) : null)}
          </div>

          {/* Tags */}
          <div>
            <p className="text-[10px] uppercase tracking-wider mb-2" style={{ color: 'var(--t3)' }}>Tags</p>
            <div className="flex flex-wrap gap-1.5">
              {contact.tags.map(t => (
                <span
                  key={t}
                  className="text-[10px] px-2 py-0.5 rounded-lg flex items-center gap-1"
                  style={{ background: 'var(--s2)', color: 'var(--t2)' }}
                >
                  <Tag size={8} />#{t}
                </span>
              ))}
              <button className="text-[10px] px-2 py-0.5 rounded-lg" style={{ background: 'rgba(33,160,196,0.1)', color: 'var(--cyan)' }}>
                + Tag
              </button>
            </div>
          </div>

          {/* Quick actions */}
          <div className="flex flex-col gap-2 pt-2">
            <button
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm w-full"
              style={{ background: 'var(--s2)', color: 'var(--t2)' }}
            >
              <Calendar size={13} style={{ color: 'var(--cyan)' }} /> Agendar Call
            </button>
            <button
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm w-full"
              style={{ background: 'var(--s2)', color: 'var(--t2)' }}
            >
              <Mail size={13} style={{ color: '#EA4335' }} /> Enviar Email
            </button>
            <button
              onClick={() => setShowDealModal(true)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm w-full"
              style={{ background: 'var(--s2)', color: 'var(--t2)' }}
            >
              <TrendingUp size={13} style={{ color: '#D1FF00' }} /> Novo Negócio
            </button>
          </div>
        </div>

        {/* CENTER COLUMN — Timeline + Tabs */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Tabs */}
          <div
            className="flex gap-0 px-6 flex-shrink-0"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
          >
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="px-4 py-3.5 text-xs font-semibold transition-all"
                style={{
                  color: activeTab === tab.id ? 'var(--cyan)' : 'var(--t3)',
                  borderBottom: activeTab === tab.id ? '2px solid var(--cyan)' : '2px solid transparent',
                  marginBottom: '-1px',
                  whiteSpace: 'nowrap',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto p-6">

            {/* VISÃO GERAL */}
            {activeTab === 'overview' && (
              <div className="flex flex-col gap-6">
                {/* Stats row */}
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { label: 'Interacções', value: MOCK_INTERACTIONS.length, color: 'var(--cyan)', icon: Activity },
                    { label: 'Calls', value: MOCK_INTERACTIONS.filter(i => i.type === 'call').length, color: '#D1FF00', icon: Phone },
                    { label: 'Deals', value: MOCK_DEALS.length, color: '#00E5A0', icon: TrendingUp },
                  ].map(({ label, value, color, icon: Icon }) => (
                    <div key={label} className="card p-4 flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${color}18` }}>
                        <Icon size={16} style={{ color }} />
                      </div>
                      <div>
                        <p className="text-xs" style={{ color: 'var(--t3)' }}>{label}</p>
                        <p className="text-xl font-bold font-display" style={{ color: 'var(--t1)' }}>{value}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Timeline */}
                <div className="card p-5">
                  <p className="text-sm font-semibold mb-4" style={{ color: 'var(--t1)' }}>Timeline de Actividade</p>
                  <div className="flex flex-col">
                    {MOCK_INTERACTIONS.map(item => (
                      <TimelineItem key={item.id} item={item} />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* CONVERSAS */}
            {activeTab === 'conversations' && (
              <div className="flex flex-col gap-4">
                <div className="card p-5">
                  <p className="text-sm" style={{ color: 'var(--t3)' }}>Conversas integradas via GHL — próximamente disponível.</p>
                  <div className="flex flex-col gap-3 mt-4">
                    {MOCK_INTERACTIONS.filter(i => ['whatsapp', 'email'].includes(i.type)).map(item => (
                      <TimelineItem key={item.id} item={item} />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* CALLS */}
            {activeTab === 'calls' && (
              <div className="flex flex-col gap-4">
                <div className="card p-5">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-sm font-semibold" style={{ color: 'var(--t1)' }}>Histórico de Calls</p>
                    <button
                      className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-xl"
                      style={{ background: 'rgba(33,160,196,0.1)', color: 'var(--cyan)' }}
                    >
                      <Plus size={13} /> Agendar Call
                    </button>
                  </div>
                  {MOCK_INTERACTIONS.filter(i => i.type === 'call').map(item => (
                    <TimelineItem key={item.id} item={item} />
                  ))}
                  {MOCK_INTERACTIONS.filter(i => i.type === 'call').length === 0 && (
                    <p className="text-sm text-center py-4" style={{ color: 'var(--t3)' }}>Nenhuma call registada</p>
                  )}
                </div>
              </div>
            )}

            {/* CAMPANHAS */}
            {activeTab === 'campaigns' && (
              <div className="card p-5">
                <p className="text-sm font-semibold mb-4" style={{ color: 'var(--t1)' }}>Campanhas em que participou</p>
                {[
                  { name: 'Sequência Boas-Vindas', status: 'completed', step: '5/5', date: '1 Abr' },
                  { name: 'Follow-up Score Alto', status: 'active', step: '2/4', date: '10 Abr' },
                ].map((c, i) => (
                  <div key={i} className="flex items-center gap-3 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: c.status === 'active' ? 'rgba(0,229,160,0.1)' : 'var(--s2)' }}>
                      <Zap size={13} style={{ color: c.status === 'active' ? '#00E5A0' : 'var(--t3)' }} />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm" style={{ color: 'var(--t1)' }}>{c.name}</p>
                      <p className="text-xs" style={{ color: 'var(--t3)' }}>Passo {c.step} · {c.date}</p>
                    </div>
                    <span
                      className="text-xs font-bold px-2 py-0.5 rounded-full"
                      style={{
                        background: c.status === 'active' ? 'rgba(0,229,160,0.1)' : 'var(--s3)',
                        color: c.status === 'active' ? '#00E5A0' : 'var(--t3)',
                      }}
                    >
                      {c.status === 'active' ? 'Activa' : 'Concluída'}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* NEGÓCIOS */}
            {activeTab === 'deals' && (
              <div className="flex flex-col gap-4">
                <button
                  onClick={() => setShowDealModal(true)}
                  className="flex items-center gap-2 text-sm px-4 py-2.5 rounded-xl w-full justify-center"
                  style={{ background: 'rgba(33,160,196,0.1)', color: 'var(--cyan)' }}
                >
                  <Plus size={14} /> Novo Negócio
                </button>
                {MOCK_DEALS.map(deal => (
                  <div key={deal.id} className="card p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="font-semibold" style={{ color: 'var(--t1)' }}>{deal.name}</p>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--t3)' }}>Criado em {deal.created_at}</p>
                      </div>
                      <span
                        className="text-xs font-bold px-2 py-0.5 rounded-full"
                        style={{
                          background: deal.status === 'won' ? 'rgba(0,229,160,0.1)' : deal.status === 'lost' ? 'rgba(232,69,69,0.1)' : 'rgba(245,166,35,0.1)',
                          color: deal.status === 'won' ? '#00E5A0' : deal.status === 'lost' ? '#E84545' : '#F5A623',
                        }}
                      >
                        {deal.status === 'won' ? 'Ganho' : deal.status === 'lost' ? 'Perdido' : deal.status === 'negotiating' ? 'Em Negociação' : 'Aberto'}
                      </span>
                    </div>
                    <p className="text-2xl font-bold font-display" style={{ color: '#00E5A0' }}>
                      €{deal.value.toLocaleString('pt-PT')}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* NOTAS */}
            {activeTab === 'notes' && (
              <div className="flex flex-col gap-4">
                <div className="card p-4">
                  <textarea
                    value={newNote}
                    onChange={e => setNewNote(e.target.value)}
                    placeholder="Escrever nota... (Cmd+Enter para guardar)"
                    rows={3}
                    className="w-full px-3 py-2.5 rounded-xl text-sm outline-none resize-none"
                    style={{ background: 'var(--s2)', color: 'var(--t1)', border: '1px solid rgba(255,255,255,0.05)' }}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                        // Save note
                        setNewNote('')
                      }
                    }}
                  />
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-xs" style={{ color: 'var(--t3)' }}>Cmd+Enter para guardar</span>
                    <button
                      onClick={() => setNewNote('')}
                      className="text-sm font-semibold px-4 py-1.5 rounded-xl"
                      style={{ background: 'var(--cyan)', color: '#0D1117' }}
                    >
                      Guardar
                    </button>
                  </div>
                </div>
                {MOCK_INTERACTIONS.filter(i => i.type === 'note').map(item => (
                  <div key={item.id} className="card px-4 py-3">
                    <p className="text-sm" style={{ color: 'var(--t1)' }}>{item.content}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs" style={{ color: 'var(--t3)' }}>{item.user?.full_name}</span>
                      <span className="text-xs" style={{ color: 'var(--t3)' }}>{relativeTime(item.created_at)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN — Score + Deals + Automations */}
        <div
          className="w-72 flex-shrink-0 flex flex-col gap-5 p-5 overflow-y-auto"
          style={{ borderLeft: '1px solid rgba(255,255,255,0.05)', background: 'var(--s0)' }}
        >
          {/* Score Breakdown */}
          <div className="card p-4">
            <div className="flex items-center gap-2 mb-3">
              <BarChart2 size={14} style={{ color: 'var(--cyan)' }} />
              <p className="text-sm font-semibold" style={{ color: 'var(--t1)' }}>Score Breakdown</p>
            </div>
            <ScoreBreakdown score={contact.score} events={MOCK_SCORE_EVENTS} />
          </div>

          {/* Active Deals */}
          <div className="card p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold" style={{ color: 'var(--t1)' }}>Negócios</p>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(0,229,160,0.1)', color: '#00E5A0' }}>
                {MOCK_DEALS.length}
              </span>
            </div>
            {MOCK_DEALS.length === 0 ? (
              <p className="text-xs" style={{ color: 'var(--t3)' }}>Nenhum deal activo</p>
            ) : (
              MOCK_DEALS.map(d => (
                <div key={d.id} className="flex items-center justify-between py-2">
                  <p className="text-xs truncate" style={{ color: 'var(--t2)' }}>{d.name}</p>
                  <span className="text-xs font-bold ml-2" style={{ color: '#00E5A0' }}>€{d.value.toLocaleString()}</span>
                </div>
              ))
            )}
            <button
              onClick={() => setShowDealModal(true)}
              className="flex items-center gap-1 text-xs mt-2 w-full justify-center py-1.5 rounded-lg"
              style={{ background: 'rgba(33,160,196,0.08)', color: 'var(--cyan)' }}
            >
              <Plus size={11} /> Novo Deal
            </button>
          </div>

          {/* Active Automations */}
          <div className="card p-4">
            <div className="flex items-center gap-2 mb-3">
              <Zap size={14} style={{ color: '#D1FF00' }} />
              <p className="text-sm font-semibold" style={{ color: 'var(--t1)' }}>Automações Activas</p>
            </div>
            {[
              { name: 'Follow-up Score Alto', step: 'Passo 2/4', next: '2h' },
            ].map((a, i) => (
              <div key={i} className="flex items-center gap-2 py-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: '#00E5A0' }} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs truncate" style={{ color: 'var(--t2)' }}>{a.name}</p>
                  <p className="text-[10px]" style={{ color: 'var(--t3)' }}>{a.step} · próximo: {a.next}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Deal Modal ── */}
      {showDealModal && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50"
          style={{ background: 'rgba(0,0,0,0.7)' }}
          onClick={() => setShowDealModal(false)}
        >
          <div
            className="w-96 rounded-2xl p-6 flex flex-col gap-4"
            style={{ background: 'var(--s1)', border: '1px solid rgba(255,255,255,0.08)' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <p className="text-base font-bold" style={{ color: 'var(--t1)' }}>Novo Negócio</p>
              <button onClick={() => setShowDealModal(false)} style={{ color: 'var(--t3)' }}>
                <X size={16} />
              </button>
            </div>
            {[
              { label: 'Valor (€)', placeholder: '0', type: 'number' },
              { label: 'Produto / Serviço', placeholder: 'Ex: Pacote Growth', type: 'text' },
              { label: 'Data estimada de fecho', placeholder: '', type: 'date' },
            ].map(field => (
              <div key={field.label}>
                <label className="text-xs mb-1 block" style={{ color: 'var(--t3)' }}>{field.label}</label>
                <input
                  type={field.type}
                  placeholder={field.placeholder}
                  className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                  style={{ background: 'var(--s2)', color: 'var(--t1)', border: '1px solid rgba(255,255,255,0.06)' }}
                />
              </div>
            ))}
            <div className="flex gap-2 mt-2">
              <button
                onClick={() => setShowDealModal(false)}
                className="flex-1 py-2.5 rounded-xl text-sm"
                style={{ background: 'var(--s2)', color: 'var(--t2)' }}
              >
                Cancelar
              </button>
              <button
                onClick={() => setShowDealModal(false)}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
                style={{ background: 'var(--cyan)', color: '#0D1117' }}
              >
                Criar Deal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
