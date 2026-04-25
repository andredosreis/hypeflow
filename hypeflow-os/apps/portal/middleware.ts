/**
 * Portal Middleware
 *
 * Protects all dashboard routes — redirects unauthenticated users to /login.
 * Identifies authenticated users as client_users (not agency users).
 *
 * The session cookie is managed by Supabase SSR and refreshed automatically.
 */

import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

function isPublicPath(pathname: string) {
  return pathname.startsWith('/login') || pathname.startsWith('/auth')
}

export async function middleware(request: NextRequest) {
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

  // Explicit preview gate — fail-closed unless flag is set (C1).
  if (process.env.NEXT_PUBLIC_PREVIEW_MODE === 'true') {
    return supabaseResponse
  }

  const { pathname } = request.nextUrl

  try {
    // Refresh session — required for Server Component auth
    const { data: { user } } = await supabase.auth.getUser()

    // Allow public routes
    if (isPublicPath(pathname)) {
      return supabaseResponse
    }

    // Redirect unauthenticated users to login
    if (!user) {
      const loginUrl = request.nextUrl.clone()
      loginUrl.pathname = '/login'
      return NextResponse.redirect(loginUrl)
    }

    return supabaseResponse
  } catch (err) {
    console.error('[middleware] session error', { err, path: pathname })
    if (isPublicPath(pathname)) {
      return supabaseResponse
    }
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    loginUrl.searchParams.set('error', 'session')
    return NextResponse.redirect(loginUrl)
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
