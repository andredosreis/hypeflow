# PRD: Automation Builder

**Versão:** 1.0
**Data:** 2026-04-21
**Tipo:** PRD de módulo
**Responsável:** Morgan (@pm) · Aria (@architect)
**Status:** Draft — Aguarda validação @po
**PRD Macro:** [hypeflow-os-prd.md](../hypeflow-os-prd.md)

---

## Resumo

O **Automation Builder** é o motor nativo de regras de automação do HYPE Flow OS. Permite à equipa da agência definir, sem código, regras do tipo `Trigger → Condições → Acções` para reagir automaticamente a eventos do CRM (nova lead, mudança de fase, call marcada, lead sem contacto, score alterado, etc.). É o que evita que a agência tenha de manter scripts ad-hoc em n8n ou configurações duplicadas em GHL para casos simples, e é o complemento nativo que se integra com n8n/GHL/ManyChat para casos complexos.

O módulo é entregue dentro do app `apps/hypeflow` (Next.js 14, route group `(admin)`) com um editor visual em `/admin/automacoes`, lógica de negócio em tRPC (`server/routers/admin/automacoes/automations.ts` + `workflows.ts`), persistência em `automation_rules` + `automation_logs` via Supabase, e execução assíncrona numa Edge Function (`supabase/functions/automation-engine`). O valor-chave é reduzir trabalho manual repetitivo (ex.: "sempre que lead entra em Qualificada → notificar agente e enviar WhatsApp de follow-up"), com logs auditáveis de cada execução.

---

## 1. Contexto e Problema

### 1.1 Motivação e importância

A operação da HYPE Flow tem padrões de follow-up repetitivos: quando uma lead muda para determinada fase, a equipa quer **sempre** notificar o agente, mover tags, enviar mensagens ou disparar webhooks. Sem automação, três problemas surgem:

- **Esquecimento humano:** gestores esquecem-se de notificar agentes quando leads entram em fases importantes.
- **SLA violado:** "lead em fase X há mais de 48h" não tem gatilho automático → leads esquecidas (cenário que afecta directamente o KPI "leads sem follow-up >48h" do PRD macro).
- **Duplicação entre plataformas:** para cada regra simples, a equipa cria um workflow no n8n ou GHL, consumindo créditos/tempo mesmo quando a regra é trivial.

Ter automações nativas dentro do OS resolve os três problemas e mantém n8n/GHL livres para workflows complexos (multi-sistema, enriquecimento de dados, IA).

### 1.2 Público-alvo

- **Gestor Comercial / Admin** — cria e edita regras
- **Agente Comercial** — consumidor passivo (recebe notificações, vê efeito das regras)
- **Account Manager** — cria regras por cliente (ex.: "cliente imobiliário X quer WhatsApp imediato em qualquer nova lead")
- **Tráfego Manager** — usa trigger `score_changed` para reagir a qualidade de lead por canal

### 1.3 Cenários de uso principais

1. **Notificação por mudança de fase:** "quando lead entra em Qualificada → notificar agente atribuído + adicionar tag `prioridade_alta`".
2. **SLA de follow-up:** "se lead fica em Nova sem contacto >48h → reatribuir a pool + notificar gestor".
3. **Sequência de WhatsApp:** "quando nova lead de Facebook entra → enviar WhatsApp template X, se não resposta em 2h → template Y".
4. **Delegação externa:** "quando lead atinge score >80 → disparar webhook para n8n que enriquece via Clearbit e regista no GHL".
5. **Trigger manual:** "correr esta regra em bloco sobre todas as leads frias dos últimos 30 dias" (Wave 8 — reactivation gallery).

### 1.4 Local de implantação

- **UI:** `apps/hypeflow/app/(admin)/admin/automacoes/`
- **tRPC router:** `apps/hypeflow/server/routers/admin/automacoes/automations.ts` + `workflows.ts` (domain-based, Wave 19)
- **Edge Function (executor):** `supabase/functions/automation-engine/index.ts`
- **API AI helper:** `apps/hypeflow/app/api/ai/automation/route.ts` (sugere regras via AI)
- **Persistência:** tabelas `automation_rules`, `automation_logs` em Supabase (migrations 0001, 0002, 0003)
- **Realtime:** `automation_logs` publicado em `supabase_realtime` para dashboards live

