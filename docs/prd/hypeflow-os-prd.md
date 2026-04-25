# HYPE Flow OS — Product Requirements Document (Macro)

**Versão:** 2.0
**Data:** 2026-04-21
**Tipo:** PRD de alto nível (macro)
**Status:** Andre Dos Reis
**Substitui:** v1.0 (2026-04-06)


---

## 1. Resumo

O **HYPE Flow OS** é a plataforma operacional SaaS multi-tenant da agência HYPE Flow. Serve simultaneamente dois tipos de utilizador — a **equipa interna da agência** (gestão comercial, tráfego, clientes, operações) e os **clientes da agência** (visibilidade de leads, agendamentos e ROI em tempo real) — num único sistema, com isolamento total de dados via Row Level Security.

O produto é entregue como dois Next.js 14 apps (`agency` e `portal`) sobre uma camada de serviços partilhada (Supabase + tRPC), integrando-se nativamente com Meta Ads, Google Ads/Meet, TikTok, GoHighLevel, ManyChat, n8n e tracking de pixels/UTMs. É o **único ponto de verdade** da operação comercial da agência e a **principal ferramenta de transparência** perante o cliente final.

> **Posicionamento:** "O sistema que prova, em tempo real, que o investimento está a gerar retorno — sem precisar de pedir relatórios."

---

## 2. Contexto e Oportunidade

### 2.1 Motivação

A HYPE Flow opera hoje com um patchwork de ferramentas (folhas de cálculo, CRM de terceiros, dashboards dispersos, relatórios manuais em PDF). Isto gera três problemas mensuráveis:

- **Fuga de leads:** leads sem follow-up por mais de 48h devido a falta de pipeline activo — erosão directa de ROI.
- **Atrito operacional:** relatórios mensais tomam horas de trabalho manual por cliente.
- **Opacidade perante o cliente:** clientes pedem relatórios ad-hoc por email, gerando desconfiança ("o que a agência está a fazer pelo meu dinheiro?").

### 2.2 Por que agora

1. **Volume:** a operação ultrapassou a capacidade de gestão por folha de cálculo.
2. **Diferenciação comercial:** oferecer portal dedicado ao cliente é vantagem competitiva no pitching.
3. **Automação disponível:** integrações maduras (Meta, Google, GHL, ManyChat, n8n) permitem automatizar o que era manual.
4. **Regulatório:** GDPR exige tratamento auditável de dados de leads — folhas de cálculo não resolvem.

### 2.3 Problemas a resolver

| # | Problema | Solução no OS |
|---|----------|---------------|
| 1 | CRM como "cemitério de contactos" | Pipeline activo com Kanban + regras de automação |
| 2 | Tráfego pago sem rastreio unificado | Tracking multi-canal (Meta, Google, TikTok) + pixels/UTMs |
| 3 | Dependência humana nas calls | Integração nativa com Google Meet + histórico |
| 4 | Clientes sem visibilidade | Portal dedicado com dashboard de ROI |
| 5 | Relatórios manuais e lentos | Relatórios automáticos gerados por módulo |
| 6 | Follow-up manual | Automação nativa + delegação a GHL/ManyChat/n8n |

---

## 3. Público e Personas

### 3.1 Personas Internas (app `agency`)

| Persona | Papel | Frequência | Necessidades-chave |
|---------|-------|------------|---------------------|
| **Admin / Sócio** | Gestão estratégica | Diária | Visão 360° de receita, equipa, saúde de clientes |
| **Gestor Comercial** | Liderança de vendas | Diária (intensiva) | Pipeline, KPIs de equipa, atribuição de leads |
| **Agente Comercial** | Operador de chão | Horária | Lista de leads atribuídas, agendar calls, actualizar pipeline |
| **Account Manager** | Relação cliente-agência | Diária | Saúde da conta, NPS, reuniões, renovações |
| **Tráfego Manager** | Gestão de campanhas | Diária | ROI por canal, alertas CPL, sincronização de ads |

### 3.2 Personas Externas (app `portal`)

