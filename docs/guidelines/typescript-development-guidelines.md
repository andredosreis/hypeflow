# TypeScript Development Guidelines

## Project Stack

**HypeFlow OS Runtime**:
- **Runtime**: Node.js 18+ LTS
- **Framework**: Next.js 14.2.35 - React framework with App Router - https://nextjs.org
- **Database**: Supabase JS 2.x - Direct client (no ORM) — RLS enforced at DB level - https://supabase.com/docs/reference/javascript
- **API layer**: tRPC 11 - End-to-end typesafe API - https://trpc.io
- **Validation**: Zod 3.x - TypeScript-first schema validation - https://zod.dev
- **Testing**: Jest 29.x - JavaScript testing framework - https://jestjs.io

**Essential Tools**:
- **Formatting**: Prettier 3.x - https://prettier.io
- **Linting**: ESLint 9.x - https://eslint.org
- **Type Checking**: TypeScript 5.x - https://www.typescriptlang.org
- **Logging**: Pino 9.x - https://getpino.io
- **Package Manager**: npm 10.x (not pnpm)

> All code examples use standard library or language-native features only.
> Libraries above are listed for reference; principles apply regardless of choices.

---

## 1. Core Principles

### 1.1 Philosophy and Style

- Enable `strict: true` in `tsconfig.json` — no exceptions
- Prefer `type` for unions/intersections, `interface` for extensible object shapes
- Avoid `any`; use `unknown` at untrusted boundaries
- Run `tsc --noEmit`, `eslint`, and `prettier --check` on every CI run
- Code should be self-documenting: names reveal intent without comments

### 1.2 Clarity over Brevity

- Always annotate return types on exported functions
- Prefer early returns over nested conditionals
- Avoid clever one-liners that obscure intent
- Refactor when a function exceeds 30 lines or has 3+ nesting levels

```typescript
// Bad: no types, implicit return, hard to scan
const process = (x) => x?.items?.map(i => i.v).filter(Boolean)

// Good: explicit types, clear names
function extractActiveValues(entity: Entity): number[] {
  return entity.items
    .filter((item) => item.isActive)
    .map((item) => item.value)
}
```

---

## 2. Project Initialization

### 2.1 Creating New Project

```bash
# Next.js project with TypeScript, ESLint, and App Router
pnpm create next-app@latest my-project --typescript --eslint --app --src-dir

# Standalone TypeScript project
pnpm init
pnpm add -D typescript @types/node tsx
npx tsc --init

# Validate tsconfig has strict enabled
grep '"strict": true' tsconfig.json
```

### 2.2 Dependency Management

```bash
# Add production dependency
pnpm add <package>

# Add dev dependency
pnpm add -D <package>

# Remove dependency
pnpm remove <package>

# Update all to latest compatible versions
pnpm update

# Install from lockfile (CI)
pnpm install --frozen-lockfile

# Audit for vulnerabilities
pnpm audit

# Check outdated packages
pnpm outdated
```

---

## 3. Project Structure

```
my-project/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (auth)/             # Route group — auth pages
│   │   ├── api/                # API route handlers
│   │   │   └── users/
│   │   │       └── route.ts
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/             # Shared UI components
│   │   └── ui/                 # Primitive elements (Button, Input, etc.)
│   ├── features/               # Domain modules (co-located by feature)
│   │   └── users/
│   │       ├── components/     # Feature-specific components
│   │       ├── hooks/          # Feature-specific hooks
│   │       ├── actions.ts      # Server actions
│   │       ├── queries.ts      # Data access
│   │       ├── types.ts        # Feature types
│   │       └── utils.ts
│   ├── lib/                    # Shared utilities and clients
│   │   ├── db.ts               # Database client singleton
│   │   └── logger.ts           # Logger instance
│   ├── hooks/                  # Global custom React hooks
│   ├── types/                  # Global TypeScript types
│   └── constants/              # App-wide constants
├── tests/
│   ├── unit/
│   └── integration/
├── public/                     # Static assets
├── .env.example                # Env var template (committed)
├── .env.local                  # Secrets (gitignored)
├── tsconfig.json
├── eslint.config.mjs
├── prettier.config.mjs
└── package.json
```

---

## 4A. Ambiente de Desenvolvimento HypeFlow OS

HypeFlow OS runs locally using Supabase CLI for the backend and `npm run dev` for the Next.js frontend. Docker is **not** used for the main app — Supabase CLI manages Postgres, Auth, Storage, and Edge Functions via its own containers internally.

### 4A.1 Prerequisites

```bash
# Install Supabase CLI
npm install -g supabase

# Install project dependencies
npm install

# Copy environment template
cp .env.example .env.local
```

### 4A.2 Starting the Dev Environment

```bash
# 1. Start Supabase local stack (Postgres + Auth + Storage + Studio)
supabase start

# 2. Apply pending migrations
supabase db push

# 3. Start Next.js dev server
npm run dev
```

Supabase Studio is available at `http://localhost:54323` after `supabase start`.

### 4A.3 Essential Commands

| Action | Command |
|---|---|
| Start Supabase stack | `supabase start` |
| Stop Supabase stack | `supabase stop` |
| Apply migrations | `supabase db push` |
| Create new migration | `supabase migration new <name>` |
| Seed database | `supabase db reset` |
| Generate TypeScript types | `supabase gen types typescript --local > src/types/database.ts` |
| Start Next.js | `npm run dev` |
| Run tests | `npm test` |
| Type check | `npm run typecheck` |
| Lint | `npm run lint` |

### 4A.4 Environment Variables

```bash
# .env.local — required variables for local dev
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<from supabase start output>
SUPABASE_SERVICE_ROLE_KEY=<from supabase start output>
```