### 1.5 Problemas a resolver

- Regras dispersas em sistemas externos (duplicação de fonte de verdade)
- Falta de auditoria: "esta lead recebeu WhatsApp? quando? porquê?" sem logs centralizados
- Triggers temporais (SLA, inactividade) inexistentes no CRM base
- Barreira técnica para utilizadores não-devs criarem automações simples

---

## 2. Objetivos e Métricas

| Objetivo | Métrica | Meta |
|----------|---------|------|
| Reduzir tempo manual em follow-up repetitivo | Horas/semana da equipa gastas em notificações manuais | ≤ 2h/semana (baseline antes do GA) |
| Eliminar leads sem follow-up por esquecimento | % leads que disparam regra de "SLA vencido" automaticamente | ≥ 98% dos casos qualificáveis |
| Auditabilidade de acções automáticas | % execuções com entrada em `automation_logs` | 100% |
| Confiabilidade de execução | Taxa de sucesso (`status = 'success'` em `automation_logs`) | ≥ 95% |
| Tempo de execução de uma regra | Latência p95 (trigger → acção executada) | ≤ 5s para acções síncronas; ≤ 60s para acções com `delay_hours = 0` |
| Adopção interna | % equipas com ≥ 1 regra activa criada | ≥ 90% em 60 dias |

---

## 3. Escopo

### 3.1 Incluso

**Modelo de regras:**
- Entidade `automation_rule`: `trigger_type`, `trigger_config`, `conditions[]`, `actions[]`, `is_active`, `agency_id`, `client_id` (null = regra global da agência)
- Entidade `automation_log`: registo de cada execução (`status`, `trigger_data`, `actions_executed`, `error_message`)
- Escopos: regra global da agência ou regra específica por cliente

**Triggers suportados (Fase 1):**
- `lead_created` — nova lead inserida (qualquer fonte)
- `lead_stage_changed` — mudança de `pipeline_stage_id`
- `lead_no_contact` — lead sem interacção há X horas (temporal)
- `lead_lost` — mudança de status para `lost`
- `score_changed` — score cruza threshold configurável
- `call_scheduled` — call criada via módulo Calls
- `call_no_show` — call marcada como `no_show`

**Condições:**
- Operadores: `eq`, `neq`, `gt`, `lt`, `contains`, `in`
- Campos disponíveis: qualquer campo de `leads` e subset de `calls`
- Múltiplas condições combinadas com AND implícito (Fase 1); OR/NOT ficam para Fase 2

**Acções:**
- `send_whatsapp` — envio via integração (ManyChat ou WhatsApp Business API)
- `send_email` — envio transaccional
- `move_stage` — mover lead para nova fase de pipeline
- `assign_agent` — atribuir/reatribuir agente
- `add_tag` — adicionar tag à lead
- `create_task` — criar tarefa para agente
- `send_webhook` — dispara POST para URL externa (integração genérica)
- `notify_agent` — notificação in-app para agente atribuído
- `trigger_manychat_flow` — inicia fluxo ManyChat específico

**Execução:**
- `delay_hours` por acção (permite sequências temporais)
- Execução via Edge Function `automation-engine` invocada por triggers de DB ou por scheduler temporal
- Condições avaliadas em tempo de execução (não em tempo de criação da regra)
- Idempotência: mesma regra não executa duas vezes para mesmo evento

**UI — Editor visual (Waves 2, 3, 17, 18, 19):**
- Lista de regras com estado (activa/inactiva), contador de execuções, última execução
- Editor passo-a-passo: escolher trigger → condições → acções
- Editor inline de condições (Wave 18) — adicionar/remover sem mudar ecrã
- Resumo visual da regra em prosa ("Quando lead entra em Qualificada E score > 70, enviar WhatsApp X após 0h, notificar agente após 0h")
- Workflow Builder (Wave 19) — visualização em DAG para regras com múltiplas acções sequenciais

**Analytics do módulo:**
- Dashboard com: total de regras, regras activas, execuções hoje, taxa de sucesso, top 5 regras por execuções
- Log viewer filtrável por `rule_id`, período, status
- Logs em tempo real via Supabase Realtime

