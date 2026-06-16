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

const AUTH_KEY_PREFIXES = ['sb-', 'supabase.', 'supabase-']

function shouldWipeKey(key: string | null): boolean {
  if (!key) return false
  return AUTH_KEY_PREFIXES.some(p => key.startsWith(p))
}

/** Nuke the singleton AND any stored session data so the next
 *  createClient() call starts completely clean. Covers localStorage,
 *  sessionStorage, cookies, and IndexedDB — every place we've seen
 *  Supabase persist auth state in production. */
export function resetClient() {
  client = null
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i)
      if (shouldWipeKey(key)) localStorage.removeItem(key!)
    }
    for (let i = sessionStorage.length - 1; i >= 0; i--) {
      const key = sessionStorage.key(i)
      if (shouldWipeKey(key)) sessionStorage.removeItem(key!)
    }
    document.cookie.split(';').forEach(c => {
      const name = c.trim().split('=')[0]
      if (shouldWipeKey(name)) {
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`
      }
    })
    // IndexedDB: newer Supabase clients may stash session state here.
    // Best-effort — older browsers don't expose .databases().
    if (typeof indexedDB !== 'undefined' && typeof indexedDB.databases === 'function') {
      indexedDB.databases().then(dbs => {
        for (const db of dbs) {
          if (db.name && shouldWipeKey(db.name)) {
            try { indexedDB.deleteDatabase(db.name) } catch {}
          }
        }
      }).catch(() => {})
    }
  } catch {}
}