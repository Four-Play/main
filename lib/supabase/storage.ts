import { Capacitor } from '@capacitor/core'
import { Preferences } from '@capacitor/preferences'
import { AUTH_STORAGE_KEY } from './client'

// Read the raw stored session from NSUserDefaults without triggering Supabase's
// network refresh logic. Used for the fast-path session restore on iOS cold start
// so the app is visible before any network call is made.
export async function readStoredUser(): Promise<{
  id: string
  email?: string
  user_metadata?: Record<string, string>
} | null> {
  if (typeof window === 'undefined' || !Capacitor.isNativePlatform()) return null
  try {
    const { value } = await Preferences.get({ key: AUTH_STORAGE_KEY })
    if (!value) return null
    const session = JSON.parse(value)
    return session?.user ?? null
  } catch {
    return null
  }
}
