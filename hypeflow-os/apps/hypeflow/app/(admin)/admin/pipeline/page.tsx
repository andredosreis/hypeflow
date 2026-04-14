import { KanbanBoard } from './components/KanbanBoard'

function isDemo() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  return !url || url.includes('placeholder')
}

export default async function PipelinePage({
  searchParams,
}: {
  searchParams?: Promise<{ hot?: string; source?: string; temp?: string }>
}) {
  const params = (await (searchParams ?? Promise.resolve({}))) as { hot?: string; source?: string; temp?: string }
  const demo = isDemo()

  let agencyId = 'demo-agency-id'
  if (!demo) {
    const { ensureWorkspaceForCurrentUser } = await import('@/lib/bootstrap/workspace')
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
