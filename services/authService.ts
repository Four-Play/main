// services/authService.ts
import { createClient, resetClient } from '@/lib/supabase/client'
import type { Profile } from '@/types/database'

export async function signUp(email: string, password: string, username: string): Promise<Profile> {
  const supabase = createClient()
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { username }
    }
  })

  if (error) throw new Error(error.message)
  if (!data.user) throw new Error('Sign up failed')

  // Profile is auto-created by DB trigger, fetch it
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', data.user.id)
    .single()

  if (profileError || !profile) {
    // Trigger may not have fired yet, create manually
    const { data: newProfile, error: insertError } = await supabase
      .from('profiles')
      .insert({ id: data.user.id, username })
      .select()
      .single()

    if (insertError) throw new Error(insertError.message)
    return newProfile as Profile
  }

  return profile as Profile
}

export async function signIn(email: string, password: string): Promise<Profile> {
  // Nuke the singleton and any stored session so the new client starts clean.
  // resetClient() also clears localStorage + cookies, so no extra signOut needed.
  resetClient()
  const supabase = createClient()

  console.log('[auth] signing in...')
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) throw new Error(error.message)
  if (!data.user) throw new Error('Sign in failed')

  console.log('[auth] fetching profile...')
  // Don't let a slow/hung profile query block sign-in. The user is already
  // authenticated at this point; if the profile fetch stalls we fall back to
  // auth metadata so they can use the app and the row syncs on next load.
  const profileTimeout = new Promise<null>(resolve => setTimeout(() => resolve(null), 5000))
  const profileQuery: Promise<Profile | null> = (async () => {
    try {
      const r = await supabase.from('profiles').select('*').eq('id', data.user!.id).single()
      return r.error ? null : (r.data as Profile)
    } catch {
      return null
    }
  })()

  const profile = await Promise.race([profileQuery, profileTimeout])
  if (profile) {
    console.log('[auth] sign in complete')
    return profile
  }

  console.warn('[auth] profile fetch slow/failed — using auth metadata fallback')
  const meta = (data.user.user_metadata ?? {}) as { username?: string }
  return {
    id: data.user.id,
    username: meta.username ?? data.user.email?.split('@')[0] ?? 'Player',
    total_points: 0,
  }
}

export async function signOut(): Promise<void> {
  // Always clear local session first — guarantees the UI flips even if the
  // server-side revocation hangs (e.g. Supabase slow/unreachable).
  const supabase = createClient()
  await supabase.auth.signOut({ scope: 'local' }).catch(() => {})

  // Fire the global revoke too, but don't let it block. Race against a short
  // timeout so we never leave the sign-out button stuck spinning.
  const globalSignOut = createClient().auth.signOut().catch(() => {})
  const timeout = new Promise<void>(resolve => setTimeout(resolve, 3000))
  await Promise.race([globalSignOut, timeout])

  // Nuke the singleton + storage so the next sign-in starts completely clean.
  resetClient()
}

export async function getSession() {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  return session
}

export async function getProfile(userId: string): Promise<Profile | null> {
  const supabase = createClient()
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  return data as Profile | null
}

export async function requestPasswordReset(email: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: 'https://www.fourplaypicks.com',
  })
  if (error) throw new Error(error.message)
}

export async function updatePassword(newPassword: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.auth.updateUser({ password: newPassword })
  if (error) throw new Error(error.message)
}

export async function updateProfile(userId: string, updates: Partial<Profile>): Promise<Profile> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data as Profile
}

export async function deleteAccount(): Promise<void> {
  const { authFetch } = await import('@/lib/api')
  const res = await authFetch('/api/account/delete', { method: 'POST' })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error ?? 'Failed to delete account')
  }
  // Clear the local session so the UI flips immediately. Skip the global
  // signOut — the auth user is already gone, so revoking is a no-op.
  const supabase = createClient()
  await supabase.auth.signOut({ scope: 'local' }).catch(() => {})
  resetClient()
}

export async function uploadAvatar(userId: string, file: File): Promise<string> {
  const supabase = createClient()
  const ext = file.name.split('.').pop() ?? 'jpg'
  const path = `${userId}/avatar.${ext}`

  // Hard timeout so a stuck Supabase Storage call doesn't leave the avatar
  // button spinning forever (which the user has been experiencing as a
  // "crash after changing the profile picture").
  const upload = supabase.storage
    .from('avatars')
    .upload(path, file, { upsert: true, contentType: file.type })
  const timeout = new Promise<{ error: Error }>((resolve) =>
    setTimeout(() => resolve({ error: new Error('Upload timed out — please try again') }), 20000)
  )
  const { error: uploadError } = (await Promise.race([upload, timeout])) as { error: Error | null }

  if (uploadError) throw new Error(uploadError.message)

  // Append a cache-buster so the browser picks up the new image immediately
  const { data } = supabase.storage.from('avatars').getPublicUrl(path)
  return `${data.publicUrl}?t=${Date.now()}`
}

// Keep the old mock for reference during migration
export const mockSignIn = signIn
