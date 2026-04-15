'use client'

import { Bell, Search, Zap, ChevronDown, LogOut, User as UserIcon, Settings, CheckCheck, X, Phone, MessageSquare, Star, AlertTriangle } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { User } from '@supabase/supabase-js'

type NotifType = 'alert' | 'lead' | 'call' | 'automation' | 'system'

interface Notification {
  id: number
  type: NotifType
  title: string
  body: string
  time: string
  href: string
  read: boolean
  urgent?: boolean
}

const INITIAL_NOTIFS: Notification[] = [
  { id: 1, type: 'alert',  title: 'Lead sem seguimento', body: 'João Silva aguarda resposta há 2h — score 94', time: '2m', href: '/admin/comercial', read: false, urgent: true },
  { id: 2, type: 'call',   title: 'Call em 15 minutos', body: 'Carlos Mendes · Proposta · Score 88', time: '14m', href: '/admin/calls', read: false, urgent: true },
  { id: 3, type: 'lead',   title: 'Nova lead HOT', body: 'Ana Costa via Meta Ads — Score 91', time: '32m', href: '/admin/pipeline', read: false },
  { id: 4, type: 'automation', title: 'Automação executada', body: 'Boas-vindas WhatsApp → 14 leads hoje', time: '1h', href: '/admin/automacoes', read: false },
  { id: 5, type: 'lead',   title: 'Formulário preenchido', body: 'Miguel Costa respondeu ao questionário de qualificação', time: '1h', href: '/admin/formularios', read: true },
  { id: 6, type: 'system', title: 'Token Meta Ads expira em 3d', body: 'Renove antes de 17 Abr para não perder dados', time: '3h', href: '/admin/config', read: true },
  { id: 7, type: 'alert',  title: '3 leads score >85 sem call', body: 'João, Rita, André — prontos para fechar', time: '5h', href: '/admin/pipeline?filter=high_score_no_call', read: true, urgent: true },
]

const NOTIF_CONFIG: Record<NotifType, { icon: React.ElementType; color: string }> = {
  alert:      { icon: AlertTriangle, color: '#E84545' },
  lead:       { icon: Star,          color: '#F5A623' },
  call:       { icon: Phone,         color: '#D1FF00' },
  automation: { icon: Zap,           color: 'var(--cyan)' },
  system:     { icon: Settings,      color: 'var(--t3)' },
}

