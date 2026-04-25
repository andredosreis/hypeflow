---
status: Accepted
date: 2026-04-22
decider: Andre dos Reis (Engenheiro de Software)
tags: [backend, database, concurrency]
supersedes: null
amends: null
---

# ADR-0015: Optimistic concurrency via coluna `updated_at`

## Context and Problem Statement

Estado: múltiplos agentes podem editar a mesma lead em paralelo. Cenários concretos:

- Dois gestores fazem bulk reassign simultâneo incluindo a mesma lead.
- Mesmo agente edita perfil da lead em duas tabs do browser.
- Automação do Automation Builder actualiza lead enquanto agente está a editar.

Evento: sem controlo de concorrência, a última escrita sobrescreve silenciosamente a anterior (last-write-wins), perdendo trabalho.

## Decision Drivers

- Detecção de conflitos (não silenciar last-write-wins).
- Performance: evitar locks pessimistas que bloqueiam throughput.
- Simplicidade de implementação.
- UX: feedback claro ao utilizador quando ocorre conflito.

## Considered Options

1. **Sem controlo (last-write-wins)** (rejected): dados sobrescritos silenciosamente; erros sérios e invisíveis em bulk actions e em sessões multi-tab.
2. **Pessimistic locking (`SELECT FOR UPDATE`)** (rejected): reduz throughput; arriscado em UI (se a tab fecha antes de commit, o lock pode ficar preso até timeout; mau para UX).
3. **Optimistic concurrency via coluna `updated_at`** (chosen).

## Decision Outcome

Usar a coluna `updated_at` (que já existe em `leads`, `lead_interactions`, `clients` e outras) como **version stamp** para optimistic concurrency:

- Cliente lê o registo e recebe `updated_at` como parte do payload.
- Ao submeter mutation, cliente envia `updated_at` de volta como parte do input Zod.
- Server executa `UPDATE leads SET ... WHERE id = $1 AND updated_at = $2` (match exacto de timestamp).
- Se `rows_affected = 0`, significa que outro caller actualizou entretanto. Retorna **409 Conflict** com o payload actual do registo para o cliente reconciliar.
- Se `rows_affected = 1`, mutation aplicada com sucesso; `updated_at` actualizado atomicamente no mesmo UPDATE.

**Aplicação:** mutations com risco de concorrência (perfil da lead, assign, bulk reassign, mudança de stage). Consultas read-only não precisam.

**UX:** UI trata 409 com banner de aviso e botão "Atualizar e reconciliar" que faz refetch + permite re-aplicar alterações.

## Consequences

### Positive

- Detecta conflitos sem bloquear (throughput preserva-se).
- Usa coluna que já existe em todos os schemas (zero migration).
- UX clara: utilizador vê claramente que houve conflito e decide.
- Semântica standard (pattern conhecido, fácil de entender).

### Negative

- UI tem de tratar 409 em cada mutation de escrita (boilerplate).
- Bulk operations precisam de optimistic check por linha; algumas podem falhar e exigir retry parcial.
- Dois clients editando exactamente em simultâneo (mesmo ms): um ganha, outro vê 409. Aceitável.
- Se clock do server mudar por ajuste NTP, há teórico risco de colisão; mitigado por comparação exacta de timestamp (não baseada em cálculo).

## Links

- **relatesTo:** null