**AI helper (Wave 3):**
- Endpoint `POST /api/ai/automation` que sugere regra dada uma descrição em linguagem natural
- Output estruturado que o editor consome para pré-popular trigger/condições/acções

### 3.2 Fora do escopo (explícito)

- **Workflows multi-sistema complexos** (ex.: lead → enriquecer → CRM externo → Slack) — delegar a **n8n** via `send_webhook`
- **Fluxos conversacionais complexos** (multi-passo com branching) — delegar a **ManyChat** via `trigger_manychat_flow`
- **Automação de campanhas de ads** (pausar/activar campanhas) — fora do produto; vive no provider (Meta, Google)
- **Operador lógico OR / NOT** entre condições — Fase 2
- **Loops / iteração sobre colecções** — fora; delegar a n8n
- **Simulador "dry-run"** de regras antes de activar — Fase 2
- **Versionamento de regras** com rollback — Fase 2
- **Marketplace de templates públicos** — fora (templates internos apenas)
- **Execução em backend Node.js próprio** — execução vive em Supabase Edge Functions

---

## 4. Requisitos Funcionais

### FR-001 — Criar regra via editor visual

- UI em `/automacoes/new` com wizard de 3 passos: **Trigger → Condições → Acções**
- Selector de `trigger_type` mostra apenas os 7 triggers da Fase 1
- `trigger_config` é renderizado dinamicamente consoante o trigger (ex.: `lead_no_contact` pede número de horas)
- Validação client-side (Zod) + server-side (mesmo schema)
- Ao guardar, `is_active` default = `true`; gestor pode criar como draft (`is_active = false`)

### FR-002 — Editor inline de condições (Wave 18)

- Dentro do editor de regra, secção "Condições" permite adicionar/remover condições sem sair do ecrã
- Cada condição: dropdown de `field` → dropdown de `operator` → input de `value` tipado conforme o field
- Múltiplas condições combinam com AND
- Pré-visualização em prosa ("SE fase = Qualificada E score > 70")

### FR-003 — Sumário em prosa da regra

- Ao guardar ou pré-visualizar, UI gera descrição legível em PT:
  > "Quando uma lead muda para a fase **Qualificada**, se o score for maior que **70**, enviar WhatsApp usando template **Welcome** após **0 horas** e notificar o agente atribuído."

### FR-004 — Activar / desactivar regra

- Toggle na lista de regras e na página da regra
- Mudança propaga em ≤ 5s para o executor (Edge Function lê estado actual a cada invocação, não cache).
- Log de auditoria (quem mudou, quando) — guardado em `automation_logs` com `status = 'rule_toggled'`

### FR-005 — Execução do motor

- Triggers DB-based (`lead_created`, `lead_stage_changed`, `score_changed`, `lead_lost`, `call_scheduled`, `call_no_show`) invocam a Edge Function `automation-engine` via Postgres trigger ou via hook no tRPC mutation.
- Trigger `lead_no_contact` corre por scheduler cron (a cada 5min).
- Motor busca `automation_rules` activas para o par `(agency_id, client_id)` ou `(agency_id, NULL)`.
- Avalia `conditions` contra o lead actual (fetch completo da lead).
- Para cada acção, executa ou agenda (`delay_hours > 0` entra em fila).

### FR-006 — Idempotência

- Cada execução tem `execution_key = hash(rule_id + trigger_data.event_id)`.
- Antes de executar, verificar se já existe `automation_log` com mesmo `execution_key` e `status = 'success'` → skip.
- Garante que retry de webhook não duplica envios.

### FR-007 — Delay e scheduling

- Acção com `delay_hours > 0` regista em fila (`automation_queue` ou Supabase scheduled functions).
- Ao expirar delay, re-avalia condições — se lead já mudou de estado e condições já não batem, cancela acção (com log `status = 'cancelled_stale'`).
- Permite sequências: acção 1 (delay 0) + acção 2 (delay 2h) + acção 3 (delay 24h).

### FR-008 — Logging de execução