export function AdminTopBar({ user }: { user: User }) {
  const initials = user.email?.slice(0, 2).toUpperCase() ?? 'HF'
  const router = useRouter()
  const [alertsOpen, setAlertsOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [searchFocus, setSearchFocus] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>(INITIAL_NOTIFS)
  const [notifFilter, setNotifFilter] = useState<NotifType | 'all'>('all')
  const userMenuRef = useRef<HTMLDivElement>(null)
  const notifRef = useRef<HTMLDivElement>(null)

  const unreadCount = notifications.filter(n => !n.read).length
  const filtered = notifications.filter(n => notifFilter === 'all' || n.type === notifFilter)

  const markAllRead = () => setNotifications(ns => ns.map(n => ({ ...n, read: true })))
  const dismiss = (id: number) => setNotifications(ns => ns.filter(n => n.id !== id))
  const markRead = (id: number) => setNotifications(ns => ns.map(n => n.id === id ? { ...n, read: true } : n))

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false)
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setAlertsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <header className="h-14 flex-shrink-0 flex items-center justify-between px-6 sticky top-0 z-30 glass">
      {/* Search */}
      <div
        className="flex items-center gap-2.5 rounded-xl px-4 py-2 w-72 transition-all"
        style={{
          background: searchFocus ? 'var(--s2)' : 'var(--s1)',
          outline: searchFocus ? '1px solid var(--cyan-border)' : '1px solid transparent',
        }}
      >
        <Search size={14} style={{ color: searchFocus ? 'var(--cyan)' : 'var(--t3)' }} />
        <input
          type="text"
          placeholder="Pesquisar leads, calls, clientes..."
          onFocus={() => setSearchFocus(true)}
          onBlur={() => setSearchFocus(false)}
          className="flex-1 bg-transparent outline-none text-sm"
          style={{ color: 'var(--t1)' }}
        />
        <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'var(--s3)', color: 'var(--t3)' }}>⌘K</span>
      </div>

      {/* Center status */}
      <div className="flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full live-dot" style={{ background: 'var(--success)' }} />
        <span className="text-xs font-medium" style={{ color: 'var(--t3)' }}>Sistema operacional</span>
      </div>

      {/* Right */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => router.push('/admin/calls')}
          className="btn-lime hidden md:flex items-center gap-2 px-4 py-2 rounded-xl"
        >
          <Zap size={13} /> Nova Call
        </button>

        {/* Notification Center */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setAlertsOpen(o => !o)}
            className="relative p-2 rounded-xl tonal-hover"
            style={{ color: 'var(--t2)' }}
          >
            <Bell size={17} />
            {unreadCount > 0 && (
              <span
                className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 rounded-full flex items-center justify-center text-[9px] font-bold px-1"
                style={{ background: unreadCount > 2 ? '#E84545' : '#F5A623', color: '#fff' }}
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {alertsOpen && (
            <div
              className="absolute right-0 top-full mt-2 rounded-2xl overflow-hidden z-50 flex flex-col"
              style={{
                width: 360,
                background: 'var(--s2)',
                boxShadow: 'var(--shadow-float)',
                border: '1px solid rgba(255,255,255,0.06)',
                maxHeight: 520,
              }}
            >
              {/* Header */}
              <div className="px-4 py-3 flex items-center justify-between flex-shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold" style={{ color: 'var(--t1)' }}>Notificações</p>
                  {unreadCount > 0 && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: '#E8454520', color: '#E84545' }}>
                      {unreadCount} novas
                    </span>
                  )}
                </div>
                <button
                  onClick={markAllRead}
                  className="flex items-center gap-1 text-xs font-semibold"
                  style={{ color: 'var(--cyan)' }}
                >
                  <CheckCheck size={12} /> Marcar todas
                </button>
              </div>

              {/* Filter chips */}
              <div className="flex gap-1 px-3 py-2 flex-shrink-0 overflow-x-auto" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                {(['all', 'alert', 'lead', 'call', 'automation', 'system'] as const).map(f => {
                  const cfg = f !== 'all' ? NOTIF_CONFIG[f] : null
                  return (
                    <button
                      key={f}
                      onClick={() => setNotifFilter(f)}
                      className="flex-shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase transition-colors"
                      style={{
                        background: notifFilter === f ? (cfg?.color ? `${cfg.color}20` : 'var(--s3)') : 'transparent',
                        color: notifFilter === f ? (cfg?.color ?? 'var(--t1)') : 'var(--t3)',
                      }}
                    >
                      {cfg && <cfg.icon size={9} />}
                      {f === 'all' ? 'Todas' : f === 'automation' ? 'Auto' : f.charAt(0).toUpperCase() + f.slice(1)}
                    </button>
                  )
                })}
              </div>

              {/* List */}
              <div className="overflow-y-auto flex-1">
                {filtered.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-8 gap-2">
                    <CheckCheck size={24} style={{ color: 'var(--t3)' }} />
                    <p className="text-sm" style={{ color: 'var(--t3)' }}>Nenhuma notificação</p>
                  </div>
                )}
                {filtered.map(notif => {
                  const cfg = NOTIF_CONFIG[notif.type]
                  const Icon = cfg.icon
                  return (
                    <div
                      key={notif.id}
                      className="group flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors"
                      style={{
                        borderBottom: '1px solid rgba(255,255,255,0.03)',
                        background: notif.read ? 'transparent' : `${cfg.color}08`,
                        opacity: notif.read ? 0.7 : 1,
                      }}
                      onClick={() => { markRead(notif.id); setAlertsOpen(false); router.push(notif.href) }}
                      onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)')}
                      onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = notif.read ? 'transparent' : `${cfg.color}08`)}
                    >
                      <div
                        className="w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                        style={{ background: `${cfg.color}18` }}
                      >
                        <Icon size={12} style={{ color: cfg.color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-bold truncate" style={{ color: notif.urgent ? cfg.color : 'var(--t1)' }}>{notif.title}</p>
                          {!notif.read && <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: cfg.color }} />}
                        </div>
                        <p className="text-[11px] mt-0.5 leading-relaxed" style={{ color: 'var(--t3)' }}>{notif.body}</p>
                        <p className="text-[10px] mt-1" style={{ color: 'var(--t3)' }}>{notif.time} atrás</p>
                      </div>
                      <button
                        onClick={e => { e.stopPropagation(); dismiss(notif.id) }}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded-lg flex-shrink-0 transition-opacity"
                        style={{ color: 'var(--t3)' }}
                      >
                        <X size={11} />
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* User menu */}
        <div className="relative" ref={userMenuRef}>
          <button
            onClick={() => setUserMenuOpen(o => !o)}
            className="flex items-center gap-2 px-2 py-1.5 rounded-xl tonal-hover"
          >
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold"
              style={{ background: 'var(--cyan)', color: '#0F1318' }}
            >
              {initials}
            </div>
            <ChevronDown size={12} style={{ color: 'var(--t3)', transform: userMenuOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
          </button>
          {userMenuOpen && (
            <div
              className="absolute right-0 top-full mt-2 w-52 rounded-2xl overflow-hidden z-50"
              style={{ background: 'var(--s2)', boxShadow: 'var(--shadow-float)', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <div className="px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <p className="text-sm font-semibold" style={{ color: 'var(--t1)' }}>{user.email}</p>
                <p className="text-[10px] mt-0.5" style={{ color: 'var(--t3)' }}>Administrador</p>
              </div>
              <button
                onClick={() => { setUserMenuOpen(false); router.push('/admin/config') }}
                className="w-full flex items-center gap-3 px-4 py-2.5 tonal-hover text-sm"
                style={{ color: 'var(--t2)' }}
              >
                <Settings size={14} /> Configurações
              </button>
              <button
                onClick={() => { setUserMenuOpen(false); router.push('/admin/perfil') }}
                className="w-full flex items-center gap-3 px-4 py-2.5 tonal-hover text-sm"
                style={{ color: 'var(--t2)' }}
              >
                <UserIcon size={14} /> Perfil
              </button>
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                <button
                  onClick={async () => {
                    const { createClient } = await import('@/lib/supabase/client')
                    await createClient().auth.signOut()
                    router.push('/login')
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 tonal-hover text-sm"
                  style={{ color: 'var(--danger)' }}
                >
                  <LogOut size={14} /> Terminar sessão
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
