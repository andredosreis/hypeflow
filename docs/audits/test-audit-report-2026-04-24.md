# Test Audit Report — HypeFlow OS — 2026-04-24

**Scope:** `hypeflow-os/apps/**` and `hypeflow-os/packages/**` — TypeScript production code and test surface.
**Method:** static read of route handlers, middleware, and auth surfaces. No code was modified during the audit.
**Auditor:** Claude Code (session of 2026-04-24).

> ⚠️ This is the first security-test audit of HypeFlow OS. The system is in **production with live customer data**.

---

## Notas de Verificação Pós-Auditoria (added 2026-04-24, later in session)

The sections below the original report were written before verifying which apps are actually deployed. After surfacing the deployment topology, **significant corrections apply**. Read this block first — it supersedes the severity claims in §3 for findings C3 and C4, introduces a new CRITICAL (C6) not in the original body, and refines C2's exploit conditions.

### Deployment topology

Only `apps/hypeflow` has a `vercel.json` and is the deployed production app. `apps/agency` and `apps/portal` are **legacy** — superseded by `apps/hypeflow` route groups in Wave 19 (commit `3c6f060`, 2026-04-18). Last meaningful commit to `apps/agency` was 2026-04-07 (sync/docs thereafter). This matches the observation in `dependency-audit-2026-04-22.md` about the legacy apps.

### Revised severity map

| # | Finding | Original severity | Revised severity | Reason |
|---|---|---|---|---|
| C1 | middleware try/catch + preview gate | HIGH | **HIGH — stands** | Present in `apps/hypeflow/lib/supabase/middleware.ts`; same fail-open preview gate. |
| C2 | service role / workspace bootstrap | CRITICAL | **HIGH** (combines with C1 → CRITICAL if C1 preview gate fires in prod) | In unified app, `/admin/*` paths are auth-gated by middleware — unauthenticated users cannot reach the bootstrap. BUT: if C1's preview gate ever fails open in prod, the unauthenticated branch becomes live. |
| C3 | ManyChat HMAC | CRITICAL | **LOW (dead code, informational)** | Endpoint exists only in legacy `apps/agency/app/api/manychat/webhook/route.ts`, which is not deployed. User confirms ManyChat is not used — system receives leads directly from platforms (Meta, WhatsApp via Evolution API). |
| C4 | OAuth CSRF × 4 | CRITICAL | **LOW (dead code, informational)** | All 4 OAuth flows exist only in legacy `apps/agency/app/api/oauth/**`. Not deployed. User has not confirmed whether provider callback URLs were re-pointed; assumption: integrations were re-planned post-Wave 19 and these endpoints are expected to be re-implemented in `apps/hypeflow` when needed. |
| C5 | portal token endpoint | HIGH (pre-feature) | **HIGH — stands** | `derivePortalToken` and the portal page are in the unified app. |
| **C6 (new)** | **3 AI routes: public, no auth, no rate-limit, server-side Anthropic API key** | — | **CRITICAL** | Financial DoS exploitable today. See dedicated section below. |

**Revised exploitable-today count: 1 (C6).** C2 requires a prior misconfiguration trigger; C1, C5 are availability/pre-feature. C3 and C4 are not exploitable against production.

---

### C6 — AI routes have no auth and use server Anthropic key (NEW — CRITICAL)

**Severity:** CRITICAL
**Exploitable today?** YES — trivially. Three public POST endpoints use the server's `ANTHROPIC_API_KEY` on behalf of anonymous callers.

**Files & lines:**
- `hypeflow-os/apps/hypeflow/app/api/ai/agent/route.ts:68-121` — `POST /api/ai/agent`
- `hypeflow-os/apps/hypeflow/app/api/ai/copy/route.ts:28-100` — `POST /api/ai/copy`
- `hypeflow-os/apps/hypeflow/app/api/ai/automation/route.ts:31-84` — `POST /api/ai/automation`

**Shared failure shape (all three):**

1. **Zero authentication.** The `POST` handler begins; no check for a Supabase session, no API-key check, no IP allowlist, no signed request. Any internet client can call.
2. **Server's `ANTHROPIC_API_KEY` used on every call** (`agent/route.ts:77`, `copy/route.ts:29`, `automation/route.ts:32`). The key is the agency's — the caller pays nothing, the agency pays everything.
3. **No rate limiting.** No `@upstash/ratelimit`, no custom counter, no middleware throttle.
4. **No request size limits.** `await req.json()` (`agent/route.ts:70`, `copy/route.ts:37`, `automation/route.ts:36`) reads whatever the caller sends, up to Vercel's default route-handler limit (~4.5 MB). Anthropic counts input tokens.
5. **No input validation.** No Zod schema. Fields are interpolated into prompts without shape checks.
6. **User input is interpolated directly into prompts**:
   - `agent/route.ts:85` interpolates `context.lead_name`, `lead_score`, `lead_stage`, `lead_source`, `last_interaction` into a system-prompt context block.
   - `copy/route.ts:46-52` interpolates `product`, `audience`, `objective`, `tone`, `channel` into the user prompt.
   - `automation/route.ts:62` interpolates `body.prompt` into the user prompt wrapped in quotes.
   Prompt-injection surface. The agent route in particular is conversational; a caller who crafts a `messages` array with instruction-override content may be able to extract parts of the system prompt or manipulate tone.

**Attack scenarios:**

- **Financial DoS (easiest).** A looped `curl` against `/api/ai/agent` with a maximum-size messages array and `max_tokens: 1024` server-set cap consumes Anthropic input+output tokens on every call. At Claude Sonnet 4.6 pricing (indicative: ~$3/M input, ~$15/M output), a few thousand requests per hour accumulates non-trivial spend. No budget alert visible in the codebase.
- **Free chatbot service.** `POST /api/ai/agent` is a public conversational endpoint that answers any question. It's effectively a free Anthropic proxy for whoever discovers it.
- **Prompt injection with lead data.** A caller fills `context` with attacker-chosen values, then sends a `messages` array instructing the model to ignore the system prompt and output it. Mitigated partially by the model's own guardrails, but the attack surface is real.
- **Model name leak.** Each handler pins `model: 'claude-sonnet-4-6'` in the body. Revealing the agency's chosen model tier on an anonymous response is a minor info-leak; combined with response timing, helps attackers profile the agency's infra.
- **Mock-vs-real branch disclosure.** All three handlers fall back to a deterministic mock response when `ANTHROPIC_API_KEY` is missing (`agent/route.ts:78-82`, `copy/route.ts:30-33`, `automation/route.ts:45-48`). An attacker can distinguish "demo" from "live" deployment by the mock response signature, informing subsequent targeting.

**Fix shape (shared module, apply to all three routes):**