Never commit `.env.local`. The `.env.example` file is committed with placeholder values.

---

## 4B. Ambiente Evolution API (VPS externo)

Evolution API runs containerised on an external VPS. Docker is the deployment mechanism for this component — **not** for the HypeFlow OS app itself.

### 4B.1 Architecture

```
VPS (external)
├── Evolution API container   — WhatsApp gateway
├── Redis container           — queue / session state
└── Postgres container        — Evolution API own data
          ↑
          |  webhooks (HTTPS)
          ↓
HypeFlow OS (Vercel / local)
└── /api/webhooks/evolution   — ingestion handler
```

### 4B.2 docker-compose.yml (VPS)

```yaml
services:
  evolution:
    image: atendai/evolution-api:latest
    ports:
      - "8080:8080"
    environment:
      SERVER_URL: https://api.yourdomain.com
      AUTHENTICATION_API_KEY: ${EVOLUTION_API_KEY}
      DATABASE_PROVIDER: postgresql
      DATABASE_CONNECTION_URI: ${DATABASE_URL}
      REDIS_URI: redis://redis:6379
    depends_on:
      - redis
      - db
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    restart: unless-stopped

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: evolution
      POSTGRES_USER: evolution
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - pgdata:/var/lib/postgresql/data
    restart: unless-stopped

volumes:
  pgdata:
```

### 4B.3 VPS Management Commands

```bash
# Deploy / update Evolution API
docker compose pull && docker compose up -d

# View logs
docker compose logs -f evolution

# Check container health
docker compose ps

# Restart after config change
docker compose restart evolution
```

### 4B.4 Best Practices

- Pin `evolution-api` to a specific image tag — never use `latest` in production
- Store `EVOLUTION_API_KEY` in a secrets manager or VPS environment secrets
- Expose Evolution API only via HTTPS with a reverse proxy (nginx/caddy)
- Configure webhook signature validation in HypeFlow OS ingestion handler

---

## 5. Naming Conventions

| Element | Convention | Example |
|---|---|---|
| Files — React components | PascalCase | `UserCard.tsx` |
| Files — modules/utils | kebab-case | `format-date.ts` |
| Interfaces | PascalCase | `UserProfile` |
| Types | PascalCase | `ApiResponse<T>` |
| Enums | PascalCase; SCREAMING members | `Status.ACTIVE` |
| Functions | camelCase | `getUserById` |
| Variables | camelCase | `isLoading` |
| Constants (module-level) | SCREAMING_SNAKE_CASE | `MAX_RETRY_COUNT` |
| React components | PascalCase | `SearchInput` |
| Boolean variables | `is/has/can` prefix | `isAuthenticated` |
| Event handlers | `handle` prefix | `handleSubmit` |
| Generic type params | Single uppercase letter or descriptive | `T`, `TItem`, `TResult` |

---

## 6. Types and Type System

### 6.1 Type Declaration

```typescript
// Use `interface` for extensible object shapes
interface User {
  id: string
  email: string
  role: UserRole
  createdAt: Date
}

// Use `type` for unions, intersections, and mapped types
type UserRole = 'admin' | 'editor' | 'viewer'
type ApiResult<T> = { data: T; error: null } | { data: null; error: string }

// Enums for fixed named values — prefer const enums for treeshaking
const enum HttpStatus {
  OK = 200,
  NOT_FOUND = 404,
  INTERNAL_ERROR = 500,
}
```

### 6.2 Type Safety

```typescript
// Use `unknown` at system boundaries, not `any`
function parseWebhookPayload(raw: unknown): WebhookEvent {
  if (typeof raw !== 'object' || raw === null || !('type' in raw)) {
    throw new Error('Invalid webhook payload')
  }
  return raw as WebhookEvent
}

// Use `satisfies` to validate without widening the type
const routes = {
  home: '/',
  dashboard: '/dashboard',
  profile: '/profile',
} satisfies Record<string, string>

// `Readonly` and `ReadonlyArray` for immutable data contracts
function computeTotal(items: ReadonlyArray<LineItem>): number {
  return items.reduce((sum, item) => sum + item.price * item.qty, 0)
}
```

### 6.3 Utility Types and Generics

```typescript
// Built-in utility types — prefer over manual re-implementation
type CreateUserDto = Omit<User, 'id' | 'createdAt'>
type UpdateUserDto = Partial<Pick<User, 'email' | 'role'>>

// Discriminated unions for exhaustive checks
type Shape =
  | { kind: 'circle'; radius: number }
  | { kind: 'square'; side: number }

function area(shape: Shape): number {
  switch (shape.kind) {
    case 'circle': return Math.PI * shape.radius ** 2
    case 'square': return shape.side ** 2
    // TypeScript errors here if a case is missing
  }
}

// Constrained generics
function getProperty<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key]
}
```

---

## 7. Functions and Methods

### 7.1 Signatures

```typescript
// Explicit return types on all exported functions
export async function findUserById(id: string): Promise<User | null> {
  const row = await db.query('SELECT * FROM users WHERE id = $1', [id])
  return row ?? null
}

// Object params for > 3 arguments
interface SendEmailParams {
  to: string
  subject: string
  body: string
  replyTo?: string
}

export async function sendEmail(params: SendEmailParams): Promise<void> {
  // implementation
}

// Arrow functions for callbacks and inline closures only
const activeUsers = users.filter((user) => user.isActive)
```

### 7.2 Returns and Errors

