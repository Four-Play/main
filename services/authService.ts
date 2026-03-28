// src/services/authService.ts
// services/authService.ts
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types/database'

const supabase = createClient()

export async function signUp(email: string, password: string, username: string): Promise<Profile> {
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
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) throw new Error(error.message)
  if (!data.user) throw new Error('Sign in failed')

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', data.user.id)
    .single()

  if (profileError || !profile) throw new Error('Profile not found')

  return profile as Profile
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut()
  if (error) throw new Error(error.message)
}

export async function getSession() {
  const { data: { session } } = await supabase.auth.getSession()
  return session
}

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

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

// Keep the old mock for reference during migration
export const mockSignIn = signIn