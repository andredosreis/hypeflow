# PRD: {{Nome do Módulo}}

**Versão:** 1.0
**Data:** YYYY-MM-DD
**Tipo:** PRD de módulo / feature
**Responsável:** {{Nome — @agent}}
**Status:** Draft / Em Revisão / Aprovado
**PRD Macro:** [hypeflow-os-prd.md](../hypeflow-os-prd.md)

---

## Resumo

> Dois parágrafos, no máximo.
>
> **Parágrafo 1** — O que é este módulo e qual o seu papel no HYPE Flow OS.
> **Parágrafo 2** — Como é entregue (app, stack, integrações) e qual o seu valor para o utilizador.

---

## 1. Contexto e Problema

### 1.1 Motivação e importância

> Porque é que este módulo existe? Que problema concreto resolve? Incluir dados, incidentes ou observações sempre que possível (não hipóteses).

### 1.2 Público-alvo

- {{Persona 1 do PRD macro}} — {{papel no módulo}}
- {{Persona 2 do PRD macro}} — {{papel no módulo}}

### 1.3 Cenários de uso principais

- {{Cenário 1}}
- {{Cenário 2}}
- {{Cenário 3}}

### 1.4 Local de implantação

> Onde vive este módulo? `app/xxx`, `api/xxx`, `packages/xxx`, integrações externas, etc.

### 1.5 Problemas a resolver

- {{Problema 1}}
- {{Problema 2}}
- {{Problema 3}}

---

## 2. Objetivos e Métricas

| Objetivo | Métrica | Meta |
|----------|---------|------|
| {{Objetivo de negócio ou técnico}} | {{Como se mede}} | {{Número concreto}} |
| ... | ... | ... |

---

## 3. Escopo

### 3.1 Incluso

- {{Funcionalidade 1}}
- {{Funcionalidade 2}}
- {{Integração X}}
- ...

### 3.2 Fora do escopo (explícito)

- {{Item que NÃO faz parte, mesmo que relacionado}}
- {{Módulo que cobre outro caso (link para outro PRD)}}
- {{Funcionalidade adiada para Fase 2}}

---

## 4. Requisitos Funcionais

> Cada requisito tem um ID único (`FR-XXX`) para rastreabilidade PRD → story → teste → PR.

### FR-001 — {{Nome do requisito}}

- {{Bullet do comportamento esperado}}
- {{Condição / regra}}
- {{Formato / contrato de output}}

### FR-002 — {{Nome do requisito}}

- ...

### FR-003 — {{Nome do requisito}}

- ...

---

## 5. Requisitos Não Funcionais

### 5.1 Performance
- {{Latência, throughput, tempo de resposta}}

### 5.2 Disponibilidade
- {{Uptime esperado, failover, graceful degradation}}

### 5.3 Segurança e privacidade
- {{RLS, hashing, PII, TLS, auditoria}}

### 5.4 Observabilidade
- {{Métricas, logs, tracing, alertas}}

### 5.5 Confiabilidade / integridade
- {{Transacções, consistência, idempotência}}

### 5.6 Portabilidade / acessibilidade
- {{Browsers suportados, responsive, WCAG, i18n}}

---

## 6. Arquitetura e Abordagem

> Diagrama simples (ASCII ou link para ficheiro em `docs/architecture/`).
> Fluxo de dados, componentes principais, decisões de design relevantes ao módulo.

```
{{diagrama ASCII ou descrição textual do fluxo}}
```

---

## 7. Decisões e Trade-offs

| Decisão | Justificativa | Trade-off |
|---------|---------------|-----------|
| {{Decisão 1}} | {{Porquê}} | {{Custo aceite}} |
| {{Decisão 2}} | {{Porquê}} | {{Custo aceite}} |

---

## 8. Dependências

### 8.1 Técnicas
- {{Tabelas / pacotes / serviços internos}}

### 8.2 Externas (APIs)
- {{API 1 + versão + propósito}}

### 8.3 Organizacionais
- {{Equipa X precisa fornecer Y}}

### 8.4 Outros módulos HYPE Flow
- [{{Nome do Módulo}}]({{link para PRD}}) — {{natureza da dependência}}

---

## 9. Fluxo do Usuário (User Flow)

> Fluxo principal passo-a-passo. Opcionalmente incluir ASCII diagram, mermaid ou link para Figma.

**Cenário:** {{nome do cenário}}

1. {{Actor}} faz {{acção}}
2. {{Sistema}} responde com {{resultado}}
3. {{Condição}} → {{ramo A}} / {{ramo B}}
4. ...

---

## 10. Riscos e Mitigação

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| {{Risco 1}} | Baixa/Média/Alta | Baixo/Médio/Alto/Crítico | {{Como se mitiga}} |
| {{Risco 2}} | ... | ... | ... |

---

## 11. Critérios de Aceitação

- [ ] {{Critério testável 1}}
- [ ] {{Critério testável 2}}
- [ ] {{Critério testável 3}}
- [ ] Performance dentro das metas da secção 5.1
- [ ] Testes automatizados cobrindo cenários críticos
- [ ] Documentação técnica actualizada

---

## 12. Testes e Validação

### 12.1 Testes obrigatórios
- {{Unitários: o quê}}
- {{Integração: o quê}}
- {{E2E: o quê}}
- {{Carga / stress / resiliência: quando aplicável}}

### 12.2 Cenários de validação manual
- {{Cenário 1}}
- {{Cenário 2}}

---

## 13. Referências

- **Código:** {{paths relevantes}}
- **Stories:** {{`docs/stories/XX.X.story.md` se existirem}}
- **Schema:** {{`docs/architecture/hypeflow-os-schema.md#tabela`}}
- **Arquitectura:** {{link se aplicável}}

---

## 14. Histórico de Revisões

| Versão | Data | Autor | Alterações |
|--------|------|-------|------------|
| 1.0 | YYYY-MM-DD | {{Autor}} | Versão inicial |