| Persona | Nicho | Necessidades-chave |
|---------|-------|---------------------|
| **Cliente Imobiliário** | Imobiliária | Leads recebidas, triagem, agendamentos |
| **Cliente Crédito** | Intermediação de crédito | Velocidade de resposta, conversão |
| **Cliente Clínica** | Clínicas privadas | Reactivação de pacientes, novos agendamentos |
| **Cliente B2B / Serviços** | Serviços profissionais | Qualidade de lead, ROI |

> **Nota:** o produto é **multi-nicho por design** — os nichos listados são os iniciais, não limitantes.

---

## 4. Objetivos e Métricas

### 4.1 Objetivos de negócio (12 meses após GA)

| Objetivo | Métrica | Meta |
|----------|---------|------|
| Substituir stack operacional interno | % de operações feitas no OS | ≥ 95% |
| Adopção pelos clientes da agência | % clientes com ≥1 login/mês no portal | ≥ 80% |
| Redução de tempo em relatórios manuais | Horas/mês por cliente em reporting | ≤ 1h (baseline a medir antes do lançamento) |
| Reduzir leads negligenciadas | % leads sem follow-up > 48h | < 5% |
| Satisfação da equipa interna | NPS interno | ≥ 8.0 |
| Satisfação dos clientes da agência | NPS cliente | ≥ 8.0 |

### 4.2 Objetivos técnicos

| Objetivo | Métrica | Meta |
|----------|---------|------|
| Performance de dashboards | Tempo de carregamento (p95) | ≤ 2s |
| Performance de APIs | Latência p95 | ≤ 500ms |
| Disponibilidade | Uptime mensal | ≥ 99.5% |
| Escalabilidade inicial | Utilizadores concorrentes suportados | ≥ 100 |
| Isolamento de dados | Vazamentos inter-tenant detectados | 0 (verificado por testes RLS) |

---

## 5. Escopo

### 5.1 Incluso

**Fase 1 — MVP (entregue nas Waves 1-19 + gaps pendentes):**

| Módulo | Estado |
|--------|--------|
| Autenticação multi-tenant + RLS | Entregue |
| Dashboard Master (agência) | Entregue |
| CRM & Gestão de Leads | Entregue |
| Pipeline & Kanban | Entregue |
| Tracking de Tráfego (Meta + Google + TikTok) | Entregue |
| Pixels & UTMs | Entregue |
| Gestão de Calls com Google Meet | Entregue |
| Gestão de Clientes (ficha + health score) | Entregue |
| Form Builder (formulários públicos) | Entregue |
| Automation Builder (nativo) | Entregue |
| Workflow Builder | Entregue |
| Integrações: GHL (inbound), ManyChat, n8n | Entregue |
| Portal do Cliente: dashboard, pipeline read-only, ROI, calls, leads | Entregue |
| Configurações & equipa | Entregue |
| Notificações in-app + email | Pendente |
| Onboarding wizard (primeiro login) | Pendente |
| Health score automático com thresholds | Pendente |

**Fase 2 — Expansão:**

- Relatórios automáticos agendados (envio por email, templates por nicho)
- WhatsApp Business API (outbound)
- LinkedIn Ads API
- Chat interno agência ↔ cliente
- Facturação / Stripe
- Analytics avançados (YoY, MoM, cohort)
- Configurações avançadas de permissões

**Fase 3 — Escala:**

- Apps móveis nativas (iOS/Android)
- Multi-idioma (EN, ES)
- Multi-região infraestrutural
- Marketplace de templates (pipelines, automações, formulários)
- White-label para sub-agências

### 5.2 Fora do Escopo (explícito)

O produto **NÃO** inclui e **NÃO** pretende substituir:

- **Apps móveis nativas** na Fase 1 — web responsive desktop-first; nativa é Fase 3
- **Sistema de checkout do cliente final** (do cliente da agência) — não gerimos o pagamento do cliente-do-cliente
- **ERP ou contabilidade** — MRR e contratos são tracking operacional, não contabilístico
- **Editor de criativos / gestor de ads** — o tracking é read-only; não publicamos ads
- **Email marketing em massa** — integramos com terceiros; não fazemos envio bulk
- **Multi-idioma na Fase 1** — arranca PT-PT; EN/ES são Fase 2
- **Multi-região na Fase 1** — single-region EU; outras regiões são Fase 3
- **Marketplace público de templates** — templates são internos à agência; público é Fase 3

