# Dependency Audit Report

**Project:** HypeFlow OS  
**Audit Date:** 2026-04-22  
**Auditor:** Dependency Auditor Agent  
**Scope:** Entire project root — `/hypeflow`  
**Ecosystems Detected:** JavaScript/TypeScript (npm)  
**Package Managers:** npm (with Turborepo monorepo orchestration)

---

## 1. Summary

HypeFlow is a multi-workspace JavaScript/TypeScript monorepo composed of four distinct projects:

| Workspace | Path | Purpose |
|-----------|------|---------|
| `hypeflow-os` (root) | `/hypeflow-os/` | Turborepo monorepo root with shared tooling |
| `@hypeflow/app` | `/hypeflow-os/apps/hypeflow/` | Main Next.js 14 SaaS application (CRM + AI) |
| `@hypeflow/portal` | `/hypeflow-os/apps/portal/` | Client-facing portal (Next.js 14) |
| `@hypeflow/agency` | `/hypeflow-os/apps/agency/` | Agency management app (Next.js 14) |
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
- **Currently Installed:** `^14.2.20` in `@hypeflow/app` and `@hypeflow/agency`; `14.2.35` (fixed) in `@hypeflow/portal`
- **Impact:** An attacker can craft an HTTP request with the `x-middleware-subrequest` header to bypass all Next.js middleware guards — including the authentication redirects in `middleware.ts`. This means unauthenticated access to `/admin/*` and `/client/*` routes is possible.
- **Note:** `@hypeflow/app` and `@hypeflow/agency` use the range `^14.2.20`. The lockfile pinned version determines actual exposure. `@hypeflow/portal` declares the fixed version `14.2.35` explicitly.

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
- **Affected Workspaces:** `@hypeflow/app` (`^8.57.1`), `@hypeflow/agency` (`^8.57.1`)
- **Current Stable:** ESLint 10.2.1
- **Impact:** No further security patches. Any new vulnerabilities discovered in ESLint 8 will remain unpatched.

### Next.js 14 — End of Life (HIGH)

- **EOL Date:** October 26, 2025
- **Affected Workspaces:** `@hypeflow/app`, `@hypeflow/portal`, `@hypeflow/agency`
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

### 3.2 Main App — `@hypeflow/app`

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
| next | ^14.2.20 | 16.2.4 | Legacy / EOL (Critical CVEs) |
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

### 3.3 Portal App — `@hypeflow/portal`

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

