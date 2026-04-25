# Dependency Audit Report

**Project:** HypeFlow OS  
**Audit Date:** 2026-04-22  
**Auditor:** Dependency Auditor Agent  
**Scope:** Entire project root — `/hypeflow`  
**Ecosystems Detected:** JavaScript/TypeScript (npm)  
**Package Managers:** npm (with Turborepo monorepo orchestration)

---

## Notas de Verificação Pós-Auditoria

### CVE-2025-29927 — Status Real no Lockfile

O `package.json` de `@hypeflow/app` e `@hypeflow/agency` declara `^14.2.20`, o que gerou alerta crítico na auditoria. Verificação do lockfile confirma que a versão resolvida é `14.2.35` (top-level `node_modules/next`) e `14.2.33` nas resoluções de workspace. **Ambas as versões são superiores a 14.2.25 (fix da CVE).** A CVE-2025-29927 está mitigada no estado atual do lockfile. Não há ação imediata necessária para esta CVE.

Recomendação: fixar a versão declarada no `package.json` de `@hypeflow/app` e `@hypeflow/agency` para `14.2.35` (em vez de `^14.2.20`) para evitar que um `npm install` limpo num CI sem lockfile resolva para uma versão vulnerável.

### apps/agency e apps/portal — Status de Produção

`apps/agency` (18 ficheiros TSX) e `apps/portal` (9 ficheiros TSX) são **apps legadas** — os protótipos originais separados que foram substituídos pelo app unificado `apps/hypeflow` (55 ficheiros TSX) através de route groups na Wave 19. A arquitectura documenta explicitamente: `hypeflow/ — App unificado — admin + portal via route groups (Wave 19)`. O histórico git confirma que as apps legacy não têm actividade desde as waves iniciais. As dependências e CVEs reportadas para estas duas apps não têm impacto em produção activa — são resquícios não removidos do repositório.

---

## 1. Summary

HypeFlow is a multi-workspace JavaScript/TypeScript monorepo composed of four distinct projects:

| Workspace | Path | Purpose |
|-----------|------|---------|
| `hypeflow-os` (root) | `/hypeflow-os/` | Turborepo monorepo root with shared tooling |
| `@hypeflow/app` | `/hypeflow-os/apps/hypeflow/` | Main Next.js 14 SaaS application (CRM + AI) — ACTIVE |
| `@hypeflow/portal` | `/hypeflow-os/apps/portal/` | Client-facing portal (Next.js 14) — LEGACY (Wave 19) |
| `@hypeflow/agency` | `/hypeflow-os/apps/agency/` | Agency management app (Next.js 14) — LEGACY (Wave 19) |
| `hype-flow-landing` | `/hype-flow-landing/` | Marketing landing page (Vite + React 19) |
| `@aios-core/core` | `/.aios-core/` | Internal CLI framework tooling |
| `@aiox/squad-creator` | `/squads/squad-creator/` | Agent orchestration tooling |

The audit covers **direct dependencies only** across all seven workspaces. The most critical concerns are:

1. **Next.js 14 is End of Life** (since October 26, 2025) and carries three known CVEs: CVE-2025-29927 (Critical — middleware auth bypass), CVE-2025-55184 (High — DoS via RSC), and CVE-2025-55183 (Medium — source code exposure via RSC). This affects `@hypeflow/app`, `@hypeflow/portal`, and `@hypeflow/agency`.
2. **ESLint 8 is End of Life** (since October 5, 2024) with no further security patches.
3. **`@studio-freight/lenis`** has been abandoned in favor of the renamed `lenis` package; the current version is two years old with no further updates.
4. **`tailwindcss-animate`** has not been updated in three years and has no active maintenance.
5. **`inquirer` v8** (used in `.aios-core`) is a legacy version replaced by `@inquirer/prompts`; the latest stable `inquirer` is v13.
6. **`execa` v5** (used in `.aios-core`) is four major versions behind the current v9.
7. **Tailwind CSS v3** (used in the main apps) is one major version behind v4, which ships with significant CSS architecture improvements. The landing page already uses v4.
8. Several packages are outdated by minor or patch versions and are low-risk.

