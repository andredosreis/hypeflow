'use client'

import { useState } from 'react'
import {
  Check, AlertCircle, RefreshCw, ExternalLink, X, Settings,
  Webhook, Globe, Code, Tag, Link2, Copy, Plus, Zap,
  Eye, BarChart2, Target, Activity, ChevronRight, CheckCircle2,
  XCircle, Clock, Users, TrendingUp, Calendar,
} from 'lucide-react'
import { PlatformIcon } from '@/components/icons/PlatformIcons'

/* ─────────────────────── types ─────────────────────── */

type IntegrationStatus = 'connected' | 'disconnected' | 'error'
type ConfigTab = 'integracoes' | 'pixels' | 'utms'

interface Integration {
  id: string
  name: string
  description: string
  icon: string
  platformKey?: string
  category: 'ads' | 'crm' | 'automation' | 'communication'
  status: IntegrationStatus
  connected_account?: string
  last_sync?: string
}

interface Pixel {
  id: string
  name: string
  platform: string
  pixel_id: string
  status: 'active' | 'inactive' | 'error'
  events_today: number
  last_event?: string
}

interface UTMTemplate {
  id: string
  name: string
  source: string
  medium: string
  campaign: string
  content?: string
  term?: string
  usage_count: number
}

/* ─────────────────────── mock data ─────────────────────── */

const INTEGRATIONS: Integration[] = [
  {
    id: 'meta', name: 'Facebook Ads',
    description: 'Sincronize campanhas Facebook, leads e métricas de performance via Meta Business.',
    icon: '📘', platformKey: 'facebook', category: 'ads', status: 'connected',
    connected_account: 'HYPE Flow Agency',
    last_sync: new Date(Date.now() - 900000).toISOString(),
  },
  {
    id: 'instagram', name: 'Instagram Ads',
    description: 'Campanhas Instagram, stories, reels e geração de leads direto da plataforma.',
    icon: '📸', platformKey: 'instagram', category: 'ads', status: 'connected',
    connected_account: '@hypeflow.agency',
    last_sync: new Date(Date.now() - 1200000).toISOString(),
  },
  {
    id: 'google-ads', name: 'Google Ads',
    description: 'Importe campanhas, palavras-chave e conversões do Google Ads.',
    icon: '🔍', platformKey: 'google_ads', category: 'ads', status: 'connected',
    connected_account: 'hypeflow@agency.com',
    last_sync: new Date(Date.now() - 1800000).toISOString(),
  },
  {
    id: 'linkedin', name: 'LinkedIn Ads',
    description: 'Campanhas B2B, lead gen forms e métricas de empresa LinkedIn.',
    icon: '💼', platformKey: 'linkedin', category: 'ads', status: 'disconnected',
  },
  {
    id: 'tiktok', name: 'TikTok Ads',
    description: 'Campanhas TikTok Ads, leads e métricas de performance para o público jovem.',
    icon: '🎵', platformKey: 'tiktok', category: 'ads', status: 'disconnected',
  },
  {
    id: 'google-calendar', name: 'Google Calendar',
    description: 'Sincronização bidirecional de calls com Google Calendar e Google Meet.',
    icon: '📅', category: 'crm', status: 'connected',
    connected_account: 'comercial@hypeflow.pt',
    last_sync: new Date(Date.now() - 300000).toISOString(),
  },
  {
    id: 'whatsapp', name: 'WhatsApp Business',
    description: 'Envio direto de mensagens e templates via WhatsApp Cloud API.',
    icon: '💬', platformKey: 'whatsapp', category: 'communication', status: 'disconnected',
  },
  {
    id: 'manychat', name: 'ManyChat',
    description: 'Automatize conversas WhatsApp & Instagram com flows de ManyChat.',
    icon: '🤖', category: 'automation', status: 'connected',
    connected_account: 'hypeflow_bot',
    last_sync: new Date(Date.now() - 600000).toISOString(),
  },
  {
    id: 'ghl', name: 'GoHighLevel',
    description: 'Sincronização bidirecional de contactos, oportunidades, calendários e pipelines GHL via webhooks em tempo real.',
    icon: '🚀', category: 'crm', status: 'connected',
    connected_account: 'hypeflow-agency.gohighlevel.com',
    last_sync: new Date(Date.now() - 120000).toISOString(),
  },
  {
    id: 'n8n', name: 'N8N',
    description: 'Conecte workflows de automação avançados via webhook.',
    icon: '⚡', category: 'automation', status: 'connected',
    connected_account: 'n8n.hypeflow.internal',
    last_sync: new Date(Date.now() - 7200000).toISOString(),
  },
  {
    id: 'make', name: 'Make (Integromat)',
    description: 'Automatize cenários complexos entre múltiplas plataformas.',
    icon: '🔧', category: 'automation', status: 'error',
    connected_account: 'hypeflow@make.com',
    last_sync: new Date(Date.now() - 86400000).toISOString(),
  },
]

