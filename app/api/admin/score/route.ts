// app/api/admin/score/route.ts
// Manual scoring trigger for admins — re-scores all final games without needing the cron.
// Requires a valid logged-in Supabase session.

import { NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceClient } from '@/lib/supabase/server'
import { scoreExistingGames } from '@/lib/scoring'

export async function POST() {
  const authClient = await createServerSupabaseClient()
  const { data: { user } } = await authClient.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Use service client to bypass RLS for scoring writes
    const supabase = createServiceClient()
    const result = await scoreExistingGames(supabase)

    return NextResponse.json({ success: true, ...result })
  } catch (err: any) {
    console.error('Admin score error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
