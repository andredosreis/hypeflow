import { createTRPCRouter } from './trpc'
import { trafegoRouter } from './routers/trafego'
import { callsRouter } from './routers/calls'
import { pipelineRouter } from './routers/pipeline'
import { leadsRouter } from './routers/leads'
import { clientsRouter } from './routers/clients'
import { automationsRouter } from './routers/automations'
import { integrationsRouter } from './routers/integrations'
import { dashboardRouter } from './routers/dashboard'

export const appRouter = createTRPCRouter({
  trafego: trafegoRouter,
  calls: callsRouter,
  pipeline: pipelineRouter,
  leads: leadsRouter,
  clients: clientsRouter,
  automations: automationsRouter,
  integrations: integrationsRouter,
  dashboard: dashboardRouter,
})

export type AppRouter = typeof appRouter