Lockfiles are present for `hypeflow-os`, `hype-flow-landing`, and `.aios-core`. The shared packages (`@hypeflow/ui`, `@hypeflow/database`, `@hypeflow/integrations`, `@hypeflow/email`, `@hypeflow/config`) declare no direct npm dependencies and are therefore not in scope.

---

## 2. Critical Issues

### CVE-2025-29927 — Next.js Middleware Authorization Bypass (CRITICAL)

- **CVSS Score:** 9.1 (Critical)
- **Affected Versions:** Next.js 11.1.4 through 15.2.2
- **Fixed In:** Next.js 14.2.25+ (14.x branch), 15.2.3+ (15.x branch)
- **Currently Installed:** `^14.2.20` declared; lockfile resolve confirma `14.2.35` / `14.2.33` — ambas acima do fix. **Mitigado.**
- **Impact:** An attacker can craft an HTTP request with the `x-middleware-subrequest` header to bypass all Next.js middleware guards — including the authentication redirects in `middleware.ts`. This means unauthenticated access to `/admin/*` and `/client/*` routes is possible.

### CVE-2025-55184 — React Server Components Denial of Service (HIGH)

- **CVSS Score:** 7.5 (High)
- **Affected Versions:** React 19.0.0 – 19.2.1; Next.js 13.x – 16.x (App Router)
- **Fixed In:** React 19.2.4+; Next.js 14.2.35+
- **Currently Installed:** React 18.x in `@hypeflow/app`, `@hypeflow/portal`, `@hypeflow/agency` (not directly affected by the React RSC DoS); React 19.x in `hype-flow-landing` (19.2.4 declared, which is the fixed version)
- **Impact:** Malicious deserialization payload causes infinite recursion and server hang. React 18 workspaces are not affected by this specific CVE since it targets the RSC flight protocol in React 19.

### CVE-2025-55183 — React Server Components Source Code Exposure (MEDIUM)

- **CVSS Score:** 5.3 (Medium)
- **Affected Versions:** React 19.0.0 – 19.2.1; Next.js 13.x – 16.x (App Router)
- **Fixed In:** React 19.2.4+; Next.js 14.2.35+
- **Currently Installed:** Same as above. React 18 workspaces not affected. `hype-flow-landing` at React 19.2.4 (fixed).

### ESLint v8 — End of Life (HIGH)

- **EOL Date:** October 5, 2024
- **Affected Workspaces:** `@hypeflow/app` (`^8.57.1`), `@hypeflow/agency` (`^8.57.1`) — agency é LEGACY
- **Current Stable:** ESLint 10.2.1
- **Impact:** No further security patches. Any new vulnerabilities discovered in ESLint 8 will remain unpatched.

### Next.js 14 — End of Life (HIGH)

- **EOL Date:** October 26, 2025
- **Affected Workspaces:** `@hypeflow/app` (ACTIVE), `@hypeflow/portal` (LEGACY), `@hypeflow/agency` (LEGACY)
- **Current Stable:** Next.js 16.2.4
- **Impact:** No security patches for any newly discovered vulnerabilities going forward. The project is running an unsupported framework version across all three application workspaces.

### `@studio-freight/lenis` — Abandoned Package (MEDIUM)

- **Last Published:** 2 years ago (version 1.0.42)
- **Affected Workspace:** `hype-flow-landing`
- **Replacement:** `lenis` (latest: 1.3.23, actively maintained)
- **Impact:** No further security or bug fixes. The package was renamed and all development has moved to the new `lenis` package.

---

## 3. Dependencies

This section covers all **direct dependencies** across all workspaces. Workspaces with no npm dependencies declared (`@hypeflow/ui`, `@hypeflow/database`, `@hypeflow/integrations`, `@hypeflow/email`, `@hypeflow/config`) are omitted.

### 3.1 Monorepo Root — `hypeflow-os`

