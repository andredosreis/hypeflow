# HYPE Flow OS — Product Requirements Document

**Version:** 1.0  
**Date:** 2026-04-06  
**Squad:** Morgan (PM) · Aria (Architect) · Pax (PO) · Uma (UX) · Dara (Data) · Dex (Dev) · Quinn (QA)  
**Status:** Draft — Awaiting PO Validation

---

## 1. Visão do Produto

**HYPE Flow OS** é a plataforma operacional completa da agência HYPE Flow — uma solução SaaS dual que serve simultaneamente dois utilizadores distintos:

- **Operacional (Agência):** Hub central de gestão comercial, onde a equipa HYPE Flow gere clientes, campanhas, pipelines e performance.
- **Portal do Cliente:** Interface de transparência total onde cada cliente acompanha os seus leads, agendamentos, ROI e conversões em tempo real.

### Declaração de Posicionamento

> "O sistema que prova, em tempo real, que o investimento está a gerar retorno — sem precisar de pedir relatórios."

### Problema que Resolve

| Problema | Solução no OS |
|----------|--------------|
| CRM = cemitério de contactos | Pipeline activo com Kanban + automação de reactivação |
| Tráfego pago sem rastreio real | Tracking unificado de todas as fontes |
| Dependência humana nas calls | Integração nativa com Google Meet + histórico de calls |
| Clientes sem visibilidade | Portal dedicado com dashboard de ROI em tempo real |
| Relatórios manuais e lentos | Relatórios automáticos gerados por módulo |

---

## 2. Utilizadores & Personas

### 2.1 Utilizadores Internos (Agência)

| Persona | Papel | Necessidades Principais |
|---------|-------|------------------------|
| **Admin / Sócio** | Gestão total da plataforma | Visão 360° do negócio, métricas de receita, gestão de equipa |
| **Gestor Comercial** | Operações de vendas | Pipeline, Kanban, agendamentos, calls |
| **Account Manager** | Gestão de clientes | Status de clientes, relatórios, comunicação |
| **Tráfego Manager** | Gestão de campanhas | Fontes de tráfego, ROI por canal, alertas |

### 2.2 Utilizadores Externos (Clientes)

| Persona | Nicho | Necessidades Principais |
|---------|-------|------------------------|
| **Cliente Imobiliário** | Imobiliária | Leads recebidas, triagem, agendamentos |
| **Cliente Crédito** | Crédito | Velocidade de resposta, conversão, pipeline |
| **Cliente Clínica** | Clínicas | Reactivação de pacientes, novos agendamentos |

---

## 3. Escopo do Produto

### 3.1 Vista Geral — Módulos

```
HYPE Flow OS
├── LADO A: Plataforma Operacional (Agência)
│   ├── 1. Dashboard Master
│   ├── 2. Módulo Comercial (CRM)
│   ├── 3. Pipeline & Kanban
│   ├── 4. Tracking de Tráfego
│   ├── 5. Gestão de Calls (Meet)
│   ├── 6. Gestão de Clientes
│   ├── 7. Relatórios & Analytics
│   └── 8. Configurações & Equipa
│
└── LADO B: Portal do Cliente
    ├── 1. Dashboard do Cliente
    ├── 2. Leads & Pipeline (view)
    ├── 3. Agendamentos & Calls
    ├── 4. ROI & Métricas
    └── 5. Comunicação & Suporte
```

---

## 4. LADO A — Plataforma Operacional da Agência

### 4.1 Dashboard Master

**Descrição:** Visão executiva de todo o negócio da agência em tempo real.

**KPIs principais:**
- Total de leads activas (por cliente / por canal)
- Receita recorrente mensal (MRR) dos clientes
- Taxa de conversão global (lead → agendamento → fecho)
- ROI médio gerado para clientes
- Calls realizadas esta semana / mês
- Alertas de leads sem seguimento (+48h)

**Componentes visuais:**
- Cards de métricas topo (MRR, leads activas, conversão, calls)
- Gráfico de funil de pipeline (por fase)
- Heatmap de actividade por canal de tráfego
- Feed de actividade recente (últimas acções da equipa)
- Widget de alertas (leads ignoradas, calls em falta)

**Filtros:** Por cliente | Por período | Por agente comercial | Por nicho

---

### 4.2 Módulo Comercial (CRM)

**Descrição:** Gestão completa de leads e contactos com visão de 360° de cada lead.

