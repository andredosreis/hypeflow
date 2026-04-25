---
status: Proposed
date: 2026-04-22
decider: Andre dos Reis (Engenheiro de Software)
tags: [infrastructure, database, cost]
supersedes: null
amends: null
---

# ADR-0001: Plano Supabase para Fase 1 (Pro vs Free vs self-host)

## Context and Problem Statement

Estado anterior (Idle): projecto em dev/demo rodando sobre Supabase Free Tier. Evento de mudança: aproximação de GA com 3 ou mais clientes reais da agência a usar diariamente, o que requer backups diários, ausência de pausa por inactividade, compute dedicado e maior capacidade de DB e egress.

Limitações do Free Tier que forçam a decisão:

- DB limitado a 500MB (atinge em 6 a 12 meses com múltiplos clientes e volume realista de `lead_interactions`).
- Egress 5GB/mês (Realtime subscriptions e dashboards com muitas queries consomem rapidamente).
- Pausa automática após 1 semana de inactividade (inaceitável em produção).
- Sem backups diários (apenas PITR em plano Pro).
- Shared compute (queries agregadas ficam lentas sob carga).
- Edge Functions com 500k invocações/mês (atinge com motor de automação activo).

## Decision Drivers

- Disponibilidade e SLA de 99.5% em produção.
- Backups diários obrigatórios para dados comerciais sensíveis (GDPR).
- Custo previsível até 10-15 clientes.
- Baixo esforço operacional (não queremos gerir infra nesta fase).
- Caminho de migração possível se o custo crescer.

## Considered Options

1. **Continuar no Free Tier com optimizações agressivas** (rejected): particionamento, retenção curta e limitar Realtime estendem por meses, mas não resolvem pausa por inactividade nem backups. Risco inaceitável em produção.
2. **Self-host Supabase no VPS imediatamente** (rejected agora, adiado para ADR-0003): ops não trivial (backups manuais, monitoring, updates de segurança, certificados TLS), Edge Functions self-host menos maduras. Tempo de setup e risco inicial não justificam numa fase em que equipa deve focar em produto.
3. **Supabase Pro** (chosen): 25 EUR/mês por projecto, 8GB DB, 250GB egress, backups diários com PITR, compute dedicado, sem pausa.

## Decision Outcome

Adoptar **Supabase Pro** para a Fase 1 do HYPE Flow OS.

Reavaliar migração para self-host quando custo mensal total (incluindo add-ons como compute maior ou read replicas) ultrapassar 80 EUR/mês de forma recorrente, ou quando número de agências activas superar 15, ou quando cliente enterprise exigir on-prem em contrato. Formalização dessa decisão em [ADR-0003](0003-estrategia-migracao-self-host.md).

## Consequences

### Positive

- Zero ops para DB, Auth, Realtime, Storage e Edge Functions.
- Backups diários e point-in-time recovery incluídos.
- Compute dedicado melhora queries agregadas de dashboards.
- Upgrade para plano superior (Team, Enterprise) sem migração estrutural.
- Equipa foca em produto, não em infra.

### Negative

- Custo mensal fixo que cresce com número de projectos e add-ons.
- Dependência forte de fornecedor único (Supabase).
- Limites superiores (add-ons cobrados separadamente) podem surpreender em escala.
- Migração futura para self-host requer ADR e plano dedicados; não é trivial.

## Links

- **relatesTo:** [ADR-0003](0003-estrategia-migracao-self-host.md)
