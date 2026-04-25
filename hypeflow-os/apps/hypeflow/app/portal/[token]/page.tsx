'use client'

import { useState, useEffect } from 'react'
import {
  TrendingUp, TrendingDown, MousePointer,
  CheckCircle, MessageSquare, FileText, BarChart2,
  Download, ChevronRight, Send, AlertCircle, Shield,
} from 'lucide-react'

/* ─── Types ─── */
interface PortalData {
  client_name: string
  agency_name: string
  period: string
  kpis: {
    leads_generated: number
    leads_change: number
    cpl: number
    cpl_change: number
    conversion_rate: number
    conversion_change: number
    mrr: number
    mrr_change: number
  }
  reports: PortalReport[]
  campaigns: PortalCampaign[]
  messages: PortalMessage[]
}

interface PortalReport {
  id: string
  title: string
  period: string
  status: 'pending_approval' | 'approved' | 'changes_requested'
  created_at: string
  pdf_url?: string
}

interface PortalCampaign {
  id: string
  name: string
  channel: string
  reach: number
  clicks: number
  leads: number
  spend: number
  status: 'active' | 'paused' | 'ended'
}

interface PortalMessage {
  id: string
  author: string
  author_type: 'agency' | 'client'
  subject?: string
  body: string
  created_at: string
  thread_id: string
}

/* ─── Mock portal data (replaced by real DB data post-activation) ─── */
function getMockPortalData(token: string): PortalData {
  const seed = token.charCodeAt(0) % 6
  const clients = ['TechnoSpark Lda', 'Clínica Estética Silva', 'Imobiliária Horizonte', 'FitZone Gym', 'AutoPremium', 'EduLearn']
  return {
    client_name: clients[seed] ?? 'Cliente',
    agency_name: 'HYPE Flow Agency',
    period: 'Março 2026',
    kpis: {
      leads_generated: 127 + seed * 23,
      leads_change: 12.4 - seed,
      cpl: 4.20 + seed * 0.8,
      cpl_change: -8.3 + seed,
      conversion_rate: 18.4 + seed * 1.2,
      conversion_change: 2.1,
      mrr: 2400 + seed * 600,
      mrr_change: 5.2,
    },
    reports: [
      { id: 'r1', title: 'Relatório Mensal — Março 2026', period: 'Março 2026', status: 'pending_approval', created_at: '2026-04-01', pdf_url: '#' },
      { id: 'r2', title: 'Relatório Mensal — Fevereiro 2026', period: 'Fevereiro 2026', status: 'approved', created_at: '2026-03-02', pdf_url: '#' },
      { id: 'r3', title: 'Relatório Mensal — Janeiro 2026', period: 'Janeiro 2026', status: 'approved', created_at: '2026-02-01', pdf_url: '#' },
    ],
    campaigns: [
      { id: 'c1', name: 'Meta Ads — Prospecção', channel: 'Meta', reach: 45000, clicks: 1240, leads: 87, spend: 365, status: 'active' },
      { id: 'c2', name: 'Google Search', channel: 'Google', reach: 12000, clicks: 890, leads: 34, spend: 142, status: 'active' },
      { id: 'c3', name: 'Remarketing IG', channel: 'Instagram', reach: 8900, clicks: 234, leads: 12, spend: 50, status: 'paused' },
    ],
    messages: [
      { id: 'm1', thread_id: 't1', author: 'Dex Silva', author_type: 'agency', subject: 'Estratégia Q2 2026', body: 'Bom dia! Partilhamos a estratégia proposta para o Q2. Analisei os dados e proponho aumentar o orçamento em Meta em 20% com foco em lookalike audiences.', created_at: '2026-04-10T09:00:00Z' },
      { id: 'm2', thread_id: 't1', author: 'Cliente', author_type: 'client', body: 'Obrigado Dex! Concordo com a estratégia. Quando podemos começar?', created_at: '2026-04-11T14:30:00Z' },
      { id: 'm3', thread_id: 't2', author: 'Dex Silva', author_type: 'agency', subject: 'Relatório de Março pronto', body: 'O relatório de Março está disponível para aprovação. Mês muito positivo — superámos as metas em 12%.', created_at: '2026-04-01T10:00:00Z' },
    ],
  }
}