**Funcionalidades:**
- **Lista de Leads:** Tabela com filtros avançados (fonte, status, score, data, agente)
- **Perfil de Lead:** Timeline completa (origem → interações → estado actual)
- **Score de Qualificação:** Score automático baseado em comportamento e dados
- **Atribuição:** Distribuição manual/automática de leads por agente
- **Tags & Segmentação:** Classificação por nicho, fase, temperatura (H/M/F)
- **Bulk Actions:** Reatribuição em massa, mudança de status, envio de follow-up
- **Histórico de Interações:** Chamadas, emails, WhatsApp, reuniões — tudo num feed

**Fontes de leads integradas:**
| Canal | Tipo | Dados Capturados |
|-------|------|-----------------|
| Facebook Ads | Pago | Nome, email, telefone, campanha, conjunto de anúncios |
| Instagram Ads | Pago | Nome, email, telefone, campanha |
| Google Ads | Pago | Nome, email, telefone, keyword, grupo |
| LinkedIn Ads | Pago | Nome, empresa, cargo, campanha |
| LinkedIn Orgânico | Orgânico | Perfil, mensagem, data |
| WhatsApp | Orgânico/Pago | Número, mensagem inicial, origem |
| Email (Newsletter) | Orgânico | Email, origem do formulário |
| Google Orgânico (SEO) | Orgânico | Keyword, página de entrada |
| Referral | Orgânico | Quem referenciou, data |
| Manual | Manual | Input da equipa |

---

### 4.3 Pipeline & Kanban

**Descrição:** Visualização e gestão do funil comercial completo com duas views.

#### View Kanban

**Colunas por defeito (método HYPE):**
1. **Nova Lead** — Entrada no sistema
2. **Qualificação IA** — Triagem automática em curso
3. **Qualificada** — Aprovada para contacto
4. **Contactada** — Primeiro contacto feito
5. **Agendada** — Call/reunião agendada
6. **Em Proposta** — Proposta enviada
7. **Negociação** — Em negociação activa
8. **Fechada ✓** — Convertida
9. **Perdida ✗** — Não avançou

**Funcionalidades do Kanban:**
- Drag & drop entre colunas
- Cards com: nome, fonte, score, agente, data de entrada, última interacção
- Código de cor por temperatura (Frio/Morno/Quente)
- Quick-actions no card: ligar, agendar meet, enviar WhatsApp, mover fase
- Indicador de SLA (tempo máximo em cada fase) com alerta visual
- Filtros: por agente, por cliente, por fonte, por score

#### View Pipeline (Lista)

- Tabela ordenável por qualquer coluna
- Forecasting: valor esperado por fase
- Probabilidade de conversão por fase
- Pipeline total em valor (€)

#### Configuração

- Fases personalizáveis por cliente ou por nicho
- SLAs configuráveis por fase
- Regras de automação por fase (e.g., "ao entrar em Qualificada → enviar WhatsApp automático")

---

### 4.4 Tracking de Fontes de Tráfego

**Descrição:** Centro de comando de todas as fontes de tráfego — orgânico e pago.

#### 4.4.1 Fontes Pagas

| Plataforma | Métricas Rastreadas |
|-----------|---------------------|
| **Facebook Ads** | Impressões, Cliques, CPL, CTR, Leads, Conversões, ROAS |
| **Instagram Ads** | Impressões, Cliques, CPL, CTR, Leads, Conversões, ROAS |
| **Google Ads** | Impressões, Cliques, CPC, CPL, Keywords top, Quality Score, ROAS |
| **LinkedIn Ads** | Impressões, Cliques, CPL, CTR, Leads (por empresa/cargo), ROAS |

#### 4.4.2 Fontes Orgânicas

| Canal | Métricas Rastreadas |
|-------|---------------------|
| **LinkedIn Orgânico** | Alcance de posts, Engajamento, DMs recebidas, Leads geradas |
| **Instagram Orgânico** | Alcance, Engajamento, DMs, Stories views, Leads |
| **Facebook Orgânico** | Alcance, Posts, Interações, Leads |
| **Google (SEO)** | Cliques orgânicos, Impressões, Posição média, CTR, Keywords |
| **WhatsApp** | Mensagens recebidas, Leads qualificadas via WA, Tempo de resposta |
| **Email Marketing** | Aberturas, Cliques, Unsubscribes, Leads geradas |

#### 4.4.3 Dashboard de Tráfego

- **Visão unificada:** Todas as fontes num só ecrã
- **Atribuição multi-touch:** Qual canal contribuiu para cada conversão
- **Cost per Lead por canal** (comparativo)
- **ROI por canal** (lead → fecho → €)
- **Heatmap temporal:** Melhores horários por canal
- **Alertas de performance:** CPL acima da meta → notificação automática
- **Comparativo de períodos:** Semana a semana / Mês a mês

