---
status: Accepted
date: 2026-04-22
decider: Andre dos Reis (Engenheiro de Software)
tags: [ux, performance, storage]
supersedes: null
amends: null
---

# ADR-0016: CSV export assíncrono em Supabase Storage (TTL 24h)

## Context and Problem Statement

Estado: exportação CSV de leads é funcionalidade comum (agentes e gestores exportam subsets filtrados para análise offline ou para campanhas externas). Evento: exports de grandes volumes (acima de aproximadamente 5 mil leads) podem causar timeout de request HTTP síncrono (limite típico do Vercel é 10 s para Edge / 60 s para Serverless) e consomem memória do server de forma significativa.

## Decision Drivers

- UX: feedback rápido ao utilizador, mesmo para volumes grandes.
- Fiabilidade: não falhar por timeout.
- Rastreabilidade: audit log de quem exportou o quê.
- Segurança: URL de download deve expirar para não ficar acessível indefinidamente.

## Considered Options

1. **Sempre síncrono** (rejected): timeout certo acima de volumes médios; memória do server pressionada.
2. **Streaming CSV directo no response HTTP** (rejected): complexo de testar; não permite notificar o utilizador quando estiver pronto; cliente tem de ficar com a tab aberta.
3. **Síncrono até threshold + job assíncrono com artefacto em Supabase Storage acima do threshold** (chosen).

## Decision Outcome

Política híbrida baseada no count estimado **antes** da exportação:

**Até 5 mil leads (síncrono):**

- Handler tRPC/route gera CSV em memória.
- Resposta HTTP com `Content-Type: text/csv; charset=utf-8` e `Content-Disposition: attachment; filename="leads-YYYY-MM-DD.csv"`.
- Encoding UTF-8 com BOM (abertura correcta em Excel).
- Audit log em `audit_logs`.

**Acima de 5 mil leads (assíncrono):**

- Ack imediato ao cliente: `{ export_id, status: 'queued', estimated_rows }`.
- Job disparado via Supabase Scheduled Function:
  1. Executa a query com paginação para evitar pressão de memória.
  2. Monta CSV em streaming para disco temporário.
  3. Upload para Supabase Storage no bucket `exports/`, path `{agency_id}/{export_id}.csv`.
  4. Gera URL assinada com TTL de **24 horas**.
  5. Envia notificação in-app ao utilizador (e opcionalmente email) com link de download.
- Lifecycle policy do Storage remove automaticamente ficheiros expirados.
- Audit log em `audit_logs` tanto ao gerar como a cada download do link.

**Bucket `exports/`** configurado com:

- RLS policy: objectos só acessíveis via URL assinada (não listáveis).
- Lifecycle: delete automático após 24 h.

## Consequences

### Positive

- UX clara em ambos os cenários (pequeno e grande).
- Não há timeouts em exports grandes.
- URL assinada expira automaticamente: reduz janela de exposição se link vazar.
- Audit log completo (quem pediu, quem descarregou, quando).
- Memória do server preservada (streaming + paginação).

### Negative

- Dois caminhos de código (síncrono e assíncrono) requerem testes em ambos.
- Dependência do Storage (entra no custo mensal do Supabase Pro).
- Utilizador precisa esperar notificação para exports grandes (latência maior).
- Threshold de 5 mil é heurístico; pode precisar de ajuste baseado em dados reais de performance.

## Links

- **relatesTo:** null
