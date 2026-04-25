---
status: Proposed
date: 2026-04-22
decider: Andre dos Reis (Engenheiro de Software)
tags: [infrastructure, migration, cost]
supersedes: null
amends: null
---

# ADR-0003: Estratégia de migração Supabase managed para self-host

## Context and Problem Statement

Estado actual: Supabase Pro managed (ver [ADR-0001](0001-plano-supabase-fase-1.md)). Evento futuro que pode forçar mudança: custo mensal total cresce acima de threshold, número de agências activas cresce acima do razoável para managed, ou cliente enterprise exige on-premises em contrato.

Questão: em que condições migrar e com que plano de execução?

## Decision Drivers

- Custo mensal total (managed com add-ons vs custo de VPS e tempo de operação).
- Controlo sobre dados e compliance (alguns clientes enterprise podem exigir on-premises).
- Risco de downtime durante a migração.
- Maturidade da equipa em operar Postgres, Auth, Realtime e Edge Functions.
- Curva de aprendizagem do stack Supabase self-host (Docker Compose, Kong, GoTrue, PostgREST, Realtime, Storage).

## Considered Options

1. **Nunca migrar** (rejected): custo managed escala; a partir de certa dimensão, self-host fica mais económico e perder essa optimização é injustificável.
2. **Migrar assim que possível** (rejected): custo de oportunidade (ops distraindo de produto) supera poupança actual com poucos clientes.
3. **Migrar apenas quando trigger objectivo disparar, com plano pré-documentado** (chosen).

## Decision Outcome

Migrar de Supabase managed para self-host **apenas** quando pelo menos um dos seguintes triggers ocorrer:

- Custo managed mensal total ultrapassar **80 EUR** em 3 meses consecutivos.
- Número de agências activas ultrapassar **15**.
- Cliente enterprise exigir on-premises em contrato assinado.

Plano de migração a documentar antes de executar, cobrindo:

- Snapshot do Postgres produtivo e restore no target self-host.
- Dual-write temporário (ou janela de read-only) durante cut-over.
- Validação completa de RLS policies no ambiente target.
- Re-emissão de JWT tokens se a signing key mudar (forçar re-login).
- Janela de downtime planeada fora de horas úteis, máximo 2h.
- Rollback plan com threshold claro (ex.: se erro rate pós-migração >1% durante primeira hora, rollback).
- Smoke tests de todos os fluxos críticos antes de liberar tráfego.

## Consequences

### Positive

- Decisão deixa de ser ansiogénica: trigger objectivo remove ambiguidade.
- Equipa foca em produto até o trigger disparar.
- Plano documentado reduz risco quando chegar a altura de executar.
- Transparência com stakeholders (sócios sabem o critério).

### Negative

- Se trigger disparar de forma inesperada (ex.: cliente enterprise surpresa), equipa tem pouca margem para executar com calma.
- Manter "prontidão" exige revisar o plano periodicamente (pelo menos trimestralmente).
- Decisão pode ser contornada por pressão de custos antes de qualquer trigger disparar, se alguém decidir "optimizar já".

## Links

- **dependsOn:** [ADR-0001](0001-plano-supabase-fase-1.md)