**Integrações:**
- Meta Business Suite API (Facebook + Instagram)
- Google Ads API
- LinkedIn Marketing API
- Google Search Console (SEO)
- Google Analytics 4

---

### 4.5 Gestão de Calls (Google Meet)

**Descrição:** Módulo central para gestão de todas as calls de vendas.

**Funcionalidades:**
- **Calendário de Calls:** Vista semanal/mensal de todas as calls agendadas
- **Agendamento directo:** Criar call → gerar link Meet automático → enviar convite
- **Pré-call:** Briefing automático da lead (histórico, score, notas)
- **Durante a call:** Timer, checklist de qualificação, notas em tempo real
- **Pós-call:** Resultado (avançou / perdeu / follow-up), próximo passo, proposta
- **Histórico:** Todas as calls por lead, por agente, por cliente
- **Métricas de calls:**
  - Taxa show-up (agendados vs realizados)
  - Taxa de conversão por agente
  - Duração média por fase do funil
  - Calls por semana por agente
- **Integração Google Meet:**
  - Criação automática de link
  - Sincronização com Google Calendar
  - Notificação 15min antes (email + in-app)
  - Registo de duração da call real

---

### 4.6 Gestão de Clientes

**Descrição:** Módulo de gestão de todos os clientes da agência.

**Funcionalidades:**
- **Lista de Clientes:** Cards com status, nicho, MRR, saúde da conta
- **Ficha de Cliente:** 
  - Dados do negócio (nome, nicho, contactos)
  - Fontes de tráfego activas
  - Pipelines activos
  - ROI gerado até à data
  - Histórico de reuniões / reports
  - NPS / satisfação
- **Saúde da Conta (Health Score):**
  - Verde: Activo, resultados positivos
  - Amarelo: Atenção — métricas abaixo da meta
  - Vermelho: Risco de churn — requere acção imediata
- **Gestão de Onboarding:** Checklist de setup para novos clientes
- **Contractos & Facturação:** Upload de contrato, data de renovação, valor MRR
- **Account Manager:** Atribuição de responsável por cliente

---

### 4.7 Relatórios & Analytics

**Descrição:** Motor de relatórios automáticos e on-demand.

**Tipos de Relatórios:**
- **Report Semanal de Performance** (auto-gerado, por cliente)
- **Report Mensal de ROI** (exportável PDF/Excel)
- **Report de Pipeline** (leads por fase, previsão de fecho)
- **Report de Tráfego** (custo por canal, ROAS comparativo)
- **Report de Calls** (show-up rate, conversão por agente)

**Funcionalidades:**
- Agendamento automático de envio (email ao cliente)
- Templates de relatório por nicho
- Exportação PDF, Excel, CSV
- Dashboard de comparativo YoY / MoM

---

### 4.8 Configurações & Equipa

- Gestão de utilizadores e permissões (Admin / Gestor / Viewer)
- Configuração de integrações (APIs de tráfego, Meet, WhatsApp)
- Templates de mensagens (WhatsApp, Email)
- Configuração de pipelines por cliente
- Notificações e alertas (email, in-app, WhatsApp)
- Auditoria de acções (log de equipa)

---

## 5. LADO B — Portal do Cliente

### 5.1 Dashboard do Cliente

**Descrição:** Visão executiva do que a agência está a fazer pelo cliente.

**KPIs exibidos:**
- Leads recebidas este mês (vs meta)
- Taxa de qualificação (% aprovadas pela IA)
- Agendamentos realizados
- Conversões (fechos) — se o cliente alimentar esta data
- ROI estimado gerado
- Investimento vs Retorno (gráfico)

**Design:** Clean, simples, focado em números — "Não confies em palavras. Olha para os números."

---

### 5.2 Leads & Pipeline (View Only)

**Descrição:** Visibilidade das leads em tratamento — sem edição.

**Funcionalidades:**
- Kanban simplificado (sem drag & drop)
- Lista de leads por fase
- Detalhe de cada lead: origem, data, estado, próximo passo
- Filtros: por data, por canal, por estado
- Contadores de leads em cada fase

**Importante:** O cliente NÃO vê dados de outros clientes. Isolamento total de dados.

---

### 5.3 Agendamentos & Calls

**Descrição:** Histórico e próximas calls entre agência e cliente + calls de vendas geridas.

**Funcionalidades:**
- Próximas calls com a agência (revisão mensal, etc.)
- Histórico de calls de vendas realizadas para o cliente
- Taxa show-up do mês
- Link para agendar nova reunião com o Account Manager

---

### 5.4 ROI & Métricas

**Descrição:** Relatórios de performance para o cliente.