```typescript
// Good: typed return, error propagates to caller with context
export async function chargeCustomer(
  customerId: string,
  amount: number,
): Promise<ChargeReceipt> {
  const customer = await getCustomer(customerId)
  if (!customer) {
    throw new NotFoundError('Customer', customerId)
  }
  if (amount <= 0) {
    throw new ValidationError('amount', 'must be positive')
  }
  return stripe.charges.create({ customer: customerId, amount })
}

// Bad: returns undefined on error, no context for caller
async function chargeCustomer(customerId: string, amount: number) {
  try {
    const customer = await getCustomer(customerId)
    return await stripe.charges.create({ customer: customerId, amount })
  } catch (e) {
    console.error(e)
    // caller receives undefined — cannot distinguish error from null result
  }
}
```

### 7.3 Best Practices

- Single responsibility: one function, one action
- Keep functions under 30 lines; extract named helpers otherwise
- Max 3 positional parameters — use an options object beyond that
- Avoid mutating input arguments; return new values
- Use `readonly` on function parameters that should not be mutated
- Default parameters over conditional logic for optional config

---

## 8. Error Handling

### 8.1 Error Types

```typescript
// Base class with structured context
export class AppError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly context?: Record<string, unknown>,
  ) {
    super(message)
    this.name = 'AppError'
    // Maintains proper stack trace in V8
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError)
    }
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id: string) {
    super(`${resource} not found`, 'NOT_FOUND', { resource, id })
    this.name = 'NotFoundError'
  }
}

export class ValidationError extends AppError {
  constructor(field: string, reason: string) {
    super(`Validation failed on ${field}: ${reason}`, 'VALIDATION_ERROR', {
      field,
      reason,
    })
    this.name = 'ValidationError'
  }
}
```

### 8.2 Conventions

```typescript
// Good: typed error, context preserved, log only at HTTP boundary
export async function processOrder(orderId: string): Promise<Receipt> {
  const order = await findOrder(orderId)
  if (!order) {
    throw new NotFoundError('Order', orderId)
  }
  try {
    return await paymentService.charge(order)
  } catch (cause) {
    throw new AppError('Payment failed', 'PAYMENT_ERROR', {
      orderId,
      cause: cause instanceof Error ? cause.message : String(cause),
    })
  }
}

// Bad: error swallowed, context lost, generic message
async function processOrder(orderId: string) {
  try {
    const order = await findOrder(orderId)
    return await paymentService.charge(order)
  } catch {
    console.log('something went wrong') // no context, execution continues
  }
}
```

### 8.3 Best Practices

- Define domain-specific error classes extending `AppError`
- Always include structured context (`orderId`, `userId`, field name)
- Log errors exactly once — at the I/O boundary (HTTP handler, queue consumer)
- Use ES2022 `cause` when wrapping a lower-level error
- Use `instanceof AppError` to distinguish app errors from unexpected runtime errors
- Never use empty `catch {}` blocks

---

## 9. Concurrency and Parallelism

### 9.1 Concurrency Model

TypeScript runs on Node.js's single-threaded event loop. All I/O is non-blocking via `async/await` over Promises. CPU-bound work uses `worker_threads`.

```typescript
// Parallel independent async operations — use Promise.all
const [user, orders, settings] = await Promise.all([
  fetchUser(userId),
  fetchOrders(userId),
  fetchSettings(userId),
])

// Bad: sequential awaits for independent operations — 3x slower
const user = await fetchUser(userId)
const orders = await fetchOrders(userId)
const settings = await fetchSettings(userId)
```

### 9.2 Concurrency Patterns

```typescript
// Promise.allSettled — when partial failure is acceptable
const results = await Promise.allSettled(
  userIds.map((id) => sendWelcomeEmail(id)),
)
const failures = results.filter((r) => r.status === 'rejected')

// AbortController — cancellation for fetch and async work
async function fetchWithTimeout(url: string, ms: number): Promise<Response> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), ms)
  try {
    return await fetch(url, { signal: controller.signal })
  } finally {
    clearTimeout(timeout)
  }
}

// Controlled concurrency for large batches (avoid overwhelming DB/APIs)
async function processBatch<T>(
  items: T[],
  handler: (item: T) => Promise<void>,
  concurrency = 5,
): Promise<void> {
  const queue = [...items]
  const workers = Array.from({ length: concurrency }, async () => {
    while (queue.length > 0) {
      const item = queue.shift()
      if (item !== undefined) await handler(item)
    }
  })
  await Promise.all(workers)
}
```

### 9.3 Best Practices

- Always `await` Promises — never fire-and-forget unless intentional
- Set timeouts on all external I/O via `AbortController` or library options
- Use `Promise.all` for independent tasks, `Promise.allSettled` for partial-failure tolerance
- For CPU-bound work, offload to `worker_threads` or a job queue
- Handle unhandled rejections: `process.on('unhandledRejection', handler)`

### 9.4 Common Pitfalls

```typescript
// Pitfall: async in forEach does not wait for completion
items.forEach(async (item) => { await process(item) }) // WRONG

// Fix: use for...of or Promise.all with map
for (const item of items) { await process(item) }
await Promise.all(items.map((item) => process(item)))

// Pitfall: missing await causes silent skip
async function save(data: Data): Promise<void> {
  db.insert(data) // forgot await — insert never completes
}
```

---

## 10. Interfaces and Abstractions

### 10.1 Interface Design

Keep interfaces small and focused on a single responsibility (Interface Segregation).

```typescript
// Good: small, cohesive interfaces
interface Readable {
  read(id: string): Promise<User | null>
}

interface Writable {
  write(user: User): Promise<void>
}

// Compose larger interfaces from smaller ones
interface UserRepository extends Readable, Writable {
  list(filter: UserFilter): Promise<User[]>
}
```

