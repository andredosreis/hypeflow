---
status: Proposed
date: 2026-04-22
decider: Andre dos Reis (Engenheiro de Software)
tags: [backend, async, database]
supersedes: null
amends: null
---

# ADR-0006: Invocação de Edge Functions via Postgres trigger + `pg_notify`

## Context and Problem Statement

Estado: mutations de lead (create, update de pipeline stage, log de interacção) precisam disparar side effects (recálculo de score em background, notificação ao Automation Builder, publicação de eventos para Realtime complementar). Evento que força decisão: arquitectura event-driven definida no HLD obriga a escolher o mecanismo de invocação da Edge Function `event-publisher`.

Alternativas:

- Postgres trigger + `pg_notify` + Edge Function que faz `LISTEN`.
- Hook directo no mutation tRPC (chamada HTTP à Edge Function depois do commit).
- Fila externa intermediária (Redis Streams, BullMQ, SQS).

## Decision Drivers

- Garantia de que evento dispara mesmo quando mutation vem fora do tRPC (SQL directo, bulk migration, admin tooling).
- Transacionalidade: evento não dispara se mutation fizer rollback.
- Simplicidade de código e de operação.
- Observabilidade: fácil rastrear eventos disparados.

## Considered Options

1. **Hook no tRPC mutation (HTTP call pós-commit)** (rejected): mutations fora do tRPC (bulk job, data migration, admin) não disparam eventos; quebra garantia de consistência. Adicionalmente, hook pós-commit pode correr mesmo se commit falhar em race conditions muito raras.
2. **Webhook interno via queue externa (Redis/BullMQ)** (rejected agora): acrescenta infraestrutura; viola [ADR-0010](0010-sem-cache-distribuido-fase-1.md); overkill para o volume actual.
3. **Postgres trigger + `pg_notify` + Edge Function listener** (chosen).

## Decision Outcome

Cada tabela crítica (`leads`, `lead_interactions`) tem triggers `AFTER INSERT` e `AFTER UPDATE` (em colunas relevantes como `status`, `pipeline_stage_id`, `score`) que emitem `NOTIFY <channel>, '<payload_json>'` com payload mínimo:

```json
{
  "event": "lead.stage_changed",
  "entity_id": "uuid",
  "agency_id": "uuid",
  "timestamp": "iso8601",
  "correlation_id": "uuid"
}
```

Edge Function `event-publisher` mantém connection persistente ao Postgres e faz `LISTEN` em todos os canais. Ao receber evento, despacha para os consumidores registados (Automation Builder, Notifications, etc.).

Canais planeados: `lead.created`, `lead.stage_changed`, `lead.score_changed`, `lead.lost`, `interaction.logged`.

## Consequences

### Positive

- Evento dispara independentemente da origem da mutation (tRPC, SQL directo, bulk job).
- Transaccional: `NOTIFY` só é entregue se `COMMIT` ocorrer; rollback cancela também.
- Zero infraestrutura adicional (usa Postgres e Edge Functions já disponíveis).
- Audit trail via Postgres logs.

### Negative

- Payload limite de 8KB: não serializar entidade completa, apenas IDs e contexto mínimo.
- `LISTEN` é não persistente: se listener morrer, eventos emitidos nesse intervalo são perdidos. Mitigação: heartbeat + restart automático via Supabase; para eventos críticos, considerar tabela `event_outbox` complementar em fase posterior.
- Escalar horizontalmente um único listener não é trivial. Para volume actual basta 1 instância; se volume passar 100 eventos/s sustentados, reavaliar.
- Payload JSON limita expressividade; consumidores têm de fetch dados frescos se precisarem de estado completo.

## Links

- **relatesTo:** [ADR-0012](0012-pg-notify-eventos-internos.md)
