import { notFound } from 'next/navigation'
import { validatePortalToken } from '@/lib/portal/tokens'
import PortalView from './PortalView'

// Server Component: validates the token server-side BEFORE any client UI
// renders. If invalid/revoked/expired → 404. The "Acesso protegido por token"
// claim in the footer is now backed by this gate (story 01.13 / audit C5).
export default async function ClientPortalPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const ctx = await validatePortalToken(token)
  if (!ctx) notFound()

  return <PortalView clientId={ctx.client_id} agencyId={ctx.agency_id} />
}