- Cada execução cria um `automation_log` com:
  - `rule_id`, `agency_id`, `lead_id` (se aplicável)
  - `trigger_data` (JSONB — payload do evento)
  - `actions_executed` (JSONB — array de `{ type, success, error? }`)
  - `status`: `success` | `partial_success` | `failed` | `cancelled_stale`
  - `error_message` (texto se `failed`)
  - `executed_at`

### FR-009 — Realtime dashboard

- Página `/automacoes` mostra:
  - Cards: total de regras, regras activas, execuções hoje, taxa de sucesso 30d
  - Top 5 regras por execuções
  - Stream live dos últimos 50 logs (Supabase Realtime subscription em `automation_logs`)

### FR-010 — Log viewer

- Página `/automacoes/logs` com:
  - Filtro por `rule_id`, período, `status`
  - Detalhe de cada log: trigger data, acções executadas, lead associada (link para perfil CRM)
  - Exportação CSV do subset filtrado

### FR-011 — Regras por cliente vs regras globais

- Criar regra com `client_id = X` → só dispara para leads desse cliente
- Criar regra com `client_id = null` → dispara para qualquer lead da agência (regra global)
- Quando um evento ocorre numa lead, o motor avalia **ambos** conjuntos (regras globais + regras específicas do cliente da lead)

### FR-012 — AI suggestion (opcional, Wave 3)

- Endpoint `POST /api/ai/automation` aceita `{ description: string }` em PT ou EN
- Responde com `{ trigger_type, trigger_config, conditions, actions }` como sugestão
- UI oferece botão "Sugerir regra com IA" que pré-popula o editor
- Utilizador valida/ajusta antes de guardar

### FR-013 — Workflow Builder (Wave 19)

- Visualização DAG de regra com múltiplas acções
- Arestas representam `delay_hours` (label com tempo)
- Nós coloridos por tipo de acção
- Permite reorder drag-and-drop (actualiza ordem em `actions[]`)

### FR-014 — Preview de impacto antes de activar

- Ao activar regra nova, UI mostra preview: "Esta regra afectaria X leads actuais com base nos triggers e condições"
- Count calculado server-side (query simulada)
- Não executa acções — apenas mostra count
- Permite à equipa evitar regras mal configuradas que afectariam centenas de leads

### FR-015 — RLS

- Utilizadores só vêem regras e logs do seu `agency_id`
- Utilizador do portal (cliente) **não** vê automações (fora do escopo do portal na Fase 1)
- Edge Function usa `SUPABASE_SERVICE_ROLE_KEY` para executar cross-tenant com cuidado — todos os queries filtram por `agency_id` explicitamente

---

## 5. Requisitos Não Funcionais

### 5.1 Performance
- Tempo de execução de uma regra (trigger → acção síncrona), p95 ≤ 5s
- Avaliação de condições: O(n) com n = número de condições por regra; < 10ms para n ≤ 10
- Dashboard `/automacoes` carrega em ≤ 1.5s com até 500 regras

### 5.2 Disponibilidade
- Edge Function ≥ 99.5% (mesmo SLA da plataforma)
- Fila de delays persistente — reinício do scheduler não perde jobs pendentes
- Retry com backoff: 3 tentativas para acções externas (webhook, email, WhatsApp) antes de marcar `failed`

### 5.3 Segurança
- Webhooks outbound: validação da URL (apenas HTTPS; opcional allowlist por agência)
- Payload do webhook não inclui PII em texto claro por default — configurável por regra
- Rate limiting por agência: máx. 1000 acções/hora (Fase 1); configurável por plano
- Assinatura HMAC nos webhooks outbound (opcional por regra)

### 5.4 Observabilidade
- Métricas:
  - `automation_executions_total{agency, rule_id, status}`
  - `automation_action_duration_ms{action_type}`
  - `automation_queue_depth` (jobs pendentes com delay)
- Logs estruturados JSON com `correlation_id` por execução
- Tracing: spans `automation.trigger`, `automation.evaluate_conditions`, `automation.execute_action`
- Alertas: `status = 'failed'` > 10% em janela de 1h → alerta para Slack da agência

