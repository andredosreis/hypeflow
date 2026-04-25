---
status: Proposed
date: 2026-04-22
decider: Andre dos Reis (Engenheiro de Software)
tags: [database, gdpr, performance]
supersedes: null
amends: null
---

# ADR-0008: Retenção de `lead_interactions` (sem particionamento até 500k linhas)

## Context and Problem Statement

Estado: a tabela `lead_interactions` cresce linearmente com a actividade comercial (aproximadamente 5 a 10 interacções por lead). Para 500 mil leads, pode ultrapassar 5 milhões de linhas. Evento que força decisão: necessidade de política de retenção para garantir performance de queries da timeline e compliance GDPR.

## Decision Drivers

- Performance da timeline da lead (query por `lead_id` paginada).
- Performance de queries agregadas (dashboard, funnels).
- Compliance GDPR (retenção justificável e direito ao esquecimento).
- Custo de storage e backup.
- Complexidade operacional.

## Considered Options

1. **Particionamento mensal desde o dia 1** (rejected): overhead de gestão (criação automática de novas partições, manutenção) sem benefício real no volume inicial.
2. **Retenção curta (6 meses) com `DELETE` automático** (rejected): apaga histórico valioso para análise de conversion attribution e performance histórica por agente.
3. **Sem particionamento na Fase 1; reavaliar aos 500 mil linhas de `lead_interactions`** (chosen).

## Decision Outcome

Política de retenção por tabela:

- **`lead_interactions`**: retenção indefinida na Fase 1. Trigger automático de alerta quando tabela passa 400 mil linhas: iniciar planning de particionamento mensal (`PARTITION BY RANGE (created_at)`). Aos 500 mil linhas, executar migração. Índice composto `(lead_id, created_at DESC)` obrigatório desde dia 1 para manter queries de timeline performantes.
- **`audit_logs`**: retenção de 2 anos. Purga mensal via `pg_cron`.
- **`webhook_failures`**: retenção de 30 dias. Purga diária via `pg_cron`.
- **`leads`**: retenção indefinida; anonimização via GDPR Art. 17 endpoint.

**Direito ao esquecimento (GDPR Art. 17):** endpoint `DELETE /api/leads/:id` autenticado com role `agency_admin` que:

1. Executa transacção única.
2. Apaga `leads` (cascata para `lead_interactions` via FK `ON DELETE CASCADE`).
3. Anonimiza rows relacionadas em `audit_logs` (preserva histórico mas remove PII).
4. Apaga `webhook_failures` relacionados se existirem.
5. Regista acção em `audit_logs` com `user_id` do operador.

## Consequences

### Positive

- Simplicidade operacional inicial (nenhum particionamento).
- Histórico comercial completo preservado para análise de ROI, atribuição multi-touch e performance por agente.
- Compliance GDPR explicitada com endpoint dedicado.
- Retenção de `audit_logs` cobre window típica de auditoria externa.

### Negative

- Migração futura para tabela particionada não é trivial (requer locks breves, testes cuidados).
- Sem o índice composto `(lead_id, created_at DESC)`, aos 500 mil linhas as queries de timeline ficam lentas. Requisito técnico desde dia 1.
- Backups crescem indefinidamente. Mitigação: Supabase Pro inclui retenção de backups com rotação; avaliar archive para cold storage aos 10 milhões de linhas.
- Direito ao esquecimento em transacção única pode lockar tabelas grandes brevemente; aceitável para operação rara.

## Links

- **relatesTo:** [ADR-0011](0011-postgres-source-of-truth.md)
