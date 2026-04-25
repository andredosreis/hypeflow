'use client'

import { useState, useEffect, useCallback } from 'react'
import { RefreshCw, Euro, TrendingUp } from 'lucide-react'

/* ── types ── */

type Stage = 'nova' | 'qualificada' | 'agendada' | 'proposta' | 'fechada'

interface PipelineCard {
  id: string
  name: string
  source: string
  value: number | null
  score: number
  stage: Stage
  agent: string
  created: string
}

/* ── stage config ── */

const STAGES: { key: Stage; label: string; color: string }[] = [
  { key: 'nova',       label: 'Nova',       color: '#8AAEC8' },
  { key: 'qualificada',label: 'Qualificada',color: '#21A0C4' },
  { key: 'agendada',   label: 'Agendada',   color: '#F5A623' },
  { key: 'proposta',   label: 'Proposta',   color: '#E8A838' },
  { key: 'fechada',    label: 'Fechada ✓', color: '#00E5A0' },
]

/* ── mock data ── */

const INITIAL_CARDS: PipelineCard[] = [
  { id: 'k1',  name: 'João Silva',    source: 'Facebook',  value: 2400, score: 82, stage: 'proposta',   agent: 'Dex Silva',    created: '2026-04-01' },
  { id: 'k2',  name: 'Ana Ferreira',  source: 'Google Ads',value: 1800, score: 71, stage: 'agendada',   agent: 'Quinn Costa',  created: '2026-04-02' },
  { id: 'k3',  name: 'Carlos Mendes', source: 'Instagram', value: 3200, score: 65, stage: 'qualificada',agent: 'Dex Silva',    created: '2026-03-30' },
  { id: 'k4',  name: 'Sofia Lopes',   source: 'LinkedIn',  value: null, score: 40, stage: 'nova',       agent: 'River Lopes',  created: '2026-04-03' },
  { id: 'k5',  name: 'Miguel Costa',  source: 'Facebook',  value: 5000, score: 95, stage: 'fechada',    agent: 'Dex Silva',    created: '2026-03-25' },
  { id: 'k6',  name: 'Rita Oliveira', source: 'TikTok',    value: 2200, score: 78, stage: 'proposta',   agent: 'Quinn Costa',  created: '2026-04-01' },
  { id: 'k7',  name: 'Pedro Santos',  source: 'Orgânico',  value: null, score: 32, stage: 'nova',       agent: 'River Lopes',  created: '2026-04-04' },
  { id: 'k8',  name: 'Inês Rodrigues',source: 'Facebook',  value: 4100, score: 88, stage: 'agendada',   agent: 'Dex Silva',    created: '2026-03-28' },
  { id: 'k9',  name: 'Bruno Neves',   source: 'Google Ads',value: 1600, score: 55, stage: 'qualificada',agent: 'Quinn Costa',  created: '2026-04-02' },
  { id: 'k10', name: 'Marta Lima',    source: 'Instagram', value: 2800, score: 73, stage: 'qualificada',agent: 'River Lopes',  created: '2026-04-03' },
  { id: 'k11', name: 'Tiago Fonseca', source: 'TikTok',    value: null, score: 45, stage: 'nova',       agent: 'Dex Silva',    created: '2026-04-05' },
  { id: 'k12', name: 'Catarina Dias', source: 'LinkedIn',  value: 6500, score: 91, stage: 'fechada',    agent: 'Quinn Costa',  created: '2026-03-22' },
]

/* ── KPI helper ── */