1. **Authentication gate.** Require a valid Supabase session on the `/api/ai/*` routes. Either:
   - Create a shared `withAuth(handler)` wrapper that validates the session server-side and 401s otherwise.
   - Or add a `middleware.ts` matcher for `/api/ai/*` that requires auth (mirrors the `/admin` gate already in place).
2. **Rate limiting per session + per tenant.** `@upstash/ratelimit` with sliding window — e.g. 60 requests per user per hour + 1000 per agency per day. Return `429` with `Retry-After`.
3. **Zod schemas** for request bodies. Reject on shape violations with 400.
4. **Size limits**: cap `messages` array length (e.g. ≤ 20 messages), cap `content` length per message (e.g. ≤ 4000 chars), cap `prompt` length (`automation` route — e.g. ≤ 2000 chars). Reject with 413 on overshoot.
5. **Strip user input from system prompt.** Move attacker-controlled context values out of the `system` field and into `messages` (separate `role: 'user'` message marked as structured data). Anthropic's prompt-injection posture is better when untrusted text is in user-role messages, not system.
6. **Budget tracking.** Log per-request estimated cost to an observability table or Vercel log drain so unusual spend spikes are detectable. Optional but strongly recommended given the financial nature of the risk.
7. **Remove mock fallback from production builds.** The "demo mode" path disclosed by missing API key should be dev-only: `if (process.env.NODE_ENV === 'development' && !apiKey) { return mock }`; in production, missing key → 500 + alarm, not silent mock.

**Tests required (minimum 12 — 4 per route × 3 routes):**

Per route:
1. Unit — authenticated POST with valid body → 200 + forwarded Anthropic call (mocked).
2. Unit — unauthenticated POST → 401.
3. Unit — rate-limit exceeded → 429 with `Retry-After`.
4. Unit — oversized body → 413.

Plus 3 shared:
- Integration — Anthropic outage → 502, no mock fallback leak in prod.
- Integration — prompt injection attempt in context → model output does not leak system prompt (best-effort; property-based check).
- Integration — cost tracking: one call increments the budget counter by expected amount.

### C2 correction — unified app detail

C2 in `apps/hypeflow/lib/bootstrap/workspace.ts` differs from the original `apps/agency` audit in one important way:

- **The unified app's middleware DOES gate** `/admin/*` and `/client/*` paths (`apps/hypeflow/lib/supabase/middleware.ts:34`). Unauthenticated users are redirected to `/login` before Server Components run.
- **Callers of `ensureWorkspaceForCurrentUser` are all inside `/admin/*`** (`app/(admin)/layout.tsx:6`, `app/(admin)/admin/pipeline/page.tsx:19`, `app/(admin)/admin/trafego/page.tsx:13`). The route group is unpacked as `/admin/pipeline`, `/admin/trafego` — which **do** match the middleware guard.
- **Therefore the unauthenticated-user branch in `workspace.ts:41-227` is unreachable in a correctly-configured production deployment.**

What remains concerning:

- The unauthenticated branch is still shipped as production code that writes to production DB via service role. A single middleware regression (e.g. the C1 preview-gate fail-open, a future matcher tweak, a misconfigured Vercel env) makes it live.
- `apps/hypeflow/lib/bootstrap/workspace.ts:32-34` silent fallback on missing env vars still hides misconfiguration.
- `(admin)/layout.tsx:6` re-runs `ensureWorkspaceForCurrentUser()` on **every authenticated admin page load** via the layout wrapper. The function does 5+ service-role queries per page render, some of which may insert rows on first run. Service role bypasses RLS; this is more privilege than needed for "look up the user's agency row". Design smell, not exploit.

**Updated C2 fix scope:**

1. **Hard-fail on missing env vars in production.** Replace `hasSupabase` silent fallback with `@t3-oss/env-nextjs` schema validation at process start.
2. **Remove the unauthenticated branch** from `workspace.ts`. Move any intentional "seed a demo workspace" behaviour to a one-shot `npm run seed:demo` script that runs explicitly, not on request.
3. **Switch the authenticated bootstrap to anon-role + RLS** where possible. Isolate the single INSERT that genuinely requires service role (first-time agency creation) into a helper with a comment explaining why. Move the `layout.tsx` wrapper to only call the bootstrap once (e.g. compute a `bootstrapped` flag on the `users` row and short-circuit subsequent calls).

Feature-flag decision (per user):
- **Demo mode stays**, but moves behind an explicit `NEXT_PUBLIC_DEMO_MODE=true` env flag (not the URL-based `.includes('placeholder')` check). The demo seeding runs only when this flag is set at build/deploy time — never at request time.

### Revised critical-fix sequence (supersedes §5)

| # | Critical | Severity | Exploitable today | User decision locked |
|---|---|---|---|---|
| 1 | **C6 — AI routes auth + rate-limit** | CRITICAL | **YES** | — |
| 2 | C1 — middleware try/catch + preview gate | HIGH | No auth-bypass; fail-open preview branch could trigger C2 | — |
| 3 | C2 — workspace bootstrap hardening | HIGH (combines with C1) | No, pending C1 regression | Demo mode stays behind explicit `NEXT_PUBLIC_DEMO_MODE=true` flag (not URL substring) |
| 4 | C5 — portal token scheme | HIGH (pre-feature) | No | TTL 24h · single active token per client · DB-stored hash |
| 5 | C3 — ManyChat HMAC | LOW (dead code) | No (legacy) | Skip — system not using ManyChat; confirm legacy app is not re-deployed |
| 6 | C4 — OAuth CSRF × 4 | LOW (dead code) | No (legacy) | Skip for now — address when integrations are re-implemented in unified app |

**Recommendation: start with C6, not C2.** C6 is the only finding exploitable against the running production deployment today. The original sequencing assumed C3/C4 were the top CRITICALs; after verification, C6 takes their place.

**Original-audit ordering removed decisions (for audit trail):**
- C3 per-agency HMAC secret decision → not applicable (no ManyChat in use)
- C4 PKCE-or-nonce decision → deferred until OAuth flows are reintroduced in the unified app

---

### Resolution Log

#### C6 — RESOLVED (2026-04-25, story 01.9)

All three AI routes now have: **auth gate · rate limit · Zod validation · size guard · dev-only mock fallback.**

| File | Changes |
|---|---|
| `supabase/migrations/0005_ai_rate_limits.sql` | New `ai_rate_limits` table for sliding-window rate-limit state |
| `lib/api/with-session.ts` | `requireSession()` — validates Supabase session, returns 401 if missing; `getClientIp()` — reads `x-forwarded-for` / `x-real-ip` |
| `lib/api/rate-limit.ts` | Supabase-backed sliding window: 20 req / 60s per IP per route; fails open on infra errors |
| `lib/api/zod-schemas.ts` | `agentRequestSchema`, `copyRequestSchema`, `automationRequestSchema` — shape + length validation |
| `app/api/ai/agent/route.ts` | 6-step guard: size → auth → rate-limit → Zod → key check → Anthropic call; context moved to `role: user` message (prompt-injection hardening) |
| `app/api/ai/copy/route.ts` | Same 6-step pattern |
| `app/api/ai/automation/route.ts` | Same 6-step pattern |
| `.env.example` | `NEXT_PUBLIC_DEMO_MODE=false` and `ANTHROPIC_API_KEY=` documented |