const MOCK_PIXELS: Pixel[] = [
  { id: 'px1', name: 'Meta Pixel — Principal', platform: 'facebook', pixel_id: '1234567890123456', status: 'active', events_today: 248, last_event: new Date(Date.now() - 120000).toISOString() },
  { id: 'px2', name: 'Google Tag Manager', platform: 'google_ads', pixel_id: 'GTM-XXXXXXX', status: 'active', events_today: 391, last_event: new Date(Date.now() - 45000).toISOString() },
  { id: 'px3', name: 'TikTok Pixel', platform: 'tiktok', pixel_id: 'TKTK1234567890', status: 'inactive', events_today: 0 },
  { id: 'px4', name: 'LinkedIn Insight Tag', platform: 'linkedin', pixel_id: '987654', status: 'error', events_today: 0, last_event: new Date(Date.now() - 86400000 * 2).toISOString() },
  { id: 'px5', name: 'Instagram / Meta — Loja', platform: 'instagram', pixel_id: '9876543210987654', status: 'active', events_today: 112, last_event: new Date(Date.now() - 300000).toISOString() },
]

const MOCK_UTM_TEMPLATES: UTMTemplate[] = [
  { id: 'u1', name: 'Facebook Lead Gen', source: 'facebook', medium: 'cpc', campaign: 'leads-{mes}', content: 'carrossel-v1', usage_count: 47 },
  { id: 'u2', name: 'Instagram Stories', source: 'instagram', medium: 'cpc', campaign: 'stories-awareness', content: 'video-15s', usage_count: 23 },
  { id: 'u3', name: 'Google Search', source: 'google', medium: 'cpc', campaign: 'search-brand', term: 'hype+flow+agencia', usage_count: 61 },
  { id: 'u4', name: 'TikTok Awareness', source: 'tiktok', medium: 'paid_social', campaign: 'tiktok-top-funnel', content: 'ugc-video', usage_count: 8 },
  { id: 'u5', name: 'LinkedIn B2B', source: 'linkedin', medium: 'cpc', campaign: 'b2b-q1-2025', content: 'sponsored-post', usage_count: 15 },
  { id: 'u6', name: 'Email Newsletter', source: 'newsletter', medium: 'email', campaign: 'newsletter-semanal', usage_count: 34 },
]

/* ─────────────────────── helpers ─────────────────────── */

const STATUS_CFG: Record<IntegrationStatus, { label: string; color: string; bg: string }> = {
  connected:    { label: 'Conectado',     color: '#1EC87A', bg: 'bg-[#1EC87A20]' },
  disconnected: { label: 'Desconectado',  color: '#3D6080', bg: 'bg-[#3D608020]' },
  error:        { label: 'Erro',          color: '#E84545', bg: 'bg-[#E8454520]' },
}

const PIXEL_STATUS_CFG: Record<Pixel['status'], { label: string; color: string }> = {
  active:   { label: 'Activo',    color: '#1EC87A' },
  inactive: { label: 'Inactivo',  color: '#3D6080' },
  error:    { label: 'Erro',      color: '#E84545' },
}

const CATEGORY_LABELS: Record<string, string> = {
  ads: 'Publicidade', crm: 'CRM & Calendário', automation: 'Automação', communication: 'Comunicação',
}

function formatRelative(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000
  if (diff < 60) return 'há segundos'
  if (diff < 3600) return `há ${Math.round(diff / 60)} min`
  if (diff < 86400) return `há ${Math.round(diff / 3600)}h`
  return `há ${Math.round(diff / 86400)} dias`
}

function buildUTMUrl(tpl: UTMTemplate, baseUrl = 'https://landing.hypeflow.pt') {
  const params = new URLSearchParams({
    utm_source: tpl.source,
    utm_medium: tpl.medium,
    utm_campaign: tpl.campaign,
    ...(tpl.content ? { utm_content: tpl.content } : {}),
    ...(tpl.term    ? { utm_term: tpl.term } : {}),
  })
  return `${baseUrl}?${params.toString()}`
}

/* ─────────────────────── integration card ─────────────────────── */

const OAUTH_URLS: Partial<Record<string, string>> = {
  'meta':             '/api/oauth/meta/connect',
  'instagram':        '/api/oauth/meta/connect',        // Meta covers Instagram
  'google-ads':       '/api/oauth/google/connect?scope=ads',
  'google-calendar':  '/api/oauth/google/connect?scope=calendar',
  'tiktok':           '/api/oauth/tiktok/connect',
  'linkedin':         '/api/oauth/linkedin/connect',
}

