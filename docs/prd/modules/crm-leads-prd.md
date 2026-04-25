# PRD: CRM & Gestão de Leads

**Versão:** 1.0
**Data:** 2026-04-21
**Tipo:** PRD de módulo
**Responsável:** Morgan (@pm) · Aria (@architect)
**Status:** Draft — Aguarda validação @po
**PRD Macro:** [hypeflow-os-prd.md](../hypeflow-os-prd.md)

---

## Resumo

O **CRM & Gestão de Leads** é o módulo-núcleo do HYPE Flow OS. É o ponto único de entrada e gestão de todas as leads captadas de qualquer fonte (paga, orgânica, manual, webhook externo) para todos os clientes de todas as agências, com isolamento total via RLS. Qualquer outro módulo do produto (Pipeline, Calls, Portal, Automações, Relatórios) consome o modelo de lead definido aqui — este PRD é, portanto, uma fundação sobre a qual os restantes dependem.

O módulo é entregue dentro do app `apps/hypeflow` (Next.js 14, route group `(admin)`), com lógica de negócio em tRPC (`server/routers/admin/crm/leads.ts`), persistência em PostgreSQL via Supabase e ingestão de leads externas via webhooks HTTP (`app/api/webhooks/ghl/`). O valor-chave para o utilizador interno é eliminar leads esquecidas, tornar o histórico de interacções auditável, e permitir triagem rápida por score e temperatura.

---

## 1. Contexto e Problema

### 1.1 Motivação e importância

Antes do OS, as leads da HYPE Flow viviam em folhas de cálculo partilhadas e caixas de entrada de email. Observámos três falhas recorrentes:

- **Leads perdidas:** leads entravam mas não eram atribuídas a nenhum agente; ficavam no limbo até serem esquecidas.
- **Origem desconhecida:** quando uma lead fechava, ninguém sabia dizer de que campanha tinha vindo → impossível calcular ROI real.
- **Triagem manual:** cada agente decidia por instinto o que era "lead boa" vs "má"; qualidade de triagem inconsistente entre agentes.

Sem CRM estruturado, o resto do produto (pipeline, calls, portal, automações) não tem como existir.

### 1.2 Público-alvo

- **Gestor Comercial** — vê todas as leads, atribui, faz acções em massa, monitoriza KPIs de equipa
- **Agente Comercial** — trabalha a sua lista atribuída, actualiza estado, regista interacções
- **Account Manager** — consulta leads dos seus clientes para responder a questões
- **Admin / Sócio** — visão global de volume, qualidade e conversão

### 1.3 Cenários de uso principais

1. **Ingestão contínua:** leads entram automaticamente de Meta Ads, Google Ads, TikTok, formulários públicos (Tally/Typeform), GHL, ManyChat.
2. **Triagem diária:** gestor abre lista filtrada, ordena por score/temperatura, atribui leads novas a agentes.
3. **Trabalho do agente:** agente abre a sua lista, escolhe próxima lead, faz contacto, regista outcome.
4. **Análise post-mortem:** ao fechar venda, agência identifica fonte/campanha/criativo original para optimizar investimento.
5. **Acções em massa:** reatribuição por fim de turno, mudança de status em bloco, exportação para CSV.

### 1.4 Local de implantação

- **UI (agência):** `apps/hypeflow/app/(admin)/admin/contactos/` e `apps/hypeflow/app/(admin)/admin/pipeline/`
- **API tRPC:** `apps/hypeflow/server/routers/admin/crm/leads.ts` (domain-based, reorganizado em Wave 19)
- **Webhooks inbound:** `apps/hypeflow/app/api/webhooks/ghl/` (GHL); rotas dedicadas para ManyChat e n8n
- **Persistência:** tabelas `leads`, `lead_interactions` em Supabase PostgreSQL
- **RLS:** policies em `supabase/migrations/0002_rls_policies.sql`
- **Portal (read-only):** `apps/hypeflow/app/(client)/client/leads/` consome subset filtrado por `client_id`

### 1.5 Problemas a resolver