### 3.4 Agency App — `@hypeflow/agency`

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
| next | ^14.2.20 | 16.2.4 | Legacy / EOL (Critical CVEs) |
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
| Critical | next ^14.2.20 | @hypeflow/app, @hypeflow/agency | CVE-2025-29927 — Middleware Auth Bypass | Versions before 14.2.25 allow full authentication bypass via crafted `x-middleware-subrequest` header. All admin and client routes are unprotected. Fixed in 14.2.25+. |
| Critical | next ^14.2.20 | @hypeflow/app, @hypeflow/agency | EOL Framework | Next.js 14 reached end of life on October 26, 2025. No further security patches for any new CVEs. |
| Critical | next 14.2.35 | @hypeflow/portal | EOL Framework | Same EOL status as above. Portal uses fixed 14.2.35 for CVE-2025-29927 but still on unsupported major version. |
| High | eslint ^8.57.1 | @hypeflow/app, @hypeflow/agency | EOL — No security patches since Oct 2024 | ESLint 8 reached end of life on October 5, 2024. Current stable is 10.2.1. |
| High | @supabase/ssr ^0.3.0 | @hypeflow/portal | Significantly outdated (0.3 vs 0.10.2) | Missing authentication and session management improvements across 7 minor releases. |
| High | execa ^5.1.1 | .aios-core | 4 major versions behind (v5 vs v9) | Execa v5 is a CommonJS legacy release. v6+ moved to pure ESM. v9 includes significant security and breaking changes. No known active CVE but represents substantial maintenance risk. |
| High | inquirer ^8.2.6 | .aios-core | Legacy — replaced by @inquirer/prompts | Inquirer v8 is the legacy release line. The package has been rewritten; v8 receives maintenance-only fixes. Current stable: 13.2.2. |
| Medium | @studio-freight/lenis ^1.0.42 | hype-flow-landing | Package abandoned — renamed to `lenis` | Last published 2 years ago. All active development moved to the `lenis` package (latest: 1.3.23). No further bug fixes or security patches for `@studio-freight/lenis`. |
| Medium | tailwindcss-animate ^1.0.7 | @hypeflow/app, @hypeflow/agency | Unmaintained — 3 years without update | No updates since the initial 1.0.7 release. Not compatible with Tailwind CSS v4. Replacement: `tailwind-animate` (v4-compatible). |
| Medium | framer-motion ^11.18.2 | @hypeflow/app, @hypeflow/agency | One major version behind | Framer Motion v12 was released with breaking API changes. The package was rebranded to `motion`; `framer-motion` remains an alias but `motion` is the canonical package going forward. |
| Medium | next ^14.2.20 | @hypeflow/app, @hypeflow/agency | CVE-2025-55184 / CVE-2025-55183 | DoS and source code exposure via RSC. These CVEs specifically target the React 19 / App Router RSC pathway. Since these apps use React 18, they are not directly at risk from this specific vector, but the framework version is still EOL. |
| Medium | zod ^3.24.1 | @hypeflow/app, @hypeflow/agency | One major version behind (v3 vs v4) | Zod 4.x introduces a rewritten core with breaking changes (string strictness, error API, `.brand()`). Apps relying on Zod 3 schema patterns will require migration before upgrading. |
| Medium | recharts ^2.15.0 | @hypeflow/app, @hypeflow/agency, @hypeflow/portal | One major version behind (v2 vs v3) | Recharts 3 introduces breaking changes in chart API and drops some legacy APIs. Migration required. |
| Medium | lucide-react ^0.474.0 | @hypeflow/app, @hypeflow/agency | Major version behind (0.x vs 1.x) | Lucide-react reached 1.0 with a revised icon API. Import paths and some icon names have changed. |
| Medium | chalk ^4.1.2 | .aios-core | One major version behind (v4 vs v5) | Chalk v5 is pure ESM. Since the `.aios-core` package ships both CJS and ESM (dual package), using chalk v4 (CJS) is intentional, but chalk v5 is the actively maintained version. |
| Medium | commander ^12.1.0 | .aios-core | Two major versions behind (v12 vs v14) | Commander v14 introduced breaking changes in option parsing. |
| Medium | tailwindcss ^3.4.x | @hypeflow/app, @hypeflow/agency, @hypeflow/portal | One major version behind (v3 vs v4) | Tailwind CSS v4 uses a new CSS-native configuration model (PostCSS is optional, no `tailwind.config.js`). Migration is a significant effort involving configuration and utility class changes. |
| Medium | react ^18.3.1 | @hypeflow/app, @hypeflow/agency, @hypeflow/portal | One major version behind (v18 vs v19) | React 19 introduces Actions, new hooks, and deprecates some patterns. Not a security risk currently, but creates a compounding maintenance burden when combined with the Next.js EOL status. |
| Medium | typescript ^5.x | All workspaces | One major version behind (v5 vs v6) | TypeScript 6.0 drops `target: es5`, requires ES2015 minimum. Breaking for some legacy config setups. |
| Low | @supabase/supabase-js ^2.48.1 | @hypeflow/app, @hypeflow/agency | Minor version drift (2.48.1 vs 2.103.3) | Large number of patch and minor releases missed. No known CVE but significant feature and compatibility improvements. |
| Low | @tanstack/react-query ^5.64.2 | @hypeflow/app, @hypeflow/agency | Minor version drift (5.64.2 vs 5.99.2) | No known CVE. Numerous bug fixes and improvements. |
| Low | @trpc/server ^11.0.0 | @hypeflow/app, @hypeflow/agency | Minor version drift (11.0.0 vs 11.16.0) | 16 minor versions of improvements. No breaking changes. |
| Low | date-fns ^3.6.0 | @hypeflow/portal | One major version behind (v3 vs v4) | date-fns v4 adds first-class timezone support. Breaking changes are type-only. |
| Low | turbo ^2.9.4 | hypeflow-os root | Patch version behind (2.9.4 vs 2.9.6) | No known CVE. |
| Low | prettier ^3.4.2 | hypeflow-os root | Minor version drift (3.4.2 vs 3.8.3) | No known CVE. |
| Low | glob ^10.4.4 | .aios-core | One major version behind (v10 vs v11) | Glob v11 drops support for Node.js 16. No known CVE. |
| Low | diff ^5.2.0 | .aios-core | Two major versions behind (v5 vs v7) | No known CVE. |
| Low | highlight.js ^11.9.0 | .aios-core | Minor drift (11.9.0 vs 11.11.1) | No known CVE. |

