import { TrafficDashboardClient } from './components/TrafficDashboardClient'
import { createClient } from '@/lib/supabase/server'
import { ensureWorkspaceForCurrentUser } from '@/lib/bootstrap/workspace'

export default async function TrafegoPage() {
  const hasSupabase = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL
    && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    && process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const { agencyId } = hasSupabase
    ? await ensureWorkspaceForCurrentUser()
    : { agencyId: 'demo-agency-id' }

  const supabase = hasSupabase ? await createClient() : null

  const { data: clients } = agencyId && supabase
    ? await supabase
        .from('clients')
        .select('id, name, niche')
        .eq('agency_id', agencyId)
        .order('name', { ascending: true })
    : {
        data: [
          { id: 'preview-client-1', name: 'Cliente Demo Performance', niche: 'Servicos B2B' },
          { id: 'preview-client-2', name: 'Clinica Demo', niche: 'Saude e Beleza' },
        ],
      }

  return (
    <>
      {agencyId && clients && clients.length > 0 ? (
        <TrafficDashboardClient agencyId={agencyId} clients={clients} demoMode={!hasSupabase} />
      ) : (
        <div className="bg-[#0C1824] border border-white/5 rounded-2xl p-6 text-sm text-[#7FA8C4]">A preparar workspace...</div>
      )}
    </>
  )
}
