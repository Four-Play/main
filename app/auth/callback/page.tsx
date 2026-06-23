'use client'

import { useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'

// Password reset emails use implicit flow (iOS Supabase client has flowType: 'implicit').
// The link redirects here with tokens in the URL hash:
//   #access_token=...&refresh_token=...&type=recovery
//
// This page opens in Safari (external browser), where createBrowserClient
// does not auto-detect hash tokens. We parse them manually and call setSession
// directly so the session is established before redirecting to the reset form.
export default function AuthCallback() {
  useEffect(() => {
    // PKCE flow: code in query params
    const code = new URL(window.location.href).searchParams.get('code')
    if (code) {
      supabase.auth.exchangeCodeForSession(code).finally(() => {
        window.location.href = '/?reset=true'
      })
      return
    }

    // Implicit flow: tokens in URL hash — parse and set session directly.
    // Do not rely on auto-detection; createBrowserClient in Safari won't fire it.
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''))
    const accessToken = hash.get('access_token')
    const refreshToken = hash.get('refresh_token') ?? ''
    if (accessToken) {
      supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
        .finally(() => {
          window.location.href = '/?reset=true'
        })
      return
    }

    // Fallback: wait for auto-detected auth event
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
        subscription.unsubscribe()
        window.location.href = '/?reset=true'
      }
    })
    const timeout = setTimeout(() => {
      subscription.unsubscribe()
      window.location.href = '/?reset=true'
    }, 4000)
    return () => { clearTimeout(timeout); subscription.unsubscribe() }
  }, [])

  return (
    <div className="flex items-center justify-center min-h-screen bg-black">
      <div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}