/* ─── Sub-components ─── */

function KpiCard({ label, value, change, prefix = '', suffix = '' }: {
  label: string; value: number; change: number; prefix?: string; suffix?: string
}) {
  const positive = change >= 0
  const color = label === 'CPL' ? (change <= 0 ? '#00E5A0' : '#E84545') : (positive ? '#00E5A0' : '#E84545')
  return (
    <div className="rounded-2xl p-5 flex flex-col gap-2" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
      <p className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.5)' }}>{label}</p>
      <p className="text-2xl font-bold font-display" style={{ color: '#fff' }}>
        {prefix}{typeof value === 'number' && value >= 1000 ? value.toLocaleString('pt-PT') : value}{suffix}
      </p>
      <div className="flex items-center gap-1">
        {positive ? <TrendingUp size={11} style={{ color }} /> : <TrendingDown size={11} style={{ color }} />}
        <span className="text-[11px] font-semibold" style={{ color }}>
          {positive ? '+' : ''}{change.toFixed(1)}% vs mês anterior
        </span>
      </div>
    </div>
  )
}

const REPORT_STATUS_CFG = {
  pending_approval: { label: 'Aguarda aprovação', color: '#F5A623', bg: 'rgba(245,166,35,0.12)' },
  approved:         { label: 'Aprovado',           color: '#00E5A0', bg: 'rgba(0,229,160,0.12)' },
  changes_requested:{ label: 'Revisão pedida',     color: '#E84545', bg: 'rgba(232,69,69,0.12)' },
}

