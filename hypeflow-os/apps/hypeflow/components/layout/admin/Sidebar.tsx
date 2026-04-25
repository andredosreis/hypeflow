'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useRef, useEffect } from 'react'
import {
  LayoutDashboard, Users, Kanban, BarChart2,
  Phone, Settings, Zap, Building2, FileText, Activity,
  MessageSquare, Calendar, Mail, CreditCard, Star, BookOpen,
  MessageCircle, X, Hash, Send, Lock,
} from 'lucide-react'

/* ─────────────────────── Campfire (F10) ─────────────────────── */

interface ChatMsg {
  id: string; author: string; avatar: string; body: string
  ts: string; channel: string; type: 'user' | 'system'
}

const CHANNELS = [
  { id: 'geral',    label: '#geral',    icon: Hash,     color: 'var(--t2)' },
  { id: 'pipeline', label: '#pipeline', icon: Hash,     color: '#D1FF00' },
  { id: 'alertas',  label: '#alertas',  icon: Lock,     color: '#F5A623', system: true },
]

const MOCK_MSGS: ChatMsg[] = [
  { id: 'm1', author: 'João',    avatar: 'J', body: 'Deal da TechnoSpark quase fechado! 🔥',           ts: '18:42', channel: 'pipeline', type: 'user' },
  { id: 'm2', author: 'Ana',     avatar: 'A', body: 'Show! Qual o próximo passo?',                      ts: '18:43', channel: 'pipeline', type: 'user' },
  { id: 'm3', author: 'Sistema', avatar: '⚡',body: 'Lead "Carlos Mendes" atingiu score 82',             ts: '18:45', channel: 'alertas',  type: 'system' },
  { id: 'm4', author: 'João',    avatar: 'J', body: 'Bom dia equipa! Quem tem call antes do almoço?',   ts: '09:01', channel: 'geral',    type: 'user' },
  { id: 'm5', author: 'Miguel',  avatar: 'M', body: 'Eu tenho às 11h com a AutoGroup',                  ts: '09:05', channel: 'geral',    type: 'user' },
  { id: 'm6', author: 'Sistema', avatar: '⚡',body: 'Call em 30 min: "Sofia Lima" – AutoGroup',          ts: '10:30', channel: 'alertas',  type: 'system' },
]

