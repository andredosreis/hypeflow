---
status: Accepted
date: 2026-04-22
decider: Andre dos Reis (Engenheiro de Software)
tags: [backend, events, database]
supersedes: null
amends: null
---

# ADR-0012: `pg_notify` como canal de eventos internos

## Context and Problem Statement

Estado: a arquitectura event-driven estabelecida em [ADR-0006](0006-invocacao-edge-functions.md) requer um bus interno para publicar eventos de domínio (`lead.created`, `lead.stage_changed`, `interaction.logged`, etc.). Evento que força decisão: escolher entre bus externo (Kafka, Redis Streams, SQS) ou mecanismo nativo do Postgres.

## Decision Drivers

- Volume previsto de eventos: dezenas por segundo no pico inicial, não milhares.
- Complexidade operacional.
- Custo mensal.
- Latência aceitável: sub-segundo é suficiente.
- Integração com Edge Functions Deno.

## Considered Options

1. **Apache Kafka gerido (Confluent Cloud)** (rejected): overkill para volume; custo inicial alto (aproximadamente 100 EUR/mês mínimo); curva de aprendizagem significativa.
2. **Redis Streams** (rejected agora): viola [ADR-0010](0010-sem-cache-distribuido-fase-1.md); pode ser útil em Fase 2 se volume explodir.
3. **AWS SQS ou equivalente cloud-native** (rejected): lock-in com cloud externo; integração menos fluida com Supabase.
4. **`pg_notify` nativo do Postgres** (chosen).

## Decision Outcome

Usar **`pg_notify`** como bus interno de eventos na Fase 1.

Padrão de uso:

- Postgres triggers `AFTER INSERT/UPDATE/DELETE` em tabelas críticas emitem `NOTIFY <channel>, '<payload_json>'`.
- Payload limitado a metadata mínima (abaixo de 8KB): `{ event, entity_id, agency_id, timestamp, correlation_id }`.
- Edge Function `event-publisher` faz `LISTEN` em todos os canais e despacha para consumidores (Automation Builder, Notifications, Realtime broadcast complementar).
- Consumidores têm de ser **idempotentes** (semântica at-least-once). Deduplicação por `correlation_id` quando aplicável.

Canais definidos: `lead.created`, `lead.stage_changed`, `lead.score_changed`, `lead.lost`, `interaction.logged`, `webhook.failed`.

**Migração futura:** reavaliar bus externo quando volume passar 100 eventos/s sustentados, ou quando surgirem consumidores em serviços fora do Supabase.

## Consequences

### Positive

- Zero infraestrutura adicional (usa Postgres e Edge Functions já existentes).
- Transaccional: evento dispara apenas se `COMMIT` ocorrer; rollback cancela também.
- Debugging via Postgres logs (standard).
- Baixa latência (microssegundos entre `NOTIFY` e recepção do listener).

### Negative

- Sem persistência: se o listener morrer, eventos emitidos nesse intervalo são perdidos. Mitigação: heartbeat + restart automático via Supabase; para eventos críticos, considerar tabela `event_outbox` em fase posterior.
- Payload limit de 8KB obriga a design minimalista (apenas metadata, não entidade inteira).
- Não cross-service por default: se um dia existirem microservices externos, será preciso adaptar (ex.: bridge `pg_notify` para webhook).
- `LISTEN` não escala horizontalmente de forma trivial; recomenda-se 1 listener único.

## Links

- **relatesTo:** [ADR-0006](0006-invocacao-edge-functions.md)