### 10.2 Implementation and Dependency Inversion

```typescript
// Depend on the interface, not the concrete class
class UserService {
  constructor(private readonly repo: UserRepository) {}

  async activate(userId: string): Promise<void> {
    const user = await this.repo.read(userId)
    if (!user) throw new NotFoundError('User', userId)
    await this.repo.write({ ...user, isActive: true })
  }
}

// In tests, provide a lightweight fake — no mocking library needed
class InMemoryUserRepository implements UserRepository {
  private store = new Map<string, User>()

  async read(id: string) { return this.store.get(id) ?? null }
  async write(user: User) { this.store.set(user.id, user) }
  async list() { return [...this.store.values()] }
}
```

### 10.3 Generic Abstractions

```typescript
// Repository pattern with generics
interface Repository<T extends { id: string }> {
  findById(id: string): Promise<T | null>
  save(entity: T): Promise<void>
  delete(id: string): Promise<void>
}

// Service result pattern — avoid exceptions for expected failure paths
type Result<T, E = string> =
  | { ok: true; value: T }
  | { ok: false; error: E }

function ok<T>(value: T): Result<T> { return { ok: true, value } }
function fail<E>(error: E): Result<never, E> { return { ok: false, error } }
```

---

## 11. Unit Tests

### 11.1 Structure

```typescript
// src/features/users/__tests__/user.service.test.ts
import { UserService } from '../user.service'
import { InMemoryUserRepository } from '../__mocks__/user.repository'

describe('UserService', () => {
  let service: UserService
  let repo: InMemoryUserRepository

  beforeEach(() => {
    repo = new InMemoryUserRepository()
    service = new UserService(repo)
  })

  describe('activate', () => {
    it('sets isActive to true for an existing user', async () => {
      const user = { id: '1', email: 'a@b.com', isActive: false }
      await repo.write(user)

      await service.activate('1')

      const updated = await repo.read('1')
      expect(updated?.isActive).toBe(true)
    })

    it('throws NotFoundError when user does not exist', async () => {
      await expect(service.activate('nonexistent')).rejects.toThrow('User not found')
    })
  })
})
```

### 11.2 Table-Driven Tests

```typescript
describe('formatCurrency', () => {
  const cases: Array<{ input: number; locale: string; expected: string }> = [
    { input: 1000, locale: 'en-US', expected: '$1,000.00' },
    { input: 1000, locale: 'de-DE', expected: '1.000,00 €' },
    { input: 0, locale: 'en-US', expected: '$0.00' },
    { input: -50, locale: 'en-US', expected: '-$50.00' },
  ]

  it.each(cases)('formats $input in $locale as $expected', ({ input, locale, expected }) => {
    expect(formatCurrency(input, locale)).toBe(expected)
  })
})
```

### 11.3 Assertions

```typescript
// Prefer specific matchers over toBe(true)
expect(result).toEqual({ id: '1', isActive: true })  // deep equality
expect(fn).toThrow(NotFoundError)                     // specific error class
expect(arr).toHaveLength(3)
expect(spy).toHaveBeenCalledWith('expected-arg')
expect(value).toMatchObject({ status: 'ok' })         // partial match

// Async assertions
await expect(promise).resolves.toEqual(expected)
await expect(promise).rejects.toThrow('message')
```

### 11.4 Commands

```bash
# Run all unit tests
pnpm test

# Run tests in watch mode
pnpm test --watch

# Run a specific test file
pnpm test src/features/users/__tests__/user.service.test.ts

# Run tests matching a name pattern
pnpm test --testNamePattern="activate"

# Run with coverage
pnpm test --coverage

# Run with verbose output
pnpm test --verbose
```

---

## 12. Mocks and Testability

### 12.1 Prefer Fakes over Mocks

Hand-rolled fakes (implementations of interfaces) are more maintainable than auto-generated mocks from `jest.mock()`.

```typescript
// Fake — implements the interface, zero magic
export class FakeEmailService implements EmailService {
  sent: Array<{ to: string; subject: string }> = []

  async send(to: string, subject: string, body: string): Promise<void> {
    this.sent.push({ to, subject })
  }
}

// Use in test
const emailService = new FakeEmailService()
const service = new UserService(repo, emailService)
await service.register({ email: 'user@example.com' })
expect(emailService.sent).toHaveLength(1)
expect(emailService.sent[0].to).toBe('user@example.com')
```

### 12.2 Jest Mocks for Module-Level Dependencies

```typescript
// Mock an entire module
jest.mock('@/lib/db', () => ({
  query: jest.fn(),
}))

import { query } from '@/lib/db'
const mockQuery = jest.mocked(query)

it('calls db with correct params', async () => {
  mockQuery.mockResolvedValueOnce([{ id: '1' }])
  const result = await getUserById('1')
  expect(mockQuery).toHaveBeenCalledWith(
    'SELECT * FROM users WHERE id = $1',
    ['1'],
  )
})
```

### 12.3 Test Doubles Reference

| Type | Use case | Example |
|---|---|---|
| Fake | Full working implementation | `InMemoryRepository` |
| Stub | Returns canned values | `jest.fn().mockResolvedValue(data)` |
| Mock | Verifies call interactions | `expect(spy).toHaveBeenCalledWith(...)` |
| Spy | Wraps real function | `jest.spyOn(module, 'method')` |

---

## 13. Integration Tests

### 13.1 Structure and Separation

