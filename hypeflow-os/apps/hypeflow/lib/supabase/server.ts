import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Returns a no-op Supabase-like object for demo/placeholder mode
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function createNullClient(): any {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const noopQuery: any = {}
  const noop = () => noopQuery
  noopQuery.select    = noop
  noopQuery.insert    = () => Promise.resolve({ data: null, error: null })
  noopQuery.update    = noop
  noopQuery.upsert    = () => Promise.resolve({ data: null, error: null })
  noopQuery.delete    = noop
  noopQuery.eq        = noop
  noopQuery.neq       = noop
  noopQuery.not       = noop
  noopQuery.in        = noop
  noopQuery.or        = noop
  noopQuery.is        = noop
  noopQuery.order     = noop
  noopQuery.limit     = noop
  noopQuery.single    = () => Promise.resolve({ data: null, error: null })
  noopQuery.maybeSingle = () => Promise.resolve({ data: null, error: null })
  // Awaiting this query resolves to { data: null, error: null, count: null } as any
  noopQuery.then = (resolve: (v: unknown) => unknown) =>
    Promise.resolve(resolve({ data: null, error: null, count: null }))
  return {
    auth: {
      getUser: () => Promise.resolve({ data: { user: null }, error: null }),
      signInWithPassword: () => Promise.resolve({ data: { user: null, session: null }, error: null }),
    },
    from: () => noopQuery,
    channel: () => ({ on: () => ({ subscribe: () => {} }) }),
  }
}

const isDemo = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  return !url || url.includes('placeholder')
}

export async function createClient() {
  if (isDemo()) return createNullClient()

  const cookieStore = await cookies()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return createServerClient<any>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setAll(cookiesToSet: any[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }: { name: string; value: string; options?: object }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Server Component — cookies read-only
          }
        },
      },
    }
  )
}

export async function createServiceClient() {
  if (isDemo()) return createNullClient()

  const cookieStore = await cookies()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return createServerClient<any>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll() {},
      },
    }
  )
}
