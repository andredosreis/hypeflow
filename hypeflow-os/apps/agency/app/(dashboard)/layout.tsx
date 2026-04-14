import { Sidebar } from '@/components/layout/Sidebar'
import { TopBar } from '@/components/layout/TopBar'
import { ensureWorkspaceForCurrentUser } from '@/lib/bootstrap/workspace'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user } = await ensureWorkspaceForCurrentUser()

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--s0)' }}>
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar
          user={
            user ?? {
              id: 'preview',
              email: 'admin@hypeflow.pt',
              app_metadata: {},
              user_metadata: {},
              aud: 'authenticated',
              created_at: '',
            }
          }
        />
        <main className="flex-1 overflow-auto p-6" style={{ background: 'var(--s0)' }}>
          {children}
        </main>
      </div>
    </div>
  )
}