```typescript
// tests/integration/users.test.ts
// Use a real database connection; run against a test schema

describe('User API — integration', () => {
  beforeAll(async () => {
    await db.query('BEGIN')
    await runMigrations(db)
  })

  afterAll(async () => {
    await db.query('ROLLBACK')
    await db.end()
  })

  it('creates and retrieves a user', async () => {
    const created = await createUser({ email: 'int@test.com' })
    const found = await findUserById(created.id)
    expect(found?.email).toBe('int@test.com')
  })
})
```

### 13.2 Selective Execution

```bash
# Run only unit tests (exclude integration folder)
pnpm jest --testPathPattern="src/"

# Run only integration tests
pnpm jest --testPathPattern="tests/integration/"

# Run with a specific config for integration
pnpm jest --config jest.integration.config.ts
```

### 13.3 Real Dependencies

Use `testcontainers` to spin up real services in CI:

```typescript
import { PostgreSqlContainer } from '@testcontainers/postgresql'

let container: StartedPostgreSqlContainer

beforeAll(async () => {
  container = await new PostgreSqlContainer('postgres:16-alpine').start()
  process.env.DATABASE_URL = container.getConnectionUri()
  await runMigrations()
})

afterAll(async () => {
  await container.stop()
})
```

---

## 14. Load and Stress Tests

### 14.1 Tools

| Tool | Use case | Install |
|---|---|---|
| k6 | HTTP load testing with JavaScript scripts | `brew install k6` |
| Artillery | YAML/JS scenario-based load testing | `npm install -g artillery` |
| autocannon | Lightweight HTTP benchmarking | `npm install -g autocannon` |

### 14.2 k6 Scripts — HypeFlow OS Thresholds

Thresholds are defined per endpoint type per the FDD:

```javascript
// tests/load/webhook-ingestion.k6.js — inbound lead ingestion
import http from 'k6/http'
import { check, sleep } from 'k6'

export const options = {
  vus: 50,
  duration: '30s',
  thresholds: {
    http_req_duration: ['p(95)<300'],  // webhook ingestion SLO: p95 < 300ms
    http_req_failed: ['rate<0.01'],
  },
}

export default function () {
  const payload = JSON.stringify({ phone: '+5511999990000', source: 'ghl' })
  const res = http.post(
    'http://localhost:3000/api/webhooks/evolution',
    payload,
    { headers: { 'Content-Type': 'application/json' } },
  )
  check(res, { 'accepted': (r) => r.status === 202 })
  sleep(1)
}
```

```javascript
// tests/load/score-engine.k6.js — lead qualification scoring
import http from 'k6/http'
import { check, sleep } from 'k6'

export const options = {
  vus: 30,
  duration: '30s',
  thresholds: {
    http_req_duration: ['p(95)<200'],  // Score Engine SLO: p95 < 200ms
    http_req_failed: ['rate<0.01'],
  },
}

export default function () {
  const res = http.get('http://localhost:3000/api/leads/score?id=test-lead-1')
  check(res, { 'status is 200': (r) => r.status === 200 })
  sleep(1)
}
```

```bash
# Run load test
k6 run tests/load/users.k6.js

# Run with HTML report
k6 run --out json=results.json tests/load/users.k6.js
```

### 14.3 Concurrency Tests

```bash
# Quick concurrency check with autocannon
autocannon -c 100 -d 10 http://localhost:3000/api/health

# Output: requests/sec, latency percentiles, errors
```

---

## 15. Profiling and Diagnostics

### 15.1 CPU and Memory Profiling

```bash
# Start Node.js with CPU profiler
node --prof dist/server.js

# Process the V8 profile log
node --prof-process isolate-*.log > profile.txt

# Heap snapshot via Node.js inspector
node --inspect dist/server.js
# Then open chrome://inspect and take heap snapshots
```

### 15.2 Clinic.js Diagnostics

```bash
# Install clinic
pnpm add -g clinic

# CPU profiling with flamegraph
clinic flame -- node dist/server.js

# Event loop blocking detection
clinic bubbleprof -- node dist/server.js

# Memory leak detection
clinic heapprofiler -- node dist/server.js
```

### 15.3 Performance Analysis

```bash
# Built-in Node.js performance hooks
node --trace-warnings dist/server.js   # surface warning origins
node --heap-prof dist/server.js        # write heap profile on exit

# Check memory usage in code
const used = process.memoryUsage()
console.log(`RSS: ${Math.round(used.rss / 1024 / 1024)} MB`)
console.log(`Heap: ${Math.round(used.heapUsed / 1024 / 1024)} MB`)
```

---

## 16. Optimization

### 16.1 Principles

- Measure before optimizing — use profiling output as evidence
- Fix the algorithm before micro-optimizing
- Document performance trade-offs in comments when non-obvious

```bash
# Benchmark a route under load before and after changes
autocannon -c 50 -d 10 http://localhost:3000/api/users
```

### 16.2 Common Optimizations

```typescript
// Pre-compute lookup maps instead of repeated .find()
// Bad: O(n) per lookup
const getUser = (id: string) => users.find((u) => u.id === id)

// Good: O(1) lookup
const userMap = new Map(users.map((u) => [u.id, u]))
const getUser = (id: string) => userMap.get(id)

// Lazy initialization for expensive singletons
let _db: DatabaseClient | undefined
function getDb(): DatabaseClient {
  return (_db ??= new DatabaseClient(process.env.DATABASE_URL!))
}

// Avoid recreating objects inside hot loops
const formatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })
for (const item of items) {
  item.formatted = formatter.format(item.price) // reuse formatter
}
```

### 16.3 Memory Optimization

