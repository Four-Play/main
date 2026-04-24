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
  // Clear Supabase session from all storage backends.
  // @supabase/ssr may use cookies or localStorage depending on config.
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
    const projectRef = new URL(url).hostname.split('.')[0]
    const storageKey = `sb-${projectRef}-auth-token`
    localStorage.removeItem(storageKey)
    // Also clear any cookie-based session by setting expired cookies
    document.cookie.split(';').forEach(c => {
      const name = c.trim().split('=')[0]
      if (name.startsWith('sb-')) {
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`
      }
    })
  } catch {}
}