function CampfirePanel({ onClose }: { onClose: () => void }) {
  const [channel, setChannel]   = useState('geral')
  const [input, setInput]       = useState('')
  const [msgs, setMsgs]         = useState<ChatMsg[]>(MOCK_MSGS)
  const bottomRef = useRef<HTMLDivElement>(null)

  const visible = msgs.filter(m => m.channel === channel)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [channel, msgs.length])

  const send = () => {
    if (!input.trim()) return
    setMsgs(prev => [...prev, {
      id: `m${Date.now()}`, author: 'Eu', avatar: 'E',
      body: input.trim(), ts: new Date().toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' }),
      channel, type: 'user',
    }])
    setInput('')
  }

  const unread = (ch: string) => msgs.filter(m => m.channel === ch && m.type === 'system').length

  return (
    <div
      className="fixed right-0 top-0 bottom-0 z-40 flex flex-col animate-slide-in"
      style={{
        width: 360,
        background: 'var(--s0)',
        borderLeft: '1px solid rgba(255,255,255,0.06)',
        boxShadow: '-8px 0 32px rgba(0,0,0,0.4)',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="flex items-center gap-2">
          <MessageCircle size={15} style={{ color: '#F5A623' }} />
          <p className="font-bold text-sm" style={{ color: 'var(--t1)' }}>Campfire</p>
          <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold" style={{ background: 'rgba(245,166,35,0.12)', color: '#F5A623' }}>EQUIPA</span>
        </div>
        <button onClick={onClose} className="tonal-hover p-1.5 rounded-lg" style={{ color: 'var(--t3)' }}>
          <X size={13} />
        </button>
      </div>

      {/* Channel tabs */}
      <div className="flex gap-0 px-2 pt-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        {CHANNELS.map(ch => {
          const Icon = ch.icon
          const u = unread(ch.id)
          return (
            <button
              key={ch.id}
              onClick={() => setChannel(ch.id)}
              className="flex items-center gap-1 px-3 py-2 text-xs font-semibold transition-all rounded-t-lg"
              style={{
                color: channel === ch.id ? 'var(--t1)' : 'var(--t3)',
                borderBottom: channel === ch.id ? '2px solid var(--cyan)' : '2px solid transparent',
                background: channel === ch.id ? 'var(--s1)' : 'transparent',
              }}
            >
              <Icon size={10} style={{ color: ch.color }} />
              {ch.label.replace('#', '')}
              {u > 0 && channel !== ch.id && (
                <span className="w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center flex-shrink-0" style={{ background: '#F5A623', color: '#000' }}>{u}</span>
              )}
            </button>
          )
        })}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3" style={{ scrollbarWidth: 'none' }}>
        {visible.length === 0 && (
          <div className="flex items-center justify-center h-20">
            <p className="text-xs" style={{ color: 'var(--t3)' }}>Sem mensagens neste canal</p>
          </div>
        )}
        {visible.map(m => (
          <div key={m.id} className={`flex gap-2.5 ${m.author === 'Eu' ? 'flex-row-reverse' : ''}`}>
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0 self-end"
              style={{
                background: m.type === 'system' ? 'rgba(245,166,35,0.15)' : m.author === 'Eu' ? 'rgba(33,160,196,0.2)' : 'var(--s2)',
                color: m.type === 'system' ? '#F5A623' : m.author === 'Eu' ? 'var(--cyan)' : 'var(--t2)',
              }}
            >
              {m.avatar}
            </div>
            <div className="flex flex-col gap-0.5 max-w-[240px]">
              {m.author !== 'Eu' && (
                <div className="flex items-center gap-1.5">
                  <p className="text-[10px] font-semibold" style={{ color: m.type === 'system' ? '#F5A623' : 'var(--t3)' }}>{m.author}</p>
                  <p className="text-[9px]" style={{ color: 'var(--t3)' }}>{m.ts}</p>
                </div>
              )}
              <div
                className="px-3 py-2 rounded-2xl text-xs leading-relaxed"
                style={{
                  background: m.author === 'Eu'
                    ? 'rgba(33,160,196,0.15)'
                    : m.type === 'system'
                    ? 'rgba(245,166,35,0.08)'
                    : 'var(--s2)',
                  color: m.type === 'system' ? '#F5A623' : 'var(--t1)',
                  borderRadius: m.author === 'Eu' ? '18px 4px 18px 18px' : '4px 18px 18px 18px',
                }}
              >
                {m.body}
              </div>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      {CHANNELS.find(c => c.id === channel && c.system) ? (
        <div className="px-4 py-3" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <p className="text-[10px] text-center" style={{ color: 'var(--t3)' }}>Canal de alertas automáticos — só leitura</p>
        </div>
      ) : (
        <div className="flex items-center gap-2 px-4 py-3" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), send())}
            placeholder={`Mensagem em #${channel}...`}
            className="flex-1 bg-transparent text-xs outline-none"
            style={{ color: 'var(--t1)', caretColor: 'var(--cyan)' }}
          />
          <button
            onClick={send}
            disabled={!input.trim()}
            className="p-1.5 rounded-lg transition-all"
            style={{ color: input.trim() ? 'var(--cyan)' : 'var(--t3)' }}
          >
            <Send size={13} />
          </button>
        </div>
      )}
    </div>
  )
}

type NavItem = { label: string; href: string; icon: React.ElementType; badge?: string; group?: string }

const nav: NavItem[] = [
  { label: 'Dashboard',   href: '/admin/dashboard',  icon: LayoutDashboard },

  { label: 'Contactos',   href: '/admin/contactos',  icon: Users,         group: 'CRM & Vendas' },
  { label: 'Pipeline',    href: '/admin/pipeline',   icon: Kanban,        group: 'CRM & Vendas' },
  { label: 'Conversas',   href: '/admin/conversas',  icon: MessageSquare, group: 'CRM & Vendas', badge: '6' },
  { label: 'Calendário',  href: '/admin/calendario', icon: Calendar,      group: 'CRM & Vendas' },
  { label: 'Calls',       href: '/admin/calls',      icon: Phone,         group: 'CRM & Vendas' },

  { label: 'Marketing',   href: '/admin/marketing',  icon: Mail,          group: 'Marketing' },
  { label: 'Automações',  href: '/admin/automacoes', icon: Zap,           group: 'Marketing' },
  { label: 'Playbooks',   href: '/admin/playbooks',  icon: BookOpen,      group: 'Marketing' },
  { label: 'Formulários', href: '/admin/formularios',icon: FileText,      group: 'Marketing' },

  { label: 'Tráfego',     href: '/admin/trafego',    icon: BarChart2,     group: 'Negócio' },
  { label: 'Pagamentos',  href: '/admin/pagamentos',  icon: CreditCard,   group: 'Negócio' },
  { label: 'Reputação',   href: '/admin/reputacao',   icon: Star,         group: 'Negócio' },
  { label: 'Clientes',    href: '/admin/clientes',    icon: Building2,    group: 'Negócio' },
  { label: 'Parceiros',   href: '/admin/parceiros',   icon: Users,        group: 'Negócio' },

  { label: 'Check-ins',   href: '/admin/equipa/check-ins',   icon: Activity,    group: 'Equipa' },
  { label: 'Actividade',  href: '/admin/equipa/actividade',  icon: BarChart2,   group: 'Equipa' },
  { label: 'Gamificação', href: '/admin/equipa/gamificacao', icon: Star,        group: 'Equipa' },

  { label: 'Config',      href: '/admin/config',     icon: Settings,      group: 'Sistema' },
]