function KpiBar({ cards }: { cards: PipelineCard[] }) {
  const total    = cards.length
  const revenue  = cards.filter(c => c.stage === 'fechada').reduce((a, c) => a + (c.value ?? 0), 0)
  const pipeline = cards.filter(c => c.stage !== 'fechada').reduce((a, c) => a + (c.value ?? 0), 0)
  const convRate = total > 0 ? Math.round((cards.filter(c => c.stage === 'fechada').length / total) * 100) : 0

  return (
    <div className="grid grid-cols-3 gap-4">
      {[
        { label: 'Total em Pipeline', value: `€${pipeline.toLocaleString()}`, icon: Euro,       color: 'var(--cyan)'    },
        { label: 'Receita Fechada',   value: `€${revenue.toLocaleString()}`,  icon: TrendingUp, color: 'var(--success)' },
        { label: 'Taxa de Conversão', value: `${convRate}%`,                  icon: TrendingUp, color: 'var(--warning)' },
      ].map(({ label, value, icon: Icon, color }) => (
        <div key={label} className="card border p-4 flex items-center gap-4" style={{ borderColor: 'var(--glass-border)' }}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${color}20` }}>
            <Icon size={18} style={{ color }} />
          </div>
          <div>
            <p className="tag-label">{label}</p>
            <p className="num-md mt-0.5">{value}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

/* ── kanban column ── */

function KanbanColumn({
  stage, cards, onDrop, onDragOver,
}: {
  stage: typeof STAGES[number]
  cards: PipelineCard[]
  onDrop: (e: React.DragEvent, targetStage: Stage) => void
  onDragOver: (e: React.DragEvent) => void
  onDragStart: (e: React.DragEvent, id: string) => void
}) {
  const total = cards.reduce((a, c) => a + (c.value ?? 0), 0)

  return (
    <div
      className="flex flex-col gap-3 min-w-0"
      onDrop={e => onDrop(e, stage.key)}
      onDragOver={onDragOver}
    >
      {/* Column header */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: stage.color }} />
          <span className="text-sm font-bold" style={{ color: 'var(--t1)' }}>{stage.label}</span>
          <span
            className="text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center"
            style={{ background: 'var(--s2)', color: 'var(--t2)', fontSize: '0.65rem' }}
          >
            {cards.length}
          </span>
        </div>
        {total > 0 && (
          <span className="text-xs font-bold" style={{ color: stage.color }}>€{total.toLocaleString()}</span>
        )}
      </div>

      {/* Drop zone */}
      <div
        className="flex flex-col gap-2 rounded-2xl p-2 min-h-[120px] transition-colors"
        style={{
          background: 'var(--s1)',
          border: `1px solid var(--glass-border)`,
          borderTop: `2px solid ${stage.color}`,
        }}
      >
        {cards.map(card => (
          <KanbanCardWrapper key={card.id} card={card} />
        ))}
        {cards.length === 0 && (
          <div className="flex-1 flex items-center justify-center py-6">
            <p style={{ fontSize: '0.7rem', color: 'var(--t3)' }}>Arrastar aqui</p>
          </div>
        )}
      </div>
    </div>
  )
}

/* Wrapper to pass drag handler down from page context */
function KanbanCardWrapper({ card }: { card: PipelineCard }) {
  return (
    <div
      draggable
      onDragStart={e => {
        e.dataTransfer.setData('cardId', card.id)
        e.dataTransfer.effectAllowed = 'move'
      }}
    >
      <div
        className="rounded-xl p-3 cursor-grab active:cursor-grabbing transition-all"
        style={{ background: 'var(--s2)', border: '1px solid var(--glass-border)' }}
      >
        <div className="flex items-center gap-2.5 mb-2">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
            style={{ background: 'var(--cyan-glow)', color: 'var(--cyan)' }}
          >
            {card.name.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold truncate" style={{ color: 'var(--t1)' }}>{card.name}</p>
            <p style={{ fontSize: '0.65rem', color: 'var(--t3)' }}>{card.source}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 mb-2">
          <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: 'var(--s0)' }}>
            <div
              className="h-full rounded-full"
              style={{
                width: `${card.score}%`,
                background: card.score >= 75 ? 'var(--success)' : card.score >= 50 ? 'var(--warning)' : 'var(--t3)',
              }}
            />
          </div>
          <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--t3)' }}>{card.score}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold" style={{ color: card.value ? 'var(--t1)' : 'var(--t3)' }}>
            {card.value ? `€${card.value.toLocaleString()}` : '—'}
          </span>
          <span style={{ fontSize: '0.65rem', fontWeight: 700, color: STAGES.find(s => s.key === card.stage)?.color }}>
            {STAGES.find(s => s.key === card.stage)?.label}
          </span>
        </div>
      </div>
    </div>
  )
}

/* ── page ── */

export default function PipelinePage() {
  const [cards, setCards]       = useState<PipelineCard[]>(INITIAL_CARDS)
  const [syncing, setSyncing]   = useState(false)
  const [lastSync, setLastSync] = useState(new Date())
  const [toast, setToast]       = useState<string | null>(null)

  /* Auto-refresh every 30s */
  useEffect(() => {
    const id = setInterval(() => {
      setSyncing(true)
      setTimeout(() => {
        setSyncing(false)
        setLastSync(new Date())
      }, 800)
    }, 30000)
    return () => clearInterval(id)
  }, [])

  const manualRefresh = useCallback(() => {
    setSyncing(true)
    setTimeout(() => {
      setSyncing(false)
      setLastSync(new Date())
    }, 800)
  }, [])

  /* Drag events */
  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  function handleDrop(e: React.DragEvent, targetStage: Stage) {
    e.preventDefault()
    const cardId = e.dataTransfer.getData('cardId')
    const card   = cards.find(c => c.id === cardId)
    if (!card || card.stage === targetStage) return

    const prevLabel = STAGES.find(s => s.key === card.stage)!.label
    const nextLabel = STAGES.find(s => s.key === targetStage)!.label

    setCards(prev => prev.map(c => c.id === cardId ? { ...c, stage: targetStage } : c))

    /* Sync pulse */
    setSyncing(true)
    setTimeout(() => {
      setSyncing(false)
      setLastSync(new Date())
    }, 600)

    setToast(`${card.name} movido: ${prevLabel} → ${nextLabel}`)
    setTimeout(() => setToast(null), 3000)
  }

  const pad = (n: number) => String(n).padStart(2, '0')
  const syncLabel = `${pad(lastSync.getHours())}:${pad(lastSync.getMinutes())}:${pad(lastSync.getSeconds())}`

  return (
    <div className="flex flex-col gap-5 h-full animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Pipeline</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--t2)' }}>
            {cards.length} leads · arraste os cards para mover entre etapas
          </p>
        </div>

        {/* Sync indicator */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--t3)' }}>
            <span
              className={`w-1.5 h-1.5 rounded-full ${syncing ? 'lime-pulse' : 'live-dot'}`}
              style={{ background: syncing ? 'var(--lime)' : 'var(--success)' }}
            />
            {syncing ? 'A sincronizar...' : `Sync ${syncLabel}`}
          </div>
          <button
            onClick={manualRefresh}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl transition-all"
            style={{ background: 'var(--s2)', color: 'var(--t2)', border: '1px solid var(--glass-border)' }}
          >
            <RefreshCw size={11} className={syncing ? 'animate-spin' : ''} />
            Actualizar
          </button>
        </div>
      </div>

      {/* KPIs */}
      <KpiBar cards={cards} />

      {/* Toast */}
      {toast && (
        <div
          className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl text-sm font-bold animate-fade-in"
          style={{ background: 'var(--s2)', color: 'var(--success)', border: '1px solid var(--glass-border)' }}
        >
          ✓ {toast}
        </div>
      )}

      {/* Kanban board */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden">
        <div className="grid gap-4 h-full" style={{ gridTemplateColumns: `repeat(${STAGES.length}, minmax(200px, 1fr))`, minWidth: '900px' }}>
          {STAGES.map(stage => {
            const stageCards = cards.filter(c => c.stage === stage.key)
            return (
              <KanbanColumn
                key={stage.key}
                stage={stage}
                cards={stageCards}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragStart={() => {}}
              />
            )
          })}
        </div>
      </div>
    </div>
  )
}
