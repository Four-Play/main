import { createBrowserClient } from '@supabase/ssr'
import { createClient as createSupabaseClient, SupabaseClient } from '@supabase/supabase-js'
import { Preferences } from '@capacitor/preferences'
import { isPreferencesAvailable, supabaseAuthStorage } from './storage'

let client: SupabaseClient | null = null

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export function createClient(): SupabaseClient {
  if (client) return client

  // Only switch to the supabase-js + Preferences path when the Preferences
  // plugin is *actually* available on this binary. Without that guard,
  // an iOS binary built before the Preferences pod was added will hit
  // "Preferences plugin is not implemented on iOS" on every getItem.
  if (isPreferencesAvailable()) {
    client = createSupabaseClient(URL, KEY, {
      auth: {
        storage: supabaseAuthStorage,
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
        // implicit: recovery emails embed tokens directly in the URL hash so
        // any browser client can handle them without a PKCE code verifier.
        // pkce requires the same client session that generated the code challenge,
        // which breaks when the email link opens in Safari (new client, no verifier).
        flowType: 'implicit',
      },
    })
    return client
  }

  // Web (and pre-Preferences iOS binaries) — keep @supabase/ssr's
  // cookie-based storage. Less durable on iOS but already shipped,
  // and matches the behavior users had before this update.
  client = createBrowserClient(URL, KEY) as unknown as SupabaseClient
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
    // Capacitor Preferences — primary storage on native (when the
    // plugin is linked into this binary). Skip silently otherwise.
    if (isPreferencesAvailable()) {
      Preferences.keys().then(({ keys }) => {
        for (const k of keys) {
          if (shouldWipeKey(k)) {
            Preferences.remove({ key: k }).catch(() => {})
          }
        }
      }).catch(() => {})
    }
  } catch {}
}