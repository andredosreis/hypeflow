---
status: Proposed
date: 2026-04-22
decider: Andre dos Reis (Engenheiro de Software)
tags: [observability, sla]
supersedes: null
amends: null
---

# ADR-0018: SLIs/SLOs formais com error budget policy

## Context and Problem Statement

Estado: o HLD declara metas informais de disponibilidade (99.9% para webhooks inbound, 99.5% para tRPC interno) e latências p95 alvo. Evento: sem SLOs formais e error budget policy, decisões de "ship feature" vs "focar em reliability" viram subjectivas e arbitrárias.

## Decision Drivers

- Critério objectivo para decisões de release.
- Alinhamento entre product pressure e reliability.
- Transparência perante stakeholders (sócios, clientes, equipa).
- Ciclo de feedback saudável (quando apertar SLO, quando relaxar).

## Considered Options

1. **Sem SLOs formais** (rejected): decisões viram subjectivas; reliability tende a ser sacrificada em pressão.
2. **SLOs globais apenas para o OS inteiro** (rejected): demasiado grossos; não orientam decisões por componente ou área.
3. **SLOs por componente/interface com error budget policy** (chosen).

## Decision Outcome

Definir SLOs iniciais (sujeitos a revisão trimestral após baseline):

| SLI | SLO | Janela | Budget mensal (downtime) |
|---|---|---|---|
| Disponibilidade webhook inbound (200 ou 4xx count como sucesso) | 99.9% | mensal | aproximadamente 44 min |
| Disponibilidade tRPC interno | 99.5% | mensal | aproximadamente 3h30min |
| Latência p95 tRPC | menor que 500 ms | 30 dias | n/a |
| Latência p95 webhook ack | menor que 300 ms | 30 dias | n/a |
| Integridade (cross_tenant_attempts com sucesso) | 0 | mensal | 0 (qualquer ocorrência é incidente P0) |

**Error budget policy:**

- Budget consumido abaixo de 50% → **Modo verde**: releases normais, foco em features.
- Budget consumido entre 50% e 100% → **Modo amarelo**: releases requerem aprovação explícita do responsável de engenharia; foco em reliability paralelo ao roadmap.
- Budget consumido acima de 100% → **Modo vermelho**: **congelamento de releases** até próximo reset mensal; apenas bugfixes e melhorias de reliability são deployados.

**Revisão:**

- Trimestral: revisitar SLOs com base em dados reais (apertar se consistentemente acima, relaxar se consistentemente abaixo).
- Após cada incidente P0 ou P1: post-mortem avalia impacto no budget e aprendizagens.

**Medição:**

- SLIs calculados a partir de métricas em [ADR-0017](0017-stack-observabilidade.md).
- Dashboard Axiom dedicado mostra budget consumido e trend.

## Consequences

### Positive

- Disciplina objectiva: pergunta "posso fazer release?" tem resposta baseada em dados.
- Alinhamento automático entre product pressure e reliability (budget balance).
- Dados para conversas com clientes sobre SLA contractual futuro.
- Incentivo claro para investir em reliability quando o budget estiver a ser consumido.

### Negative

- Requer baseline actual para calibrar SLOs (primeiro mês em "observação" antes de aplicar enforcement).
- Pode frustrar pressão de product em períodos de budget baixo.
- Incidentes P0 consomem budget rapidamente; um único incidente mal dimensionado pode congelar releases.
- Exige discipline na implementação dos SLIs (instrumentação correcta, contagem de sucessos e falhas).

## Links

- **dependsOn:** [ADR-0017](0017-stack-observabilidade.md)