- Leads sem agente atribuído ("órfãs")
- Origem e UTMs não rastreados
- Triagem subjectiva, sem score objectivo
- Duplicação de leads vindas de fontes diferentes
- Perda de histórico de interacções ao mudar de agente
- Impossibilidade de atribuir ROI à campanha certa (sem campaign_id ou UTM)

---

## 2. Objetivos e Métricas

| Objetivo | Métrica | Meta |
|----------|---------|------|
| Eliminar leads sem follow-up | % leads "new"/"qualifying" há >48h sem interacção | < 5% |
| Tornar triagem objectiva | % leads com score calculado em <5min após ingestão | ≥ 95% |
| Rastrear origem de 100% das leads | % leads com `source` preenchido | 100% |
| Rastrear campanha em leads pagas | % leads pagas com `campaign_id` ou UTMs completos | ≥ 90% |
| Minimizar duplicados | % duplicados detectados e merged / total leads | deduplicação ≥ 95% de precisão |
| Auditabilidade | % interacções registadas em `lead_interactions` vs registadas ad-hoc | ≥ 98% |
| Performance de listagem | Tempo de resposta da tabela com 10k leads, p95 | ≤ 800ms |

---

## 3. Escopo

### 3.1 Incluso

**Captura e ingestão:**
- Criação manual de lead via UI (modal "Adicionar Lead" com preview de score)
- Ingestão automática via webhooks (Tally, Typeform, GHL, Meta lead forms)
- Ingestão via APIs de providers (Meta, Google, TikTok) — referenciadas pelo módulo Tracking
- Deduplicação por email e telefone (normalizado)

**Modelo de dados:**
- Entidade `Lead` com contacto, origem, qualificação, pipeline, metadados
- Entidade `LeadInteraction` para histórico (call, email, whatsapp, nota, mudança de estado, reunião, tarefa)
- Associação a `Client`, `Agency`, `Agent`, `Campaign`, `PipelineStage`

**Triagem e qualificação:**
- Scoring automático 0-100 com recálculo em tempo real (Wave 10) ao registar nova interacção
- Preview ao vivo do score no modal de criação (Wave 17)
- Classificação por temperatura (cold/warm/hot) derivada do score + inputs manuais
- Tags livres (array)

**Operação diária:**
- Lista filtrada (fonte, status, score, data, agente, cliente)
- Perfil da lead com timeline de interacções (Wave 4)
- Atribuição individual e em massa a agentes
- Acções em massa: reatribuição, mudança de status, exportação CSV (Wave 14)
- Quick-actions no card do kanban: ligar, agendar call, WhatsApp, mover fase (Wave 11)

**Analytics do módulo:**
- Contador em tempo real de leads novas no dashboard (Wave 12)
- Funnel de conversão por fase (Wave 4, Wave 9)
- Atribuição de conversão à campanha/canal (Wave 9)
- Leaderboard de performance por agente (Wave 5)

**Integrações inbound:**
- Webhook GHL (contact, opportunity, form events) — Wave 16
- ManyChat (via `api/manychat/`)
- n8n (via `api/n8n/`)
- Tally & Typeform

### 3.2 Fora do escopo (explícito)

- **Edição de fases do pipeline** — vive no PRD `pipeline-kanban-prd.md`
- **Agendamento de calls** — vive no PRD `calls-meet-prd.md`
- **Gestão de campanhas de ads** — read-only neste módulo; vive no PRD `tracking-trafego-prd.md`
- **Envio outbound de WhatsApp** — Fase 2 (integração WhatsApp Business API)
- **Envio outbound de email marketing bulk** — fora do produto; integramos com terceiros
- **Editor visual de automações** — vive no PRD `automation-builder-prd.md`
- **Relatórios agendados** — vive no PRD `relatorios-analytics-prd.md` (Fase 2)
- **Chamadas VoIP dentro da plataforma** — fora do escopo; Meet é o canal para calls

---

## 4. Requisitos Funcionais

### FR-001 — Criação manual de lead

- Modal acessível a partir da página Comercial com botão "Adicionar Lead".
- Campos obrigatórios: `full_name`, `client_id`, `source`.
- Campos opcionais: `email`, `phone`, `company`, `campaign_id`, UTMs, `tags`, `notes`.
- **Preview de score ao vivo** enquanto o utilizador preenche — usa a mesma engine do scoring automático.
- Validação: `email` ou `phone` tem de estar presente (pelo menos um).
- Ao submeter, a lead entra no estado `status = 'new'`, sem agente atribuído (orphan).

