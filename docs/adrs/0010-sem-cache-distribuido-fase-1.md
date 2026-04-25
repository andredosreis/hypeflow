---
status: Accepted
date: 2026-04-22
decider: Andre dos Reis (Engenheiro de Software)
tags: [caching, performance]
supersedes: null
amends: null
---

# ADR-0010: Sem Redis ou cache distribuído na Fase 1

## Context and Problem Statement

Estado: arquitectura inicial do HYPE Flow OS assenta em Supabase Postgres + Next.js no Vercel. Evento: é comum introduzir Redis ou memcached cedo "por precaução", para cachear queries comuns (lista de leads, counts de dashboard, agregados). Essa decisão tem custo operacional real e de complexidade.

Questão: vale a pena introduzir camada de cache distribuído na Fase 1?

## Decision Drivers

- Performance observada hoje (latência real vs perceived).
- Complexidade operacional (mais um serviço para operar, monitorar, migrar).
- Consistência de dados (cache invalidation é dos problemas mais complexos).
- Custo marginal (Redis managed custa desde ~10 EUR/mês, acima disso cresce).
- Princípio do YAGNI (não adicionar antes de provar necessidade).

## Considered Options

1. **Redis gerido (Upstash, Render, etc.) desde o início** (rejected): adiciona infraestrutura e custo; invalidation complexa; sem evidência de gargalo actual.
2. **Postgres materialized views para agregados** (rejected agora): valioso para dashboards em escala; volume actual não justifica complexidade operacional de refresh.
3. **Apenas Tanstack Query no cliente** (chosen).

## Decision Outcome

Não introduzir Redis, memcached, ou materialized views na Fase 1. Camada de cache única e oficial é **Tanstack Query no cliente** (React), com `staleTime` ajustado por rota:

- Listagens (leads.list): 30 s.
- Perfil de lead (leads.getById): 0 s (sempre fresco; actualizações via Realtime).
- Contadores de dashboard: 10 s (complementado por Realtime para actualização imediata).

**Revisar esta decisão** se:

- Postgres connection pool consistentemente acima de 70% de utilização.
- Queries agregadas (dashboards) consistentemente acima de 1 s de latência p95.
- Número de utilizadores concorrentes ultrapassar 200.

## Consequences

### Positive

- Arquitectura simples; menos peças a operar, migrar e monitorar.
- Consistência forte (Postgres é single source of truth, ver [ADR-0011](0011-postgres-source-of-truth.md)).
- Zero custo adicional de infraestrutura.
- Cache invalidation trivial (Tanstack Query gere client-side).

### Negative

- Se carga crescer bruscamente, pode surgir gargalo antes de termos cache distribuído para responder.
- Queries agregadas complexas de dashboard podem ficar lentas sem materialized views.
- Dependência total do Postgres compute; qualquer instabilidade afecta toda a experiência.
- Requer monitorização activa das métricas acima para não sermos surpreendidos.

## Links

- **relatesTo:** [ADR-0011](0011-postgres-source-of-truth.md)
