/**
 * Portal Supabase Client — browser-side
 *
 * Used in 'use client' components.
 * Creates a Supabase client using the anon key with cookie-based session.
 */

import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