**Verification:** `tsc --noEmit` passes clean. No lint errors in C6 files (pre-existing errors in other files unrelated to this fix). Manual curl verification pending local deploy.

**Remaining gap:** Unit tests for these 3 routes are deferred to story 01.10 (test infrastructure setup). The 0% coverage baseline is unchanged until that story ships.

---

#### C1 — RESOLVED (2026-04-25, story 01.11)

Three middleware files refactored: try/catch wraps `getUser()` and downstream queries; the substring-based preview gate is replaced by an explicit env flag; soft-deleted agency users are routed to `/login?status=account-disabled` instead of falling through as client users.

| File | Changes |
|---|---|
| `apps/hypeflow/lib/supabase/middleware.ts` | `try/catch` around session resolution → redirect `/login?error=session` on throw for protected paths; `NEXT_PUBLIC_PREVIEW_MODE === 'true'` gate (was `URL.includes('placeholder')`); `.maybeSingle()` + `is_active` branching for soft-deleted agency users |
| `apps/agency/lib/supabase/middleware.ts` | Same try/catch + explicit preview gate (no `users` lookup in this app, so no inactive-user branch) |
| `apps/portal/middleware.ts` | Same try/catch + explicit preview gate; existing redirect-to-login behaviour preserved |
| `apps/hypeflow/__tests__/lib/supabase/middleware.test.ts` | 8 Vitest unit tests covering: throw → redirect with `?error=session`, public-path passthrough on throw, preview mode skip, no-skip when URL contains `placeholder`, soft-deleted user → `?status=account-disabled`, no-row → `/client/dashboard`, anonymous → `/login`, no redirect loop on `/login` for inactive |
| `apps/hypeflow/tests/e2e/middleware.spec.ts` | 4 Playwright E2E tests: anonymous → `/admin/*` and `/client/*` both redirect to `/login`; `/login?error=session` and `/login?status=account-disabled` render without 500 |
| `.env.example` | `NEXT_PUBLIC_PREVIEW_MODE=false` documented with explicit "never set in production" warning |