**Funcionalidades:**
- Gráfico de leads ao longo do tempo
- Custo por lead por canal
- Comparativo mês anterior
- Download do relatório mensal (PDF)
- Investimento total vs leads geradas vs ROI

---

### 5.5 Comunicação & Suporte

- Chat directo com o Account Manager
- Submissão de pedidos / feedbacks
- Base de conhecimento (FAQs sobre o serviço)
- Histórico de comunicações

---

## 6. Requisitos Não Funcionais

### Performance
- Tempo de carregamento do dashboard < 2 segundos
- API responses < 500ms (p95)
- Suporte a 100+ utilizadores simultâneos (fase 1)

### Segurança
- Autenticação multi-factor (MFA)
- Isolamento total de dados entre clientes (Row Level Security)
- HTTPS everywhere / TLS 1.3
- Auditoria de todas as acções sensíveis
- GDPR compliance (dados de leads)

### Disponibilidade
- SLA 99.5% uptime
- Backups automáticos diários
- Monitorização de erros em tempo real

### Acessibilidade
- Responsive (desktop-first, mobile funcional)
- Suporte Chrome, Safari, Firefox, Edge

---

## 7. Integrações Externas (Fase 1)

| Integração | Propósito | Prioridade |
|-----------|-----------|-----------|
| Google Meet API | Criação automática de links de call | P1 |
| Google Calendar API | Sincronização de agendamentos | P1 |
| Meta Business API | Facebook + Instagram Ads data | P1 |
| Google Ads API | Google Ads data | P1 |
| WhatsApp Business API | Envio de mensagens automáticas | P1 |
| LinkedIn Marketing API | LinkedIn Ads + orgânico | P2 |
| Google Search Console | SEO data | P2 |
| Google Analytics 4 | Tráfego orgânico web | P2 |
| Stripe / Paygate | Facturação de clientes | P3 |
| Slack / Email | Notificações internas equipa | P2 |

---

## 8. Epics de Alto Nível

| Epic ID | Nome | Lado | Prioridade |
|---------|------|------|-----------|
| EPIC-01 | Autenticação & Onboarding | Ambos | P1 |
| EPIC-02 | Dashboard Master (Agência) | Agência | P1 |
| EPIC-03 | CRM & Gestão de Leads | Agência | P1 |
| EPIC-04 | Pipeline & Kanban | Agência | P1 |
| EPIC-05 | Tracking de Tráfego | Agência | P1 |
| EPIC-06 | Calls & Google Meet | Agência | P1 |
| EPIC-07 | Gestão de Clientes | Agência | P1 |
| EPIC-08 | Relatórios & Analytics | Agência | P2 |
| EPIC-09 | Dashboard do Cliente (Portal) | Portal | P1 |
| EPIC-10 | Pipeline View (Portal) | Portal | P1 |
| EPIC-11 | ROI & Métricas (Portal) | Portal | P2 |
| EPIC-12 | Comunicação & Suporte | Portal | P2 |
| EPIC-13 | Integrações (Meta, Google, LinkedIn) | Ambos | P1 |
| EPIC-14 | Configurações & Permissões | Agência | P2 |
| EPIC-15 | Notificações & Alertas | Ambos | P2 |

---

## 9. MVP — Fase 1 (Lançamento)

### O que entra no MVP:

**Agência (core):**
- [ ] Autenticação (admin + agentes)
- [ ] Dashboard Master (métricas chave)
- [ ] CRM — Lista de leads, perfil, atribuição
- [ ] Kanban — Pipeline com drag & drop
- [ ] Tracking — Facebook Ads + Google Ads (mínimo)
- [ ] Calls — Agendamento + integração Google Meet
- [ ] Gestão de Clientes (básico)

**Portal do Cliente:**
- [ ] Login do cliente
- [ ] Dashboard com KPIs
- [ ] View do Kanban (read-only)
- [ ] Download de relatório mensal

### O que fica para Fase 2:
- LinkedIn Ads API
- Relatórios automáticos agendados
- WhatsApp Business API
- Chat interno
- Facturação / Stripe
- Mobile app

---

## 10. Métricas de Sucesso do Produto

| Métrica | Meta Fase 1 (90 dias) |
|---------|----------------------|
| Tempo de setup de novo cliente | < 2 horas |
| % de leads sem follow-up > 48h | < 5% |
| NPS dos clientes da agência | > 8.0 |
| Adopção do portal pelos clientes | > 80% login mensal |
| Redução de tempo em reports manuais | > 70% |

---

*Documento criado por: Orion (aios-master) orquestrando Squad HYPE Flow OS*  
*Próximo passo: Validação @po + Arquitectura @architect*