```typescript
// Stream large datasets instead of loading into memory
import { createReadStream } from 'fs'
import { parse } from 'csv-parse'

async function* streamCsv(path: string) {
  const parser = createReadStream(path).pipe(parse({ columns: true }))
  for await (const row of parser) {
    yield row
  }
}

// Use WeakMap for caches tied to object lifetime
const cache = new WeakMap<Request, ProcessedData>()
function getProcessed(req: Request): ProcessedData {
  if (!cache.has(req)) cache.set(req, processRequest(req))
  return cache.get(req)!
}
```

---

## 17. Security

### 17.1 Essential Practices

- Never hardcode secrets — use environment variables only
- Validate all external input at system boundaries (HTTP, queues, webhooks)
- Use parameterized queries — never string-concatenate SQL
- Set security headers (`Content-Security-Policy`, `X-Frame-Options`)
- Rotate secrets regularly; use a secrets manager in production

### 17.2 Input Validation at Boundaries

```typescript
// Validate request bodies at the HTTP layer using native parsing
function parseCreateUserBody(body: unknown): CreateUserInput {
  if (typeof body !== 'object' || body === null) {
    throw new ValidationError('body', 'must be an object')
  }
  const b = body as Record<string, unknown>
  if (typeof b.email !== 'string' || !b.email.includes('@')) {
    throw new ValidationError('email', 'must be a valid email')
  }
  if (typeof b.password !== 'string' || b.password.length < 8) {
    throw new ValidationError('password', 'must be at least 8 characters')
  }
  return { email: b.email.toLowerCase().trim(), password: b.password }
}
```

### 17.3 Tools

```bash
# Audit dependencies for known vulnerabilities
pnpm audit

# Fix automatically patchable vulnerabilities
pnpm audit --fix

# Static analysis for security issues
npx eslint --rule '{"no-eval": "error"}' src/

# Check for secrets accidentally committed
npx secretlint "**/*"
```

---

## 18. Code Patterns

### 18.1 Early Return

```typescript
// Bad: deep nesting
function processOrder(order: Order): string {
  if (order) {
    if (order.isActive) {
      if (order.items.length > 0) {
        return calculateTotal(order)
      }
    }
  }
  return 'invalid'
}

// Good: early returns flatten the logic
function processOrder(order: Order | null): string {
  if (!order) return 'invalid'
  if (!order.isActive) return 'invalid'
  if (order.items.length === 0) return 'invalid'
  return calculateTotal(order)
}
```

### 18.2 Separation of Concerns

```typescript
// Keep data access, business logic, and presentation separate

// Data access layer
async function findActiveUsers(): Promise<User[]> {
  return db.query('SELECT * FROM users WHERE is_active = true')
}

// Business logic — pure function, no I/O
function rankUsers(users: User[]): User[] {
  return [...users].sort((a, b) => b.score - a.score)
}

// Handler — composes layers, handles HTTP concerns
export async function GET(): Promise<Response> {
  const users = await findActiveUsers()
  const ranked = rankUsers(users)
  return Response.json(ranked)
}
```

### 18.3 DRY and Scope

```typescript
// Extract when duplication appears 3+ times with same intent
function formatDate(date: Date): string {
  return date.toISOString().split('T')[0]
}

// Minimize variable scope — declare as close to use as possible
function processItems(items: Item[]): Result[] {
  return items.map((item) => {
    const multiplied = item.value * item.quantity  // scoped to this map callback
    return { id: item.id, total: multiplied }
  })
}
```

---

## 19. Dependency Management

### 19.1 Principles

- Standard library first — check `node:` built-ins before adding a package
- Prefer packages with >1M weekly downloads and recent maintenance
- Lock to exact versions in `package.json` for reproducible builds
- Audit on every CI run: `pnpm audit --audit-level=high`

### 19.2 Commands

```bash
# Check all outdated packages
pnpm outdated

# Update a specific package
pnpm update <package>@latest

# Remove unused dependencies
npx depcheck

# Analyze bundle size impact before adding a package
npx bundlephobia <package>

# List transitive dependencies
pnpm why <package>

# Clean install
rm -rf node_modules && pnpm install --frozen-lockfile
```

---

## 20. Comments and Documentation

### 20.1 Code Comments

Comment the **why**, never the **what**. Code describes what it does; comments explain why it must be done that way.

```typescript
// Good: explains non-obvious reason
// Supabase RLS requires the user ID to be in the JWT claims, not the session.
// Fetching from the session would bypass row-level policies.
const userId = jwt.sub

// Bad: describes what the code already says
// Get user id from jwt
const userId = jwt.sub

// Good: documents a constraint or workaround
// parseInt with radix 10 prevents octal parsing on strings like "08"
const port = parseInt(process.env.PORT ?? '3000', 10)
```

### 20.2 JSDoc for Public APIs

```typescript
/**
 * Calculates the discounted price after applying a coupon.
 *
 * @param price - Original price in cents
 * @param coupon - Valid coupon with a percentage discount (0-100)
 * @returns Discounted price in cents, floored to nearest cent
 * @throws {ValidationError} When coupon discount is outside 0-100 range
 */
export function applyDiscount(price: number, coupon: Coupon): number {
  if (coupon.discount < 0 || coupon.discount > 100) {
    throw new ValidationError('coupon.discount', 'must be between 0 and 100')
  }
  return Math.floor(price * (1 - coupon.discount / 100))
}
```

### 20.3 Module Documentation

```typescript
/**
 * User domain — data access, business logic, and types for the users feature.
 *
 * Entry point: `UserService`
 * Dependencies: `UserRepository` (injected), `EmailService` (injected)
 */
export { UserService } from './user.service'
export type { User, CreateUserDto, UserRole } from './types'
```

---

## 21. Database

### 21.1 Approach

