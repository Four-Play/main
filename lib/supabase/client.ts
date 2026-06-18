import { createBrowserClient } from '@supabase/ssr'
import { createClient as createSupabaseClient, SupabaseClient } from '@supabase/supabase-js'
import { supabaseAuthStorage, clearAuthStorage, AUTH_KEY_PREFIXES } from './storage'

let client: SupabaseClient | null = null

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export function createClient(): SupabaseClient {
  if (client) return client

  if (supabaseAuthStorage) {
    // IndexedDB-backed storage — persistent across iOS cold-starts, no native
    // plugin required. detectSessionInUrl:true lets the browser client handle
    // the password-recovery hash when the email link opens in Safari.
    client = createSupabaseClient(URL, KEY, {
      auth: {
        storage: supabaseAuthStorage,
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: 'implicit',
      },
    })
    return client
  }

  // SSR / environments without IndexedDB — @supabase/ssr cookie-based fallback.
  client = createBrowserClient(URL, KEY) as unknown as SupabaseClient
  return client
}

function shouldWipeKey(key: string | null): boolean {
  if (!key) return false
  return AUTH_KEY_PREFIXES.some(p => key.startsWith(p))
}

export function resetClient() {
  client = null

  // Clear IndexedDB (primary storage)
  clearAuthStorage()

  // Belt-and-suspenders: clear any session data that landed in localStorage,
  // sessionStorage, or cookies (e.g. from the createBrowserClient SSR fallback).
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
  } catch {}
}