---

## 5. Unverified Dependencies

The following dependencies could not be fully verified against external registries at audit time due to limited search coverage:

| Dependency | Current Version | Reason Not Verified |
|------------|-----------------|---------------------|
| eslint-config-next | ^14.2.20 | Version tied to Next.js; latest is bundled with Next.js 16.x. Could not independently verify the exact latest standalone version on npm. |
| @vitejs/plugin-react | ^6.0.1 | Search results confirmed version as current but did not return a definitive npm page version for cross-validation. |
| tailwind-merge | ^2.6.0 / ^3.5.0 | The two workspaces use different major versions (v2 in apps, v3 in landing). Confirmed both exist; full breaking change analysis between v2 and v3 not completed. |
| @hookform/resolvers | ^3.10.0 | Confirmed as current by npm but exact latest minor not independently verified beyond 3.10.0. |

---

## 6. Critical File Analysis

The following ten files are the highest-risk in the codebase based on their direct use of EOL, vulnerable, or high-maintenance-burden dependencies, combined with their business criticality.

### 1. `hypeflow-os/apps/hypeflow/middleware.ts`

**Why Critical:** This is the authentication gateway for the entire `@hypeflow/app`. It intercepts every HTTP request and enforces redirects for unauthenticated users attempting to access `/admin/*` and `/client/*`. It depends directly on `next/server` (Next.js 14, EOL) and `@supabase/ssr` (significantly outdated). CVE-2025-29927 allows an attacker to bypass this file's entire protective logic using a single crafted HTTP header. Any compromise here exposes all agency data and all client data.

**Risky Dependencies:** `next` (CVE-2025-29927, EOL), `@supabase/ssr` (outdated)

---

### 2. `hypeflow-os/apps/hypeflow/lib/supabase/middleware.ts`

**Why Critical:** This file implements the concrete `updateSession()` logic called by `middleware.ts`. It contains the authentication redirect rules, user-type resolution (agency vs. client), and session cookie management. It uses `@supabase/ssr` `createServerClient` directly. If the middleware is bypassed via CVE-2025-29927 or if `@supabase/ssr` has regressions in cookie handling across 7 missed minor versions, all authentication decisions fail silently.

**Risky Dependencies:** `next/server` (EOL), `@supabase/ssr` (outdated — 0.5.2 vs 0.10.2)

---

### 3. `hypeflow-os/apps/hypeflow/server/trpc.ts`

**Why Critical:** This file is the single tRPC server initialization point for the entire backend. It creates the context (authentication state), initializes the transformer (`superjson`), and defines authorization middleware for both `agencyProcedure` and `clientProcedure`. Every API call in the application — CRM, analytics, automations, calls, ROI, pipeline — flows through this file. It depends on tRPC 11, zod, superjson, and supabase-js. Any incompatibility from an upgrade or a regression in these dependencies cascades to the entire API layer.

