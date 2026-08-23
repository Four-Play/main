// Authenticated fetch helper.
//
// On native (Capacitor iOS) the Supabase session lives in Capacitor
// Preferences, not cookies — so the browser won't auto-attach an auth
// cookie to requests against our /api/* routes. We pull the access token
// out of the current session and send it as a bearer header instead.
// On web the cookie is still attached automatically, but sending the
// header too is harmless and lets the server prefer one source of truth.

import { supabase } from '@/lib/supabase/client'

export async function authFetch(url: string, init: RequestInit = {}): Promise<Response> {
  // getSession() acquires GoTrue's internal lock; if a token refresh is in
  // flight it can hang indefinitely. Race against a 5s timeout so callers
  // always get a response (unauthenticated → 401) rather than hanging forever.
  const sessionResult = await Promise.race([
    supabase.auth.getSession(),
    new Promise<{ data: { session: null } }>((resolve) =>
      setTimeout(() => resolve({ data: { session: null } }), 5000)
    ),
  ])
  const session = sessionResult.data.session
  const headers = new Headers(init.headers)
  if (session?.access_token) {
    headers.set('Authorization', `Bearer ${session.access_token}`)
  }
  return fetch(url, { ...init, headers })
}
