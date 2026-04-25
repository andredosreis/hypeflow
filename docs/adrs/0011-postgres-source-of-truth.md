---
status: Accepted
date: 2026-04-22
decider: Andre dos Reis (Engenheiro de Software)
tags: [database, integrity]
supersedes: null
amends: null
---

# ADR-0011: Postgres como source of truth único

## Context and Problem Statement

Estado: vários componentes lêem dados da lead (UI agency, UI portal, Automation Builder, Dashboard, Portal do Cliente). Evento: sem princípio explícito, componentes podem tentar guardar estado derivado local (ex.: score cached em memória, pipeline stage em client state stale, contadores em Redis) e divergir do Postgres.

Questão: onde está a verdade autoritativa e como garantir que toda a arquitectura respeita isso?

## Decision Drivers

- Integridade de dados (impossibilidade de viver com drift entre sistemas).
- Simplicidade mental: um único local para investigar quando algo não bate.
- Debugging (uma fonte, um lugar para consultar).
- Consistência transaccional (ACID).

## Considered Options

1. **Cache side-car em Redis com TTL longo para reads quentes** (rejected): viola [ADR-0010](0010-sem-cache-distribuido-fase-1.md); drift possível entre Redis e Postgres; invalidation fica complexa.
2. **Event sourcing com read models separados** (rejected): arquitectura complexa; overkill para o volume actual; requer investimento grande em ferramental.
3. **Postgres é fonte única; reads vão directo ao Postgres com cache apenas no cliente** (chosen).

## Decision Outcome

Princípio arquitectural: **Postgres Supabase é source of truth autoritativo para todas as entidades owned pelo módulo CRM & Leads** (`leads`, `lead_interactions`, `audit_logs`, `webhook_failures`).

Componentes que lêem estado derivado devem:

- Fetch via tRPC (que executa query em Postgres).
- Subscrever Supabase Realtime para updates em tempo real (que reflectem mudanças em Postgres).
- Nunca guardar cópia autoritativa em outro sistema persistente.

**Excepção única:** Tanstack Query no cliente com TTL curto (ver [ADR-0010](0010-sem-cache-distribuido-fase-1.md)), tratado como cache volátil, não como source of truth.

**Regra para novos componentes:** qualquer feature que proponha persistir estado fora do Postgres deve abrir ADR a superseder este ou a justificar excepção específica.

## Consequences

### Positive

- Modelo mental simples: a verdade está na DB.
- Debugging centralizado (um único lugar para investigar).
- Consistência transaccional garantida (ACID do Postgres).
- Evita classe inteira de bugs por drift.

### Negative

- Queries sob alta carga dependem 100% do Postgres compute.
- Migrations afectam tudo (na Fase 1 não há read replicas).
- Leitura em disconnected mode é impossível (UI requer rede).
- Se futuramente precisarmos de analytics complexos, podem exigir ETL para data warehouse, o que é compatível com este princípio desde que o Postgres permaneça autoritativo.

## Links

- **relatesTo:** [ADR-0010](0010-sem-cache-distribuido-fase-1.md)