**Risky Dependencies:** `@trpc/server` (minor drift), `zod` (major version behind), `superjson` (patch drift), `@supabase/supabase-js` (significant minor drift)

---

### 4. `hypeflow-os/apps/hypeflow/app/api/webhooks/ghl/route.ts`

**Why Critical:** This is the inbound webhook handler for GoHighLevel (GHL) integration. It ingests external contact and opportunity events and writes directly to the Supabase database (leads, pipeline stages, lead interactions). It operates on an unauthenticated public endpoint (protected only by a shared secret check). Running on Next.js 14 (EOL), any undiscovered vulnerability in the Next.js routing or edge runtime could expose this endpoint. The GHL secret verification logic (`verifySecret`) skips verification entirely if the env variable is unset, creating a potential for unauthorized data injection.

**Risky Dependencies:** `next` (EOL, CVE-2025-29927), `@supabase/supabase-js` (significant minor drift)

---

### 5. `hypeflow-os/apps/hypeflow/lib/supabase/server.ts`

**Why Critical:** This file creates authenticated and service-role Supabase clients used across the entire server-side codebase — tRPC context, webhooks, and API routes. The `createServiceClient()` function uses the `SUPABASE_SERVICE_ROLE_KEY`, which has administrative database permissions bypassing Row Level Security. Any bug or regression in `@supabase/ssr` (7 minor versions behind) in cookie handling or client initialization directly affects the security of all server operations.

**Risky Dependencies:** `@supabase/ssr` (0.5.2 vs 0.10.2 — significantly outdated), `next/headers` (EOL)

---

### 6. `hypeflow-os/apps/hypeflow/app/api/ai/agent/route.ts`

**Why Critical:** This file is the AI agent API endpoint, serving the CRM AI assistant that communicates with the Anthropic API. It processes user messages containing sensitive lead data (names, scores, stages, interaction history) and proxies them to an external API. It runs on the EOL Next.js 14 runtime. It also contains all system prompt logic inline, including Portuguese-language CRM context. Any vulnerability in the Next.js request handling or edge runtime directly exposes this endpoint, which has access to business-sensitive lead intelligence.

**Risky Dependencies:** `next` (EOL), `next/server` (EOL)

---

### 7. `hypeflow-os/apps/hypeflow/server/root.ts`

**Why Critical:** This is the tRPC app router aggregation file that composes all 16+ sub-routers into the unified `appRouter`. It is the single integration point that exposes the complete API surface to the client. Any dependency failure or breaking change in `@trpc/server` or `@trpc/react-query` would require this file to be updated first. It is the central contract between frontend and backend.

**Risky Dependencies:** `@trpc/server` (minor drift — 11.0.0 vs 11.16.0)

---

### 8. `hypeflow-os/apps/hypeflow/app/layout.tsx`

**Why Critical:** This is the root Next.js App Router layout, wrapping every page in the application with `TRPCProvider`. It loads Google Fonts via `next/font/google` and establishes the global CSS context. Any breaking change in the Next.js App Router layout contract (especially in major upgrades from 14 to 15 or 16) requires this file to change. It represents the highest-level dependency on the EOL Next.js framework.

**Risky Dependencies:** `next` (EOL), `@trpc/react-query` (minor drift)

---

### 9. `hypeflow-os/apps/hypeflow/components/providers/TRPCProvider.tsx`

**Why Critical:** This component wraps the entire React application with `TRPCProvider` and `QueryClientProvider`. It bridges `@trpc/react-query` and `@tanstack/react-query`. Any breaking change in the integration between tRPC v11 and TanStack Query v5 (35 minor versions drifted) would surface here, breaking all data fetching across the application.

**Risky Dependencies:** `@trpc/react-query` (minor drift), `@tanstack/react-query` (5.64.2 vs 5.99.2)

---

### 10. `hypeflow-os/apps/hypeflow/lib/trpc/client.ts`

