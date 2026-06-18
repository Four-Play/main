import { createBrowserClient } from '@supabase/ssr'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { Capacitor } from '@capacitor/core'
import { Preferences } from '@capacitor/preferences'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

function buildClient() {
  if (typeof window === 'undefined') {
    // Server-side render pass — no auth state here; API routes use server.ts
    return createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  }

  if (Capacitor.isNativePlatform()) {
    // iOS: store the session in NSUserDefaults via Capacitor Preferences.
    // NSUserDefaults survives force-kills so sessions persist across cold restarts.
    return createSupabaseClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        storage: {
          getItem: async (key: string) => {
            const { value } = await Preferences.get({ key })
            return value
          },
          setItem: async (key: string, value: string) => {
            await Preferences.set({ key, value })
          },
          removeItem: async (key: string) => {
            await Preferences.remove({ key })
          },
        },
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
        flowType: 'implicit',
      },
    })
  }

  // Web: Supabase's default localStorage-backed client.
  return createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY)
}

// Single client instance — created once, never destroyed.
export const supabase = buildClient()

// The key Supabase uses to store the auth session in Preferences / localStorage.
export const AUTH_STORAGE_KEY = `sb-${new URL(SUPABASE_URL).hostname.split('.')[0]}-auth-token`
