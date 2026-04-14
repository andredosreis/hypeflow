'use client'

import { useState } from 'react'
import { Zap, ArrowRight, Eye, EyeOff } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const isDemo = process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('placeholder')

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    // Demo mode — bypass real auth, go to admin by default
    if (isDemo) {
      router.push('/admin/dashboard')
      return
    }

    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password })
    if (authError || !data.user) {
      setError('Email ou password incorrectos.')
      setLoading(false)
      return
    }

    // Detect user type and redirect
    const { data: agencyUser } = await supabase
      .from('users')
      .select('id')
      .eq('id', data.user.id)
      .eq('is_active', true)
      .single()

    router.push(agencyUser ? '/admin/dashboard' : '/client/dashboard')
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{
        background: 'var(--s0)',
        backgroundImage: 'linear-gradient(to right, rgba(33,160,196,0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(33,160,196,0.04) 1px, transparent 1px)',
        backgroundSize: '40px 40px',
      }}
    >
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-10">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center lime-pulse"
            style={{ background: 'var(--lime)' }}
          >
            <Zap size={22} style={{ color: '#0F1318' }} strokeWidth={2.5} />
          </div>
          <div>
            <p className="font-bold text-xl tracking-tight leading-tight" style={{ color: 'var(--t1)', fontFamily: 'var(--font-syne)' }}>
              HYPE FLOW OS
            </p>
            <p className="text-xs" style={{ color: 'var(--t3)' }}>Engenharia de Performance B2B</p>
          </div>
        </div>

        {/* Demo banner */}
        {isDemo && (
          <div
            className="rounded-xl px-4 py-3 mb-5 text-sm flex items-center gap-2"
            style={{ background: 'rgba(209,255,0,0.08)', border: '1px solid rgba(209,255,0,0.3)', color: 'var(--lime)' }}
          >
            <span style={{ fontSize: 16 }}>⚡</span>
            <span><strong>Modo Demo</strong> — clique em Entrar para explorar</span>
          </div>
        )}

        {/* Card */}
        <div
          className="rounded-2xl p-8"
          style={{ background: 'var(--s1)', border: '1px solid var(--glass-border)' }}
        >
          <h1 className="text-2xl font-bold mb-1" style={{ fontFamily: 'var(--font-syne)', color: 'var(--t1)' }}>
            Acesso à Plataforma
          </h1>
          <p className="text-sm mb-8" style={{ color: 'var(--t2)' }}>
            Administradores e clientes entram aqui
          </p>

          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div>
              <label className="text-xs font-semibold uppercase tracking-widest mb-2 block" style={{ color: 'var(--t3)' }}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="o@teu.email"
                required={!isDemo}
                className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-colors"
                style={{
                  background: 'var(--s0)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  color: 'var(--t1)',
                }}
                onFocus={e => (e.target.style.borderColor = 'var(--cyan)')}
                onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.08)')}
              />
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-widest mb-2 block" style={{ color: 'var(--t3)' }}>
                Password
              </label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required={!isDemo}
                  className="w-full rounded-xl px-4 py-3 pr-12 text-sm outline-none transition-colors"
                  style={{
                    background: 'var(--s0)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    color: 'var(--t1)',
                  }}
                  onFocus={e => (e.target.style.borderColor = 'var(--cyan)')}
                  onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.08)')}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                  style={{ color: 'var(--t3)' }}
                  onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = 'var(--t1)')}
                  onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = 'var(--t3)')}
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <div
                className="rounded-xl px-4 py-3 text-sm"
                style={{ background: 'rgba(232,69,69,0.1)', border: '1px solid var(--danger)', color: 'var(--danger)' }}
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex items-center justify-center gap-2 font-bold text-sm uppercase tracking-widest py-3.5 rounded-xl transition-all mt-2 disabled:opacity-50"
              style={{
                background: 'var(--cyan)',
                color: '#0F1318',
                boxShadow: '0 0 24px rgba(33,160,196,0.25)',
              }}
            >
              {loading ? 'A entrar...' : 'Entrar'}
              {!loading && <ArrowRight size={16} />}
            </button>
          </form>
        </div>

        <p className="text-center text-xs mt-6" style={{ color: 'var(--t3)' }}>
          © 2026 HYPE Flow · Engenharia de Performance B2B
        </p>
      </div>
    </div>
  )
}