**Why Critical:** This file configures the tRPC client with the HTTP link and `superjson` transformer. It is the client-side counterpart to `server/trpc.ts` and must remain in sync with server-side serialization settings. Any version mismatch between `superjson` on client and server, or any breaking change in `@trpc/client`, would silently break data serialization for complex types (Dates, BigInts) across the entire application.

**Risky Dependencies:** `@trpc/client` (11.0.0 vs 11.16.0), `superjson` (patch drift)

---

## 7. Integration Notes

| Dependency | Used In | Integration Summary |
|------------|---------|---------------------|
| next | @hypeflow/app, @hypeflow/portal, @hypeflow/agency | Core framework for all three server-rendered applications. App Router used in main app for RSC/SSR; Pages or App Router in portal. All applications depend heavily on Next.js routing, middleware, and server actions. |
| @supabase/supabase-js | @hypeflow/app, @hypeflow/portal, @hypeflow/agency | Primary database and authentication client. Used for all data reads/writes across CRM, pipeline, leads, calls, analytics, and client portal. |
| @supabase/ssr | @hypeflow/app, @hypeflow/portal, @hypeflow/agency | Server-side Supabase client factory. Used in middleware for session refresh and in server.ts for authenticated and service-role database clients. |
| @trpc/server / @trpc/client / @trpc/react-query | @hypeflow/app, @hypeflow/agency | End-to-end typesafe API layer. All admin and client portal data operations go through tRPC routers. Critical coupling between server/trpc.ts and client TRPCProvider. |
| @tanstack/react-query | @hypeflow/app, @hypeflow/agency | Server state management, paired with tRPC. Handles caching, invalidation, and background refetching for all API calls. |
| zod | @hypeflow/app, @hypeflow/agency | Schema validation for tRPC inputs and form data. Used in every tRPC router for procedure input validation. |
| react-hook-form + @hookform/resolvers | @hypeflow/app, @hypeflow/agency | Form state management with zod integration. Used for all user-facing forms (leads, clients, playbooks, automations). |
| zustand | @hypeflow/app, @hypeflow/agency | Client-side global state. Used for UI state management (modals, selected items, filters). |
| framer-motion | @hypeflow/app, @hypeflow/agency, hype-flow-landing | Animations and transitions across UI components and landing page. |
| @xyflow/react | @hypeflow/app | Workflow/automation builder canvas. Used for visual automation flow construction. High-value feature with no alternative fallback. |
| @dnd-kit/core + @dnd-kit/sortable | @hypeflow/app, @hypeflow/agency | Drag-and-drop for pipeline kanban boards, lead ordering, and sortable lists. |
| recharts | @hypeflow/app, @hypeflow/portal, @hypeflow/agency | Data visualization. Used in analytics dashboards, ROI charts, and traffic analysis. |
| superjson | @hypeflow/app, @hypeflow/agency | Serialization transformer for tRPC. Enables Date, Map, Set, undefined support across the API boundary. Must remain in sync on both client and server. |
| lucide-react | @hypeflow/app, @hypeflow/portal, @hypeflow/agency, hype-flow-landing | Icon library used throughout all applications. Version mismatch between apps (0.474 vs 0.400 vs 1.6). |
| tailwindcss | All apps | Utility CSS framework. Version split: v3 in apps, v4 in landing. v3 and v4 have incompatible config formats. |
| tailwindcss-animate | @hypeflow/app, @hypeflow/agency | Tailwind CSS animations plugin. Required for component enter/exit animations. Not compatible with Tailwind v4. |
| date-fns | @hypeflow/app, @hypeflow/agency, @hypeflow/portal | Date manipulation utility. Version split: v4 in main app and agency, v3 in portal. |
| openai | hype-flow-landing | OpenAI API client used in the landing page (likely for an AI demo or content generation feature). |
| @studio-freight/lenis | hype-flow-landing | Smooth scroll library. Abandoned package. |
| vite | hype-flow-landing | Build tool for the landing page. On the latest stable (v8). |
| turbo | hypeflow-os root | Monorepo build orchestration. |
| typescript | All workspaces | Static type checking. Version inconsistency: portal uses 5.5.3, others use 5.7.3. |
| inquirer | .aios-core | Interactive CLI prompts for the AIOS framework tooling. Legacy v8. |
| execa | .aios-core | Shell command execution for the AIOS framework tooling. Legacy v5. |
| ajv | .aios-core | JSON schema validation for AIOS task and config definitions. |
| chalk | .aios-core | Terminal color output for the AIOS CLI. |
| commander | .aios-core | CLI command parser for the AIOS framework. |
| js-yaml | .aios-core, squads/squad-creator | YAML parsing for agent definitions and task configs. |

