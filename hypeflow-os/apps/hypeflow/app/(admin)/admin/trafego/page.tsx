import { TrafficDashboardClient } from './components/TrafficDashboardClient'
import { createClient } from '@/lib/supabase/server'
import { ensureWorkspaceForCurrentUser, isDemoMode } from '@/lib/bootstrap/workspace'

export default async function TrafegoPage() {
  const demo = isDemoMode()

  if (demo) {
    return (
      <TrafficDashboardClient
        agencyId="demo-agency-id"
        clients={[
          { id: 'preview-client-1', name: 'Cliente Demo Performance', niche: 'Servicos B2B' },
          { id: 'preview-client-2', name: 'Clinica Demo', niche: 'Saude e Beleza' },
        ]}
        demoMode
      />
    )
  }

  const { agencyId } = await ensureWorkspaceForCurrentUser()
  const supabase = await createClient()

  const { data: clients } = await supabase
    .from('clients')
    .select('id, name, niche')
    .eq('agency_id', agencyId!)
    .order('name', { ascending: true })

  return (
    <>
      {agencyId && clients && clients.length > 0 ? (
        <TrafficDashboardClient agencyId={agencyId} clients={clients} demoMode={false} />
      ) : (
        <div className="bg-[#0C1824] border border-white/5 rounded-2xl p-6 text-sm text-[#7FA8C4]">A preparar workspace...</div>
      )}
    </>
  )
}