### FR-002 — Ingestão via webhook

- Endpoints `api/webhooks/tally`, `api/webhooks/typeform`, `api/webhooks/ghl`.
- Cada endpoint valida assinatura do provider antes de persistir.
- Mapeamento do payload → `Lead` parametrizável por cliente (`clients.settings.webhook_mapping`).
- Ingestão é **idempotente**: mesmo payload enviado duas vezes não cria duplicado.
- Em caso de falha de validação, responder 400 com `{ error, correlation_id }` e registar log.

### FR-003 — Deduplicação

- Ao criar lead, verificar existência de lead com mesmo `email` OU `phone` (normalizado para E.164) no mesmo `client_id`.
- Se duplicado encontrado e < 30 dias de diferença: **merge** → adiciona nova interacção à lead existente em vez de criar nova.
- Se duplicado > 30 dias: cria nova lead mas marca metadata `{ duplicated_of: <id_original> }`.
- Operação de merge preservar todas as interacções históricas.

### FR-004 — Lista de leads (view)

- Tabela paginada (cursor-based, 50 por página).
- Colunas default: `full_name`, `client_id` (badge), `source` (badge), `score`, `temperature` (pill colorida), `agent_id` (avatar), `status`, `created_at`, `last_contact_at`.
- Filtros: `source`, `status`, `score_range`, `temperature`, `agent_id`, `client_id`, `date_range`.
- Ordenação por qualquer coluna.
- Selecção múltipla para acções em massa (FR-008).
- Exportação CSV do subset filtrado (FR-009).

### FR-005 — Perfil da lead

- Página de detalhe em `/comercial/leads/[id]` com:
  - Dados de contacto editáveis inline
  - Origem e UTMs (read-only — vêm do webhook)
  - Score actual + histórico de evolução do score
  - Pipeline stage actual
  - Agente atribuído (com possibilidade de reatribuição)
  - **Timeline de interacções** cronológica (tRPC live) — FR-007
  - Lista de calls associadas (link para módulo Calls)
  - Tags editáveis
  - Notas livres
  - Campo `lost_reason` se `status = 'lost'`

### FR-006 — Atribuição

- Atribuição manual: dropdown de agentes disponíveis (filtrado por `agency_id` e `is_active = true`).
- Atribuição automática (opcional, por cliente): round-robin, ou por capacidade.
- Logar mudança de atribuição como `lead_interactions` com `type = 'assignment_change'`.
- Notificar o novo agente via notificação in-app (depende de `notifications-prd.md`).

### FR-007 — Registo de interacção e timeline

- Qualquer evento (call, email, whatsapp, note, status_change, meeting, task) cria um `lead_interaction`.
- Campos: `type`, `direction` (inbound/outbound), `subject`, `content`, `outcome`, `metadata` (JSONB).
- Outcomes possíveis: `interested`, `not_interested`, `no_answer`, `scheduled`, `follow_up`.
- Timeline rendrizada em tempo real (tRPC subscription) no perfil da lead.
- **Cada interacção triggera recálculo do score** (FR-010).

### FR-008 — Acções em massa

- Após selecção múltipla na lista:
  - **Reatribuir** a outro agente (modal com confirmação)
  - **Mudar status** (modal com novo status + motivo opcional)
  - **Adicionar tag** (autocomplete de tags existentes)
  - **Remover tag**
  - **Exportar** (ver FR-009)
- Operações são transaccionais: ou todas as leads são alteradas, ou nenhuma.
- Limite: 500 leads por operação em massa.

### FR-009 — Exportação CSV

- Exporta o subset filtrado actual (não apenas página visível).
- Colunas configuráveis pelo utilizador (default: todas).
- Encoding UTF-8 com BOM (para abrir correctamente em Excel).
- Campos sensíveis (email, phone) sempre incluídos — utilizador autenticado com permissão.
- Log de auditoria: registar quem exportou, quando, quantas leads.

