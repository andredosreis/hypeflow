/**
 * Portal tRPC App Router
 *
 * Composes all portal-specific routers.
 * These are separate from the agency routers — data is always scoped
 * to the authenticated client_user's client_id.
 */

import { createTRPCRouter } from './trpc'
import { dashboardRouter } from './routers/dashboard'
import { leadsRouter }     from './routers/leads'
import { callsRouter }     from './routers/calls'
import { roiRouter }       from './routers/roi'
import { pipelineRouter }  from './routers/pipeline'

export const appRouter = createTRPCRouter({
  dashboard: dashboardRouter,
  leads:     leadsRouter,
  calls:     callsRouter,
  roi:       roiRouter,
  pipeline:  pipelineRouter,
})

export type AppRouter = typeof appRouter
