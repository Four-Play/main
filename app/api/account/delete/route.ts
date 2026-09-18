// app/api/account/delete/route.ts
// Deletes the requesting user's auth account and anonymizes their profile.
// League history, picks, and weekly results are preserved so the leaderboard
// stays accurate — the user appears as "Deleted User" with no avatar.

import { NextResponse } from 'next/server'
import { createServiceClient, getAuthenticatedUser } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const user = await getAuthenticatedUser(request)

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()
  const userId = user.id

  // Anonymize profile — keeps the row so league history displays correctly.
  const { error: profileError } = await supabase
    .from('profiles')
    .update({ username: 'Deleted User', avatar_url: null })
    .eq('id', userId)

  if (profileError) {
    console.error('[account-delete] failed to anonymize profile:', profileError)
    return NextResponse.json({ error: 'Failed to anonymize profile' }, { status: 500 })
  }

  // Remove device tokens so the user stops receiving push notifications.
  await supabase.from('device_tokens').delete().eq('user_id', userId)

  // Delete the auth user. league_members, picks, and weekly_results FKs are
  // now SET NULL (not CASCADE) so those rows are preserved with user_id = null.
  const { error: authError } = await supabase.auth.admin.deleteUser(userId)
  if (authError) {
    console.error('[account-delete] failed to delete auth user:', authError)
    return NextResponse.json({ error: 'Failed to delete account credentials' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