### FR-010 — Scoring automático

- Score 0-100 calculado por engine determinística.
- Inputs: completude de dados (nome, email, phone, empresa), canal de origem, comportamento (interacções registadas, tempo de resposta ao primeiro contacto), tags/campaign metadata.
- **Recálculo trigger:** a cada `lead_interaction` inserida.
- **Preview live:** o mesmo cálculo corre no modal de criação com inputs parciais.
- Configuração de pesos vive em `clients.settings.score_weights` (por cliente, com default por nicho).
- Temperatura derivada: `cold < 40 ≤ warm < 70 ≤ hot`.

### FR-011 — Atribuição multi-touch

- Ao fechar uma lead (`status = 'closed'`), identificar a **primeira campanha/canal** e a **última campanha/canal** associadas.
- Guardar em `leads.metadata.attribution = { first_touch, last_touch, touches[] }`.
- Exposto no report "Conversion Attribution" (Wave 9).

### FR-012 — Reactivação de leads frias

- Template gallery acessível a partir da lista (Wave 8).
- Filtrar leads `status in ('lost', 'new') AND last_contact_at < 30 dias`.
- Permitir disparo em massa de um template (via automation — depende de `automation-builder-prd.md`).

### FR-013 — RLS por agência e cliente

- Todas as queries sobre `leads` e `lead_interactions` respeitam:
  - Utilizadores da agência vêem leads de `agency_id = <sua>`
  - Utilizadores do portal vêem apenas leads de `client_id = <seu>` (read-only)
  - Nunca atravessam fronteira de `agency_id`
- Testes RLS em CI validam ausência de vazamento (FR crítico — violação = bloqueador de release).

---

## 5. Requisitos Não Funcionais

### 5.1 Performance

- Listagem de 10k leads, p95 ≤ 800ms (com filtros + paginação)
- Criação de lead (manual ou webhook), p95 ≤ 300ms
- Recálculo de score, p95 ≤ 50ms
- Timeline de lead (até 500 interacções), p95 ≤ 400ms

### 5.2 Disponibilidade

- Uptime da ingestão via webhook ≥ 99.9% (impacto directo em receita)
- Retry com backoff exponencial se Supabase falhar (até 3 tentativas)
- Dead-letter queue para payloads que falham validação (permite replay manual)

### 5.3 Segurança e privacidade

- Email e telefone são PII — nunca logados em texto claro em produção
- `email_normalized` e `phone_normalized` (hash SHA-256 + salt por agência) para deduplicação sem expor valores
- Validação de assinatura HMAC em todos os webhooks
- Rate limiting por IP no webhook inbound (100 req/min)
- Campos sensíveis só exportáveis por roles `agency_admin` e `agency_manager`
- Direito ao esquecimento (GDPR): endpoint `DELETE /api/leads/:id` cascata para `lead_interactions`

### 5.4 Observabilidade

- Métricas expostas (Supabase metrics + app telemetry):
  - `leads_created_total{source, client_id}`
  - `leads_webhook_errors_total{provider, error_type}`
  - `lead_score_duration_ms` (histogram)
  - `lead_dedup_merges_total`
- Logs estruturados JSON com `correlation_id` por request
- Tracing: spans `leads.create`, `leads.score`, `leads.dedupe`, `webhook.ghl.process`

### 5.5 Confiabilidade / integridade

- Inserção de lead + primeiro `lead_interaction` (origem) numa única transacção
- Deduplicação protegida por unique constraint composto (`client_id`, `email_normalized`) com conflict handling
- Recálculo de score é idempotente (mesmo input → mesmo output)

### 5.6 Portabilidade / acessibilidade

- UI responsive (desktop-first, tablet funcional)
- WCAG 2.1 AA para páginas principais (lista, perfil, modal)
- Suporte Chrome, Safari, Firefox, Edge (últimas 2 versões)

---

## 6. Arquitetura e Abordagem

