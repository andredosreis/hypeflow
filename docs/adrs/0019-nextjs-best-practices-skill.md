# ADR-0019 — Adopção do Skill `next-best-practices` como Standard Next.js

**Status:** Accepted  
**Date:** 2026-04-23  
**Deciders:** Andre dos Reis

---

## Contexto

O HypeFlow OS usa Next.js 14.2.35 com App Router como framework full-stack. À medida que o
projecto cresce, o número de decisões repetitivas sobre como estruturar componentes, buscar dados,
gerir erros e separar Server de Client Components aumenta.

Sem um padrão documentado e executável, cada developer (ou sessão de AI) pode tomar decisões
inconsistentes — async Client Components, props não-serializáveis, waterfalls desnecessários,
`redirect()` dentro de try-catch — todos erros silenciosos que são difíceis de detectar.

A Vercel Labs publicou um skill oficial (`vercel-labs/next-skills`) com boas práticas curadas
para o ecossistema Next.js App Router, instalável via o ecosistema `skills` compatível com
Claude Code e outros agentes AI.

---

## Decisão

Adoptamos o skill `next-best-practices` de `vercel-labs/next-skills` como standard oficial de
coding Next.js para o HypeFlow OS, com as seguintes adaptações:

1. **`async-patterns.md` ignorado** — documenta comportamento de Next.js 15+ onde `params` e
   `searchParams` são assíncronos. O HypeFlow OS usa 14.2.35 onde ainda são síncronos.

2. **`runtime-selection.md` reforçado** — sempre Node.js runtime. O Supabase JS client não é
   compatível com Edge runtime.

3. **`self-hosting.md` ignorado** — o HypeFlow OS faz deploy na Vercel, não em self-hosted.

O skill foi instalado via:

```bash
npx skills add https://github.com/vercel-labs/next-skills --skill next-best-practices --yes
```

Localização: `.agents/skills/next-best-practices/` (symlink para `.claude/skills/`)

O guideline completo adaptado ao HypeFlow OS está em:
`docs/guidelines/nextjs-best-practices-guidelines.md`

---

## Alternativas Consideradas

### 1. Escrever regras manualmente no CLAUDE.md
- **Prós:** Controlo total, sem dependência externa
- **Contras:** Manutenção manual, sem actualizações automáticas, mais trabalho

### 2. Não ter standard — decidir caso a caso
- **Prós:** Flexibilidade
- **Contras:** Inconsistência, erros repetidos, tempo perdido a debater as mesmas decisões

### 3. Skill `next-best-practices` da Vercel Labs (escolhida)
- **Prós:** Mantido pela equipa que criou o Next.js, actualizado com cada versão, avaliação de
  segurança limpa, compatível com Claude Code via symlink automático
- **Contras:** Algumas regras para Next.js 15+ não se aplicam à versão actual; repositório de
  terceiros sujeito a arquivamento ou mudança de URL

---

## Consequências

### Positivas
- Padrões consistentes em todas as sessões de desenvolvimento (humano e AI)
- Erros comuns documentados com exemplos Good/Bad (RSC boundaries, hidratação, redirect em try-catch)
- Skill actualizável com `npx skills add ... --yes` quando houver nova versão
- Disponível para todos os agentes compatíveis (Cursor, Codex, Gemini CLI, GitHub Copilot)

### Negativas / Riscos

| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|
| Regras Next.js 15+ aplicadas em 14.x | Alta | Médio | Aviso de versão no topo do guideline |
| Repositório arquivado ou URL alterado | Baixa | Baixo | Ver abaixo |
| Skill desactualizado face ao Next.js | Média | Médio | Rever em cada major release |

**Mitigação do risco de repositório externo:**  
O skill `vercel-labs/next-skills` é um repositório de terceiros — pode ser arquivado, movido ou
deixar de ser mantido. Se `npx skills add` falhar por qualquer razão, **o guideline adaptado em
`docs/guidelines/nextjs-best-practices-guidelines.md` é a fonte de verdade local** e permanece
funcional independentemente do estado do repositório upstream. O skill é apenas o mecanismo de
actualização; o conhecimento já está capturado e adaptado ao HypeFlow OS localmente.

### Acções de Follow-up
- Quando actualizar para Next.js 15: remover aviso de `async-patterns.md` no guideline e rever
  secção de params assíncronos
- Rever o skill após cada major release do Next.js: `npx skills add https://github.com/vercel-labs/next-skills --skill next-best-practices --yes`
- Se o repositório upstream for arquivado: o guideline local continua válido; actualizar manualmente
  a partir das release notes do Next.js

---

## Regras Críticas Adoptadas

| Regra | Ficheiro de origem |
|---|---|
| Client Components não podem ser `async` | `rsc-boundaries.md` |
| Props Server → Client devem ser serializáveis | `rsc-boundaries.md` |
| `redirect()` fora de try-catch em Server Actions | `error-handling.md` |
| `useSearchParams` sempre dentro de `<Suspense>` | `suspense-boundaries.md` |
| Server Components para leituras, Server Actions para mutações | `data-patterns.md` |
| Route Handlers apenas para APIs externas e webhooks | `data-patterns.md` |
| Node.js runtime por defeito (nunca Edge no HypeFlow OS) | `runtime-selection.md` |
| `next/image` sempre em vez de `<img>` | `image.md` |
| `Promise.all` para fetches independentes | `data-patterns.md` |