| Dependency | Current Version | Latest Version | Status |
|------------|-----------------|----------------|--------|
| prettier | ^3.4.2 | 3.8.3 | Outdated (minor) |
| turbo | ^2.9.4 | 2.9.6 | Outdated (patch) |
| typescript | ^5.7.3 | 6.0.3 | Outdated (major) |

### 3.2 Main App — `@hypeflow/app` (ACTIVE)

| Dependency | Current Version | Latest Version | Status |
|------------|-----------------|----------------|--------|
| @dnd-kit/core | ^6.3.1 | 6.3.1 | Up to Date |
| @dnd-kit/sortable | ^8.0.0 | 8.0.0 | Up to Date |
| @dnd-kit/utilities | ^3.2.2 | 3.2.2 | Up to Date |
| @hookform/resolvers | ^3.10.0 | 3.10.0 | Up to Date |
| @supabase/ssr | ^0.5.2 | 0.10.2 | Outdated (minor) |
| @supabase/supabase-js | ^2.48.1 | 2.103.3 | Outdated (minor) |
| @tanstack/react-query | ^5.64.2 | 5.99.2 | Outdated (minor) |
| @trpc/client | ^11.0.0 | 11.16.0 | Outdated (minor) |
| @trpc/react-query | ^11.0.0 | 11.16.0 | Outdated (minor) |
| @trpc/server | ^11.0.0 | 11.16.0 | Outdated (minor) |
| @xyflow/react | ^12.10.2 | 12.10.2 | Up to Date |
| clsx | ^2.1.1 | 2.1.1 | Up to Date |
| date-fns | ^4.1.0 | 4.1.0 | Up to Date |
| framer-motion | ^11.18.2 | 12.38.0 | Outdated (major) |
| lucide-react | ^0.474.0 | 1.8.0 | Outdated (major) |
| next | ^14.2.20 | 16.2.4 | Legacy / EOL (lockfile: 14.2.35 — CVE mitigada) |
| react | ^18.3.1 | 19.2.5 | Outdated (major) |
| react-dom | ^18.3.1 | 19.2.5 | Outdated (major) |
| react-hook-form | ^7.54.2 | 7.73.1 | Outdated (minor) |
| recharts | ^2.15.0 | 3.8.1 | Outdated (major) |
| superjson | ^2.2.2 | 2.2.6 | Outdated (patch) |
| tailwind-merge | ^2.6.0 | 3.5.0 | Outdated (major) |
| tailwindcss-animate | ^1.0.7 | 1.0.7 | Unmaintained (3 years, no update) |
| zod | ^3.24.1 | 4.3.6 | Outdated (major) |
| zustand | ^5.0.3 | 5.0.12 | Outdated (patch) |
| @types/node (dev) | ^22.10.7 | 22.x | Up to Date |
| @types/react (dev) | ^18.3.18 | 18.x | Up to Date |
| @types/react-dom (dev) | ^18.3.5 | 18.x | Up to Date |
| autoprefixer (dev) | ^10.4.20 | 10.4.27 | Outdated (patch) |
| eslint (dev) | ^8.57.1 | 10.2.1 | Legacy / EOL |
| eslint-config-next (dev) | ^14.2.20 | 16.x | Legacy / EOL |
| postcss (dev) | ^8.5.1 | 8.5.10 | Outdated (patch) |
| tailwindcss (dev) | ^3.4.17 | 4.2.4 | Outdated (major) |
| typescript (dev) | ^5.7.3 | 6.0.3 | Outdated (major) |

### 3.3 Portal App — `@hypeflow/portal` (LEGACY)

