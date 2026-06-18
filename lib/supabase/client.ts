import { createBrowserClient } from '@supabase/ssr'
import { createClient as createSupabaseClient, SupabaseClient } from '@supabase/supabase-js'
import { Preferences } from '@capacitor/preferences'
import { isPreferencesAvailable, createPreferencesAdapter, AUTH_KEY_PREFIXES } from './storage'

let client: SupabaseClient | null = null

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export function createClient(): SupabaseClient {
  if (client) return client

  // isPreferencesAvailable() is safe to call here: createClient() is only
  // ever called from useEffect or event handlers, never at module-load time,
  // so the Capacitor bridge is guaranteed to be fully initialised by now.
  if (isPreferencesAvailable()) {
    // createPreferencesAdapter() is called inline (not at module load) for the
    // same reason: the adapter must be created after the bridge is ready.
    client = createSupabaseClient(URL, KEY, {
      auth: {
        storage: createPreferencesAdapter(),
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
        flowType: 'implicit',
      },
    })
    return client
  }

  // Web fallback (Safari, desktop browser). detectSessionInUrl:true lets the
  // browser client pick up the password-recovery hash from email links.
  client = createBrowserClient(URL, KEY) as unknown as SupabaseClient
  return client
}

function shouldWipeKey(key: string | null): boolean {
  if (!key) return false
  return AUTH_KEY_PREFIXES.some(p => key.startsWith(p))
}

export function resetClient() {
  client = null

  try {
    // Clear localStorage / sessionStorage / cookies (belt-and-suspenders for
    // any session data that landed outside Preferences via the SSR fallback).
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
  } catch {}

  // Clear Capacitor Preferences (primary storage on native).
  if (isPreferencesAvailable()) {
    Preferences.keys().then(({ keys }) => {
      for (const k of keys) {
        if (shouldWipeKey(k)) Preferences.remove({ key: k }).catch(() => {})
      }
    }).catch(() => {})
  }
}