export function AdminSidebar() {
  const path = usePathname()
  const [showCampfire, setShowCampfire] = useState(false)
  const campfireUnread = 2  // in production: real-time unread count

  return (
    <>
    {showCampfire && <CampfirePanel onClose={() => setShowCampfire(false)} />}
    <aside
      className="w-56 flex-shrink-0 flex flex-col h-screen relative"
      style={{ background: 'var(--s0)', borderRight: '1px solid rgba(255,255,255,0.04)' }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-4 flex-shrink-0">
        <div className="relative">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold"
            style={{ background: 'var(--lime)', color: '#0F1318' }}
          >
            HF
          </div>
          <span
            className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full live-dot"
            style={{ background: 'var(--cyan)' }}
          />
        </div>
        <div>
          <p className="font-bold text-sm tracking-tight" style={{ color: 'var(--t1)' }}>HYPE FLOW</p>
          <p className="text-xs" style={{ color: 'var(--t3)' }}>Agency OS</p>
        </div>
      </div>

      {/* Live indicator */}
      <div
        className="mx-3 mb-2 rounded-xl px-3 py-2 flex items-center gap-2.5 flex-shrink-0"
        style={{ background: 'var(--s1)' }}
      >
        <Activity size={12} style={{ color: 'var(--lime)' }} />
        <span className="text-xs font-semibold flex-1" style={{ color: 'var(--t2)' }}>Sistema</span>
        <span className="text-xs font-bold" style={{ color: 'var(--lime)' }}>LIVE</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2.5 flex flex-col gap-0 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
        {nav.map(({ label, href, icon: Icon, badge, group }, i) => {
          const active = path === href || path.startsWith(href + '/')
          const prevGroup = i > 0 ? nav[i - 1]?.group : undefined
          const showGroupLabel = group !== undefined && group !== prevGroup

          return (
            <div key={href}>
              {showGroupLabel && (
                <p
                  className="text-[9px] uppercase tracking-widest px-3 pt-3 pb-1 font-bold"
                  style={{ color: 'rgba(255,255,255,0.18)' }}
                >
                  {group}
                </p>
              )}
              <Link
                href={href}
                className="relative flex items-center gap-2.5 px-3 py-2 rounded-xl transition-all"
                style={{
                  background: active ? 'var(--s2)' : 'transparent',
                }}
              >
                {active && (
                  <span
                    className="absolute left-0 top-2 bottom-2 w-0.5 rounded-full"
                    style={{ background: 'var(--cyan)' }}
                  />
                )}
                <Icon size={14} style={{ color: active ? 'var(--cyan)' : 'var(--t3)' }} />
                <span className="text-sm font-medium flex-1" style={{ color: active ? 'var(--t1)' : 'var(--t2)' }}>
                  {label}
                </span>
                {badge && (
                  <span
                    className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0"
                    style={{ background: 'var(--cyan)', color: '#0D1117' }}
                  >
                    {badge}
                  </span>
                )}
              </Link>
            </div>
          )
        })}
      </nav>

      {/* Campfire button */}
      <div className="px-3 pb-2 flex-shrink-0">
        <button
          onClick={() => setShowCampfire(v => !v)}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all tonal-hover"
          style={{
            background: showCampfire ? 'rgba(245,166,35,0.12)' : 'var(--s1)',
            border: showCampfire ? '1px solid rgba(245,166,35,0.2)' : '1px solid transparent',
          }}
        >
          <div className="relative">
            <MessageCircle size={14} style={{ color: showCampfire ? '#F5A623' : 'var(--t3)' }} />
            {campfireUnread > 0 && !showCampfire && (
              <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full flex items-center justify-center text-[7px] font-bold" style={{ background: '#F5A623', color: '#000' }}>
                {campfireUnread}
              </span>
            )}
          </div>
          <span className="text-sm font-medium flex-1 text-left" style={{ color: showCampfire ? '#F5A623' : 'var(--t2)' }}>Campfire</span>
          {campfireUnread > 0 && !showCampfire && (
            <span className="text-[10px] font-bold" style={{ color: '#F5A623' }}>{campfireUnread}</span>
          )}
        </button>
      </div>

      {/* Footer */}
      <div className="px-3 py-3 flex-shrink-0">
        <div
          className="rounded-xl px-3 py-3 flex items-center gap-3"
          style={{ background: 'var(--s1)' }}
        >
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
            style={{ background: 'rgba(33,160,196,0.15)', color: 'var(--cyan)' }}
          >
            AG
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate" style={{ color: 'var(--t1)' }}>HYPE Flow</p>
            <p className="text-xs" style={{ color: 'var(--t3)' }}>Plano Pro</p>
          </div>
          <div className="w-2 h-2 rounded-full live-dot flex-shrink-0" style={{ background: 'var(--success)' }} />
        </div>
      </div>
    </aside>
    </>
  )
}