---

## 6. Requisitos de Alto Nível (Capacidades Macro)

O sistema **deve ser capaz de**:

1. **Autenticar e isolar dados** de múltiplas agências e múltiplos clientes com zero vazamento cruzado.
2. **Capturar leads de múltiplas fontes** (pagas, orgânicas, manuais, webhooks externos) num modelo unificado.
3. **Gerir pipeline comercial** com estados customizáveis por cliente, SLAs e alertas.
4. **Rastrear a origem de cada lead** até ao canal, campanha e criativo (atribuição multi-touch).
5. **Agendar, executar e registar calls** com sincronização bidireccional de calendário.
6. **Automatizar follow-up** via regras nativas e/ou delegação a sistemas externos (n8n, GHL, ManyChat).
7. **Expor dados em tempo real ao cliente** da agência sem dar acesso a dados de outros clientes.
8. **Calcular e reportar ROI** usando dados de investimento (input manual ou integração) e conversões.
9. **Integrar com APIs externas** com retry, logging e alertas de falha.
10. **Auditar acções sensíveis** para compliance (GDPR, auditoria interna).

> O detalhe funcional de cada capacidade vive nos PRDs de módulo em `docs/prd/modules/`.

---

## 7. Estratégia e Fases

### 7.1 Roadmap de alto nível

```
Fase 0 — Concluída              Fase 1 — Em curso (MVP)      Fase 2                  Fase 3
(Waves 1-19)                    (gaps de MVP)                 (expansão)              (escala)

✓ Auth multi-tenant             ○ Notificações in-app/push    ○ Relatórios agend.     ○ Apps nativas
✓ Dashboard Master              ○ Onboarding wizard           ○ WhatsApp outbound     ○ Multi-idioma
✓ CRM / Pipeline / Kanban       ○ Health score automático     ○ LinkedIn Ads          ○ Multi-região
✓ Tracking (Meta/Google/TikTok)                               ○ Chat agência ↔        ○ Marketplace
✓ Pixels / UTMs                                                 cliente                 templates
✓ Calls / Meet                                                ○ Stripe / billing      ○ White-label
✓ Automation / Workflow Builder                               ○ Analytics avançados
✓ Form Builder                                                ○ Permissões avançadas
✓ GHL / ManyChat / n8n
✓ Portal do Cliente (core)
```

### 7.2 Princípios de priorização

1. **Desbloquear a operação interna primeiro** — só depois polir o portal do cliente.
2. **Integrar antes de reconstruir** — n8n/GHL/ManyChat antes de reinventar orquestração complexa.
3. **Medir antes de optimizar** — baseline numérico obrigatório antes de qualquer optimização.
4. **Entregar em incrementos (waves)** — validado pelas 19 waves já entregues.

---

## 8. Decisões e Trade-offs (Macro)

| Decisão | Justificativa | Trade-off |
|---------|---------------|-----------|
| **Single app Next.js (`apps/hypeflow`) com route groups `(admin)` + `(client)`** | Menor overhead de deploy e de partilha de código; isolamento por route groups App Router (refactor Wave 19) | Maior risco de vazar lógica de admin para portal se route groups não forem respeitados — mitigado por `agencyProcedure` e `clientProcedure` no tRPC e por RLS |
| **Supabase + RLS como camada de autorização** | Reduz superfície de bugs de autz; testes RLS determinísticos | Acoplamento forte ao Supabase; migração futura seria custosa |
| **tRPC em vez de REST/GraphQL** | Type-safety end-to-end, baixo boilerplate, excelente DX | Difícil expor API pública estável a terceiros — mitigado com rotas `api/` e webhooks dedicados |
| **Automation Builder nativo + delegação a n8n/GHL/ManyChat** | Casos simples in-app, casos complexos delegados sem reinventar | Aparência de duplicação de capacidade — mitigada com fronteiras claras no PRD de módulo |
| **Single-region EU na Fase 1** | GDPR-first; latência aceitável para mercado PT/EU | Clientes LATAM/US com latência pior — aceitável para Fase 1 |
| **Desktop-first + mobile responsive (não nativa)** | Time-to-market; persona principal opera em desktop | Agentes comerciais em mobilidade têm UX sub-óptima — aceitável para Fase 1 |

