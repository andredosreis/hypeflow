import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const PROTECTED_PATH_PREFIXES = ['/dashboard', '/portal'] as const

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
  // C1 fix: removed the `.includes('placeholder')` URL substring check.
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
