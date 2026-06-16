// Custom Supabase storage adapter for Capacitor.
//
// iOS WKWebView's localStorage and cookies are NOT reliably persistent
// across app cold-starts (the system data store can be evicted under
// memory pressure, cleared by iOS storage management, or simply fail to
// rehydrate after a crash). Users on the native iOS build were getting
// logged out on every relaunch as a result.
//
// On native we route the session to Capacitor Preferences instead, which
// is backed by `NSUserDefaults` on iOS — the platform's most durable
// per-app key-value store. On web we leave storage undefined so the
// supabase-js client falls back to its default localStorage adapter,
// which is fine in real browsers.

import { Capacitor } from '@capacitor/core'
import { Preferences } from '@capacitor/preferences'

export interface SupabaseAuthStorage {
  getItem(key: string): Promise<string | null>
  setItem(key: string, value: string): Promise<void>
  removeItem(key: string): Promise<void>
}

/**
 * True only when we're running inside a Capacitor native binary that
 * was *also* compiled with the @capacitor/preferences plugin linked in.
 * The JS bundle and the native binary update independently: Vercel can
 * ship a new bundle that calls Preferences.get() before the corresponding
 * native binary is on the App Store, and on that intermediate binary the
 * call fails with "Preferences plugin is not implemented on iOS". Guard
 * against that here so the JS gracefully falls back to localStorage
 * until the user's binary catches up.
 */
export function isPreferencesAvailable(): boolean {
  if (typeof window === 'undefined') return false
  if (!Capacitor.isNativePlatform()) return false
  try {
    return Capacitor.isPluginAvailable('Preferences')
  } catch {
    return false
  }
}

export const supabaseAuthStorage: SupabaseAuthStorage | undefined =
  isPreferencesAvailable()
    ? {
        async getItem(key) {
          const { value } = await Preferences.get({ key })
          return value
        },
        async setItem(key, value) {
          await Preferences.set({ key, value })
        },
        async removeItem(key) {
          await Preferences.remove({ key })
        },
      }
    : undefined
