import { Capacitor } from '@capacitor/core'

let registered = false

/**
 * Register this device for push notifications and save the APNs token to the server.
 * Silently no-ops on web (push notifications are iOS-only for this app).
 * Safe to call multiple times — registration happens at most once per session.
 */
export async function registerPushNotifications(accessToken: string): Promise<void> {
  if (!Capacitor.isNativePlatform() || registered) return

  // Dynamic import so the module is never loaded in a web/SSR context
  const { PushNotifications } = await import('@capacitor/push-notifications')

  PushNotifications.addListener('registration', async ({ value: token }) => {
    try {
      await fetch('/api/account/push-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ token, platform: 'ios' }),
      })
    } catch {
      // Non-critical — token will be re-sent on next app launch
    }
  })

  PushNotifications.addListener('registrationError', err => {
    console.warn('[push] registration error:', err.error)
  })

  const { receive } = await PushNotifications.requestPermissions()
  if (receive === 'granted') {
    await PushNotifications.register()
  }

  registered = true
}

/**
 * Remove this device's token on sign-out so the user stops receiving notifications.
 */
export async function unregisterPushNotifications(
  accessToken: string,
  token?: string
): Promise<void> {
  if (!Capacitor.isNativePlatform()) return
  registered = false
  try {
    await fetch('/api/account/push-token', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(token ? { token } : {}),
    })
  } catch {
    // Non-critical
  }
}
