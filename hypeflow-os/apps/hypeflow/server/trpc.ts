import { initTRPC, TRPCError } from '@trpc/server'
import superjson from 'superjson'
import { ZodError } from 'zod'
import { createClient, createServiceClient } from '@/lib/supabase/server'

/**
 * Unified tRPC context resolves both agency users and client users.
 * agencyUser → authenticated agency team member (from `users` table)
 * clientUser → authenticated client portal user (from `client_users` table)
 */
export const createTRPCContext = async () => {
  // Placeholder/demo mode — skip all Supabase calls
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  if (!supabaseUrl || supabaseUrl.includes('placeholder')) {
    const serviceClient = await createServiceClient()
    return {
      supabase: serviceClient,
      agencyUser: {
        id: 'demo-user',
        email: 'admin@hypeflow.pt',
        agency_id: 'demo-agency-id',
      },
      clientUser: {
        id: 'demo-client-user',
        email: 'cliente@demo.pt',
        client_id: 'preview-client-1',
        agency_id: 'demo-agency-id',
      },
    }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { supabase, agencyUser: null, clientUser: null }
  }

  // Try agency user
  const { data: agencyRow } = await supabase
    .from('users')
    .select('id, agency_id, role')
    .eq('id', user.id)
    .eq('is_active', true)
    .single()

  if (agencyRow) {
    return {
      supabase,
      agencyUser: {
        id: user.id,
        email: user.email!,
        agency_id: agencyRow.agency_id,
        role: agencyRow.role,
      },
      clientUser: null,
    }
  }

  // Try client user
  const { data: clientRow } = await supabase
    .from('client_users')
    .select('client_id, agency_id')
    .eq('id', user.id)
    .eq('is_active', true)
    .single()

  return {
    supabase,
    agencyUser: null,
    clientUser: clientRow
      ? {
          id: user.id,
          email: user.email!,
          client_id: clientRow.client_id,
          agency_id: clientRow.agency_id,
        }
      : null,
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

// Agency team procedures
const enforceAgencyUser = t.middleware(({ ctx, next }) => {
  if (!ctx.agencyUser) throw new TRPCError({ code: 'UNAUTHORIZED' })
  return next({ ctx: { ...ctx, agencyUser: ctx.agencyUser } })
})
export const agencyProcedure = t.procedure.use(enforceAgencyUser)

// Client portal procedures
const enforceClientUser = t.middleware(({ ctx, next }) => {
  if (!ctx.clientUser || !ctx.clientUser.client_id) throw new TRPCError({ code: 'UNAUTHORIZED' })
  return next({
    ctx: {
      ...ctx,
      clientUser: ctx.clientUser as { id: string; email: string; client_id: string; agency_id: string },
    },
  })
})
export const clientProcedure = t.procedure.use(enforceClientUser)