| Dependency | Current Version | Latest Version | Status |
|------------|-----------------|----------------|--------|
| next | 14.2.35 | 16.2.4 | Legacy / EOL |
| react | ^18.3.1 | 19.2.5 | Outdated (major) |
| react-dom | ^18.3.1 | 19.2.5 | Outdated (major) |
| lucide-react | ^0.400.0 | 1.8.0 | Outdated (major) |
| recharts | ^2.12.7 | 3.8.1 | Outdated (major) |
| date-fns | ^3.6.0 | 4.1.0 | Outdated (major) |
| @supabase/supabase-js | ^2.44.2 | 2.103.3 | Outdated (minor) |
| @supabase/ssr | ^0.3.0 | 0.10.2 | Outdated (minor) |
| clsx | ^2.1.1 | 2.1.1 | Up to Date |
| @types/node (dev) | ^20.14.9 | 22.x | Outdated (major) |
| @types/react (dev) | ^18.3.3 | 18.x | Up to Date |
| @types/react-dom (dev) | ^18.3.0 | 18.x | Up to Date |
| autoprefixer (dev) | ^10.4.19 | 10.4.27 | Outdated (patch) |
| postcss (dev) | ^8.4.39 | 8.5.10 | Outdated (minor) |
| tailwindcss (dev) | ^3.4.4 | 4.2.4 | Outdated (major) |
| typescript (dev) | ^5.5.3 | 6.0.3 | Outdated (major) |

### 3.4 Agency App — `@hypeflow/agency` (LEGACY)

| Dependency | Current Version | Latest Version | Status |
|------------|-----------------|----------------|--------|
| @supabase/supabase-js | ^2.48.1 | 2.103.3 | Outdated (minor) |
| @supabase/ssr | ^0.5.2 | 0.10.2 | Outdated (minor) |
| @tanstack/react-query | ^5.64.2 | 5.99.2 | Outdated (minor) |
| @trpc/client | ^11.0.0 | 11.16.0 | Outdated (minor) |
| @trpc/react-query | ^11.0.0 | 11.16.0 | Outdated (minor) |
| @trpc/server | ^11.0.0 | 11.16.0 | Outdated (minor) |
| @dnd-kit/core | ^6.3.1 | 6.3.1 | Up to Date |
| @dnd-kit/sortable | ^8.0.0 | 8.0.0 | Up to Date |
| @dnd-kit/utilities | ^3.2.2 | 3.2.2 | Up to Date |
| next | ^14.2.20 | 16.2.4 | Legacy / EOL (lockfile: 14.2.33 — CVE mitigada) |
| react | ^18.3.1 | 19.2.5 | Outdated (major) |
| react-dom | ^18.3.1 | 19.2.5 | Outdated (major) |
| recharts | ^2.15.0 | 3.8.1 | Outdated (major) |
| zustand | ^5.0.3 | 5.0.12 | Outdated (patch) |
| react-hook-form | ^7.54.2 | 7.73.1 | Outdated (minor) |
| zod | ^3.24.1 | 4.3.6 | Outdated (major) |
| @hookform/resolvers | ^3.10.0 | 3.10.0 | Up to Date |
| date-fns | ^4.1.0 | 4.1.0 | Up to Date |
| framer-motion | ^11.18.2 | 12.38.0 | Outdated (major) |
| superjson | ^2.2.2 | 2.2.6 | Outdated (patch) |
| lucide-react | ^0.474.0 | 1.8.0 | Outdated (major) |
| clsx | ^2.1.1 | 2.1.1 | Up to Date |
| tailwind-merge | ^2.6.0 | 3.5.0 | Outdated (major) |
| tailwindcss-animate | ^1.0.7 | 1.0.7 | Unmaintained (3 years, no update) |
| typescript (dev) | ^5.7.3 | 6.0.3 | Outdated (major) |
| tailwindcss (dev) | ^3.4.17 | 4.2.4 | Outdated (major) |
| autoprefixer (dev) | ^10.4.20 | 10.4.27 | Outdated (patch) |
| postcss (dev) | ^8.5.1 | 8.5.10 | Outdated (patch) |
| eslint (dev) | ^8.57.1 | 10.2.1 | Legacy / EOL |
| eslint-config-next (dev) | ^14.2.20 | 16.x | Legacy / EOL |

### 3.5 Landing Page — `hype-flow-landing`