HypeFlow OS uses **Supabase JS client directly** — no ORM layer. Authorization is enforced at the database level via Row Level Security (RLS) policies, not in application code. The Supabase client is typed against generated `Database` types from the schema.

```typescript
// lib/supabase/client.ts — browser/server client singleton
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

export const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
)

// lib/supabase/server.ts — server-side client (service role for admin ops)
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

export function createServerClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}
```

### 21.2 Querying with Supabase JS

```typescript
// Standard select — RLS applied automatically for anon/user clients
export async function getActiveLeads(): Promise<Lead[]> {
  const { data, error } = await supabase
    .from('leads')
    .select('id, name, phone, score, status')
    .eq('status', 'active')
    .order('score', { ascending: false })

  if (error) throw new AppError('Failed to fetch leads', 'DB_ERROR', { error: error.message })
  return data
}

// Select with related data (join)
export async function getLeadWithInteractions(leadId: string) {
  const { data, error } = await supabase
    .from('leads')
    .select(`
      id, name, phone, score,
      lead_interactions (
        id, channel, message, created_at
      )
    `)
    .eq('id', leadId)
    .single()

  if (error) throw new NotFoundError('Lead', leadId)
  return data
}

// Insert
export async function createLead(input: CreateLeadInput): Promise<Lead> {
  const { data, error } = await supabase
    .from('leads')
    .insert(input)
    .select()
    .single()

  if (error) throw new AppError('Failed to create lead', 'DB_ERROR', { error: error.message })
  return data
}

// Update
export async function updateLeadScore(leadId: string, score: number): Promise<void> {
  const { error } = await supabase
    .from('leads')
    .update({ score, updated_at: new Date().toISOString() })
    .eq('id', leadId)

  if (error) throw new AppError('Failed to update score', 'DB_ERROR', { leadId, error: error.message })
}
```

### 21.3 Transactions via RPC

Multi-step atomic operations must be wrapped in Postgres functions (RPC) — the Supabase JS client does not expose direct transaction control.

```typescript
// Call a Postgres function that runs inside a single transaction
export async function qualifyAndAssignLead(
  leadId: string,
  agentId: string,
): Promise<void> {
  const { error } = await supabase.rpc('qualify_and_assign_lead', {
    p_lead_id: leadId,
    p_agent_id: agentId,
  })

  if (error) {
    throw new AppError('Lead qualification transaction failed', 'RPC_ERROR', {
      leadId,
      agentId,
      error: error.message,
    })
  }
}
```

```sql
-- supabase/migrations/20240101_qualify_and_assign_lead.sql
CREATE OR REPLACE FUNCTION qualify_and_assign_lead(
  p_lead_id UUID,
  p_agent_id UUID
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE leads SET status = 'qualified', updated_at = NOW() WHERE id = p_lead_id;
  INSERT INTO lead_assignments (lead_id, agent_id, assigned_at)
    VALUES (p_lead_id, p_agent_id, NOW());
END;
$$;
```

### 21.4 RLS as Authorization Layer

RLS policies replace application-level permission checks. Never bypass them with the service role client in user-facing code paths.

```sql
-- supabase/migrations/20240101_leads_rls.sql

-- Enable RLS on the table
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- Users can only see leads belonging to their organization
CREATE POLICY "leads_org_isolation" ON leads
  FOR ALL
  USING (org_id = (SELECT org_id FROM profiles WHERE id = auth.uid()));

-- Only agents can update leads assigned to them
CREATE POLICY "leads_agent_update" ON leads
  FOR UPDATE
  USING (assigned_agent_id = auth.uid());
```

```typescript
// The anon/user client automatically applies RLS — no WHERE org_id = ... needed
const { data } = await supabase.from('leads').select('*')
// Returns ONLY leads the authenticated user has access to

// Use service role ONLY for trusted server-side admin operations (webhooks, jobs)
const adminClient = createServerClient()
const { data } = await adminClient.from('leads').select('*')
// Bypasses RLS — use only in controlled server contexts
```

### 21.5 Migrations

Migrations are managed exclusively via Supabase CLI. Never edit the database manually.

```bash
# Create a new migration file
supabase migration new add_lead_score_column

# Apply migrations to local dev database
supabase db push

# Check migration status
supabase migration list

# Generate TypeScript types from current schema
supabase gen types typescript --local > src/types/database.ts

# Apply migrations to production (via CI/CD or manually)
supabase db push --db-url $PRODUCTION_DATABASE_URL
```

### 21.6 Best Practices

- Always check `error` from every Supabase JS call — it does not throw by default
- Use the **anon client** for user-facing queries — RLS handles authorization
- Use the **service role client** only in server-side trusted contexts (webhooks, cron jobs)
- Call `supabase gen types` after every migration to keep TypeScript types in sync
- Use `.single()` when expecting exactly one row — it throws if 0 or >1 rows returned
- Use RPC functions for multi-step atomic operations instead of sequential JS awaits
- Never expose raw Supabase error objects to API consumers — wrap and sanitize

---

## 22. Logs and Observability

### 22.1 Log Levels

| Level | When to use |
|---|---|
| `debug` | Detailed diagnostic info — dev only |
| `info` | Normal operations: request received, job started |
| `warn` | Unexpected but recoverable: retry triggered, deprecated usage |
| `error` | Operation failed, needs attention |
| `fatal` | Application cannot continue — triggers process exit |

### 22.2 Logger Setup