function IntegrationCard({ integration, onSync, onDisconnect }: {
  integration: Integration
  onSync: (id: string) => void
  onDisconnect: (id: string) => void
}) {
  const s = STATUS_CFG[integration.status]
  const connected = integration.status === 'connected'
  const hasError  = integration.status === 'error'
  return (
    <div className="rounded-2xl p-5 flex flex-col gap-4 tonal-hover transition-all" style={{ background: 'var(--s2)' }}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: 'var(--s1)' }}>
            {integration.platformKey
              ? <PlatformIcon platform={integration.platformKey} size={32} />
              : <span className="text-2xl">{integration.icon}</span>
            }
          </div>
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--t1)' }}>{integration.name}</p>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg mt-1 inline-block ${s.bg}`} style={{ color: s.color }}>
              {s.label}
            </span>
          </div>
        </div>
        {connected && (
          <button className="p-1.5 rounded-lg tonal-hover transition-colors" style={{ color: 'var(--t3)' }}>
            <Settings size={13} />
          </button>
        )}
      </div>
      <p className="text-xs leading-relaxed" style={{ color: 'var(--t2)' }}>{integration.description}</p>
      {integration.connected_account && (
        <div className="flex items-center justify-between">
          <p className="text-[10px]" style={{ color: 'var(--t3)' }}>
            Conta: <span style={{ color: 'var(--t2)' }}>{integration.connected_account}</span>
          </p>
          {integration.last_sync && (
            <p className="text-[10px]" style={{ color: 'var(--t3)' }}>
              Sync: {formatRelative(integration.last_sync)}
            </p>
          )}
        </div>
      )}
      {hasError && (
        <div className="flex items-center gap-2 rounded-xl px-3 py-2" style={{ background: 'rgba(232,69,69,0.08)', border: '1px solid rgba(232,69,69,0.2)' }}>
          <AlertCircle size={12} style={{ color: 'var(--danger)', flexShrink: 0 }} />
          <p className="text-[10px]" style={{ color: 'var(--danger)' }}>Token expirado. Reconecte a integração.</p>
        </div>
      )}
      <div className="flex gap-2 mt-auto">
        {connected ? (
          <>
            <button
              onClick={() => onSync(integration.id)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[10px] font-bold tonal-hover transition-colors"
              style={{ background: 'var(--s3)', color: 'var(--t2)' }}
            >
              <RefreshCw size={11} /> Sincronizar
            </button>
            <button
              onClick={() => onDisconnect(integration.id)}
              title="Desconectar"
              className="flex items-center justify-center px-3 py-2 rounded-xl text-[10px] tonal-hover transition-colors"
              style={{ background: 'var(--s3)', color: 'var(--danger)' }}
            >
              <X size={11} />
            </button>
          </>
        ) : hasError ? (
          <button
            onClick={() => { const url = OAUTH_URLS[integration.id]; if (url) window.location.href = url }}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[10px] font-bold transition-opacity hover:opacity-90"
            style={{ background: 'var(--danger)', color: '#fff' }}
          >
            <RefreshCw size={11} /> Reconectar
          </button>
        ) : (
          <button
            onClick={() => { const url = OAUTH_URLS[integration.id]; if (url) window.location.href = url }}
            disabled={!OAUTH_URLS[integration.id]}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[10px] font-bold transition-colors hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: 'var(--cyan)', color: '#0F1318' }}
          >
            <ExternalLink size={11} /> Conectar
          </button>
        )}
      </div>
    </div>
  )
}

/* ─────────────────────── pixel card ─────────────────────── */