```
┌────────────────────────────────────────────────────────────┐
│                   Fontes de Lead                           │
│                                                            │
│  Meta/Google   Tally     Typeform    GHL    ManyChat  n8n  │
│     │            │          │         │        │       │   │
└─────┼────────────┼──────────┼─────────┼────────┼───────┼───┘
      │            │          │         │        │       │
      ▼            ▼          ▼         ▼        ▼       ▼
┌────────────────────────────────────────────────────────────┐
│              Webhook Inbound Layer                         │
│  api/webhooks/{tally,typeform,ghl} + api/{manychat,n8n}    │
│  • Valida assinatura HMAC                                  │
│  • Normaliza payload → Lead DTO                            │
│  • Rate limiting por IP                                    │
└────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌────────────────────────────────────────────────────────────┐
│              Lead Service (tRPC)                           │
│  server/routers/admin/crm/leads.ts                         │
│  • create / update / list / assign / bulk                  │
│  • dedupe                                                  │
│  • invoca Score Engine                                     │
└────────────────────────────────────────────────────────────┘
                          │
           ┌──────────────┼──────────────┐
           ▼              ▼              ▼
      ┌─────────┐   ┌───────────┐  ┌───────────────┐
      │  leads  │   │  lead_    │  │ Score Engine  │
      │         │◄──│interact.  │──►│ (pure fn)    │
      └─────────┘   └───────────┘  └───────────────┘
           │              │
           └──── RLS ─────┘
                 │
                 ▼
      Portal read-only view (client_id = <seu>)
```

**Decisões centrais:**

- **Inserção atómica:** criar lead + primeira interacção "source" numa única transacção → nunca temos lead sem origem.
- **Score engine puro:** função sem I/O, testável, com mesmo comportamento em server e client (para preview live).
- **Deduplicação em write-time:** não permite duplicados em vez de deduplicar em read-time.

---

## 7. Decisões e Trade-offs

| Decisão | Justificativa | Trade-off |
|---------|---------------|-----------|
| **Deduplicação por write-time (unique constraint)** | Leads duplicadas poluem analytics e enganam atribuição de ROI | Pode rejeitar falsos positivos (duas pessoas com mesmo nº) — mitigado pela combinação com `client_id` |
| **Score engine como função pura (não AI inicial)** | Determinístico, testável, rápido, auditável; AI pode entrar em Fase 2 | Score menos "inteligente" que ML — aceitável porque a agência quer regras explícitas que possa ajustar |
| **tRPC subscription para timeline live** | UX melhor; evita polling; DX excelente | Acopla ainda mais ao stack Next.js/tRPC — aceitável |
| **Ingestão single-tenant por webhook (um endpoint por provider)** | Cada provider tem formato próprio; não vale criar abstracção prematura | Mais ficheiros a manter — mitigado por padrão comum (validate → normalize → insert) |
| **PII normalizada com hash, não encriptação reversível** | Deduplicação funciona sem expor valor; menor risco em caso de leak de DB | Impossível "recuperar" valor hashado — aceitável porque valor original fica em `email`/`phone` com RLS |
| **Soft delete via `status = 'lost'` + `lost_reason`** | Histórico preservado para análise; compliance GDPR resolvido por endpoint dedicado | Tabela cresce indefinidamente — mitigado por particionamento futuro (Fase 2) |

---

## 8. Dependências

### 8.1 Técnicas

- Tabelas: `leads`, `lead_interactions`, `clients`, `users`, `pipeline_stages`, `ad_campaigns`
- Pacotes: `@hypeflow/database`, `@hypeflow/integrations`
- tRPC + Supabase client + Zod (validação)

### 8.2 Externas (APIs)

- Meta Business API — formato de webhook de leadgen
- Google Ads API — formato de webhook de leads
- TikTok Ads API — formato de leads (Wave futura de tracking)
- GoHighLevel — webhook signed payload
- Tally / Typeform — webhook signed payload
- ManyChat — webhook signed payload
- n8n — webhook flexível (signature configurável)

### 8.3 Organizacionais

- **Compliance/Legal:** validação de política de retenção (default 24 meses após último contacto)
- **Sócios da agência:** definição de pesos default de scoring por nicho

### 8.4 Outros módulos HYPE Flow

