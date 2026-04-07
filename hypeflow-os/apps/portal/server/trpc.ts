/**
 * Portal tRPC Server Context
 *
 * Differs from agency tRPC:
 *   - Authenticates client_users (not agency users)
 *   - Automatically resolves client_id from the logged-in user
 *   - All queries are automatically scoped to the client's data
 */

import { initTRPC, TRPCError } from '@trpc/server'
import superjson from 'superjson'
import { ZodError } from 'zod'
import { createClient } from '@/lib/supabase/server'

export const createTRPCContext = async () => {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    // Dev preview mode — use seed client
    if (process.env.NODE_ENV !== 'production') {
      return {
        supabase,
        user: {
          id:        'dev-portal-user',
          email:     'preview@hypeflow.local',
          client_id: '00000000-0000-0000-0000-000000000010',  // TechnoSpark seed
          agency_id: '00000000-0000-0000-0000-000000000001',
        },
      }
    }
    return { supabase, user: null }
  }

  // Resolve client_id from client_users table
  const { data: clientUser } = await supabase
    .from('client_users')
    .select('client_id, agency_id')
    .eq('id', user.id)
    .eq('is_active', true)
    .single()

  return {
    supabase,
    user: {
      id:        user.id,
      email:     user.email!,
      client_id: clientUser?.client_id ?? null,
      agency_id: clientUser?.agency_id ?? null,
    },
  }
}

type Context = Awaited<ReturnType<typeof createTRPCContext>>

const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError: error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    }
  },
})

export const createTRPCRouter = t.router
export const publicProcedure  = t.procedure

// Enforces that user is authenticated and has a client_id
const enforceClientUser = t.middleware(({ ctx, next }) => {
  if (!ctx.user || !ctx.user.client_id) {
    throw new TRPCError({ code: 'UNAUTHORIZED' })
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user as { id: string; email: string; client_id: string; agency_id: string },
    },
  })
})

export const clientProcedure = t.procedure.use(enforceClientUser)
