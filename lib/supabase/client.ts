import { createBrowserClient } from '@supabase/ssr'
import { createClient as createSupabaseClient, SupabaseClient } from '@supabase/supabase-js'
import { Capacitor } from '@capacitor/core'
import { Preferences } from '@capacitor/preferences'
import { supabaseAuthStorage } from './storage'

let client: SupabaseClient | null = null

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export function createClient(): SupabaseClient {
  if (client) return client

  // On native (Capacitor iOS/Android) the @supabase/ssr cookie storage is
  // unreliable across cold-starts — see lib/supabase/storage.ts for why.
  // Route the session through Capacitor Preferences instead.
  if (typeof window !== 'undefined' && Capacitor.isNativePlatform()) {
    client = createSupabaseClient(URL, KEY, {
      auth: {
        storage: supabaseAuthStorage,
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
        flowType: 'pkce',
      },
    })
    return client
  }

  // Web: keep @supabase/ssr's cookie-based storage so SSR/middleware
  // (if/when we add any) continues to see the session.
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
    // Capacitor Preferences — primary storage on native, must be cleared
    // too or the wedged session resurrects on the next createClient().
    if (typeof window !== 'undefined' && Capacitor.isNativePlatform()) {
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