---

## 9. Dependências

### 9.1 Técnicas
- **Supabase** (PostgreSQL 15+, Auth, Realtime, RLS, Edge Functions)
- **Vercel** (hosting de `apps/hypeflow` e `hype-flow-landing` — dois targets de deploy separados)
- **Node.js 18+** runtime
- **Redis** (cache / rate limiting — em roadmap, não obrigatório na Fase 1)

### 9.2 Externas (APIs)
- Meta Business API (Facebook + Instagram Ads)
- Google Ads API + Google Meet API + Google Calendar API
- TikTok Ads API (pixel + tracking)
- GoHighLevel webhooks (inbound de leads)
- ManyChat API (conversational / automação de follow-up)
- n8n (webhook-based delegation de workflows)
- WhatsApp Business Cloud API (Official) — **call reminders activos em Fase 1** (`supabase/functions/call-reminders`: 24h + 1h antes da call); envio outbound de sequências de marketing/follow-up bulk é **Fase 2**
- Stripe (Fase 2)

### 9.3 Organizacionais
- **Sponsor executivo** da agência para decisões de escopo macro
- **Equipa de sucesso do cliente** para piloto e onboarding
- **Clientes piloto** confirmados por nicho (imobiliário + crédito + clínica) — a nomear
- **Compliance / legal** para GDPR (DPA, política de retenção, direito ao esquecimento)

---

## 10. Riscos e Mitigação

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| **Meta/Google revogam ou limitam APIs** | Média | Alto | Abstracção por provider (adapter pattern); degradação graciosa; alertas automáticos |
| **Violação de RLS expõe dados entre clientes** | Baixa | Crítico | Testes automatizados de RLS em CI; auditoria periódica; convenção forçada de prefixação |
| **Cliente piloto recusa usar o portal** | Média | Médio | Onboarding assistido; medir adopção nas primeiras 2 semanas; iterar UX com dados reais |
| **Equipa interna perde tempo na curva de aprendizagem** | Média | Médio | Training sessions; métricas antes/depois; fallback às ferramentas antigas durante 30 dias |
| **Dívida técnica acumulada após 19 waves** | Alta | Médio | Budget de refactor por sprint; regressão automatizada; revisão trimestral de arquitectura |
| **GDPR não-conformidade (retenção, DPA, erasure)** | Média | Crítico | Audit legal antes de GA; política de retenção documentada; automação de purga |
| **Dependência única do Supabase** | Baixa | Alto | Backups regulares; plano de evacuação documentado; ORM-layer para facilitar migração |
| **Scope creep via pedidos ad-hoc dos sócios** | Alta | Médio | Roadmap público; "Fora do Escopo" enforced em todos os PRDs; PO como gate |
| **Integração ManyChat/GHL altera contrato sem aviso** | Média | Médio | Webhook signing; versioning local; testes de contrato em CI |
| **Performance degrada acima de 100 utilizadores** | Média | Alto | Load testing antes de GA; índices de DB revistos; paginação server-side obrigatória |

---

## 11. KPIs

### 11.1 KPIs de produto (dashboard interno)

| KPI | Fórmula | Cadência | Meta Fase 1 |
|-----|---------|----------|-------------|
| **Adopção interna** | MAU equipa / total colaboradores | Semanal | ≥ 95% |
| **Adopção cliente** | clientes com ≥1 login no mês / total clientes | Mensal | ≥ 80% |
| **Leads sem follow-up (>48h)** | count(leads "nova"/"qualificada" há >48h) / total leads activas | Diária | < 5% |
| **Tempo médio em fase** | média de horas por fase do pipeline | Semanal | ≤ SLA configurado |
| **Show-up rate** | calls realizadas / calls agendadas | Semanal | ≥ 75% |
| **ROI médio por cliente** | (receita declarada pelo cliente − investimento em ads) / investimento | Mensal | medir baseline antes de GA |
| **NPS interno** | survey trimestral (-100 a +100) | Trimestral | ≥ 8.0 (escala 0-10) |
| **NPS cliente** | survey trimestral (-100 a +100) | Trimestral | ≥ 8.0 (escala 0-10) |