function PixelCard({ pixel, onCopy }: { pixel: Pixel; onCopy: (id: string) => void }) {
  const st = PIXEL_STATUS_CFG[pixel.status]
  return (
    <div className="rounded-2xl p-5 flex flex-col gap-4" style={{ background: 'var(--s2)' }}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--s1)' }}>
            <PlatformIcon platform={pixel.platform} size={28} />
          </div>
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--t1)' }}>{pixel.name}</p>
            <p className="text-[10px] font-mono mt-0.5" style={{ color: 'var(--t3)' }}>{pixel.pixel_id}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: st.color }} />
          <span className="text-[10px] font-bold" style={{ color: st.color }}>{st.label}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl p-3 text-center" style={{ background: 'var(--s1)' }}>
          <p className="text-base font-bold" style={{ color: pixel.status === 'active' ? 'var(--cyan)' : 'var(--t3)' }}>{pixel.events_today}</p>
          <p className="text-[10px] mt-0.5" style={{ color: 'var(--t3)' }}>Eventos hoje</p>
        </div>
        <div className="rounded-xl p-3 text-center" style={{ background: 'var(--s1)' }}>
          <p className="text-[10px] font-bold" style={{ color: 'var(--t2)' }}>
            {pixel.last_event ? formatRelative(pixel.last_event) : '—'}
          </p>
          <p className="text-[10px] mt-0.5" style={{ color: 'var(--t3)' }}>Último evento</p>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => onCopy(pixel.pixel_id)}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[10px] font-bold tonal-hover"
          style={{ background: 'var(--s3)', color: 'var(--t2)' }}
        >
          <Copy size={11} /> Copiar ID
        </button>
        {pixel.status === 'active' ? (
          <button
            onClick={() => {
              // Send a test PageView event via server-side pixel route
              fetch('/api/pixels/events', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${process.env.NEXT_PUBLIC_PIXEL_API_SECRET ?? 'test'}`,
                },
                body: JSON.stringify({
                  event_name: 'PageView',
                  client_id: 'test',
                  user_data: { client_user_agent: navigator.userAgent },
                  custom_data: { test: true },
                }),
              }).catch(() => {})
              onCopy('test-sent')
            }}
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-bold tonal-hover"
            style={{ background: 'var(--s3)', color: 'var(--success)' }}
          >
            <Eye size={11} /> Testar
          </button>
        ) : (
          <button
            onClick={() => alert('Para activar este pixel configure o ID nas definições de integração.')}
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-bold transition-opacity hover:opacity-90"
            style={{ background: 'var(--cyan)', color: '#0F1318' }}
          >
            <Zap size={11} /> Activar
          </button>
        )}
      </div>
    </div>
  )
}

/* ─────────────────────── UTM builder ─────────────────────── */

function UTMBuilder() {
  const [utm, setUtm] = useState({ source: 'facebook', medium: 'cpc', campaign: '', content: '', term: '' })
  const [baseUrl, setBaseUrl] = useState('https://landing.hypeflow.pt')
  const [copied, setCopied] = useState(false)

  const fullUrl = utm.campaign
    ? `${baseUrl}?utm_source=${utm.source}&utm_medium=${utm.medium}&utm_campaign=${utm.campaign}${utm.content ? `&utm_content=${utm.content}` : ''}${utm.term ? `&utm_term=${utm.term}` : ''}`
    : ''

  const copy = () => {
    if (fullUrl) {
      navigator.clipboard.writeText(fullUrl).catch(() => {})
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="rounded-2xl p-5 flex flex-col gap-4" style={{ background: 'var(--s2)' }}>
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(209,255,0,0.1)' }}>
          <Link2 size={15} style={{ color: 'var(--lime)' }} />
        </div>
        <p className="text-sm font-semibold" style={{ color: 'var(--t1)' }}>Construtor de UTMs</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'URL Base', key: 'baseUrl', placeholder: 'https://landing.hypeflow.pt', wide: true },
          { label: 'utm_source', key: 'source', placeholder: 'facebook' },
          { label: 'utm_medium', key: 'medium', placeholder: 'cpc' },
          { label: 'utm_campaign', key: 'campaign', placeholder: 'leads-abril-2025' },
          { label: 'utm_content (opcional)', key: 'content', placeholder: 'carrossel-v1' },
          { label: 'utm_term (opcional)', key: 'term', placeholder: 'agencia+marketing' },
        ].map(({ label, key, placeholder, wide }) => (
          <div key={key} className={wide ? 'col-span-2' : ''}>
            <label className="text-[10px] font-bold uppercase tracking-widest mb-1 block" style={{ color: 'var(--t3)' }}>{label}</label>
            <input
              value={key === 'baseUrl' ? baseUrl : utm[key as keyof typeof utm]}
              onChange={e => key === 'baseUrl'
                ? setBaseUrl(e.target.value)
                : setUtm(u => ({ ...u, [key]: e.target.value }))}
              placeholder={placeholder}
              className="w-full rounded-xl px-3 py-2.5 text-xs outline-none"
              style={{ background: 'var(--s1)', color: 'var(--t1)', caretColor: 'var(--cyan)' }}
            />
          </div>
        ))}
      </div>

      {fullUrl && (
        <div className="rounded-xl p-3" style={{ background: 'var(--s1)' }}>
          <p className="text-[10px] font-mono break-all" style={{ color: 'var(--t2)' }}>{fullUrl}</p>
        </div>
      )}

      <button
        onClick={copy}
        disabled={!fullUrl}
        className="btn-lime flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <Copy size={13} /> {copied ? 'Copiado!' : 'Copiar URL com UTMs'}
      </button>
    </div>
  )
}

/* ─────────────────────── UTM template card ─────────────────────── */

function UTMTemplateCard({ tpl }: { tpl: UTMTemplate }) {
  const [copied, setCopied] = useState(false)
  const url = buildUTMUrl(tpl)
  const copy = () => {
    navigator.clipboard.writeText(url).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <div className="rounded-2xl p-4 flex flex-col gap-3" style={{ background: 'var(--s2)' }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <PlatformIcon platform={tpl.source} size={22} />
          <p className="text-sm font-semibold" style={{ color: 'var(--t1)' }}>{tpl.name}</p>
        </div>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(33,160,196,0.1)', color: 'var(--cyan)' }}>
          {tpl.usage_count}× usado
        </span>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {[
          { k: 'source', v: tpl.source },
          { k: 'medium', v: tpl.medium },
          { k: 'campaign', v: tpl.campaign },
          ...(tpl.content ? [{ k: 'content', v: tpl.content }] : []),
          ...(tpl.term    ? [{ k: 'term', v: tpl.term }] : []),
        ].map(({ k, v }) => (
          <span key={k} className="text-[10px] px-2 py-0.5 rounded-lg font-mono" style={{ background: 'var(--s3)', color: 'var(--t2)' }}>
            {k}={v}
          </span>
        ))}
      </div>

      <button
        onClick={copy}
        className="flex items-center justify-center gap-1.5 py-2 rounded-xl text-[10px] font-bold tonal-hover transition-colors"
        style={{ background: 'var(--s3)', color: copied ? 'var(--success)' : 'var(--t2)' }}
      >
        <Copy size={11} /> {copied ? 'Copiado!' : 'Copiar link'}
      </button>
    </div>
  )
}

/* ─────────────────────── GHL sync panel ─────────────────────── */

type GHLEventType = 'contact.created' | 'opportunity.updated' | 'appointment.booked' | 'pipeline.stage_changed' | 'form.submitted'

interface GHLEvent {
  id: string
  type: GHLEventType
  contact: string
  detail: string
  ts: string
  ok: boolean
}

const GHL_EVENT_CFG: Record<GHLEventType, { label: string; icon: React.ElementType; color: string }> = {
  'contact.created':         { label: 'Contacto criado',     icon: Users,      color: '#1EC87A' },
  'opportunity.updated':     { label: 'Oportunidade',        icon: TrendingUp, color: 'var(--cyan)' },
  'appointment.booked':      { label: 'Agendamento',         icon: Calendar,   color: '#F5A623' },
  'pipeline.stage_changed':  { label: 'Stage alterada',      icon: ChevronRight, color: '#D1FF00' },
  'form.submitted':          { label: 'Formulário',          icon: Activity,   color: 'var(--t2)' },
}

const MOCK_GHL_EVENTS: GHLEvent[] = [
  { id: 'g1', type: 'contact.created',        contact: 'Ana Costa',     detail: 'Lead HOT · Score inicial 72',      ts: new Date(Date.now() - 180000).toISOString(),   ok: true },
  { id: 'g2', type: 'opportunity.updated',    contact: 'Carlos Mendes', detail: 'Pipeline: Proposta → Negociação',   ts: new Date(Date.now() - 420000).toISOString(),   ok: true },
  { id: 'g3', type: 'appointment.booked',     contact: 'João Silva',    detail: 'Call marcada · 15 Abr 14h00',       ts: new Date(Date.now() - 900000).toISOString(),   ok: true },
  { id: 'g4', type: 'pipeline.stage_changed', contact: 'Rita Ferreira', detail: 'Qualificação → Call agendada',       ts: new Date(Date.now() - 1800000).toISOString(),  ok: false },
  { id: 'g5', type: 'form.submitted',         contact: 'Miguel Costa',  detail: 'Questionário de qualificação',       ts: new Date(Date.now() - 3600000).toISOString(),  ok: true },
]

const GHL_COUNTERS = [
  { label: 'Contactos hoje',   value: 14, icon: Users,      color: '#1EC87A' },
  { label: 'Oportunidades',    value: 8,  icon: TrendingUp, color: 'var(--cyan)' },
  { label: 'Agendamentos',     value: 3,  icon: Calendar,   color: '#F5A623' },
]

function GHLSyncPanel() {
  const [copied, setCopied] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const webhookUrl = 'https://hypeflow.vercel.app/api/webhooks/ghl'
  const successRate = Math.round((MOCK_GHL_EVENTS.filter(e => e.ok).length / MOCK_GHL_EVENTS.length) * 100)

  const copy = () => {
    navigator.clipboard.writeText(webhookUrl).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const resync = () => {
    setSyncing(true)
    fetch('/api/integrations/sync', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ provider: 'ghl' }) }).catch(() => {})
    setTimeout(() => setSyncing(false), 2000)
  }

  return (
    <div className="rounded-2xl p-5 flex flex-col gap-4" style={{ background: 'var(--s2)' }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center text-base" style={{ background: 'rgba(30,200,122,0.1)' }}>
            🚀
          </div>
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--t1)' }}>GoHighLevel Sync</p>
            <div className="flex items-center gap-1 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full live-dot" style={{ background: '#1EC87A' }} />
              <span className="text-[10px]" style={{ color: '#1EC87A' }}>Conectado · em tempo real</span>
            </div>
          </div>
        </div>
        <button
          onClick={resync}
          className="p-1.5 rounded-lg tonal-hover transition-colors"
          style={{ color: 'var(--t3)' }}
        >
          <RefreshCw size={12} className={syncing ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Counters */}
      <div className="grid grid-cols-3 gap-2">
        {GHL_COUNTERS.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="rounded-xl p-2.5 text-center" style={{ background: 'var(--s1)' }}>
            <Icon size={11} style={{ color, margin: '0 auto 4px' }} />
            <p className="text-base font-bold leading-none" style={{ color }}>{value}</p>
            <p className="text-[9px] mt-1 leading-tight" style={{ color: 'var(--t3)' }}>{label}</p>
          </div>
        ))}
      </div>

      {/* Health bar */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--t3)' }}>Taxa de sucesso</span>
          <span className="text-[10px] font-bold" style={{ color: successRate >= 80 ? '#1EC87A' : '#E84545' }}>{successRate}%</span>
        </div>
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--s1)' }}>
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${successRate}%`, background: successRate >= 80 ? '#1EC87A' : '#E84545' }}
          />
        </div>
      </div>

      {/* Recent events */}
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--t3)' }}>Eventos recentes</p>
        <div className="flex flex-col gap-1.5">
          {MOCK_GHL_EVENTS.map(ev => {
            const cfg = GHL_EVENT_CFG[ev.type]
            const Icon = cfg.icon
            return (
              <div key={ev.id} className="flex items-center gap-2.5 rounded-xl px-2.5 py-2" style={{ background: 'var(--s1)' }}>
                <Icon size={10} style={{ color: cfg.color, flexShrink: 0 }} />
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-semibold truncate" style={{ color: 'var(--t1)' }}>{ev.contact}</p>
                  <p className="text-[9px] truncate" style={{ color: 'var(--t3)' }}>{ev.detail}</p>
                </div>
                <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
                  {ev.ok
                    ? <CheckCircle2 size={10} style={{ color: '#1EC87A' }} />
                    : <XCircle size={10} style={{ color: 'var(--danger)' }} />
                  }
                  <span className="text-[8px]" style={{ color: 'var(--t3)' }}>{formatRelative(ev.ts)}</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Webhook URL */}
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: 'var(--t3)' }}>Webhook URL</p>
        <div className="flex items-center gap-2 rounded-xl px-2.5 py-2" style={{ background: 'var(--s1)' }}>
          <p className="text-[9px] font-mono flex-1 truncate" style={{ color: 'var(--t2)' }}>{webhookUrl}</p>
          <button onClick={copy} className="tonal-hover rounded p-1 flex-shrink-0" style={{ color: copied ? 'var(--success)' : 'var(--t3)' }}>
            <Copy size={10} />
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────── webhook sidebar ─────────────────────── */

function WebhookPanel() {
  return (
    <div className="rounded-2xl p-5 flex flex-col gap-4" style={{ background: 'var(--s2)' }}>
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(33,160,196,0.1)' }}>
          <Webhook size={15} style={{ color: 'var(--cyan)' }} />
        </div>
        <div>
          <p className="text-sm font-semibold" style={{ color: 'var(--t1)' }}>Webhooks de entrada</p>
          <p className="text-xs" style={{ color: 'var(--t3)' }}>N8N, Make, e sistemas externos</p>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        {[
          { label: 'N8N Action Endpoint', url: '/api/n8n/actions', method: 'POST' },
          { label: 'ManyChat Lead Webhook', url: '/api/manychat/webhook', method: 'POST' },
          { label: 'Google Calendar Sync', url: '/api/webhooks/google-calendar', method: 'POST' },
        ].map(({ label, url, method }) => (
          <div key={url} className="flex items-center gap-3 rounded-xl px-3 py-2.5" style={{ background: 'var(--s1)' }}>
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md" style={{ background: 'rgba(33,160,196,0.1)', color: 'var(--cyan)' }}>{method}</span>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold" style={{ color: 'var(--t1)' }}>{label}</p>
              <p className="text-[10px] font-mono" style={{ color: 'var(--t3)' }}>{url}</p>
            </div>
            <button style={{ color: 'var(--t3)' }} className="tonal-hover rounded p-1">
              <ExternalLink size={11} />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ─────────────────────── pixel install code ─────────────────────── */

function PixelInstallPanel() {
  const [platform, setPlatform] = useState('facebook')
  const snippets: Record<string, string> = {
    facebook: `<!-- Meta Pixel Code -->
<script>
!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '1234567890123456');
fbq('track', 'PageView');
</script>`,
    google_ads: `<!-- Google Tag Manager -->
<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-XXXXXXX');</script>`,
    tiktok: `<!-- TikTok Pixel Code -->
<script>
!function (w, d, t) {
  w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];
  ttq.methods=["page","track","identify","instances"];
  ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};
  for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);
  ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e};
  ttq.load = function(e,n){var i="https://analytics.tiktok.com/i18n/pixel/events.js";ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=i,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};var o=document.createElement("script");o.type="text/javascript",o.async=!0,o.src=i+"?sdkid="+e+"&lib="+t;var a=document.getElementsByTagName("script")[0];a.parentNode.insertBefore(o,a)};
  ttq.load('TKTK1234567890');
  ttq.page();
}(window, document, 'ttq');
</script>`,
    linkedin: `<!-- LinkedIn Insight Tag -->
<script type="text/javascript">
_linkedin_partner_id = "987654";
window._linkedin_data_partner_ids = window._linkedin_data_partner_ids || [];
window._linkedin_data_partner_ids.push(_linkedin_partner_id);
</script><script type="text/javascript">
(function(l) {
if (!l){window.lintrk = function(a,b){window.lintrk.q.push([a,b])};
window.lintrk.q=[]}
var s = document.getElementsByTagName("script")[0];
var b = document.createElement("script");
b.type = "text/javascript";b.async = true;
b.src = "https://snap.licdn.com/li.lms-analytics/insight.min.js";
s.parentNode.insertBefore(b, s);})(window.lintrk);
</script>`,
  }

  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(snippets[platform] ?? '').catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="rounded-2xl p-5 flex flex-col gap-4" style={{ background: 'var(--s2)' }}>
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(209,255,0,0.1)' }}>
          <Code size={15} style={{ color: 'var(--lime)' }} />
        </div>
        <p className="text-sm font-semibold" style={{ color: 'var(--t1)' }}>Código de instalação</p>
      </div>

      <div className="flex gap-2">
        {(['facebook','google_ads','tiktok','linkedin'] as const).map(p => (
          <button
            key={p}
            onClick={() => setPlatform(p)}
            className={`flex-1 flex items-center justify-center py-1.5 rounded-lg transition-all ${platform === p ? 'opacity-100' : 'opacity-40 hover:opacity-70'}`}
          >
            <PlatformIcon platform={p} size={22} />
          </button>
        ))}
      </div>

      <pre className="text-[10px] font-mono rounded-xl p-3 overflow-x-auto leading-relaxed" style={{ background: 'var(--s0)', color: 'var(--t2)' }}>
        {snippets[platform]}
      </pre>

      <button onClick={copy} className="flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold tonal-hover" style={{ background: 'var(--s3)', color: copied ? 'var(--success)' : 'var(--t2)' }}>
        <Copy size={12} /> {copied ? 'Copiado!' : 'Copiar código'}
      </button>
    </div>
  )
}

/* ─────────────────────── main page ─────────────────────── */

export default function ConfigPage() {
  const [tab, setTab] = useState<ConfigTab>('integracoes')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [pixelCopied, setPixelCopied] = useState<string | null>(null)
  const [syncingId, setSyncingId] = useState<string | null>(null)

  const handleSync = (id: string) => {
    setSyncingId(id)
    // Trigger edge function sync for this integration
    const funcMap: Record<string, string> = {
      meta:            'sync-meta-ads',
      instagram:       'sync-meta-ads',
      'google-ads':    'sync-google-ads',
      tiktok:          'sync-tiktok-ads',
      linkedin:        'sync-linkedin-ads',
    }
    const fn = funcMap[id]
    if (fn) {
      fetch(`/api/integrations/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: id }),
      }).catch(() => {})
    }
    setTimeout(() => setSyncingId(null), 2000)
  }

  const handleDisconnect = (id: string) => {
    if (!confirm(`Desligar integração "${id}"? Os dados históricos são mantidos.`)) return
    fetch('/api/integrations/disconnect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider: id }),
    }).catch(() => {})
  }

  const categories = ['all', 'ads', 'crm', 'automation', 'communication']
  const filteredIntegrations = INTEGRATIONS.filter(i => categoryFilter === 'all' || i.category === categoryFilter)

  const connected = INTEGRATIONS.filter(i => i.status === 'connected').length
  const errors    = INTEGRATIONS.filter(i => i.status === 'error').length
  const activePixels = MOCK_PIXELS.filter(p => p.status === 'active').length
  const totalPixelEvents = MOCK_PIXELS.reduce((s, p) => s + p.events_today, 0)

  const copyPixelId = (id: string) => {
    navigator.clipboard.writeText(id).catch(() => {})
    setPixelCopied(id)
    setTimeout(() => setPixelCopied(null), 2000)
  }

  const TABS: { id: ConfigTab; label: string; icon: typeof Settings }[] = [
    { id: 'integracoes', label: 'Integrações', icon: Webhook },
    { id: 'pixels',      label: 'Pixels & Tags', icon: BarChart2 },
    { id: 'utms',        label: 'UTMs', icon: Target },
  ]

  return (
    <div className="flex flex-col gap-5 h-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Config</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--t2)' }}>
            {connected} integrações conectadas · {activePixels} pixels activos · {totalPixelEvents} eventos hoje
            {errors > 0 && <span style={{ color: 'var(--danger)' }} className="ml-2">· {errors} com erro</span>}
          </p>
        </div>
      </div>

      {/* Tab navigation */}
      <div className="flex gap-0.5 rounded-xl p-1" style={{ background: 'var(--s1)', width: 'fit-content' }}>
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all"
            style={{
              background: tab === id ? 'var(--s3)' : 'transparent',
              color: tab === id ? 'var(--t1)' : 'var(--t3)',
            }}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {/* ── INTEGRAÇÕES TAB ── */}
      {tab === 'integracoes' && (
        <>
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Conectadas',    value: connected, color: 'var(--success)' },
              { label: 'Desconectadas', value: INTEGRATIONS.filter(i=>i.status==='disconnected').length, color: 'var(--t3)' },
              { label: 'Com erro',      value: errors, color: 'var(--danger)' },
            ].map(({ label, value, color }) => (
              <div key={label} className="rounded-2xl p-4 flex items-center gap-4" style={{ background: 'var(--s2)' }}>
                <div className="w-2 h-10 rounded-full" style={{ background: color }} />
                <div>
                  <p className="num-lg" style={{ color }}>{value}</p>
                  <p className="text-xs" style={{ color: 'var(--t2)' }}>{label}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="flex rounded-xl overflow-hidden w-fit" style={{ background: 'var(--s2)' }}>
            {categories.map(c => (
              <button key={c} onClick={() => setCategoryFilter(c)}
                className={`px-4 py-2 text-xs font-bold transition-colors`}
                style={{ background: categoryFilter === c ? 'var(--cyan)' : 'transparent', color: categoryFilter === c ? '#0F1318' : 'var(--t2)' }}>
                {c === 'all' ? 'Todas' : CATEGORY_LABELS[c]}
              </button>
            ))}
          </div>

          <div className="flex gap-5 flex-1 min-h-0">
            <div className="flex-1 overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                {filteredIntegrations.map(i => (
                  <IntegrationCard
                    key={i.id}
                    integration={i}
                    onSync={handleSync}
                    onDisconnect={handleDisconnect}
                  />
                ))}
              </div>
            </div>
            <div className="w-72 flex-shrink-0 flex flex-col gap-4">
              <GHLSyncPanel />
              <div className="rounded-2xl p-5 flex flex-col gap-3" style={{ background: 'var(--s2)' }}>
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(245,166,35,0.1)' }}>
                    <Globe size={15} style={{ color: '#F5A623' }} />
                  </div>
                  <p className="text-sm font-semibold" style={{ color: 'var(--t1)' }}>API Key</p>
                </div>
                <div className="rounded-xl px-3 py-2.5 flex items-center gap-2" style={{ background: 'var(--s1)' }}>
                  <p className="text-[10px] font-mono flex-1 truncate" style={{ color: 'var(--t3)' }}>hf_••••••••••••••••••••••••</p>
                  <button className="text-[10px] font-bold tonal-hover px-2 py-0.5 rounded" style={{ color: 'var(--t3)' }}>Copiar</button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── PIXELS TAB ── */}
      {tab === 'pixels' && (
        <div className="flex gap-5 flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto flex flex-col gap-5">
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: 'Pixels activos', value: activePixels, color: 'var(--success)' },
                { label: 'Eventos hoje',   value: totalPixelEvents, color: 'var(--cyan)' },
                { label: 'Com erro',       value: MOCK_PIXELS.filter(p=>p.status==='error').length, color: 'var(--danger)' },
              ].map(({ label, value, color }) => (
                <div key={label} className="rounded-2xl p-4" style={{ background: 'var(--s2)' }}>
                  <p className="num-lg" style={{ color }}>{value}</p>
                  <p className="text-xs mt-1" style={{ color: 'var(--t2)' }}>{label}</p>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold" style={{ color: 'var(--t1)' }}>Pixels instalados</p>
              <button className="btn-lime flex items-center gap-2 px-4 py-2 rounded-xl text-sm">
                <Plus size={13} /> Adicionar pixel
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {MOCK_PIXELS.map(p => <PixelCard key={p.id} pixel={p} onCopy={copyPixelId} />)}
            </div>
          </div>

          <div className="w-80 flex-shrink-0">
            <PixelInstallPanel />
          </div>
        </div>
      )}

      {/* ── UTMs TAB ── */}
      {tab === 'utms' && (
        <div className="flex gap-5 flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto flex flex-col gap-5">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold" style={{ color: 'var(--t1)' }}>Templates de UTM</p>
              <button className="btn-lime flex items-center gap-2 px-4 py-2 rounded-xl text-sm">
                <Plus size={13} /> Novo template
              </button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {MOCK_UTM_TEMPLATES.map(t => <UTMTemplateCard key={t.id} tpl={t} />)}
            </div>
          </div>

          <div className="w-80 flex-shrink-0">
            <UTMBuilder />
          </div>
        </div>
      )}
    </div>
  )
}
