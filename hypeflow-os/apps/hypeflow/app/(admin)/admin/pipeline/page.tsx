import { KanbanBoard } from './components/KanbanBoard'
import { ensureWorkspaceForCurrentUser, isDemoMode } from '@/lib/bootstrap/workspace'

export default async function PipelinePage({
  searchParams,
}: {
  searchParams?: Promise<{ hot?: string; source?: string; temp?: string }>
}) {
  const params = (await (searchParams ?? Promise.resolve({}))) as { hot?: string; source?: string; temp?: string }
  const demo = isDemoMode()

  let agencyId = 'demo-agency-id'
  if (!demo) {
    const ws = await ensureWorkspaceForCurrentUser()
    agencyId = ws.agencyId ?? 'demo-agency-id'
  }

  return (
    <KanbanBoard
      agencyId={agencyId}
      demoMode={demo}
      initialHotFilter={params.hot === '1'}
    />
  )
}