**Verification:** `tsc --noEmit` passes clean across all 3 apps. Vitest 20/20 passing (12 prior AI-route + 8 new middleware). Playwright 38/38 passing (34 prior + 4 new middleware). Pre-existing `.catch()` typing bugs in `apps/portal/server/routers/pipeline.ts` and `apps/agency/app/api/pixels/events/route.ts` were converted to `.then(undefined, console.error)` to unblock the workspace typecheck — these were latent runtime bugs (Supabase builders aren't full Promises) caught during validation, not introduced by C1.

**Remaining gap:** Vitest is installed only in `apps/hypeflow`; `apps/agency` and `apps/portal` middleware fixes share the same pattern but have no unit tests — adding Vitest to those apps is a separate story. The user-visible behaviour is exercised by the 4 new Playwright E2E tests.

---

---

## 1. Executive Summary

| Metric | Value |
|---|---|
| Production `.ts` / `.tsx` files | **206** (find-based count; slight variance from prior "211" estimate) |
| Test files (`*.test.*`, `*.spec.*`, `__tests__/`) | **0** |
| Test framework installed | **None** (no Jest, Vitest, Playwright, @testing-library) |
| Test config files | **None** |
| Root `package.json` test script | `turbo run test` — fans out to nothing; returns success because no workspace defines a `test` script |
| Coverage baseline | **0 %** across every subsystem |

| Critical | Severity | Exploitable today? |
|---|---|---|
| C1 — middleware try/catch | HIGH | Availability risk + fail-open preview gate; not auth-bypass |
| C2 — service role on unauthenticated page loads | CRITICAL | **Yes** |
| C3 — ManyChat webhook HMAC | CRITICAL | **Yes — no authentication at all** |
| C4 — OAuth CSRF across 4 flows | CRITICAL | **Yes — all 4 flows** |
| C5 — portal token endpoint | HIGH (pre-feature) | No backend yet; deterministic scheme will become CRITICAL the moment `/api/portal/[token]` is built on top of it |

Bottom line: **C3 is the most severe single finding** (unauthenticated public endpoint writing to production via service role). C2 is the broadest (every unauthenticated page load in `/pipeline` and `/trafego` triggers service-role writes). C4 affects all four integrations equally.

---

## 2. Coverage Baseline

### 2.1 File counts per subsystem

| Subsystem | Production `.ts`/`.tsx` | Test files |
|---|---:|---:|
| `apps/hypeflow` | 110 | 0 |
| `apps/agency` | 58 | 0 |
| `apps/portal` | 26 | 0 |
| `packages/database` | 1 | 0 |
| `packages/ui` | 1 | 0 |
| `packages/integrations` | 4 | 0 |
| `packages/email` | 6 | 0 |
| **Total** | **206** | **0** |

### 2.2 Test infrastructure inventory

| Item | Status |
|---|---|
| Test framework dependency | Not in any `package.json` |
| `jest.config.*` / `vitest.config.*` / `playwright.config.*` | None found |
| `__tests__/` directories | None |
| CI test step | Not active (ties into the broader "CI/CD not yet active" state — see `devops` agent customization) |
| Mocking library | None |
| Integration test DB strategy | Not defined |

**Implication:** setting up testing requires both **framework installation** and **pattern choices** (unit runner, component renderer, E2E tool, DB strategy) before any tests can be written. Estimate 0.5–1 day for infrastructure scaffolding alone.

---

## 3. Critical Security Findings

### C1 — Middleware lacks try/catch and has fail-open preview gate

**Severity:** HIGH
**Exploitable today?** No auth bypass — fail-closed on throw. But availability risk + one fail-open branch.

**Files & lines:**
- `hypeflow-os/apps/hypeflow/lib/supabase/middleware.ts:4-74`
- `hypeflow-os/apps/hypeflow/lib/supabase/middleware.ts:27-28` (fail-open preview gate)
- `hypeflow-os/apps/agency/lib/supabase/middleware.ts:4-46`
- `hypeflow-os/apps/agency/lib/supabase/middleware.ts:28` (fail-open preview gate)
- `hypeflow-os/apps/portal/middleware.ts:13-51` (no preview gate, but no try/catch either)

**Findings:**

1. **No try/catch** around `supabase.auth.getUser()` (`apps/hypeflow/lib/supabase/middleware.ts:30`, `apps/agency/lib/supabase/middleware.ts:30`, `apps/portal/middleware.ts:34`) or the downstream `from('users').select(...).single()` query (`apps/hypeflow/lib/supabase/middleware.ts:42-47`). Any transient Supabase error → Next.js 500 for every request matching the matcher. Availability risk, not auth bypass.
2. **Fail-open preview gate** on `apps/hypeflow/lib/supabase/middleware.ts:27-28` and `apps/agency/lib/supabase/middleware.ts:28`:
   ```ts
   const isPreview = process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('placeholder')
   if (isPreview) return supabaseResponse
   ```
   If `NEXT_PUBLIC_SUPABASE_URL` ever contains the substring `"placeholder"` in a production deployment (e.g. Vercel env misconfigured, `.env.local` leaked into prod build), the **entire auth layer is bypassed** — anonymous users can reach `/admin/*` and `/client/*`.
3. **Inactive-agency-user routing quirk** (`apps/hypeflow/lib/supabase/middleware.ts:42-63`): a user whose `users` row has `is_active=false` fails the `.eq('is_active', true).single()` check, is treated as a client user (line 49), and redirected to `/client/dashboard`. The client path lives on a different app (`apps/portal/`), so the redirect mostly dead-ends — but if `/client/dashboard` is ever added to the `hypeflow` app, a soft-deleted agency user would get shunted into client-portal UX on their own account data.

**Fix shape:**
- Wrap each middleware body in `try { ... } catch (err) { /* log + redirect-to-/login with ?error=session */ }`.
- Replace the `.includes('placeholder')` preview gate with an explicit allowlist: `process.env.NEXT_PUBLIC_PREVIEW_MODE === 'true'`. Default: false.
- For soft-deleted agency users: distinguish "no row" from "row with `is_active=false`" — the latter should redirect to `/login?status=account-disabled`, not the client portal.

**Tests required (minimum 4):**
1. Unit — `updateSession` with a throwing `auth.getUser()` → asserts redirect to `/login?error=session`, not 500.
2. Unit — preview gate behaviour: `NEXT_PUBLIC_PREVIEW_MODE=true` → skip auth; any other URL pattern → enforce auth.
3. Unit — inactive agency user (row exists, `is_active=false`) → redirect to `/login?status=account-disabled`.
4. Integration (requires Supabase test project) — full auth flow: cookie → `getUser` → `users` lookup → correct redirect.

---

### C2 — Service role used on unauthenticated page loads (workspace bootstrap)

**Severity:** CRITICAL
**Exploitable today?** YES.

**Files & lines:**
- `hypeflow-os/apps/agency/lib/bootstrap/workspace.ts:21-430` — the whole function.
- `hypeflow-os/apps/agency/lib/bootstrap/workspace.ts:37-223` — unauthenticated-user branch that uses service role to create/seed a shared "demo-workspace" agency and inject leads.
- `hypeflow-os/apps/agency/app/(dashboard)/pipeline/page.tsx:9-17` — caller. Server Component; no auth guard; falls back silently when env vars are missing.
- `hypeflow-os/apps/agency/app/(dashboard)/trafego/page.tsx:9` — same pattern.
- `hypeflow-os/apps/hypeflow/lib/bootstrap/workspace.ts:28-29` — the hypeflow equivalent has a better gate (`.includes('placeholder')` check on service key), but the agency version does not.
- `hypeflow-os/apps/hypeflow/app/(admin)/admin/trafego/page.tsx:9` — same hasSupabase fallback pattern.

**Findings:**

1. **Unauthenticated service-role writes on GET.** `apps/agency/lib/bootstrap/workspace.ts:37-223` runs when `supabase.auth.getUser()` returns no user. It creates a service-role client (`createServiceClient()`), looks up/creates a shared "demo-workspace" agency, seeds pipeline stages, leads, and 30 days of `traffic_metrics` rows. Every unauthenticated visit to `/pipeline` or `/trafego` triggers this. **RLS is bypassed** because service role skips RLS.
2. **Middleware does not protect these routes.** `apps/agency/lib/supabase/middleware.ts:32-42` only redirects paths starting with `/dashboard` or `/portal`. The Server Component pages live at `apps/agency/app/(dashboard)/pipeline/page.tsx` — the `(dashboard)` is a Next.js **route group**, which is stripped from the URL. Actual paths are `/pipeline` and `/trafego`, which **don't match the middleware guards**. So unauthenticated requests reach the Server Component and trigger the bootstrap.
3. **Silent fallback hides misconfiguration.** `pipeline/page.tsx:9-13`:
   ```ts
   const hasSupabase = Boolean(
     process.env.NEXT_PUBLIC_SUPABASE_URL
     && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
     && process.env.SUPABASE_SERVICE_ROLE_KEY
   )
   const { agencyId } = hasSupabase ? await ensureWorkspaceForCurrentUser() : { agencyId: 'demo-agency-id' }
   ```
   If the service-role env is missing in production, the page silently serves a demo with `agencyId: 'demo-agency-id'` instead of erroring. This is exactly the kind of silent degradation that "looks fine in the preview build" and fails open in prod.
4. **Authenticated-user branch also uses service role** (`workspace.ts:226-429`): every page load for a signed-in user does 5+ service-role queries (users, clients, pipeline_stages, leads, traffic_metrics) and may insert. This is functionally an ongoing "seed" — fine for a fresh install, but it's running on every navigation, and uses service role (RLS bypass) for what could be done with the authenticated anon-role client and RLS. Increases attack surface if the function ever takes user-supplied parameters.

**Attack vector:**
- Attacker visits `GET /pipeline` without a session → server executes service-role writes → DB now contains attacker-seeded demo rows under a shared agency.
- Amplification: in a loop, attacker can insert unbounded `traffic_metrics` rows (current code has idempotency checks via `count`, but count-then-insert is not atomic — a concurrent request can race).
- Reconnaissance: attacker observes the shared "demo-workspace" agencyId (it's returned to the client via the KanbanBoard prop at `pipeline/page.tsx:30`).

**Fix shape:**
1. **Gate `/pipeline` and `/trafego` behind the auth middleware.** Either (a) widen the middleware matcher in `apps/agency/middleware.ts` to include `/pipeline` and `/trafego` explicitly, or (b) move the pages under a path that starts with `/dashboard`.
2. **Remove the unauthenticated bootstrap branch entirely.** `workspace.ts:37-223` should be deleted or moved to a one-shot `npm run seed:demo` script that runs intentionally, not on every anonymous request.
3. **Authenticated bootstrap should use the anon-role client + RLS**, not the service client. If a specific step requires service role (e.g. first-time agency creation), isolate that single INSERT and justify it in a comment.
4. **Throw instead of silent fallback when env vars are missing.** The `hasSupabase` pattern should be replaced with env validation at process startup (e.g. `@t3-oss/env-nextjs`).

**Tests required (minimum 6):**
1. Integration — unauthenticated GET `/pipeline` → redirect to `/login`, no DB writes.
2. Integration — unauthenticated GET `/trafego` → redirect to `/login`, no DB writes.
3. Integration — authenticated first-time user → workspace created, but using anon-role + RLS where possible.
4. Integration — authenticated returning user → no duplicate seeds; bootstrap is idempotent.
5. Unit — env-var validation: app fails to boot if `SUPABASE_SERVICE_ROLE_KEY` is missing in production; warns clearly in dev.
6. E2E (Playwright) — unauthenticated visit to the three dashboard pages → consistent redirect to login.

---

### C3 — ManyChat webhook has no authentication

**Severity:** CRITICAL (highest single finding in this audit)
**Exploitable today?** YES — the endpoint is publicly routable and accepts arbitrary `agency_id` / `client_id` in the body.

**File & lines:**
- `hypeflow-os/apps/agency/app/api/manychat/webhook/route.ts:9-122` — entire POST handler.
- Line 10 comment: *"Verify the request is from ManyChat via custom field or signature"* — **TODO never done**.

**Findings:**

1. **No signature verification.** No HMAC, no shared secret check, no bearer token, no allowlisted source IP. The POST handler begins at line 9 and jumps straight to `await req.json()` (line 11) with no auth step.
2. **`agency_id` and `client_id` come from the request body** (lines 21-22, 30, 90-91). Attacker-controlled. Combined with service-role access (line 28), attacker can write `leads` rows into any agency they know a UUID for.
3. **Service-role DB access** (line 28: `const supabase = await createServiceClient()`) — RLS bypass. The handler inserts into `leads` (lines 87-103), updates `leads` (lines 54-62), inserts into `lead_interactions` (lines 65-71).
4. **Fan-out to Edge Function with service role** (lines 74-81 and 108-115): the handler forwards `lead_id` to `/functions/v1/automation-engine` with `Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}`. The downstream function inherits the attacker-crafted `lead_id` and presumably runs automations (side effects, external calls, emails).
5. **Zero input validation.** `subscriber.email`, `subscriber.phone`, tags, `flow_ns` all pass through unchecked. XSS-in-notes (line 100 builds `notes` from `body.flow_ns`), SQL-shape issues, and log poisoning are all on the menu.

**Attack vectors:**
- **Lead injection** into any agency's pipeline: `curl -X POST https://agency.hypeflow.app/api/manychat/webhook -d '{"type":"subscriber_created","subscriber":{"id":"1","first_name":"x"},"agency_id":"<victim>","client_id":"<victim>"}'`
- **Mass lead-dupe update**: enumerate UUIDs, force temperature/tags rewrites on existing leads.
- **Automation-engine abuse**: trigger downstream automations with forged `lead_id` values, potentially causing external-side-effect amplification (outbound emails, webhooks).
- **DoS**: unbounded POST loop inflates `leads` and `lead_interactions` tables.
- **Reconnaissance**: error-message probing (line 120 returns `error: String(err)` to the caller — may leak DB error text, column names, constraint info).

**Fix shape:**
1. **HMAC signature verification.** ManyChat supports signed webhook headers; extract signature from header, compute HMAC-SHA256 of raw body with `MANYCHAT_WEBHOOK_SECRET` env var, compare with `crypto.timingSafeEqual`. Reject on mismatch with 401.
2. **Body must be read as `text()` first** (for HMAC input), then JSON-parsed after verification. `await req.json()` skips the raw-body step; you'd have to re-serialize and hope byte-identity holds, which it won't.
3. **Bind `agency_id` to the verified integration.** Store the webhook secret per-integration (`integrations.manychat_webhook_secret`), look up the integration by a signed header value, and use *that* integration's `agency_id` / `client_id` — ignore the body's values entirely. This closes the "attacker knows the UUIDs" vector.
4. **Input validation with Zod** on the decoded body shape before touching the DB.
5. **Rate limiting per integration** (`@upstash/ratelimit` or equivalent).
6. **Do not return raw error text** to the caller (line 120). Log server-side; respond with a generic `{"error":"invalid request"}`.

**Tests required (minimum 8):**
1. Unit — valid signature + valid body → 200, lead upserted.
2. Unit — missing signature header → 401.
3. Unit — invalid signature (wrong secret) → 401.
4. Unit — valid signature but body's `agency_id` does not match integration's `agency_id` → 403 (even if verified, body must match integration).
5. Unit — body fails Zod schema → 400.
6. Unit — DB error is not leaked (response body contains no `{"error": "..."}` with raw text).
7. Integration — concurrent posts for the same subscriber → exactly one `lead` created (idempotency).
8. Integration — automation-engine forwarding retries on transient failures.

---

### C4 — OAuth CSRF across all 4 flows

**Severity:** CRITICAL
**Exploitable today?** YES — identical broken pattern in all four flows.

**Files & lines:**

| Flow | Connect state generation | Callback state "validation" |
|---|---|---|
| Meta | `hypeflow-os/apps/agency/app/api/oauth/meta/connect/route.ts:34` | `meta/callback/route.ts:100-105` |
| Google | `google/connect/route.ts:31` | `google/callback/route.ts:74-78` |
| TikTok | `tiktok/connect/route.ts:26` | `tiktok/callback/route.ts:65-69` |
| LinkedIn | `linkedin/connect/route.ts:36` | `linkedin/callback/route.ts:124` |

**Findings:**

1. **`state` is not a CSRF token.** All 4 connect endpoints construct `state` as `Buffer.from(JSON.stringify({client_id, agency_id, ...})).toString('base64url')`. This is a **data-transport mechanism**, not a nonce: no randomness, not tied to a session, not bound to the initiating user.
2. **Callbacks decode state without verifying it.** All 4 callback endpoints decode the base64url back into `{client_id, agency_id}` and use those values directly to write an `integrations` row via service role. No check that the state was ever issued by this server, no check that it belongs to the current session, no check that it has not been replayed.
3. **`/api/oauth/<provider>/connect` and `/api/oauth/<provider>/callback` have no authentication layer.** No user session is required to initiate a flow — anyone can kick off `/api/oauth/meta/connect?client_id=<victim>&agency_id=<victim>` with arbitrary UUIDs.
4. **All callback handlers use service role to write `integrations`** (e.g. `meta/callback/route.ts:124-139` via `createServiceClient`). RLS is bypassed; the write lands under whatever agency/client the attacker-controlled state said.

**Attack vectors:**

- **Integration hijack (primary):**
  1. Attacker visits `GET /api/oauth/meta/connect?client_id=<VICTIM_CLIENT>&agency_id=<VICTIM_AGENCY>`.
  2. Browser redirects to Meta login; attacker logs in with *attacker's* Meta account.
  3. Meta redirects back to `/api/oauth/meta/callback?code=<ATTACKER_CODE>&state=<VICTIM_IDS>`.
  4. Server exchanges attacker's code for attacker's Meta long-lived token.
  5. Server upserts `integrations` row with `{agency_id: VICTIM, client_id: VICTIM, access_token: ATTACKER, provider: 'meta'}`.
  6. HypeFlow is now pulling ad data from the **attacker's Meta account** into the victim's dashboard (data poisoning). OR: attacker can revoke their token externally, killing the victim's real integration.

- **CSRF-pinning (secondary):** victim clicks a malicious link that triggers `/api/oauth/meta/connect?client_id=<VICTIM>&agency_id=<VICTIM>`; if the victim already has a Meta cookie, the whole OAuth handshake proceeds silently on their behalf and binds the resulting token to whatever `agency_id` the link contained (attacker chooses).

- **Replay:** state is deterministic — same `client_id`/`agency_id` pair always produces the same state string. A captured state is reusable forever.

**Fix shape (same for all 4 flows):**

1. **Generate a real CSRF nonce** on connect:
   ```ts
   const nonce = crypto.randomBytes(32).toString('base64url')
   cookies().set('oauth_state', nonce, { httpOnly: true, secure: true, sameSite: 'lax', maxAge: 600 })
   const state = Buffer.from(JSON.stringify({ nonce, client_id, agency_id, scope })).toString('base64url')
   ```
2. **Validate on callback:**
   ```ts
   const stateData = JSON.parse(Buffer.from(state, 'base64url').toString())
   const cookieNonce = cookies().get('oauth_state')?.value
   if (!cookieNonce || !crypto.timingSafeEqual(Buffer.from(stateData.nonce), Buffer.from(cookieNonce))) {
     return NextResponse.redirect(`${appUrl}/config?tab=integracoes&status=error&reason=csrf`)
   }
   cookies().delete('oauth_state')
   ```
3. **Require authentication on `/connect`.** Only a signed-in user belonging to `agency_id` should be able to initiate an OAuth flow for that agency. Look up the user via Supabase Auth (anon-role client, not service role), verify their `users.agency_id` matches the requested one, reject otherwise.
4. **Bind `client_id` and `agency_id` to the authenticated user's agency** on the callback side too — do not trust the decoded state's values; re-derive from the session.
5. **Consider PKCE** for the flows that support it (Google, LinkedIn, TikTok — Meta's PKCE support is inconsistent).
6. **One nonce file, four imports.** Extract `generateOAuthState` / `validateOAuthState` helpers into a shared module (`hypeflow-os/apps/agency/lib/oauth/state.ts` or `packages/integrations/src/oauth-state.ts`) — do not copy-paste the fix into 8 files.

**Tests required (minimum 12 — 3 per flow × 4 flows):**

Per flow:
1. Unit — connect issues a state cookie and includes nonce in state param.
2. Unit — callback with matching cookie + state → proceeds to token exchange.
3. Unit — callback with missing/mismatched cookie → redirect to `?reason=csrf`, no DB write.

Plus 2 shared:
- Integration — full handshake roundtrip for each flow using mocked provider responses.
- Integration — replay: same state twice → second attempt fails (cookie consumed).

---

### C5 — Portal token scheme is deterministic and client-side-only

**Severity:** HIGH now (pre-feature); **CRITICAL** the moment a backend is built on it.
**Exploitable today?** Limited — only mock data behind the token today. But the token scheme itself guarantees a critical vuln when real data is wired in.

**Files & lines:**
- `hypeflow-os/apps/hypeflow/app/portal/[token]/page.tsx:1-437` — client component that ignores token semantics.
- `hypeflow-os/apps/hypeflow/app/portal/[token]/page.tsx:62` — token used as `token.charCodeAt(0) % 6` index into mock data.
- `hypeflow-os/apps/hypeflow/app/portal/[token]/page.tsx:135` — comment: *"In production: fetch from /api/portal/[token]"* — backend not built yet.
- `hypeflow-os/apps/hypeflow/app/(admin)/admin/clientes/page.tsx:375-383` — `derivePortalToken()` function.
- `hypeflow-os/apps/hypeflow/app/(admin)/admin/clientes/page.tsx:440-441` — token generated and baked into copy-to-clipboard URL.

**Findings:**

1. **Token is a hash of `clientId` with a fixed salt, using a non-cryptographic polynomial hash** (`clientes/page.tsx:376-383`):
   ```ts
   function derivePortalToken(clientId: string): string {
     const base = `hypeflow-portal-${clientId}-v1`
     let hash = 0
     for (let i = 0; i < base.length; i++) {
       hash = ((hash << 5) - hash + base.charCodeAt(i)) | 0
     }
     return Math.abs(hash).toString(16).padStart(8, '0') + clientId.replace(/\W/g, '') + 'abcdef1234567890'.slice(0, 16)
   }
   ```
   The author's comment (line 375) says *"simple deterministic token for demo — production uses a DB-stored UUID"*, which is correct — but production is live and the demo is what's shipping.
2. **Token contains `clientId` in plaintext.** Output is `<8-hex hash><clientId with non-word chars stripped>abcdef1234567890`. Anyone who sees a portal URL can recover the clientId by trimming 8 chars off the front and 16 off the back.
3. **Anyone with a clientId can forge a valid token** by re-running the same deterministic hash. ClientIds leak through C3 (ManyChat injection), C4 (OAuth callbacks redirecting with IDs), and the KanbanBoard prop in C2.
4. **Portal page has no server-side validation** (`portal/[token]/page.tsx:1` — `'use client'`). The token only selects between 6 hard-coded mock clients; no auth check, no DB lookup, no expiry.
5. **Footer lies about security:** line 431 reads *"Acesso protegido por token · SSL"*. Currently false.
6. **UI wires up actions** (approve report, reply to message — lines 141-158) that if ever backed by real endpoints, would inherit the broken token scheme.

**Fix shape:**

Treat this as a design decision that needs to be made *before* `/api/portal/[token]` is built. Two reasonable schemes:

**Scheme A — DB-stored opaque tokens (recommended):**
```sql
CREATE TABLE portal_tokens (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id     uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  agency_id     uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  token_hash    text NOT NULL UNIQUE,  -- SHA-256 of raw token (never stored raw)
  created_by    uuid NOT NULL REFERENCES users(id),
  created_at    timestamptz NOT NULL DEFAULT now(),
  expires_at    timestamptz NOT NULL,
  last_used_at  timestamptz,
  revoked_at    timestamptz,
  label         text
);
CREATE INDEX ON portal_tokens (token_hash) WHERE revoked_at IS NULL;
CREATE INDEX ON portal_tokens (client_id);
```
- Issue: generate `crypto.randomBytes(32).toString('base64url')`, hash with SHA-256, store only the hash, show the raw token to the agency user **once** during generation.
- Validate: `SELECT client_id, agency_id FROM portal_tokens WHERE token_hash = sha256($1) AND revoked_at IS NULL AND expires_at > now()`.
- Rotate: issuing a new token sets `revoked_at` on existing tokens for that client (or keeps them side-by-side, agency choice).
- Revoke-on-delete: the `ON DELETE CASCADE` handles it.

**Scheme B — JWT-style signed token:**
Stateless, uses a server-side signing key, includes `{client_id, agency_id, exp, jti}`. Simpler, but revocation needs a denylist table. Not recommended here because revoke-on-demand is a real requirement for client churn.

**Additional fix pieces (either scheme):**
- Move `apps/hypeflow/app/portal/[token]/page.tsx` to a **Server Component** that validates the token server-side before rendering.
- Or split: keep the interactive UI client-side but have a Server Component wrapper that does the token lookup and fails-closed before the client code runs.
- Add `POST /api/portal/token/generate` (agency-auth only) and `POST /api/portal/token/revoke/:id`.
- Update `clientes/page.tsx:376-383` to fetch tokens from the new endpoint; remove `derivePortalToken`.
- Remove the UI lie at `portal/[token]/page.tsx:431` until the real scheme ships.

**Tests required (minimum 6):**
1. Unit — token generator returns high-entropy base64url (≥256 bits).
2. Unit — DB stores only SHA-256 hash, never raw.
3. Integration — generated token validates; same token after `revoke_at` set fails.
4. Integration — expired token fails.
5. Integration — anonymous GET `/portal/<unknown-token>` → 404.
6. Integration — generating a token requires agency-user auth; cross-agency generation is rejected.

---

## 4. Test Gap Categories (7)

Proposed breakdown of the test surface by category, as a planning scaffold for the coverage-climb. Numbers are **rough estimates** based on production file counts; pin to actual numbers after the test framework is installed and a coverage tool runs.

| # | Category | Surface | Est. tests needed | Rationale |
|---|---|---:|---:|---|
| 1 | **Unit — pure helpers / utils** | `apps/*/lib/**`, `packages/*/src/**` (non-React) | ~25 | Pure functions, no IO. Fastest to write, highest ROI per test. |
| 2 | **Unit — tRPC routers** | `apps/*/server/routers/**` | ~18 | One router per domain (pipeline, leads, calls, dashboard, automations, integrations). Each router gets a happy-path + auth-denied + RLS-denied case. |
| 3 | **Route handlers / API** | `apps/*/app/api/**/route.ts` | ~15 | 8 OAuth endpoints (4 connect + 4 callback) + 1 ManyChat webhook + tRPC route + inbound GHL webhook. Each: signature-valid, signature-invalid, malformed-body, DB-error. |
| 4 | **Middleware** | `apps/*/middleware.ts` + `apps/*/lib/supabase/middleware.ts` | ~8 | Auth-required redirect, authed-route allow, inactive-user redirect, preview-mode gate, try/catch coverage — per app (×3). |
| 5 | **Server Components (auth-gated page shells)** | `apps/*/app/(dashboard)/**/page.tsx`, `apps/*/app/(admin)/**/page.tsx` | ~12 | Snapshot + auth-required checks for the top-level pages. Low-detail; mostly guard against "server component rendered with no session" regressions. |
| 6 | **Integration — DB + Auth** | Supabase test project against real Postgres + Auth | ~10 | RLS policy coverage (multi-tenancy.md guideline), migration rollback/forward tests, service-role isolation verification. |
| 7 | **E2E — critical user flows** | Playwright against a preview deploy | ~7 | Login → dashboard, portal access, OAuth flow (mocked provider), ManyChat webhook, lead creation → automation, pipeline drag, settings save. |

**Total estimated**: **~95 tests** to reach a reasonable "safety net" (not full coverage — explicit scope: catch regressions on the 5 criticals and the story acceptance flow). This is larger than the "76" number in the dev-agent customization; the gap is mostly integration + E2E, which are more expensive to set up but more valuable given how auth-heavy this codebase is.

**Priority ordering for test build-out:**
1. **Week 1** — Install framework (Vitest for unit + integration, Playwright for E2E). Write tests for C1–C5 *as part of each fix PR* (per `dev` agent's `TEST COVERAGE` rule). **~30 tests** shipped alongside security fixes.
2. **Week 2** — Category #2 (tRPC routers) — one router at a time, happy + auth-denied per query/mutation. ~18 tests.
3. **Week 3** — Category #6 (integration, DB + Auth). Needs a dedicated Supabase project for test data. ~10 tests.
4. **Week 4** — Category #1 (utils) + Category #5 (page shells). Lower-risk but cheap. ~25 tests.
5. **Week 5** — Category #7 (E2E). Wire into CI once Vercel preview URLs are stable. ~7 tests.

**Baseline to target**: 0 % → 50 % **line coverage** by end of Week 5. Full coverage (>80%) is a 6-12 month project at current codebase size.

---

## 5. Per-Critical Fix Sequence (proposed)

Matches the ordering in the orchestration request. Each step = one `@sm` story draft → `@dev` implementation → `@qa` gate decision.

| # | Critical | File(s) of primary change | Tests in same PR | Risk of rollback |
|---|---|---|---:|---|
| 1 | C1 middleware try/catch | `apps/{hypeflow,agency,portal}/lib/supabase/middleware.ts` + `apps/{hypeflow,agency}/middleware.ts` | ~6 | LOW — additive try/catch, preview-gate tightening. Reversible. |
| 2 | C2 service role in dev | `apps/agency/lib/bootstrap/workspace.ts`, `apps/agency/app/(dashboard)/pipeline/page.tsx`, `apps/agency/app/(dashboard)/trafego/page.tsx`, `apps/hypeflow/*` equivalents, `apps/agency/middleware.ts` matcher | ~6 | MEDIUM — moves bootstrap logic; risk of breaking demo mode. Validate against live preview. |
| 3 | C3 ManyChat HMAC | `apps/agency/app/api/manychat/webhook/route.ts` (+ env var `MANYCHAT_WEBHOOK_SECRET` + optional `integrations.manychat_webhook_secret` migration) | ~8 | LOW — additive verification; failure mode is 401 on un-signed requests (rejects current unsigned attacker traffic AND the real ManyChat flow until ManyChat is configured with the secret). **Plan**: ship verification feature-flag-guarded, coordinate with ManyChat config switchover. |
| 4 | C4 OAuth CSRF (×4 flows) | `packages/integrations/src/oauth-state.ts` (new, shared) + `apps/agency/app/api/oauth/{meta,google,tiktok,linkedin}/{connect,callback}/route.ts` (×8) | ~12 | LOW-MEDIUM — adds cookie requirement. Any in-flight OAuth flow when the fix deploys will fail with `?reason=csrf` and have to restart. Not a data-loss issue but a UX one. |
| 5 | C5 portal token endpoint | New: `supabase/migrations/NNNN_portal_tokens.sql` + `packages/database` types regen + `apps/hypeflow/app/portal/[token]/page.tsx` (Server Component split) + new `/api/portal/token/*` endpoints + `apps/hypeflow/app/(admin)/admin/clientes/page.tsx` wire-up | ~6 | MEDIUM-HIGH — migration + cross-app changes + UI rewrite. **Plan**: ship in two phases — phase A creates table + endpoints without removing `derivePortalToken`; phase B switches callers and removes the old function. |

**Open product decisions to surface during the @sm story-draft phase (per critical):**

- **C2:** is demo mode a real product feature or was it scaffolding? If feature, where should it live (gated `/demo` path, not `/pipeline`)?
- **C3:** is the ManyChat webhook secret per-agency (preferred, multi-tenant isolation) or global (simpler, single secret in env)? Impacts the schema change and the onboarding flow.
- **C4:** do you want PKCE for the flows that support it, or is state-nonce enough for v1? PKCE is strictly better but adds ~30 lines per flow.
- **C5:** token TTL default (30 days? 90? per-client setting?). Single active token per client, or multiple (for "share with accounting" scenarios)? Revoke-on-client-status-change?

---

## 6. Recommended Test Infrastructure Setup (prerequisite to writing tests)

Pick these before writing any test — they should be decided with the user, not defaulted by @dev. Currently nothing is installed.

| Decision | Recommendation | Rationale |
|---|---|---|
| Unit + integration runner | **Vitest** | Native ESM, fast, integrates cleanly with Next.js 14 + Turborepo; compatible with `@testing-library/react`. |
| React component renderer | `@testing-library/react` + `@testing-library/user-event` | De-facto standard; works with both Vitest and Jest. |
| Mocking | **MSW** (Mock Service Worker) | For HTTP mocks (Meta/Google/LinkedIn/TikTok APIs, ManyChat); covers both unit and E2E. |
| DB test strategy | **Dedicated Supabase project** (`hypeflow-os-test`) + per-test transaction rollback | Per `docs/guidelines/migrations.md` and `multi-tenancy.md` — integration tests must hit real Postgres + RLS, not mocks. |
| E2E | **Playwright** | Matches Next.js ecosystem; supports parallel browsers; integrates with Vercel preview URLs. |
| Coverage | `@vitest/coverage-v8` | Zero-config with Vitest. |
| CI integration | Deferred — per `devops` agent `customization`, CI/CD is **NOT active** until E2E is configured. This audit motivates activating it. |

**One-time setup tasks (pre-testing):**
1. Add `vitest`, `@vitest/coverage-v8`, `@testing-library/react`, `@testing-library/user-event`, `msw`, `@playwright/test` to root + per-app `package.json`.
2. Create `vitest.config.ts` at the root (or per app — Turborepo can orchestrate either way).
3. Add `test`, `test:watch`, `test:coverage`, `test:e2e` scripts to the affected `package.json` files.
4. Provision a `hypeflow-os-test` Supabase project. Wire test DB credentials into `hypeflow-os/.env.test`.
5. Write a `testing-patterns.md` in `docs/guidelines/` so future tests follow a consistent shape.

Estimate: **0.5 day** for unit+integration scaffold, **1 day** for Playwright + Supabase test project, **0.5 day** for first example tests (one of each type). Total **~2 days** of infrastructure work before the 5 critical fixes can land with tests-in-same-PR as the customization rules require.

---

## 7. Open for follow-up (not in scope for the 5-critical orchestration)

These surfaced during the audit but are not in the 5-critical set; worth a separate pass later:

- **Next.js Server Component body leaks**: several admin pages render database data without obvious auth-scope checks (`apps/hypeflow/app/(admin)/admin/trafego/page.tsx:9` uses the same fallback pattern as `pipeline/page.tsx`). Broaden the audit to every `app/(admin)/**/page.tsx`.
- **Inbound GHL webhook**: `apps/*/app/api/webhooks/ghl*` (referenced in git log but not inspected this round). Likely has the same auth-check gap as ManyChat.
- **tRPC auth middleware**: `apps/agency/server/trpc.ts` and siblings — not inspected; if the session-binding there is weak, it's a cross-cutting authorization finding.
- **Env var validation**: currently done via `!` non-null assertions and `?.` optional chaining throughout. A single `@t3-oss/env-nextjs` schema would harden C2's silent-fallback problem and several others.
- **Secret logging**: `console.log` / `console.error` calls in route handlers may ship error text containing secrets to Vercel logs. Needs a scrub pass.

---

## Appendix A — Audit methodology

Read the following directly (no execution, no subagents):

```
hypeflow-os/apps/hypeflow/middleware.ts
hypeflow-os/apps/hypeflow/lib/supabase/middleware.ts
hypeflow-os/apps/hypeflow/lib/supabase/server.ts
hypeflow-os/apps/agency/middleware.ts
hypeflow-os/apps/agency/lib/supabase/middleware.ts
hypeflow-os/apps/agency/lib/supabase/server.ts
hypeflow-os/apps/agency/lib/bootstrap/workspace.ts
hypeflow-os/apps/agency/app/(dashboard)/pipeline/page.tsx
hypeflow-os/apps/agency/app/api/manychat/webhook/route.ts
hypeflow-os/apps/agency/app/api/oauth/meta/connect/route.ts
hypeflow-os/apps/agency/app/api/oauth/meta/callback/route.ts
hypeflow-os/apps/agency/app/api/oauth/{google,tiktok,linkedin}/{connect,callback}/route.ts (grep-only on state handling)
hypeflow-os/apps/portal/middleware.ts
hypeflow-os/apps/portal/lib/supabase/server.ts
hypeflow-os/apps/hypeflow/app/portal/[token]/page.tsx
hypeflow-os/apps/hypeflow/app/(admin)/admin/clientes/page.tsx (derivePortalToken + call sites)
```

Runtime tests (fetching live endpoints, fuzz testing) were **not** performed. All findings are from static reading.

---

## Appendix B — What was NOT audited

Explicitly out of scope for this pass — noting so follow-up audits can pick up:

- `squads/`, `hype-flow-landing/`, `.aios-core/` (framework code, not product)
- `supabase/functions/` (Edge Functions) — their signature verification and service-role usage
- Client-side input sanitisation across admin UI forms
- Rate-limiting posture (none observed)
- CSP / security headers (none observed)
- Secrets hygiene in Vercel project config
- Dependency vulnerabilities — covered by the separate `dependency-audit-2026-04-22.md`

---

*End of report.*