| Dependency | Current Version | Latest Version | Status |
|------------|-----------------|----------------|--------|
| @studio-freight/lenis | ^1.0.42 | 1.0.42 (abandoned) | Abandoned — use `lenis` 1.3.23 |
| @tailwindcss/postcss | ^4.2.2 | 4.2.4 | Outdated (patch) |
| clsx | ^2.1.1 | 2.1.1 | Up to Date |
| framer-motion | ^12.38.0 | 12.38.0 | Up to Date |
| lightningcss | ^1.32.0 | 1.32.0 | Up to Date |
| lucide-react | ^1.6.0 | 1.8.0 | Outdated (minor) |
| openai | ^6.32.0 | 6.34.0 | Outdated (patch) |
| react | ^19.2.4 | 19.2.5 | Outdated (patch) |
| react-dom | ^19.2.4 | 19.2.5 | Outdated (patch) |
| tailwind-merge | ^3.5.0 | 3.5.0 | Up to Date |
| @eslint/js (dev) | ^9.39.4 | 10.2.1 | Outdated (major) |
| @types/react (dev) | ^19.2.14 | 19.x | Up to Date |
| @types/react-dom (dev) | ^19.2.3 | 19.x | Up to Date |
| @vitejs/plugin-react (dev) | ^6.0.1 | 6.0.1 | Up to Date |
| autoprefixer (dev) | ^10.4.27 | 10.4.27 | Up to Date |
| eslint (dev) | ^9.39.4 | 10.2.1 | Outdated (minor) |
| eslint-plugin-react-hooks (dev) | ^7.0.1 | 7.0.1 | Up to Date |
| eslint-plugin-react-refresh (dev) | ^0.5.2 | 0.5.2 | Up to Date |
| globals (dev) | ^17.4.0 | 17.4.0 | Up to Date |
| postcss (dev) | ^8.5.8 | 8.5.10 | Outdated (patch) |
| tailwindcss (dev) | ^4.2.2 | 4.2.4 | Outdated (patch) |
| vite (dev) | ^8.0.2 | 8.0.9 | Outdated (patch) |

### 3.6 AIOS Core CLI — `.aios-core`

| Dependency | Current Version | Latest Version | Status |
|------------|-----------------|----------------|--------|
| ajv | ^8.17.1 | 8.18.0 | Outdated (patch) |
| chalk | ^4.1.2 | 5.4.1 | Outdated (major) |
| commander | ^12.1.0 | 14.0.0 | Outdated (major) |
| diff | ^5.2.0 | 7.0.0 | Outdated (major) |
| execa | ^5.1.1 | 9.6.0 | Outdated (major — legacy) |
| fast-glob | ^3.3.3 | 3.3.3 | Up to Date |
| fs-extra | ^11.3.0 | 11.3.0 | Up to Date |
| glob | ^10.4.4 | 11.0.2 | Outdated (major) |
| highlight.js | ^11.9.0 | 11.11.1 | Outdated (minor) |
| inquirer | ^8.2.6 | 13.2.2 | Outdated (major — legacy) |
| js-yaml | ^4.1.0 | 4.1.0 | Up to Date |
| semver | ^7.7.2 | 7.7.2 | Up to Date |
| tar | ^7.5.7 | 7.5.7 | Up to Date |
| validator | ^13.15.15 | 13.15.15 | Up to Date |

### 3.7 Squad Creator — `squads/squad-creator`

| Dependency | Current Version | Latest Version | Status |
|------------|-----------------|----------------|--------|
| js-yaml | ^4.1.0 | 4.1.0 | Up to Date |

---

## 4. Risk Analysis

