// app/api/account/delete/route.ts
// Permanently deletes the requesting user's account and all associated data.
// Requires a valid logged-in Supabase session.

import { NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceClient } from '@/lib/supabase/server'

export async function POST() {
  const authClient = await createServerSupabaseClient()
  const { data: { user } } = await authClient.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()
  const userId = user.id

  // Delete in dependency order. Even if FK CASCADE is set up, being explicit
  // makes the contract obvious and survives schema changes.
  const tables = ['picks', 'weekly_results', 'league_members', 'profiles'] as const
  for (const table of tables) {
    const column = table === 'profiles' ? 'id' : 'user_id'
    const { error } = await supabase.from(table).delete().eq(column, userId)
    if (error) {
      console.error(`[account-delete] failed to clear ${table}:`, error)
      return NextResponse.json(
        { error: `Failed to delete account data (${table})` },
        { status: 500 }
      )
    }
  }

  // Finally, remove the auth user itself so the email becomes available again.
  const { error: authError } = await supabase.auth.admin.deleteUser(userId)
  if (authError) {
    console.error('[account-delete] failed to delete auth user:', authError)
    return NextResponse.json(
      { error: 'Failed to delete account credentials' },
      { status: 500 }
    )
  }

  return NextResponse.json({ success: true })
}
