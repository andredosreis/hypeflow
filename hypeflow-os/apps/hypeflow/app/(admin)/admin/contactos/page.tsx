'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Search, Filter, Plus, Phone, Mail, MessageSquare,
  Star, MoreVertical, Tag, TrendingUp, Calendar,
  ChevronDown, X, Edit2, ExternalLink, Clock, Zap,
  Users, Activity, Target, Euro, Download,
} from 'lucide-react'

/* ─── Types ─── */
type Temp = 'hot' | 'warm' | 'cold'
type Source = 'meta' | 'google' | 'instagram' | 'linkedin' | 'organic' | 'whatsapp' | 'referral'

interface Contact {
  id: string
  name: string
  email: string
  phone: string
  company?: string
  score: number
  temp: Temp
  source: Source
  stage: string
  tags: string[]
  assignee: string
  createdAt: string
  lastActivity: string
  deals: number
  revenue: number
  notes: number
  starred: boolean
}

/* ─── Mock Data ─── */
const STAGES = ['Nova Lead', 'Qualificando', 'Call Agendada', 'Proposta', 'Negociação', 'Cliente', 'Perdido']

const SOURCE_COLORS: Record<Source, string> = {
  meta: '#1877F2',
  google: '#4285F4',
  instagram: '#E1306C',
  linkedin: '#0A66C2',
  organic: '#00E5A0',
  whatsapp: '#25D366',
  referral: '#F5A623',
}

const SOURCE_LABELS: Record<Source, string> = {
  meta: 'Meta',
  google: 'Google',
  instagram: 'Instagram',
  linkedin: 'LinkedIn',
  organic: 'Orgânico',
  whatsapp: 'WhatsApp',
  referral: 'Referência',
}

const tempColor: Record<Temp, string> = { cold: '#4A6680', warm: '#F5A623', hot: '#E84545' }

const MOCK_CONTACTS: Contact[] = [
  { id: '1', name: 'Tiago Fonseca', email: 'tiago@empresa.pt', phone: '+351 912 345 678', company: 'TF Digital', score: 87, temp: 'hot', source: 'meta', stage: 'Call Agendada', tags: ['marketing', 'e-commerce'], assignee: 'Ana Silva', createdAt: '2024-03-01', lastActivity: '2m', deals: 1, revenue: 0, notes: 3, starred: true },
  { id: '2', name: 'Ana Ferreira', email: 'ana@ferreira.pt', phone: '+351 913 456 789', company: 'Ferreira & Co', score: 72, temp: 'warm', source: 'google', stage: 'Proposta', tags: ['b2b', 'consulting'], assignee: 'Carlos M.', createdAt: '2024-02-20', lastActivity: '15m', deals: 1, revenue: 2400, notes: 5, starred: false },
  { id: '3', name: 'Carlos Mendes', email: 'carlos@mendes.pt', phone: '+351 914 567 890', score: 91, temp: 'hot', source: 'instagram', stage: 'Negociação', tags: ['urgente', 'premium'], assignee: 'Ana Silva', createdAt: '2024-02-15', lastActivity: '1h', deals: 2, revenue: 4800, notes: 8, starred: true },
  { id: '4', name: 'Sofia Lopes', email: 'sofia@lopes.pt', phone: '+351 915 678 901', company: 'SL Ventures', score: 65, temp: 'warm', source: 'linkedin', stage: 'Qualificando', tags: ['linkedin', 'b2b'], assignee: 'Ana Silva', createdAt: '2024-02-10', lastActivity: '2h', deals: 0, revenue: 0, notes: 2, starred: false },
  { id: '5', name: 'Miguel Costa', email: 'miguel@costa.pt', phone: '+351 916 789 012', score: 44, temp: 'cold', source: 'organic', stage: 'Nova Lead', tags: [], assignee: 'Carlos M.', createdAt: '2024-02-05', lastActivity: '1d', deals: 0, revenue: 0, notes: 1, starred: false },
  { id: '6', name: 'Rita Alves', email: 'rita@alves.pt', phone: '+351 917 890 123', company: 'RA Studio', score: 78, temp: 'warm', source: 'whatsapp', stage: 'Call Agendada', tags: ['criativo', 'branding'], assignee: 'Ana Silva', createdAt: '2024-01-28', lastActivity: '3h', deals: 0, revenue: 0, notes: 4, starred: false },
  { id: '7', name: 'João Santos', email: 'joao@santos.pt', phone: '+351 918 901 234', company: 'Santos Imob', score: 83, temp: 'hot', source: 'referral', stage: 'Proposta', tags: ['imobiliário', 'premium'], assignee: 'Carlos M.', createdAt: '2024-01-20', lastActivity: '5h', deals: 1, revenue: 1200, notes: 6, starred: true },
  { id: '8', name: 'Marta Rodrigues', email: 'marta@rodrigues.pt', phone: '+351 919 012 345', score: 58, temp: 'warm', source: 'meta', stage: 'Qualificando', tags: ['saúde', 'clinica'], assignee: 'Ana Silva', createdAt: '2024-01-15', lastActivity: '1d', deals: 0, revenue: 0, notes: 2, starred: false },
]

