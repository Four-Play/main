'use client'

import { useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'

// The password reset email uses the implicit flow — tokens arrive as
// #access_token=...&type=recovery in the URL hash. Server route handlers
// never see hash fragments, so the callback must be a client page.
// Supabase detects the hash on init and fires PASSWORD_RECOVERY.
// We wait for that event (so the session is stored) then redirect.
export default function AuthCallback() {
  useEffect(() => {
    const code = new URL(window.location.href).searchParams.get('code')

    if (code) {
      // PKCE flow (client-initiated reset) — exchange code, then redirect
      supabase.auth.exchangeCodeForSession(code).finally(() => {
        window.location.href = '/?reset=true'
      })
      return
    }

    // Implicit flow — Supabase client auto-detects hash tokens on init
    // and fires PASSWORD_RECOVERY. Wait for it so session is written first.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
        subscription.unsubscribe()
        window.location.href = '/?reset=true'
      }
    })

    // Fallback: redirect after 4s if no auth event fires
    const timeout = setTimeout(() => {
      subscription.unsubscribe()
      window.location.href = '/?reset=true'
    }, 4000)

    return () => {
      clearTimeout(timeout)
      subscription.unsubscribe()
    }
  }, [])

  return (
    <div className="flex items-center justify-center min-h-screen bg-black">
      <div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}