| Severity | Dependency | Workspace(s) | Issue | Details |
|----------|------------|--------------|-------|---------|
| Critical | next ^14.2.20 | @hypeflow/app (ACTIVE) | CVE-2025-29927 | Declarado ^14.2.20; lockfile resolve 14.2.35 — CVE mitigada. Fixar a versão declarada para prevenir regressão em CI limpo. |
| Critical | next ^14.2.20 | @hypeflow/agency (LEGACY) | CVE-2025-29927 | Lockfile resolve 14.2.33 — CVE mitigada. App é legacy. |
| Critical | next | @hypeflow/app, @hypeflow/portal, @hypeflow/agency | EOL Framework | Next.js 14 EOL desde outubro 2025. Sem patches futuros. Impacto real apenas em @hypeflow/app (ACTIVE). |
| High | eslint ^8.57.1 | @hypeflow/app (ACTIVE) | EOL — sem patches desde out 2024 | ESLint 10.2.1 é o atual estável. |
| High | @supabase/ssr ^0.3.0 | @hypeflow/portal (LEGACY) | 7 minor versions atrás | Impacto em produção nulo — app é legacy. |
| High | execa ^5.1.1 | .aios-core | 4 majors atrás (v5 vs v9) | CLI tooling. Sem CVE ativo mas risco de manutenção. |
| High | inquirer ^8.2.6 | .aios-core | Legacy — substituído por @inquirer/prompts | v8 recebe apenas fixes críticos. |
| Medium | @studio-freight/lenis ^1.0.42 | hype-flow-landing | Abandonado — renomeado para `lenis` | Sem atualizações futuras. |
| Medium | tailwindcss-animate ^1.0.7 | @hypeflow/app | Sem manutenção há 3 anos | Não compatível com Tailwind v4. |
| Medium | framer-motion ^11.18.2 | @hypeflow/app | Um major atrás (v11 vs v12) | v12 tem breaking changes; pacote rebranded para `motion`. |
| Medium | zod ^3.24.1 | @hypeflow/app | Um major atrás (v3 vs v4) | Zod 4 tem breaking changes em string handling e error API. |
| Medium | recharts ^2.15.0 | @hypeflow/app | Um major atrás (v2 vs v3) | Recharts 3 muda padrões da API de charts. |
| Medium | lucide-react ^0.474.0 | @hypeflow/app | Major version atrás (0.x vs 1.x) | Lucide 1.0 revisou icon API e renomeou alguns ícones. |
| Medium | tailwindcss ^3.4.x | @hypeflow/app | Um major atrás (v3 vs v4) | v4 usa config CSS-native. Landing já usa v4. |
| Medium | react ^18.3.1 | @hypeflow/app | Um major atrás (v18 vs v19) | React 19 depreca alguns padrões. |
| Low | @supabase/supabase-js ^2.48.1 | @hypeflow/app | Minor drift (2.48 vs 2.103) | Sem CVE ativa. Grande número de releases perdidas. |
| Low | @tanstack/react-query ^5.64.2 | @hypeflow/app | Minor drift (5.64 vs 5.99) | Sem CVE. Numerosos bug fixes. |
| Low | @trpc/* ^11.0.0 | @hypeflow/app | Minor drift (11.0 vs 11.16) | Sem breaking changes. |
| Low | turbo ^2.9.4 | hypeflow-os | Patch drift | Sem CVE. |
| Low | prettier ^3.4.2 | hypeflow-os | Minor drift | Sem CVE. |

---

## 5. Unverified Dependencies

| Dependency | Current Version | Reason Not Verified |
|------------|-----------------|---------------------|
| eslint-config-next | ^14.2.20 | Versão bundled com Next.js; não verificada independentemente no npm. |
| @vitejs/plugin-react | ^6.0.1 | Confirmado como atual por search mas não cross-validado no registry. |
| tailwind-merge | ^2.6.0 / ^3.5.0 | Dois workspaces em majors diferentes; análise de breaking changes v2→v3 não completada. |
| @hookform/resolvers | ^3.10.0 | Confirmado como atual; latest minor não verificado independentemente. |

---

## 6. Critical File Analysis

### 1. `hypeflow-os/apps/hypeflow/middleware.ts`

Authentication gateway for the entire main application. Intercepts every HTTP request and enforces authentication redirects for `/admin/*` and `/client/*`. CVE-2025-29927 permite bypass via header crafted — mitigada no lockfile atual (14.2.35).

**Risky Dependencies:** `next` (EOL — lockfile patched), `@supabase/ssr` (outdated)

---

### 2. `hypeflow-os/apps/hypeflow/lib/supabase/middleware.ts`

Implements `updateSession()` called by `middleware.ts`. Contains authentication redirect rules, user-type resolution, and session cookie management.

**Risky Dependencies:** `next/server` (EOL), `@supabase/ssr` (0.5.2 vs 0.10.2)

---

### 3. `hypeflow-os/apps/hypeflow/server/trpc.ts`

Single tRPC server initialization point for the entire backend. Creates authentication context, defines `agencyProcedure` and `clientProcedure` middleware, integrates superjson. Every API call passes through this file.

**Risky Dependencies:** `@trpc/server` (minor drift), `zod` (major behind), `superjson` (patch drift), `@supabase/supabase-js` (significant minor drift)

---

### 4. `hypeflow-os/apps/hypeflow/app/api/webhooks/ghl/route.ts`

Inbound GHL webhook handler. Public endpoint protected only by shared secret check — verificação é skipped se `GHL_WEBHOOK_SECRET` env var está ausente. Running on EOL Next.js 14.

**Risky Dependencies:** `next` (EOL), `@supabase/supabase-js` (significant minor drift)

---

### 5. `hypeflow-os/apps/hypeflow/lib/supabase/server.ts`

Creates authenticated and service-role Supabase clients. `createServiceClient()` usa `SUPABASE_SERVICE_ROLE_KEY` que bypassa toda a RLS. Qualquer regressão em `@supabase/ssr` afeta segurança de todas as operações server-side.

**Risky Dependencies:** `@supabase/ssr` (0.5.2 vs 0.10.2), `next/headers` (EOL)

---

### 6. `hypeflow-os/apps/hypeflow/app/api/ai/agent/route.ts`

AI agent endpoint proxying lead data (names, scores, stages) to the Anthropic API. System prompt with business logic inline.

**Risky Dependencies:** `next` (EOL), `next/server` (EOL)

---

### 7. `hypeflow-os/apps/hypeflow/server/root.ts`

tRPC app router — composes all 16+ sub-routers. Complete API surface contract between frontend and backend.

**Risky Dependencies:** `@trpc/server` (minor drift — 11.0.0 vs 11.16.0)

---

### 8. `hypeflow-os/apps/hypeflow/app/layout.tsx`

Root Next.js App Router layout wrapping every page with `TRPCProvider`. Any breaking change in the App Router layout contract requires changes here first.

**Risky Dependencies:** `next` (EOL), `@trpc/react-query` (minor drift)

---

### 9. `hypeflow-os/apps/hypeflow/components/providers/TRPCProvider.tsx`

Wraps the entire React app with `TRPCProvider` and `QueryClientProvider`. Bridges `@trpc/react-query` e `@tanstack/react-query`.

**Risky Dependencies:** `@trpc/react-query` (minor drift), `@tanstack/react-query` (5.64.2 vs 5.99.2)

---

### 10. `hypeflow-os/apps/hypeflow/lib/trpc/client.ts`

tRPC client with HTTP link and `superjson` transformer. Must stay in sync with server-side serialization. Version mismatch in `superjson` silently breaks Date, BigInt, and undefined serialization across the entire API.

**Risky Dependencies:** `@trpc/client` (11.0.0 vs 11.16.0), `superjson` (patch drift)

---

## 7. Integration Notes

| Dependency | Used In | Integration Summary |
|------------|---------|---------------------|
| next | @hypeflow/app (ACTIVE), portal/agency (LEGACY) | Core framework. App Router with RSC used in main app. |
| @supabase/supabase-js | All three apps | Primary database and authentication client. |
| @supabase/ssr | All three apps | Server-side Supabase client factory. Used in middleware and service-role clients. |
| @trpc/server, @trpc/client, @trpc/react-query | @hypeflow/app | End-to-end typesafe API layer. All admin and portal data goes through tRPC routers. |
| @tanstack/react-query | @hypeflow/app | Server state management paired with tRPC. |
| zod | @hypeflow/app | Schema validation for tRPC inputs and all forms. |
| react-hook-form + @hookform/resolvers | @hypeflow/app | Form state management with Zod integration. |
| zustand | @hypeflow/app | Client-side global UI state (modals, filters). |
| framer-motion | @hypeflow/app, hype-flow-landing | Animations and transitions. |
| @xyflow/react | @hypeflow/app | Workflow/automation builder canvas. No fallback. |
| @dnd-kit/* | @hypeflow/app | Drag-and-drop for pipeline kanban boards. |
| recharts | @hypeflow/app, portal, agency | Data visualization in analytics dashboards. |
| superjson | @hypeflow/app | tRPC serialization — must stay in sync on client and server. |
| lucide-react | All apps | Icon library. Version inconsistency across workspaces. |
| tailwindcss | All apps | Utility CSS. v3 in main apps, v4 in landing — incompatible configs. |
| tailwindcss-animate | @hypeflow/app | Animation plugin. Not compatible with Tailwind v4. |
| date-fns | @hypeflow/app, portal | Date utilities. Version split: v4 in main, v3 in portal (LEGACY). |
| openai | hype-flow-landing | OpenAI API client for landing page AI feature. |
| @studio-freight/lenis | hype-flow-landing | Smooth scroll. Abandoned. |
| vite | hype-flow-landing | Build tool. Latest stable v8. |
| turbo | hypeflow-os | Monorepo build orchestration. |
| inquirer | .aios-core | Interactive CLI prompts. Legacy v8. |
| execa | .aios-core | Shell command execution. Legacy v5. |
| ajv | .aios-core | JSON schema validation for AIOS task and config definitions. |
| chalk | .aios-core | Terminal color output for the AIOS CLI. |
| commander | .aios-core | CLI command parser for the AIOS framework. |
| js-yaml | .aios-core, squads/squad-creator | YAML parsing for agent definitions. |

---

## 8. Recommendations Summary (Prioritized, Analysis Only)

### P0 — Ação Imediata

1. **Fixar versão do `next` no `package.json` de `@hypeflow/app`** de `^14.2.20` para `14.2.35`. O lockfile atual resolve corretamente, mas a declaração `^14.2.20` permite regressão para versão vulnerável num `npm install` limpo (CI sem lockfile). Um commit de uma linha elimina esse risco.

### P1 — Alta Prioridade

2. **Substituir `eslint ^8` por `eslint ^10`** em `@hypeflow/app`. ESLint 8 EOL desde outubro 2024.

3. **Migrar `execa`** de v5 para v9 no `.aios-core`. CLI de execução de shell 4 majors atrás.

4. **Migrar `inquirer`** de v8 para `@inquirer/prompts` ou `inquirer ^13` no `.aios-core`.

### P2 — Média Prioridade

5. **Substituir `@studio-freight/lenis`** por `lenis` na landing page.

6. **Substituir `tailwindcss-animate`** por alternativa compatível com Tailwind v4.

7. **Resolver inconsistência de `lucide-react`** entre workspaces — alinhar para uma versão única.

8. **Planear migração Tailwind v3 → v4** para `@hypeflow/app`. Landing já usa v4.

### P3 — Baixa Prioridade / Backlog

9. **Planear migração Zod v3 → v4.** Breaking changes em todos os routers tRPC.

10. **Planear migração Recharts v2 → v3.** Breaking changes nos dashboards.

11. **Atualizar `@supabase/supabase-js`** de 2.48 para 2.103 — grande número de releases perdidas.

12. **Uniformizar versão TypeScript** entre workspaces (portal usa 5.5.3, outros 5.7.3).

13. **Avaliar remoção de `apps/agency` e `apps/portal`** do repositório — são apps legadas supersedidas pelo `apps/hypeflow` unificado na Wave 19. A presença destes workspaces adiciona ruído à auditoria e pode confundir colaboradores futuros.

---

*Report generated: 2026-04-22. All version information sourced from npm registry, GitHub releases, and CVE databases at time of audit.*
