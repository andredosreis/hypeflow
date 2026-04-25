import { createTRPCRouter } from './trpc'

/* ── CRM ── */
import { leadsRouter }        from './routers/admin/crm/leads'
import { clientsRouter }      from './routers/admin/crm/clients'
import { pipelineRouter }     from './routers/admin/crm/pipeline'
import { conversasRouter }    from './routers/admin/crm/conversas'
import { portalTokensRouter } from './routers/admin/crm/portal-tokens'

/* ── Analytics ── */
import { trafegoRouter }      from './routers/admin/analytics/trafego'
import { dashboardRouter }    from './routers/admin/analytics/dashboard'

/* ── Operações ── */
import { callsRouter }        from './routers/admin/operacoes/calls'
import { equipaRouter }       from './routers/admin/operacoes/equipa'
import { parceirosRouter }    from './routers/admin/operacoes/parceiros'

/* ── Conteúdo ── */
import { playbooksRouter }    from './routers/admin/conteudo/playbooks'
import { marketingRouter }    from './routers/admin/conteudo/marketing'

/* ── Automações ── */
import { automationsRouter }  from './routers/admin/automacoes/automations'
import { integrationsRouter } from './routers/admin/automacoes/integrations'
import { workflowsRouter }    from './routers/admin/automacoes/workflows'

/* ── Portal (client) ── */
import { dashboardRouter as clientDashboardRouter } from './routers/client/dashboard'
import { leadsRouter     as clientLeadsRouter }     from './routers/client/leads'
import { callsRouter     as clientCallsRouter }     from './routers/client/calls'
import { roiRouter }                                from './routers/client/roi'
import { pipelineRouter  as clientPipelineRouter }  from './routers/client/pipeline'

export const appRouter = createTRPCRouter({
  admin: createTRPCRouter({
    /* CRM */
    leads:        leadsRouter,
    clients:      clientsRouter,
    pipeline:     pipelineRouter,
    conversas:    conversasRouter,
    portalTokens: portalTokensRouter,
    /* Analytics */
    trafego:      trafegoRouter,
    dashboard:    dashboardRouter,
    /* Operações */
    calls:        callsRouter,
    equipa:       equipaRouter,
    parceiros:    parceirosRouter,
    /* Conteúdo */
    playbooks:    playbooksRouter,
    marketing:    marketingRouter,
    /* Automações */
    automations:  automationsRouter,
    integrations: integrationsRouter,
    workflows:    workflowsRouter,
  }),
  portal: createTRPCRouter({
    dashboard: clientDashboardRouter,
    leads:     clientLeadsRouter,
    calls:     clientCallsRouter,
    roi:       roiRouter,
    pipeline:  clientPipelineRouter,
  }),
})

export type AppRouter = typeof appRouter
