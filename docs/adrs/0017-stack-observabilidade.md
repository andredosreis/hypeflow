---
status: Proposed
date: 2026-04-22
decider: Andre dos Reis (Engenheiro de Software)
tags: [observability]
supersedes: null
amends: null
---

# ADR-0017: Stack de observabilidade (Axiom)

## Context and Problem Statement

Estado: o HYPE Flow OS precisa de logs estruturados, métricas, tracing distribuído e alertas para operação em produção. Evento: escolha de stack afecta custo, curva de aprendizagem, integração com Vercel/Supabase e qualidade da UI de investigação de incidentes.

## Decision Drivers

- Custo mensal para o volume esperado na Fase 1.
- Integração nativa com Next.js + Vercel.
- Facilidade de setup (horas, não dias).
- Qualidade da UI para investigação de incidentes (logs, traces, dashboards).
- Retenção configurável (mínimo 30 dias para debugging).
- Integração com OpenTelemetry (standard).

## Considered Options

1. **Datadog** (rejected para Fase 1): feature set completo (APM, RUM, logs, metrics, traces) mas preço de entrada alto (mais de 100 EUR/mês mesmo em volumes pequenos); overkill para esta fase.
2. **Grafana Cloud (gerido)** (rejected): flexível mas exige setup e configuração não triviais (Prometheus, Loki, Tempo); maior curva.
3. **Baselime** (rejected agora): bom mas menos maduro em certos aspectos; manter como opção de fallback.
4. **Axiom** (chosen): integração nativa com Vercel Log Drain, pricing simples baseado em volume, UI consolidada para logs/métricas/traces.

## Decision Outcome

Adoptar **Axiom** como stack principal de observabilidade na Fase 1:

- **Logs:** Vercel Log Drain aponta para dataset Axiom `hypeflow-prod`. Logs estruturados em JSON com campos obrigatórios (`level`, `ts`, `correlation_id`, `user_id` hashed, `agency_id`, `component`, `event`, `message`).
- **Métricas:** endpoint `/api/metrics` em formato Prometheus scraped por Axiom, ou push directo via SDK.
- **Tracing:** OpenTelemetry SDK com exporter para Axiom. Em avaliação durante primeiro mês; se integração OTEL ficar aquém, fallback para Baselime.
- **Dashboards:** criados nativamente em Axiom (um por área: Saúde do módulo, Ingestão, Segurança, Capacity).
- **Alertas:** Axiom alerts com integração Slack (webhook para `#alerts-hypeflow`) e email para ons-call.

**Retenção:** 30 dias em produção; preview e staging 7 dias.

**Revisar** quando custo mensal passar 50 EUR/mês ou quando surgir requisito que Axiom não suporte (ex.: APM detalhado de queries Postgres).

## Consequences

### Positive

- Setup em horas graças à integração nativa com Vercel.
- Custo baixo para o volume inicial.
- Uma única UI para logs, métricas e tracing (menos context switch).
- Pricing previsível baseado em volume.

### Negative

- Lock-in com Axiom: migração futura requer reescrita de dashboards, alertas e queries.
- Features avançadas (APM profundo, RUM, synthetic monitoring) ausentes ou limitadas face a Datadog.
- Integração OTEL ainda em evolução no Axiom; pode ter limitações que obriguem a tracing alternativo.
- Exige discipline para escrever logs estruturados correctos (lint rule recomendada).

## Links

- **relatesTo:** [ADR-0018](0018-slos-error-budget.md)
