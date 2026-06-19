import { supabase } from '@/lib/supabase/client'
import type { Profile } from '@/types/database'

// Returns a minimal profile from auth metadata so the app can show immediately.
// onAuthStateChange's SIGNED_IN listener loads the full profile from the DB.
export async function signIn(email: string, password: string): Promise<Profile> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw new Error(error.message)
  const meta = (data.user.user_metadata ?? {}) as { username?: string }
  return {
    id: data.user.id,
    username: meta.username ?? data.user.email?.split('@')[0] ?? 'Player',
    total_points: 0,
  } as Profile
}

// Returns a minimal profile from the signup data so the app can show immediately.
// onAuthStateChange's SIGNED_IN listener creates the DB profile row and loads it.
export async function signUp(email: string, password: string, username: string): Promise<Profile> {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { username } },
  })
  if (error) throw new Error(error.message)
  if (!data.user) throw new Error('Sign up failed')
  return { id: data.user.id, username, total_points: 0 } as Profile
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut()
}

export async function requestPasswordReset(email: string): Promise<void> {
  const res = await fetch('/api/auth/reset-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? 'Failed to send reset email')
}

export async function updatePassword(newPassword: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({ password: newPassword })
  if (error) throw new Error(error.message)
}

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data } = await supabase.from('profiles').select('*').eq('id', userId).single()
  return data as Profile | null
}

export async function updateProfile(userId: string, updates: Partial<Profile>): Promise<Profile> {
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
  await supabase.auth.signOut({ scope: 'local' })
}

export async function uploadAvatar(userId: string, file: File): Promise<string> {
  const ext = file.name.split('.').pop() ?? 'jpg'
  const path = `${userId}/avatar.${ext}`
  const { error } = await supabase.storage
    .from('avatars')
    .upload(path, file, { upsert: true, contentType: file.type })
  if (error) throw new Error(error.message)
  const { data } = supabase.storage.from('avatars').getPublicUrl(path)
  return `${data.publicUrl}?t=${Date.now()}`
}