### 5.5 Confiabilidade
- Inserção de `automation_log` é write-first, antes de executar acções → garante que falhas catastróficas têm trace
- Acções dentro de uma regra são executadas em ordem sequencial (não paralela) — simplifica debugging
- Se uma acção falha, as seguintes continuam (comportamento "best-effort") e `status = 'partial_success'`

### 5.6 Acessibilidade
- Editor visual WCAG 2.1 AA — navegação por teclado em todo o wizard
- Screen reader friendly na pré-visualização em prosa

---

## 6. Arquitetura e Abordagem

```
┌─────────────────────────────────────────────────────────────┐
│            UI — apps/hypeflow, route group (admin)          │
│  /admin/automacoes     /admin/automacoes/new (editor)       │
│  /admin/automacoes/[id]  /admin/automacoes/logs             │
└─────────────────────┬───────────────────────────────────────┘
                      │ tRPC
                      ▼
┌─────────────────────────────────────────────────────────────┐
│        tRPC Router: automations                             │
│  list / getById / create / update / getLogs / stats         │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│       Supabase Postgres                                     │
│  automation_rules  ◄──trigger──  leads / calls / events     │
│  automation_logs   ◄──realtime── Dashboard                  │
└─────────────────────┬───────────────────────────────────────┘
                      │  invoke on mutation
                      ▼
┌─────────────────────────────────────────────────────────────┐
│       Edge Function: automation-engine                      │
│  1. Fetch active rules for (agency_id, client_id)           │
│  2. Evaluate conditions against lead                        │
│  3. Execute actions (sync) or enqueue (delay > 0)           │
│  4. Write automation_log                                    │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│              Action Handlers                                │
│  ManyChat · WhatsApp BA · Email · Webhook · in-app notif    │
│  Supabase mutations (move_stage, assign_agent, add_tag)     │
└─────────────────────────────────────────────────────────────┘
```

**Decisão central:** Edge Function em vez de backend Node.js próprio — alinhado com Supabase-first, menor ops, escala automática.

---

## 7. Decisões e Trade-offs

| Decisão | Justificativa | Trade-off |
|---------|---------------|-----------|
| **Execução em Supabase Edge Function (Deno)** | Stack alinhado com Supabase-first; escala automática; menor ops | Dependência adicional do Deno runtime; debugging mais difícil que Node |
| **AND implícito entre condições (Fase 1)** | 95% dos casos práticos são AND; editor UI simples | Casos OR/NOT ficam fora — mitigado por criar regras separadas |
| **`delay_hours > 0` via fila Supabase** | Persistente, sobrevive a reinícios | Precisão ±5 min (não sub-second) — aceitável para o domínio |
| **Acções sequenciais (não paralelas)** | Debugging linear; ordem determinística | Regras com 10+ acções mais lentas — aceitável |
| **Condições avaliadas em execução, não na criação** | Lead pode ter mudado entre gatilho e execução — re-avaliar evita acções stale | Custo de query adicional por execução — mitigado com cache curto |
| **Delegação a n8n/GHL/ManyChat para casos complexos** | Não reinventar orquestradores maduros | Utilizador tem de aprender 2 sistemas para caso completo — mitigado com docs "quando usar cada" |
| **Regras globais vs por cliente (sem hierarquia profunda)** | Simples; cobre 95% dos casos | Não suporta "regras da agência que o cliente pode override" — Fase 2 se necessário |

---

## 8. Dependências

### 8.1 Técnicas
- Tabelas: `automation_rules`, `automation_logs`, `leads`, `calls`, `clients`, `users`
- Supabase Edge Functions runtime (Deno)
- Supabase Realtime (publication `supabase_realtime` em `automation_logs`)
- Postgres triggers em `leads` para disparar o motor em mutations (ou invocação via tRPC mutations)
- Scheduler cron (Supabase scheduled functions ou pg_cron)

### 8.2 Externas
- **ManyChat API** — para `send_whatsapp` via fluxos ou `trigger_manychat_flow`
- **WhatsApp Business API** (Fase 2) — alternativa directa a ManyChat
- **Provider de email transaccional** (Resend, Postmark, SendGrid — a definir por @devops)
- **AI API** (OpenAI, Claude, Anthropic) — para FR-012 AI suggestion