```typescript
// lib/logger.ts — structured JSON logger using Node.js console
// In production, swap for Pino (listed in Project Stack)

type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal'

interface LogEntry {
  level: LogLevel
  msg: string
  ts: string
  [key: string]: unknown
}

function log(level: LogLevel, msg: string, context?: Record<string, unknown>): void {
  const entry: LogEntry = {
    level,
    msg,
    ts: new Date().toISOString(),
    env: process.env.NODE_ENV,
    ...context,
  }
  const output = JSON.stringify(entry)
  if (level === 'error' || level === 'fatal') {
    process.stderr.write(output + '\n')
  } else {
    process.stdout.write(output + '\n')
  }
}

export const logger = {
  debug: (msg: string, ctx?: Record<string, unknown>) => log('debug', msg, ctx),
  info: (msg: string, ctx?: Record<string, unknown>) => log('info', msg, ctx),
  warn: (msg: string, ctx?: Record<string, unknown>) => log('warn', msg, ctx),
  error: (msg: string, ctx?: Record<string, unknown>) => log('error', msg, ctx),
  fatal: (msg: string, ctx?: Record<string, unknown>) => log('fatal', msg, ctx),
}
```

### 22.3 Logging with Context

```typescript
// Always include correlation data — never log bare messages
export async function processWebhook(
  requestId: string,
  payload: WebhookPayload,
): Promise<void> {
  const ctx = { requestId, eventType: payload.type }

  logger.info('Webhook received', ctx)

  try {
    await handleEvent(payload)
    logger.info('Webhook processed', ctx)
  } catch (err) {
    logger.error('Webhook processing failed', {
      ...ctx,
      error: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
    })
    throw err
  }
}

// HTTP request logging pattern
export function requestLogger(req: Request): void {
  logger.info('Request', {
    method: req.method,
    url: req.url,
    requestId: req.headers.get('x-request-id') ?? crypto.randomUUID(),
  })
}
```

### 22.4 Metrics and Observability

- Instrument all external I/O: HTTP calls, DB queries, queue publishes
- Expose a `/health` endpoint returning `{ status: 'ok', uptime: process.uptime() }`
- Expose a `/ready` endpoint that checks DB connectivity
- Emit structured logs at DEBUG for latency measurements
- Keep log field names consistent across services for aggregation

```typescript
// Latency instrumentation pattern
async function timedQuery<T>(name: string, fn: () => Promise<T>): Promise<T> {
  const start = performance.now()
  try {
    const result = await fn()
    logger.debug('Query completed', { query: name, durationMs: performance.now() - start })
    return result
  } catch (err) {
    logger.error('Query failed', { query: name, durationMs: performance.now() - start })
    throw err
  }
}
```

---

## 23. Golden Rules

1. **Simplicity first** — the simplest code that correctly solves the problem is always preferred
2. **Explicit errors** — never swallow, never return `undefined` where `Error` is appropriate
3. **Types everywhere** — `strict: true` is non-negotiable; `any` is a code smell
4. **Tests for all paths** — unit tests for logic, integration tests for I/O boundaries
5. **Measure before optimizing** — profiler output, not intuition, drives performance work
6. **Secrets in env only** — no hardcoded credentials, tokens, or connection strings in code
7. **Structured logs** — every log entry is JSON with consistent fields for machine parsing

---

## 24. Pre-Commit Checklist

### Code
- [ ] `pnpm tsc --noEmit` passes with zero errors
- [ ] `pnpm lint` passes with zero warnings on changed files
- [ ] `pnpm format --check` reports no formatting diffs
- [ ] No `any`, `@ts-ignore`, or `// eslint-disable` without explanation

### Tests
- [ ] `pnpm test` passes with all tests green
- [ ] Coverage >= 70% on new code paths
- [ ] Integration tests executed against real dependencies
- [ ] No `console.log` left in test files

### Quality
- [ ] All errors handled explicitly — no empty `catch {}` blocks
- [ ] No hardcoded secrets, URLs, or magic numbers
- [ ] `pnpm audit --audit-level=high` reports zero high/critical vulnerabilities
- [ ] Resources (DB connections, streams) are closed in `finally` blocks

### Documentation
- [ ] All exported functions have JSDoc with `@param` and `@returns`
- [ ] `README.md` updated if setup steps changed
- [ ] `.env.example` updated if new variables were added

### Docker
- [ ] `docker compose up -d` starts without errors
- [ ] `docker compose exec app pnpm test` passes in container
- [ ] Application responds on `http://localhost:3000/health`

---

## 25. References

### Official Documentation
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [TypeScript Do's and Don'ts](https://www.typescriptlang.org/docs/handbook/declaration-files/do-s-and-don-ts.html)
- [TypeScript Coding Guidelines (Microsoft)](https://github.com/microsoft/TypeScript/wiki/Coding-guidelines)
- [Next.js Documentation](https://nextjs.org/docs)
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)

### Style Guides
- [Google TypeScript Style Guide](https://google.github.io/styleguide/tsguide.html)
- [TypeScript Style Guide (ts.dev)](https://ts.dev/style/)
- [Airbnb JavaScript Style Guide](https://github.com/airbnb/javascript)

### Essential Tools
- [ESLint](https://eslint.org) — pluggable linter
- [Prettier](https://prettier.io) — opinionated formatter
- [pnpm](https://pnpm.io) — package manager
- [Jest](https://jestjs.io) — testing framework
- [Zod](https://zod.dev) — schema validation
- [Prisma](https://www.prisma.io) — ORM

### Testing and Performance
- [Testcontainers for Node.js](https://node.testcontainers.org)
- [k6 Load Testing](https://k6.io/docs/)
- [Clinic.js Profiling](https://clinicjs.org)
- [autocannon HTTP benchmarking](https://github.com/mcollina/autocannon)

### Community
- [TypeScript Discord](https://discord.com/invite/typescript)
- [awesome-typescript](https://github.com/dzharii/awesome-typescript)
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)