const ALL_TAGS = Array.from(new Set(MOCK_CONTACTS.flatMap(c => c.tags)))

/* ─── Contact Detail Sidebar ─── */
function ContactSidebar({ contact, onClose }: { contact: Contact; onClose: () => void }) {
  const [activeTab, setActiveTab] = useState<'info' | 'activity' | 'notes' | 'deals'>('info')

  return (
    <div className="w-96 flex-shrink-0 flex flex-col border-l overflow-y-auto" style={{ borderColor: 'rgba(255,255,255,0.05)', background: 'var(--s0)' }}>
      {/* Header */}
      <div className="px-5 pt-5 pb-4">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-bold" style={{ background: 'var(--s2)', color: 'var(--t2)' }}>
              {contact.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
            </div>
            <div>
              <p className="font-bold" style={{ color: 'var(--t1)' }}>{contact.name}</p>
              {contact.company && <p className="text-sm" style={{ color: 'var(--t3)' }}>{contact.company}</p>}
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg tonal-hover" style={{ color: 'var(--t3)' }}>
            <X size={14} />
          </button>
        </div>

        {/* Score + Temp */}
        <div className="flex items-center gap-2 mb-4">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl" style={{ background: `${tempColor[contact.temp]}18` }}>
            <Activity size={12} style={{ color: tempColor[contact.temp] }} />
            <span className="text-xs font-bold" style={{ color: tempColor[contact.temp] }}>{contact.temp.toUpperCase()}</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl" style={{ background: 'rgba(33,160,196,0.1)' }}>
            <Target size={12} style={{ color: 'var(--cyan)' }} />
            <span className="text-xs font-bold" style={{ color: 'var(--cyan)' }}>Score {contact.score}</span>
          </div>
          <div className="px-3 py-1.5 rounded-xl text-xs" style={{ background: 'var(--s2)', color: 'var(--t2)' }}>
            {contact.stage}
          </div>
        </div>

        {/* Quick actions */}
        <div className="flex gap-2">
          <button className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-semibold" style={{ background: 'var(--cyan)', color: '#0D1117' }}>
            <Phone size={13} /> Call
          </button>
          <button className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm" style={{ background: 'var(--s2)', color: 'var(--t2)' }}>
            <MessageSquare size={13} /> WhatsApp
          </button>
          <button className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm" style={{ background: 'var(--s2)', color: 'var(--t2)' }}>
            <Mail size={13} /> Email
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b px-4" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
        {(['info', 'activity', 'notes', 'deals'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="px-3 py-2.5 text-xs font-semibold transition-all"
            style={{
              color: activeTab === tab ? 'var(--cyan)' : 'var(--t3)',
              borderBottom: activeTab === tab ? '2px solid var(--cyan)' : '2px solid transparent',
              marginBottom: '-1px',
            }}
          >
            {tab === 'info' ? 'Info' : tab === 'activity' ? 'Actividade' : tab === 'notes' ? `Notas (${contact.notes})` : `Negócios (${contact.deals})`}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 p-4">
        {activeTab === 'info' && (
          <div className="flex flex-col gap-4">
            {/* Contact details */}
            <div className="flex flex-col gap-2">
              {[
                { label: 'Email', value: contact.email, icon: Mail },
                { label: 'Telefone', value: contact.phone, icon: Phone },
                { label: 'Fonte', value: SOURCE_LABELS[contact.source], icon: ExternalLink },
                { label: 'Responsável', value: contact.assignee, icon: Users },
                { label: 'Criado em', value: contact.createdAt, icon: Calendar },
              ].map(({ label, value, icon: Icon }) => (
                <div key={label} className="flex items-center gap-3 px-3 py-2.5 rounded-xl" style={{ background: 'var(--s2)' }}>
                  <Icon size={13} style={{ color: 'var(--t3)', flexShrink: 0 }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] uppercase tracking-wider" style={{ color: 'var(--t3)' }}>{label}</p>
                    <p className="text-sm truncate" style={{ color: 'var(--t1)' }}>{value}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Tags */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--t3)' }}>Tags</p>
              <div className="flex flex-wrap gap-1.5">
                {contact.tags.map(t => (
                  <span key={t} className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg" style={{ background: 'var(--s2)', color: 'var(--t2)' }}>
                    <Tag size={9} />#{t}
                    <button style={{ color: 'var(--t3)' }}><X size={9} /></button>
                  </span>
                ))}
                <button className="text-xs px-2 py-1 rounded-lg" style={{ background: 'rgba(33,160,196,0.1)', color: 'var(--cyan)' }}>+ Tag</button>
              </div>
            </div>

            {/* Revenue */}
            {contact.revenue > 0 && (
              <div className="px-4 py-3 rounded-2xl" style={{ background: 'rgba(0,229,160,0.06)', border: '1px solid rgba(0,229,160,0.12)' }}>
                <p className="text-xs" style={{ color: 'var(--t3)' }}>Receita Total</p>
                <p className="text-2xl font-bold font-display" style={{ color: 'var(--success)' }}>€{contact.revenue.toLocaleString('pt-PT')}</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'activity' && (
          <div className="flex flex-col gap-1">
            {[
              { icon: MessageSquare, text: 'Mensagem WhatsApp enviada', time: '2m', color: '#25D366' },
              { icon: Phone, text: 'Call realizada — 18min', time: '2d', color: 'var(--cyan)' },
              { icon: Mail, text: 'Email de follow-up enviado', time: '4d', color: '#EA4335' },
              { icon: Zap, text: 'Automação "Boas-vindas" executada', time: '5d', color: '#D1FF00' },
              { icon: Target, text: 'Lead criada via Meta Ads', time: '1sem', color: '#1877F2' },
            ].map(({ icon: Icon, text, time, color }, i) => (
              <div key={i} className="flex items-start gap-3 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                <div className="w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: `${color}18` }}>
                  <Icon size={12} style={{ color }} />
                </div>
                <div className="flex-1">
                  <p className="text-sm" style={{ color: 'var(--t2)' }}>{text}</p>
                </div>
                <span className="text-[11px] flex-shrink-0" style={{ color: 'var(--t3)' }}>{time}</span>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'notes' && (
          <div className="flex flex-col gap-3">
            <textarea
              placeholder="Adicionar nota..."
              rows={3}
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none resize-none"
              style={{ background: 'var(--s2)', color: 'var(--t1)', border: '1px solid rgba(255,255,255,0.05)' }}
            />
            <button className="text-sm font-semibold px-4 py-2 rounded-xl self-end" style={{ background: 'var(--cyan)', color: '#0D1117' }}>
              Guardar Nota
            </button>
            {[
              { text: 'Cliente interessado em pacote Enterprise. Mencionar desconto de 20% para contratos anuais.', date: '2d atrás', author: 'Ana' },
              { text: 'Call realizada. Tem objecções sobre preço. Follow-up para quinta.', date: '4d atrás', author: 'Carlos' },
            ].map((note, i) => (
              <div key={i} className="px-4 py-3 rounded-xl" style={{ background: 'var(--s2)' }}>
                <p className="text-sm" style={{ color: 'var(--t1)' }}>{note.text}</p>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs" style={{ color: 'var(--t3)' }}>{note.author}</span>
                  <span className="text-xs" style={{ color: 'var(--t3)' }}>{note.date}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'deals' && (
          <div className="flex flex-col gap-3">
            <button className="flex items-center gap-2 text-sm px-4 py-2.5 rounded-xl w-full justify-center" style={{ background: 'rgba(33,160,196,0.1)', color: 'var(--cyan)' }}>
              <Plus size={14} /> Novo Negócio
            </button>
            {contact.deals > 0 ? (
              <div className="px-4 py-3 rounded-xl" style={{ background: 'var(--s2)' }}>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-semibold" style={{ color: 'var(--t1)' }}>Pacote Growth</p>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(0,229,160,0.1)', color: 'var(--success)' }}>Em negociação</span>
                </div>
                <p className="text-lg font-bold" style={{ color: 'var(--success)' }}>€{contact.revenue.toLocaleString('pt-PT')}</p>
                <p className="text-xs mt-1" style={{ color: 'var(--t3)' }}>Proposta enviada · 3 dias atrás</p>
              </div>
            ) : (
              <p className="text-sm text-center py-4" style={{ color: 'var(--t3)' }}>Nenhum negócio ainda</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

/* ─── Main Page ─── */
export default function ContactosPage() {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [tempFilter, setTempFilter] = useState<Temp | 'all'>('all')
  const [stageFilter, setStageFilter] = useState<string>('all')
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)
  const [showTagFilter, setShowTagFilter] = useState(false)
  const [selectedTags, setSelectedTags] = useState<string[]>([])

  const filtered = MOCK_CONTACTS.filter(c => {
    if (tempFilter !== 'all' && c.temp !== tempFilter) return false
    if (stageFilter !== 'all' && c.stage !== stageFilter) return false
    if (search && !c.name.toLowerCase().includes(search.toLowerCase()) && !c.email.toLowerCase().includes(search.toLowerCase())) return false
    if (selectedTags.length > 0 && !selectedTags.every(t => c.tags.includes(t))) return false
    return true
  })

  const exportCsv = useCallback(() => {
    const headers = ['Nome', 'Email', 'Telefone', 'Empresa', 'Score', 'Temperatura', 'Fonte', 'Fase', 'Tags', 'Responsável', 'Criado Em', 'Receita']
    const rows = filtered.map(c => [
      c.name,
      c.email,
      c.phone,
      c.company ?? '',
      String(c.score),
      c.temp,
      SOURCE_LABELS[c.source],
      c.stage,
      c.tags.join('; '),
      c.assignee,
      c.createdAt,
      String(c.revenue),
    ])
    const csv = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `contactos_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }, [filtered])

  const stats = {
    total: MOCK_CONTACTS.length,
    hot: MOCK_CONTACTS.filter(c => c.temp === 'hot').length,
    thisWeek: 8,
    revenue: MOCK_CONTACTS.reduce((s, c) => s + c.revenue, 0),
  }

  return (
    <div className="flex h-full gap-0 -m-6" style={{ height: 'calc(100vh - 56px)' }}>
      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 flex-shrink-0">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h1 className="page-title">Contactos & CRM</h1>
              <p className="text-sm mt-0.5" style={{ color: 'var(--t3)' }}>Base de dados de leads e clientes</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={exportCsv}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors"
                style={{ background: 'var(--s2)', color: 'var(--t2)', border: '1px solid rgba(255,255,255,0.06)' }}
                title={`Exportar ${filtered.length} contactos como CSV`}
              >
                <Download size={14} /> CSV
              </button>
              <button className="btn-lime flex items-center gap-2 px-5 py-2.5 rounded-xl">
                <Plus size={15} /> Novo Contacto
              </button>
            </div>
          </div>

          {/* KPI row */}
          <div className="grid grid-cols-4 gap-3 mb-5">
            {[
              { label: 'Total Contactos', value: stats.total, icon: Users, color: 'var(--cyan)' },
              { label: 'Hot Leads', value: stats.hot, icon: Activity, color: '#E84545' },
              { label: 'Novos (7d)', value: stats.thisWeek, icon: TrendingUp, color: 'var(--success)' },
              { label: 'Receita Total', value: `€${stats.revenue.toLocaleString('pt-PT')}`, icon: Euro, color: '#F5A623' },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="card p-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${color}18` }}>
                  <Icon size={16} style={{ color }} />
                </div>
                <div>
                  <p className="text-xs" style={{ color: 'var(--t3)' }}>{label}</p>
                  <p className="text-lg font-bold font-display" style={{ color: 'var(--t1)' }}>{value}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-xs">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--t3)' }} />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Pesquisar contactos..."
                className="w-full pl-8 pr-3 py-2 rounded-xl text-sm outline-none"
                style={{ background: 'var(--s2)', color: 'var(--t1)', border: '1px solid rgba(255,255,255,0.05)' }}
              />
            </div>

            {/* Temp filter */}
            <div className="flex items-center gap-1 px-1 py-1 rounded-xl" style={{ background: 'var(--s2)' }}>
              {(['all', 'hot', 'warm', 'cold'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setTempFilter(t)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                  style={{
                    background: tempFilter === t ? (t === 'all' ? 'var(--s3)' : `${tempColor[t as Temp]}18`) : 'transparent',
                    color: tempFilter === t ? (t === 'all' ? 'var(--t1)' : tempColor[t as Temp]) : 'var(--t3)',
                  }}
                >
                  {t === 'all' ? 'Todos' : t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>

            {/* Stage filter */}
            <select
              value={stageFilter}
              onChange={e => setStageFilter(e.target.value)}
              className="px-3 py-2 rounded-xl text-sm outline-none"
              style={{ background: 'var(--s2)', color: 'var(--t2)', border: '1px solid rgba(255,255,255,0.05)' }}
            >
              <option value="all">Todas as fases</option>
              {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>

            <button
              onClick={() => setShowTagFilter(q => !q)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm"
              style={{ background: showTagFilter ? 'rgba(33,160,196,0.1)' : 'var(--s2)', color: showTagFilter ? 'var(--cyan)' : 'var(--t2)' }}
            >
              <Tag size={13} /> Tags
            </button>

            <span className="text-sm" style={{ color: 'var(--t3)', marginLeft: 'auto' }}>{filtered.length} contactos</span>
          </div>

          {/* Tag filter chips */}
          {showTagFilter && (
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {ALL_TAGS.map(tag => (
                <button
                  key={tag}
                  onClick={() => setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag])}
                  className="text-xs px-2.5 py-1 rounded-lg transition-all"
                  style={{
                    background: selectedTags.includes(tag) ? 'rgba(33,160,196,0.15)' : 'var(--s2)',
                    color: selectedTags.includes(tag) ? 'var(--cyan)' : 'var(--t2)',
                    border: selectedTags.includes(tag) ? '1px solid rgba(33,160,196,0.3)' : '1px solid transparent',
                  }}
                >
                  #{tag}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto px-6 pb-6">
          <div className="card overflow-hidden">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  {['Contacto', 'Temperatura', 'Fase', 'Fonte', 'Última Actividade', 'Deals', 'Responsável', ''].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--t3)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(contact => (
                  <tr
                    key={contact.id}
                    onClick={() => router.push(`/admin/contactos/${contact.id}`)}
                    className="group cursor-pointer transition-all"
                    style={{
                      background: selectedContact?.id === contact.id ? 'rgba(33,160,196,0.05)' : 'transparent',
                      borderBottom: '1px solid rgba(255,255,255,0.03)',
                    }}
                  >
                    {/* Contact */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ background: 'var(--s2)', color: 'var(--t2)' }}>
                          {contact.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <p className="text-sm font-semibold" style={{ color: 'var(--t1)' }}>{contact.name}</p>
                            {contact.starred && <Star size={11} style={{ color: '#F5A623' }} fill="#F5A623" />}
                          </div>
                          <p className="text-xs" style={{ color: 'var(--t3)' }}>{contact.email}</p>
                        </div>
                      </div>
                    </td>

                    {/* Temp */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: `${tempColor[contact.temp]}18`, color: tempColor[contact.temp] }}>
                          {contact.temp.toUpperCase()}
                        </span>
                        <span className="text-sm font-bold" style={{ color: 'var(--t2)' }}>{contact.score}</span>
                      </div>
                    </td>

                    {/* Stage */}
                    <td className="px-4 py-3">
                      <span className="text-xs px-2.5 py-1 rounded-lg" style={{ background: 'var(--s2)', color: 'var(--t2)' }}>{contact.stage}</span>
                    </td>

                    {/* Source */}
                    <td className="px-4 py-3">
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-lg" style={{ background: `${SOURCE_COLORS[contact.source]}18`, color: SOURCE_COLORS[contact.source] }}>
                        {SOURCE_LABELS[contact.source]}
                      </span>
                    </td>

                    {/* Last activity */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <Clock size={11} style={{ color: 'var(--t3)' }} />
                        <span className="text-sm" style={{ color: 'var(--t3)' }}>{contact.lastActivity}</span>
                      </div>
                    </td>

                    {/* Deals */}
                    <td className="px-4 py-3">
                      <span className="text-sm font-semibold" style={{ color: contact.revenue > 0 ? 'var(--success)' : 'var(--t3)' }}>
                        {contact.revenue > 0 ? `€${contact.revenue.toLocaleString('pt-PT')}` : contact.deals > 0 ? `${contact.deals} deal` : '—'}
                      </span>
                    </td>

                    {/* Assignee */}
                    <td className="px-4 py-3">
                      <span className="text-sm" style={{ color: 'var(--t2)' }}>{contact.assignee}</span>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button className="p-1.5 rounded-lg tonal-hover" style={{ color: 'var(--t3)' }} onClick={e => e.stopPropagation()}>
                          <Phone size={13} />
                        </button>
                        <button className="p-1.5 rounded-lg tonal-hover" style={{ color: 'var(--t3)' }} onClick={e => e.stopPropagation()}>
                          <MessageSquare size={13} />
                        </button>
                        <button className="p-1.5 rounded-lg tonal-hover" style={{ color: 'var(--t3)' }} onClick={e => e.stopPropagation()}>
                          <MoreVertical size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Right sidebar */}
      {selectedContact && (
        <ContactSidebar contact={selectedContact} onClose={() => setSelectedContact(null)} />
      )}
    </div>
  )
}