### 11.2 KPIs técnicos

| KPI | Fórmula | Cadência | Meta |
|-----|---------|----------|------|
| Uptime mensal | minutos disponível / minutos totais | Mensal | ≥ 99.5% |
| Latência API p95 | percentil 95 de todas as chamadas tRPC/API | Contínua | ≤ 500ms |
| Page load p95 | LCP medido por rota principal | Contínua | ≤ 2s |
| Erros por 1000 req | respostas 5xx / total req × 1000 | Diária | < 1 |

> **Nota:** fórmulas detalhadas de **scoring de leads** e **health score de clientes** ficam nos PRDs de módulo respectivos (CRM & Leads, Gestão de Clientes).

---

## 12. Stakeholders

| Papel | Responsabilidade | Autoridade |
|-------|------------------|-----------|
| **Sponsor / CEO HYPE Flow** | Visão de produto, escopo macro | Final sign-off |
| **Product Owner (Pax / @po)** | Validação de stories, priorização | Aprova/rejeita stories |
| **Product Manager (Morgan / @pm)** | Gestão de roadmap e requisitos | Gate de epics |
| **Tech Lead / Architect (Aria / @architect)** | Arquitectura e decisões técnicas | Gate de arquitectura |
| **Dev (Dex / @dev)** | Execução de implementação | — |
| **QA (Quinn / @qa)** | Qualidade e testes | Gate de qualidade |
| **UX (Uma / @ux-design-expert)** | Experiência de utilizador | Gate de UX |
| **Data (Dara / @data-engineer)** | Schema, RLS, performance de DB | Gate de dados |
| **DevOps (Gage / @devops)** | CI/CD, deploy, infra, MCP | Gate de release |
| **Clientes piloto** | Feedback real; validação de utilidade | Gate de GA |
| **Equipa interna da agência** | Utilizadores-alvo principais | Gate de adopção |
| **Compliance / Legal** | GDPR, DPA, retenção | Gate de conformidade |

---

## 13. Referências

- **PRDs de módulo:** `docs/prd/modules/` (a criar — Passo 2 do plano de documentação)
- **Arquitectura técnica:** `docs/architecture/hypeflow-os-architecture.md`
- **Schema de dados:** `docs/architecture/hypeflow-os-schema.md`
- **Epics:** `docs/epics/EPICS-OVERVIEW.md` (a refactorizar após este PRD)
- **Stories activas:** `docs/stories/`
- **Auditoria Context7:** `docs/architecture/context7-audit-report.md`

---

## 14. Histórico de Revisões

| Versão | Data | Autor | Alterações |
|--------|------|-------|------------|
| 1.0 | 2026-04-06 | Squad AIOS | Versão inicial |
| 2.0 | 2026-04-21 | Squad AIOS | Refactor para padrão macro: remoção de detalhes de módulo (migram para PRDs de módulo em `docs/prd/modules/`); adição de Contexto & Oportunidade com motivação/por-que-agora; Objetivos mensuráveis com metas; Fora do Escopo explícito; Decisões & Trade-offs; Dependências (técnicas / externas / organizacionais); Riscos com probabilidade e mitigação; Stakeholders com papel e autoridade; KPIs com fórmulas e cadência; reconciliação com 19 waves entregues (Automation Builder, Workflow Builder, Form Builder, GHL, ManyChat, n8n, Pixels/UTMs/TikTok) |
| 2.1 | 2026-04-22 | Squad AIOS | Alinhamento com estrutura real pós-Wave 19: decisão de app naming corrigida (`agency`+`portal` → `apps/hypeflow` single-app com route groups); WhatsApp Cloud API já activo em Fase 1 para call reminders; targets de deploy Vercel actualizados |

---

*Documento mantido pela Squad HYPE Flow OS via Orion (aios-master).*
*Próximo passo: validação @po → criar PRD de módulo piloto (CRM & Leads) seguindo o template `docs/prd/modules/TEMPLATE.md`.*
