import { KanbanBoard } from './components/KanbanBoard'
import { ensureWorkspaceForCurrentUser } from '@/lib/bootstrap/workspace'

export default async function PipelinePage({
  searchParams,
}: {
  searchParams?: { hot?: string }
}) {
  const hasSupabase = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL
    && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    && process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const { agencyId } = hasSupabase
    ? await ensureWorkspaceForCurrentUser()
    : { agencyId: 'demo-agency-id' }

  return (
    <div className="flex flex-col gap-6 h-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-800 text-white">Pipeline</h1>
          <p className="text-sm text-[#7FA8C4] mt-0.5">Gestão de leads por fase</p>
        </div>
        <div className="text-xs font-700 text-[#7FA8C4] bg-[#0C1824] border border-white/5 px-4 py-2 rounded-xl">
          Vista: Kanban
        </div>
      </div>
      {agencyId ? <KanbanBoard agencyId={agencyId} demoMode={!hasSupabase} initialHotFilter={searchParams?.hot === '1'} /> : null}
    </div>
  )
}