- **[Pipeline & Kanban](./pipeline-kanban-prd.md)** — consome `pipeline_stage_id` e `stage_entered_at`
- **[Calls & Meet](./calls-meet-prd.md)** — consome `lead_id` para associar calls
- **[Automation Builder](./automation-builder-prd.md)** — observa eventos `lead.created`, `lead.status_changed`, `interaction.logged` para disparar regras
- **[Portal — Pipeline View](./portal-pipeline-prd.md)** — expõe subset read-only filtrado por `client_id`
- **[Tracking de Tráfego](./tracking-trafego-prd.md)** — fornece `campaign_id`, pixels e UTMs capturados
- **[Gestão de Clientes](./gestao-clientes-prd.md)** — fornece `clients.settings.score_weights` e `webhook_mapping`

---

## 9. Fluxo do Usuário (User Flow)

### Cenário A — Lead entra por Meta Ads

1. Utilizador final submete formulário de lead no Facebook/Instagram.
2. Meta dispara webhook para `api/webhooks/ghl` (via GHL) ou directo.
3. Handler valida HMAC, normaliza payload, chama `leads.create` (tRPC).
4. `leads.create` verifica duplicado por `email_normalized + client_id`.
5. Se não duplicado → insere `lead` + `lead_interaction` (type: `status_change`, content: "lead created from <source>") em transacção.
6. Score engine calcula score inicial a partir dos dados disponíveis.
7. Temperatura derivada automaticamente.
8. Se regras de automação definidas (dependência: automation builder) → dispara acções (ex.: notificar agente, enviar WhatsApp).
9. Realtime broadcast: dashboard da agência incrementa contador live (Wave 12).

### Cenário B — Gestor atribui lead a agente

1. Gestor abre `/comercial`, filtra por `status = 'new' AND agent_id IS NULL`.
2. Selecciona 10 leads, clica "Atribuir".
3. Modal abre com dropdown de agentes (com contagem actual de leads por agente).
4. Escolhe agente, confirma.
5. Sistema cria 10 `lead_interactions` (type: `assignment_change`) numa transacção.
6. 10 notificações in-app vão para o agente.
7. Lista da página refresca via tRPC.

### Cenário C — Agente regista interacção

1. Agente abre perfil de lead `/comercial/leads/:id`.
2. Clica "Registar Interacção" → modal.
3. Escolhe `type: call`, `outcome: scheduled`, escreve notas.
4. Submete.
5. Sistema insere `lead_interaction`, recalcula score (FR-010), actualiza `last_contact_at`.
6. Timeline aparece em tempo real no perfil (tRPC subscription).
7. Se outcome = `scheduled` e regra de automação ligada → cria evento no módulo Calls (dependência).

### Cenário D — Exportar CSV

1. Gestor filtra lista (ex.: `source = 'facebook' AND created_at > 2026-04-01`).
2. Clica "Exportar CSV".
3. Sistema gera CSV server-side do subset inteiro (não da página visível).
4. Download inicia.
5. Registo de auditoria criado: `{ user_id, filters, count, timestamp }`.

---

## 10. Riscos e Mitigação

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| **Webhook de provider externo muda de formato sem aviso** | Média | Alto | Testes de contrato por provider em CI; validação por schema Zod; alertas automáticos em ingestion failures |
| **Score engine dá resultados "estranhos" e mina confiança da equipa** | Média | Alto | Logs detalhados de cada input que contribuiu para o score; UI de "debug score" para gestores; rubrica documentada no PRD v2+ |
| **Deduplicação agressiva merge-a leads legítimas diferentes (mesmo telefone numa família)** | Baixa | Médio | Janela de 30 dias + metadata `{ duplicated_of }` permite reverter; auditoria mensal dos merges |
| **PII vaza em logs por engano** | Baixa | Crítico | Lint rule proíbe log de `email`/`phone`; testes de grep em CI; rotação de logs 30 dias |
| **Volume de webhooks excede capacidade (>100 req/s)** | Baixa | Alto | Rate limiting + queue (Fase 2: BullMQ); teste de carga antes de GA |
| **RLS policy mal configurada expõe leads entre agências** | Baixa | Crítico | Testes de RLS automáticos em CI (já existem); peer review obrigatório em migrations |
| **Volume de `lead_interactions` degrada queries** | Média | Médio | Índice composto em `(lead_id, created_at DESC)`; paginação obrigatória; plano de particionamento anual |

