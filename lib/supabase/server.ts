import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'

/**
 * Resolve the requesting user from either an Authorization: Bearer header
 * (Capacitor native sends this — sessions live in Preferences, not cookies)
 * or the session cookie (web). Returns null if neither yields a valid user.
 */
export async function getAuthenticatedUser(request: Request): Promise<{ id: string; email?: string } | null> {
  const authHeader = request.headers.get('authorization') || request.headers.get('Authorization')
  if (authHeader?.toLowerCase().startsWith('bearer ')) {
    const token = authHeader.slice(7).trim()
    if (token) {
      const service = createServiceClient()
      const { data, error } = await service.auth.getUser(token)
      if (!error && data.user) return { id: data.user.id, email: data.user.email }
    }
  }

  const cookieClient = await createServerSupabaseClient()
  const { data, error } = await cookieClient.auth.getUser()
  if (!error && data.user) return { id: data.user.id, email: data.user.email }

  return null
}

export async function createServerSupabaseClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options?: object }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Server component - can't set cookies, that's fine
          }
        },
      },
    }
  )
}

// Service role client for cron jobs / scoring (bypasses RLS)
// ONLY use server-side, never expose to client
export function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}
