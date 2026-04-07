/**
 * Portal tRPC HTTP handler
 *
 * Exposes the portal tRPC router at /api/trpc/[trpc]
 * All procedures are automatically scoped to the authenticated client_user.
 */

import { fetchRequestHandler } from '@trpc/server/adapters/fetch'
import { type NextRequest } from 'next/server'
import { appRouter } from '@/server/root'
import { createTRPCContext } from '@/server/trpc'

const handler = (req: NextRequest) =>
  fetchRequestHandler({
    endpoint:   '/api/trpc',
    req,
    router:     appRouter,
    createContext: createTRPCContext,
    onError:    ({ path, error }) => {
      if (process.env.NODE_ENV !== 'production') {
        console.error(`[portal-trpc] Error on ${path ?? '<no-path>'}:`, error.message)
      }
    },
  })

export { handler as GET, handler as POST }