### 8.3 Organizacionais
- **@devops** para configurar scheduler cron e provider de email transaccional
- **@architect** para validar decisão de Edge Function vs backend Node

### 8.4 Outros módulos HYPE Flow
- **[CRM & Leads](./crm-leads-prd.md)** — source of truth de `leads`; emite eventos de mutação
- **[Pipeline & Kanban](./pipeline-kanban-prd.md)** — emite `lead_stage_changed`
- **[Calls & Meet](./calls-meet-prd.md)** — emite `call_scheduled`, `call_no_show`
- **[Form Builder](./form-builder-prd.md)** — submissões podem disparar regras via `lead_created`
- **[Notificações](./notifications-prd.md)** — consome `notify_agent` para entregar in-app notifications
- **[Integrações Externas](./integracoes-externas-prd.md)** — handlers de `send_webhook`, `trigger_manychat_flow`

---

## 9. Fluxo do Usuário (User Flow)

### Cenário A — Gestor cria regra "SLA de lead nova"

1. Gestor abre `/automacoes` e clica "Nova Regra".
2. Passo 1 — Trigger: escolhe `lead_no_contact`, preenche "horas sem contacto = 48".
3. Passo 2 — Condições: adiciona `status eq 'new'`.
4. Passo 3 — Acções: adiciona `assign_agent` (pool default) + `notify_agent` (gestor).
5. Pré-visualização mostra: "Quando uma lead ficar 48h sem contacto e estado for Nova, reatribuir à pool e notificar o gestor."
6. Sistema calcula FR-014: "Esta regra afectaria 23 leads actuais". Gestor confirma.
7. Regra guardada com `is_active = true`.
8. Dentro de 5min, scheduler detecta 23 leads e executa — 23 `automation_logs` criados.

### Cenário B — Evento trigger a regra

1. Agente regista interacção, lead move de "Nova" para "Qualificada" (mutation tRPC).
2. Mutation invoca Edge Function `automation-engine` com `trigger_type = 'lead_stage_changed'` e payload da lead.
3. Motor busca regras activas para `(agency_id, client_id) OR (agency_id, NULL)` com `trigger_type = 'lead_stage_changed'`.
4. Encontra 2 regras — avalia condições:
   - Regra A: condição `new_stage = 'qualified'` bate → executa acções (enviar WhatsApp + add tag)
   - Regra B: condição `score > 90` não bate → skip
5. Regra A: acção 1 (`add_tag`) executa imediatamente; acção 2 (`send_whatsapp`, delay 0h) chama ManyChat API.
6. Ambas bem sucedidas → log com `status = 'success'`.
7. Dashboard `/automacoes` incrementa "execuções hoje" via Realtime.

### Cenário C — Log viewer debug

1. Gestor nota que WhatsApp não chegou a uma lead.
2. Abre perfil da lead → secção "Timeline" mostra evento "Automação executada: regra X".
3. Click → navega para `/automacoes/logs?rule_id=X&lead_id=Y`.
4. Vê log: `status = 'partial_success'`, acção 1 ok, acção 2 (ManyChat) falhou com `error_message = "Invalid flow ID"`.
5. Volta à regra, corrige flow ID, testa em outra lead.

---

## 10. Riscos e Mitigação

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| **Loop infinito** (regra que muda fase → dispara outra regra → muda fase de volta) | Média | Alto | Máx. profundidade de cascata = 5; detectar ciclos via `execution_key` + contador no payload |
| **Regra mal configurada afecta centenas de leads em segundos** | Média | Alto | FR-014 (preview de impacto) obrigatório antes de activar; rate limit por regra (100 exec/min) |
| **Webhook outbound chama URL maliciosa** | Baixa | Médio | Validação HTTPS + allowlist opcional por agência; SSRF protection no runtime da Edge Function |
| **Edge Function timeout (> 60s)** | Média | Médio | Acções síncronas limitadas a 5s cada; restante vai para fila com delay 0 |
| **Perda de jobs na fila de delays** | Baixa | Alto | Fila persistente em Postgres; testes de recovery; monitorização de `queue_depth` |
| **ManyChat API muda sem aviso** | Média | Médio | Adapter com testes de contrato; feature flag para desactivar `trigger_manychat_flow` sem downtime |
| **AI suggestion gera regra perigosa** | Média | Médio | Output da AI nunca activa regra directamente — utilizador tem de rever e guardar |
| **Volume de `automation_logs` degrada queries** | Alta (a prazo) | Médio | Particionamento mensal; retenção de 90d; índice composto `(agency_id, executed_at DESC)` |

