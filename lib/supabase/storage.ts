import { Capacitor } from '@capacitor/core'
import { Preferences } from '@capacitor/preferences'

export const AUTH_KEY_PREFIXES = ['sb-', 'supabase.', 'supabase-']

export interface SupabaseAuthStorage {
  getItem(key: string): Promise<string | null>
  setItem(key: string, value: string): Promise<void>
  removeItem(key: string): Promise<void>
}

/**
 * Returns true when Capacitor Preferences is available on this binary.
 *
 * IMPORTANT: call this at runtime (inside createClient / useEffect), NOT at
 * module-load time. Capacitor registers its plugins asynchronously via the
 * native bridge; if you call isPluginAvailable() during module evaluation the
 * bridge may not have finished registering plugins yet and this returns false.
 * By the time the first useEffect fires the bridge is fully initialised.
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

/**
 * Creates a fresh Supabase storage adapter backed by Capacitor Preferences
 * (NSUserDefaults on iOS). Always call this inside createClient(), never at
 * module-load time — the Capacitor bridge must be initialised first.
 */
export function createPreferencesAdapter(): SupabaseAuthStorage {
  return {
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
}
