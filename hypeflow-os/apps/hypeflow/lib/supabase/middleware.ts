import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const PROTECTED_PATH_PREFIXES = ['/admin', '/client'] as const

function isProtectedPath(pathname: string) {
  return PROTECTED_PATH_PREFIXES.some(p => pathname.startsWith(p))
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setAll(cookiesToSet: any[]) {
          cookiesToSet.forEach(({ name, value }: { name: string; value: string }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }: { name: string; value: string; options?: object }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Explicit preview gate — fail-closed unless flag is set.
  // C1 fix: removed the `.includes('placeholder')` URL substring check that could fail-open
  // on a misconfigured prod env var.
  if (process.env.NEXT_PUBLIC_PREVIEW_MODE === 'true') {
    return supabaseResponse
  }

  const { pathname } = request.nextUrl

  try {
    const { data: { user } } = await supabase.auth.getUser()

    if (!user && isProtectedPath(pathname)) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }

    if (user) {
      const { data: agencyRow } = await supabase
        .from('users')
        .select('id, is_active')
        .eq('id', user.id)
        .maybeSingle()

      const hasAgencyRow = !!agencyRow
      const isAgencyUserActive = agencyRow?.is_active === true

      // Soft-deleted agency user: row exists but is_active=false.
      // Keep them out of both /admin and /client; surface a status on /login.
      if (hasAgencyRow && !isAgencyUserActive) {
        if (pathname === '/login') return supabaseResponse
        const url = request.nextUrl.clone()
        url.pathname = '/login'
        url.searchParams.set('status', 'account-disabled')
        return NextResponse.redirect(url)
      }

      // Active agency user trying to access /client → redirect to /admin
      if (isAgencyUserActive && pathname.startsWith('/client')) {
        const url = request.nextUrl.clone()
        url.pathname = '/admin/dashboard'
        return NextResponse.redirect(url)
      }

      // No agency row → treat as client user. /admin not allowed.
      if (!hasAgencyRow && pathname.startsWith('/admin')) {
        const url = request.nextUrl.clone()
        url.pathname = '/client/dashboard'
        return NextResponse.redirect(url)
      }

      // Authenticated user hits /login → route to their area
      if (pathname === '/login') {
        const url = request.nextUrl.clone()
        url.pathname = isAgencyUserActive ? '/admin/dashboard' : '/client/dashboard'
        return NextResponse.redirect(url)
      }
    }

    return supabaseResponse
  } catch (err) {
    console.error('[middleware] session error', { err, path: pathname })
    if (isProtectedPath(pathname)) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      url.searchParams.set('error', 'session')
      return NextResponse.redirect(url)
    }
    return supabaseResponse
  }
}