---

## 11. Critérios de Aceitação

- [ ] FR-001 a FR-013 implementados e cobertos por testes
- [ ] Listagem de 10k leads entrega em ≤ 800ms (p95)
- [ ] Criação de lead + score em ≤ 300ms (p95)
- [ ] Zero leads criadas sem `source` em 1000 ingestões consecutivas
- [ ] Testes RLS automatizados passam: utilizador da agência A não vê leads da agência B
- [ ] Webhook GHL validado com payload oficial da documentação GHL
- [ ] Exportação CSV abre correctamente em Excel e Google Sheets (UTF-8 BOM)
- [ ] Timeline live renderiza evento em < 1s após inserção de `lead_interaction`
- [ ] Score live preview no modal corresponde ao score pós-creação em 100% dos casos
- [ ] Auditoria: toda a exportação CSV aparece em log consultável
- [ ] Documentação técnica actualizada em `docs/architecture/hypeflow-os-schema.md`

---

## 12. Testes e Validação

### 12.1 Testes obrigatórios

**Unitários:**
- Score engine — tabela de casos por nicho, inputs parciais, edge cases (email inválido, score clampado a 0-100)
- Normalização de phone E.164 (PT, ES, BR, UK formats)
- Deduplicação (match, no match, dentro/fora da janela 30d)
- Zod schemas de todos os webhooks

**Integração:**
- `leads.create` → escreve em `leads` e `lead_interactions` na mesma transacção
- Webhook GHL endpoint → cria lead correcta com score
- Bulk actions — 500 leads actualizadas atomicamente
- tRPC subscription — timeline actualiza < 1s

**E2E (Playwright):**
- Fluxo completo: criar lead manual → atribuir → registar interacção → mudar status → exportar CSV
- RLS: user de agência A não vê lead de agência B na lista nem consegue abrir URL directa

**Carga:**
- 10k leads em DB, listagem com filtros, p95 ≤ 800ms
- 100 webhooks/s sustentados durante 5 min sem drop

**RLS / Segurança:**
- Suite de testes RLS em CI (existente, reforçar)
- Pen test ao endpoint de webhook (assinatura inválida, payload malformado, oversized)

### 12.2 Cenários de validação manual

- Importar CSV real de CRM antigo → verificar deduplicação
- Pedir a um agente real para usar a lista durante 1 dia → recolher feedback UX
- Simular incidente: provider externo envia payload malformado → verificar se vai para dead-letter queue e alerta dispara

---

## 13. Referências

- **Código:**
  - `apps/hypeflow/server/routers/admin/crm/leads.ts`
  - `apps/hypeflow/app/(admin)/admin/contactos/`
  - `apps/hypeflow/app/api/webhooks/ghl/route.ts`
- **Schema:** `docs/architecture/hypeflow-os-schema.md` (tabelas `leads`, `lead_interactions`)
- **Migrations:** `hypeflow-os/supabase/migrations/0001_initial_schema.sql`, `0002_rls_policies.sql`, `0003_pixels_utms_tiktok.sql`
- **Arquitectura macro:** `docs/architecture/hypeflow-os-architecture.md`
- **PRD Macro:** [../hypeflow-os-prd.md](../hypeflow-os-prd.md)
- **Waves relevantes (commits):** Wave 3 (segmentation), Wave 4 (live timeline), Wave 5 (leaderboard), Wave 7 (GHL deep sync panel), Wave 8 (reactivation templates), Wave 9 (conversion attribution), Wave 10 (real-time score), Wave 11 (quick-edit kanban), Wave 12 (live counter), Wave 14 (CSV export), Wave 16 (GHL inbound webhook), Wave 17 (add lead modal with live score)

---

## 14. Histórico de Revisões

| Versão | Data | Autor | Alterações |
|--------|------|-------|------------|
| 1.0 | 2026-04-21 | Morgan (@pm) · Aria (@architect) | Versão inicial. Consolidação do trabalho entregue nas Waves 1-17 em formato PRD de módulo seguindo padrão Rate Limiter. Pendente validação @po. |
