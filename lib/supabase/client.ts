import { createBrowserClient } from '@supabase/ssr'

let client: ReturnType<typeof createBrowserClient> | null = null

export function createClient() {
  if (!client) {
    client = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  }
  return client
}

/** Nuke the singleton AND any stored session data so the next
 *  createClient() call starts completely clean. */
export function resetClient() {
  client = null
  try {
    // Clear ALL Supabase keys from localStorage. Auth stores several
    // (main token, code-verifier for PKCE, etc.) — leaving stragglers
    // can wedge the next sign-in in an inconsistent state.
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i)
      if (key && key.startsWith('sb-')) localStorage.removeItem(key)
    }
    // Also clear sessionStorage — PKCE state can land here too, and
    // an iOS WebView that crashed mid-permission-flow may have left
    // partial keys behind.
    for (let i = sessionStorage.length - 1; i >= 0; i--) {
      const key = sessionStorage.key(i)
      if (key && key.startsWith('sb-')) sessionStorage.removeItem(key)
    }
    // Same for cookies — @supabase/ssr chunks sessions across sb-*.0, .1, etc.
    document.cookie.split(';').forEach(c => {
      const name = c.trim().split('=')[0]
      if (name.startsWith('sb-')) {
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`
      }
    })
  } catch {}
}