/* ─── Main portal page ─── */
export default function ClientPortalPage({ params }: { params: { token: string } }) {
  const [data, setData] = useState<PortalData | null>(null)
  const [tab, setTab] = useState<'dashboard' | 'reports' | 'campaigns' | 'messages'>('dashboard')
  const [reports, setReports] = useState<PortalReport[]>([])
  const [replyBody, setReplyBody] = useState('')
  const [sending, setSending] = useState(false)
  const [sentMsg, setSentMsg] = useState(false)

  useEffect(() => {
    // In production: fetch from /api/portal/[token]
    const d = getMockPortalData(params.token)
    setData(d)
    setReports(d.reports)
  }, [params.token])

  const approveReport = (id: string) => {
    setReports(prev => prev.map(r => r.id === id ? { ...r, status: 'approved' as const } : r))
  }

  const requestChanges = (id: string) => {
    setReports(prev => prev.map(r => r.id === id ? { ...r, status: 'changes_requested' as const } : r))
  }

  const sendReply = () => {
    if (!replyBody.trim()) return
    setSending(true)
    setTimeout(() => {
      setSending(false)
      setSentMsg(true)
      setReplyBody('')
      setTimeout(() => setSentMsg(false), 3000)
    }, 800)
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#050D14' }}>
        <div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: 'rgba(33,160,196,0.3)', borderTopColor: '#21A0C4' }} />
      </div>
    )
  }

  const tabs = [
    { id: 'dashboard',  label: 'Dashboard',  icon: BarChart2 },
    { id: 'reports',    label: 'Relatórios', icon: FileText },
    { id: 'campaigns',  label: 'Campanhas',  icon: MousePointer },
    { id: 'messages',   label: 'Mensagens',  icon: MessageSquare },
  ] as const

  return (
    <div className="min-h-screen" style={{ background: '#050D14', color: '#fff' }}>
      {/* Top bar */}
      <div
        className="sticky top-0 z-10 flex items-center justify-between px-6 py-3"
        style={{ background: 'rgba(5,13,20,0.9)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold" style={{ background: 'rgba(33,160,196,0.15)', color: '#21A0C4' }}>H</div>
          <div>
            <p className="text-xs font-bold" style={{ color: '#fff' }}>{data.agency_name}</p>
            <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.4)' }}>Portal do Cliente</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full" style={{ background: 'rgba(0,229,160,0.1)', border: '1px solid rgba(0,229,160,0.2)' }}>
            <Shield size={10} style={{ color: '#00E5A0' }} />
            <span className="text-[10px] font-semibold" style={{ color: '#00E5A0' }}>Acesso seguro</span>
          </div>
          <p className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.6)' }}>{data.client_name}</p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Hero */}
        <div className="mb-8">
          <p className="text-xs font-semibold mb-1" style={{ color: 'rgba(33,160,196,0.8)' }}>RELATÓRIO · {data.period.toUpperCase()}</p>
          <h1 className="text-3xl font-bold mb-1">{data.client_name}</h1>
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>Visão geral da performance da sua conta</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-8 p-1 rounded-2xl w-fit" style={{ background: 'rgba(255,255,255,0.05)' }}>
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
              style={{
                background: tab === id ? '#21A0C4' : 'transparent',
                color: tab === id ? '#fff' : 'rgba(255,255,255,0.5)',
              }}
            >
              <Icon size={13} />
              {label}
              {id === 'reports' && reports.some(r => r.status === 'pending_approval') && (
                <span className="w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center" style={{ background: '#F5A623', color: '#000' }}>
                  {reports.filter(r => r.status === 'pending_approval').length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Dashboard tab */}
        {tab === 'dashboard' && (
          <div className="flex flex-col gap-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <KpiCard label="Leads Gerados"    value={data.kpis.leads_generated}  change={data.kpis.leads_change}      suffix=" leads" />
              <KpiCard label="CPL"              value={data.kpis.cpl}               change={data.kpis.cpl_change}        prefix="€" />
              <KpiCard label="Taxa Conversão"   value={data.kpis.conversion_rate}  change={data.kpis.conversion_change} suffix="%" />
              <KpiCard label="MRR"              value={data.kpis.mrr}              change={data.kpis.mrr_change}        prefix="€" />
            </div>

            {/* Pending approval call-to-action */}
            {reports.some(r => r.status === 'pending_approval') && (
              <div
                className="flex items-center justify-between p-4 rounded-2xl"
                style={{ background: 'rgba(245,166,35,0.1)', border: '1px solid rgba(245,166,35,0.25)' }}
              >
                <div className="flex items-center gap-3">
                  <AlertCircle size={18} style={{ color: '#F5A623' }} />
                  <div>
                    <p className="text-sm font-semibold">Relatório aguarda a sua aprovação</p>
                    <p className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>Relatório de {data.period} · Criado em 1 de Abril</p>
                  </div>
                </div>
                <button
                  onClick={() => setTab('reports')}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold"
                  style={{ background: '#F5A623', color: '#000' }}
                >
                  Ver Relatório <ChevronRight size={13} />
                </button>
              </div>
            )}
          </div>
        )}

        {/* Reports tab */}
        {tab === 'reports' && (
          <div className="flex flex-col gap-3">
            {reports.map(r => {
              const cfg = REPORT_STATUS_CFG[r.status]
              return (
                <div
                  key={r.id}
                  className="flex items-center justify-between p-4 rounded-2xl"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(33,160,196,0.1)' }}>
                      <FileText size={16} style={{ color: '#21A0C4' }} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{r.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: cfg.bg, color: cfg.color }}>
                          {cfg.label}
                        </span>
                        <span className="text-[11px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
                          {new Date(r.created_at).toLocaleDateString('pt-PT')}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {r.status === 'pending_approval' && (
                      <>
                        <button
                          onClick={() => requestChanges(r.id)}
                          className="px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
                          style={{ background: 'rgba(232,69,69,0.1)', color: '#E84545' }}
                        >
                          Pedir alteração
                        </button>
                        <button
                          onClick={() => approveReport(r.id)}
                          className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold transition-all"
                          style={{ background: '#00E5A0', color: '#000' }}
                        >
                          <CheckCircle size={12} /> Aprovar
                        </button>
                      </>
                    )}
                    {r.status !== 'pending_approval' && (
                      <a
                        href={r.pdf_url ?? '#'}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold"
                        style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)' }}
                      >
                        <Download size={12} /> PDF
                      </a>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Campaigns tab */}
        {tab === 'campaigns' && (
          <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  {['Campanha', 'Canal', 'Alcance', 'Cliques', 'Leads', 'Gasto', 'CPL', 'Estado'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.4)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.campaigns.map(c => (
                  <tr key={c.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td className="px-4 py-3 text-sm font-semibold">{c.name}</td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>{c.channel}</td>
                    <td className="px-4 py-3 text-sm">{c.reach.toLocaleString('pt-PT')}</td>
                    <td className="px-4 py-3 text-sm">{c.clicks.toLocaleString('pt-PT')}</td>
                    <td className="px-4 py-3 text-sm font-bold" style={{ color: '#00E5A0' }}>{c.leads}</td>
                    <td className="px-4 py-3 text-sm">€{c.spend}</td>
                    <td className="px-4 py-3 text-sm font-bold" style={{ color: '#21A0C4' }}>€{(c.spend / c.leads).toFixed(2)}</td>
                    <td className="px-4 py-3">
                      <span
                        className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                        style={{
                          background: c.status === 'active' ? 'rgba(0,229,160,0.12)' : 'rgba(255,255,255,0.06)',
                          color: c.status === 'active' ? '#00E5A0' : 'rgba(255,255,255,0.4)',
                        }}
                      >
                        {c.status === 'active' ? 'Activa' : 'Pausada'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Messages tab */}
        {tab === 'messages' && (
          <div className="flex flex-col gap-4">
            {data.messages.map(m => (
              <div
                key={m.id}
                className={`flex gap-3 ${m.author_type === 'client' ? 'flex-row-reverse' : ''}`}
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                  style={{ background: m.author_type === 'agency' ? 'rgba(33,160,196,0.2)' : 'rgba(0,229,160,0.15)', color: m.author_type === 'agency' ? '#21A0C4' : '#00E5A0' }}
                >
                  {m.author.charAt(0)}
                </div>
                <div
                  className="flex-1 max-w-xl p-4 rounded-2xl"
                  style={{ background: m.author_type === 'client' ? 'rgba(0,229,160,0.08)' : 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
                >
                  {m.subject && <p className="text-xs font-bold mb-1" style={{ color: '#21A0C4' }}>{m.subject}</p>}
                  <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.85)' }}>{m.body}</p>
                  <p className="text-[10px] mt-2" style={{ color: 'rgba(255,255,255,0.3)' }}>
                    {m.author} · {new Date(m.created_at).toLocaleDateString('pt-PT', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}

            {/* Reply box */}
            <div className="mt-2 flex flex-col gap-3 p-4 rounded-2xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <p className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.5)' }}>Responder</p>
              <textarea
                value={replyBody}
                onChange={e => setReplyBody(e.target.value)}
                rows={3}
                placeholder="Escreve a tua mensagem..."
                className="w-full bg-transparent text-sm outline-none resize-none leading-relaxed"
                style={{ color: '#fff', caretColor: '#21A0C4' }}
              />
              {sentMsg && (
                <div className="flex items-center gap-2 text-xs" style={{ color: '#00E5A0' }}>
                  <CheckCircle size={12} /> Mensagem enviada com sucesso
                </div>
              )}
              <div className="flex justify-end">
                <button
                  onClick={sendReply}
                  disabled={!replyBody.trim() || sending}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold transition-all"
                  style={{
                    background: replyBody.trim() && !sending ? '#21A0C4' : 'rgba(255,255,255,0.08)',
                    color: replyBody.trim() && !sending ? '#fff' : 'rgba(255,255,255,0.3)',
                  }}
                >
                  {sending ? <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" /> : <Send size={13} />}
                  Enviar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-12 pt-6 flex items-center justify-between" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>© {new Date().getFullYear()} {data.agency_name} · HYPE Flow OS</p>
          <div className="flex items-center gap-1.5" style={{ color: 'rgba(255,255,255,0.25)' }}>
            <Shield size={10} />
            <p className="text-[10px]">Acesso protegido por token · SSL</p>
          </div>
        </div>
      </div>
    </div>
  )
}