---

## 11. Critérios de Aceitação

- [ ] FR-001 a FR-015 implementados e cobertos por testes
- [ ] Dashboard `/automacoes` carrega em ≤ 1.5s com 500 regras activas
- [ ] Execução de regra simples (trigger → 1 acção síncrona), p95 ≤ 5s
- [ ] Idempotência validada: disparar 100 eventos idênticos resulta em 100 logs mas cada acção executa uma vez só
- [ ] Delay de 2h validado em teste de integração (scheduler respeita tempo ±5 min)
- [ ] Preview de impacto (FR-014) mostra count correcto validado manualmente em 5 cenários
- [ ] Log viewer exporta CSV correcto com até 10k logs
- [ ] RLS: utilizador da agência A não vê regras da agência B
- [ ] Documentação "quando usar Automation Builder vs n8n vs GHL vs ManyChat" publicada
- [ ] QA gate @qa: PASS

---

## 12. Testes e Validação

### 12.1 Testes obrigatórios

**Unitários:**
- `evaluateConditions()` — tabela de casos por operador (eq, neq, gt, lt, contains, in)
- Geração de `execution_key` (idempotência)
- Prosa generator (FR-003) — cada trigger/acção gera texto correcto

**Integração:**
- Fluxo completo: criar regra → disparar evento → log correcto
- Delay de 2h — usar relógio fake para validar scheduler
- Retry de webhook — 3 tentativas com backoff
- FR-011: regra global aplicada ao lado de regra específica de cliente

**E2E (Playwright):**
- Wizard completo de criação de regra (3 passos)
- Preview de impacto correcto
- Activar/desactivar regra reflecte em ≤ 5s

**Carga:**
- 1000 eventos/min sustentados durante 10 min sem drop
- Dashboard com 500 regras + 10k logs carrega em ≤ 1.5s

**Segurança:**
- SSRF attempt em `send_webhook` com URL `http://169.254.169.254/` → bloqueado
- Rate limiting testado: 1001ª execução na mesma hora → `throttled`

### 12.2 Validação manual
- Gestor real cria 3 regras típicas em sessão de onboarding — medir tempo e feedback
- Log viewer usado para debug de caso real — validar utilidade

---

## 13. Referências

- **Código:**
  - `apps/hypeflow/app/(admin)/admin/automacoes/`
  - `apps/hypeflow/server/routers/admin/automacoes/automations.ts`
  - `apps/hypeflow/server/routers/admin/automacoes/workflows.ts`
  - `supabase/functions/automation-engine/index.ts`
  - `apps/hypeflow/app/api/ai/automation/route.ts`
- **Schema:** tabelas `automation_rules`, `automation_logs` em `docs/architecture/hypeflow-os-schema.md`
- **Migrations:** `0001_initial_schema.sql` (linhas 250-280), `0002_rls_policies.sql`, `0003_pixels_utms_tiktok.sql`
- **PRD Macro:** [../hypeflow-os-prd.md](../hypeflow-os-prd.md)
- **PRDs relacionados:** [crm-leads-prd.md](./crm-leads-prd.md)
- **Waves relevantes:** Wave 2 (visual editor), Wave 3 (score trigger + AI suggestion + segmentation), Wave 8 (reactivation template gallery), Wave 10 (real-time score trigger), Wave 17 (add lead modal with score preview), Wave 18 (inline conditions + rule summary), Wave 19 (Workflow Builder + domain reorganization)

---

## 14. Histórico de Revisões

| Versão | Data | Autor | Alterações |
|--------|------|-------|------------|
| 1.0 | 2026-04-21 | Morgan (@pm) · Aria (@architect) | Versão inicial. Consolidação do trabalho entregue nas Waves 2, 3, 8, 10, 17, 18, 19 em formato PRD de módulo seguindo padrão Rate Limiter. Pendente validação @po. |