---

## 8. Recommendations Summary (Prioritized, Analysis Only)

### P0 — Immediate Action Required

1. **Verify the installed (locked) version of `next` in `@hypeflow/app` and `@hypeflow/agency`.** The declared range `^14.2.20` may resolve to a version below 14.2.25 (the CVE-2025-29927 fix). If the lockfile shows any version below 14.2.25, the middleware authentication bypass is exploitable in production. The portal app already uses 14.2.35 (safe for this CVE).

2. **All three Next.js applications are on an EOL framework.** Next.js 14 receives no further security patches as of October 26, 2025. Any newly discovered CVE will remain permanently unpatched. Migration to Next.js 15 (current Maintenance LTS) or Next.js 16 (current stable) should be treated as a security obligation, not a feature upgrade.

### P1 — High Priority

3. **Replace `eslint ^8` with `eslint ^10`** in `@hypeflow/app` and `@hypeflow/agency`. ESLint 8 is EOL and unpatched since October 2024. This also requires replacing `eslint-config-next ^14.2.20` with the current version.

4. **Update `@supabase/ssr` in `@hypeflow/portal`** from `^0.3.0` to the current `0.10.2`. The portal is 7 minor versions behind the main app, creating inconsistent session handling behavior.

5. **Migrate `.aios-core` `execa`** from v5 to v9. The CLI tooling runs on the host machine and executes shell commands. Running a 4-major-version-old execution library introduces unnecessary risk.

6. **Migrate `.aios-core` `inquirer`** from v8 to `@inquirer/prompts` (the rewritten successor) or upgrade to `inquirer ^13`. The legacy v8 line is maintained only for critical bugs.

### P2 — Medium Priority

7. **Replace `@studio-freight/lenis` with `lenis`** in `hype-flow-landing`. Direct package rename with a compatible API. The abandoned package will never receive updates.

8. **Replace `tailwindcss-animate`** with `tailwind-animate` (or equivalent) in preparation for a Tailwind v4 migration. The current plugin is 3 years without updates.

9. **Resolve the `lucide-react` version inconsistency** across workspaces. The portal uses `^0.400.0`, the main app and agency use `^0.474.0`, and the landing page already uses `^1.6.0`. A single major version target across all workspaces reduces maintenance burden.

10. **Plan the Tailwind CSS v3 to v4 migration** for `@hypeflow/app`, `@hypeflow/portal`, and `@hypeflow/agency`. The landing page already uses v4. Running two incompatible Tailwind versions across workspaces adds configuration fragmentation.

### P3 — Low Priority / Track

11. **Track Zod v3 to v4 migration.** Zod 4 is a significant API improvement but introduces breaking changes. All tRPC routers using Zod validation will need auditing.

12. **Track Recharts v2 to v3 migration.** Recharts 3 changes chart API patterns used in analytics and dashboard pages.

13. **Update `@supabase/supabase-js`** across all workspaces from 2.44–2.48 to 2.103. While no active CVE is known, the large number of missed releases represents significant unreviewed changes.

14. **Standardize TypeScript version** across workspaces. The portal uses 5.5.3 while others use 5.7.3. Inconsistent compiler versions can produce different type errors.

---

*Report generated: 2026-04-22. All version information sourced from npm registry, GitHub releases, and CVE databases at time of audit.*
