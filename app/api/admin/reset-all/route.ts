// app/api/admin/reset-all/route.ts
// Wipes ALL picks, games, weekly_results, and resets every league member's
// stats and every profile's total_points. Used once to clear NBA test data
// before the 2026 NFL season starts.
//
// Requires a valid authenticated session (Bearer token or cookie).

import { NextResponse } from 'next/server'
import { createServiceClient, getAuthenticatedUser } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const user = await getAuthenticatedUser(request)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()

  const { error: picksError } = await supabase.from('picks').delete().neq('id', '')
  if (picksError) return NextResponse.json({ error: 'Failed to clear picks: ' + picksError.message }, { status: 500 })

  const { error: resultsError } = await supabase.from('weekly_results').delete().neq('id', '')
  if (resultsError) return NextResponse.json({ error: 'Failed to clear weekly_results: ' + resultsError.message }, { status: 500 })

  const { error: gamesError } = await supabase.from('games').delete().neq('id', '')
  if (gamesError) return NextResponse.json({ error: 'Failed to clear games: ' + gamesError.message }, { status: 500 })

  const { error: membersError } = await supabase
    .from('league_members')
    .update({ wins: 0, losses: 0, league_points: 0, total_owed_cents: 0 })
    .neq('id', '')
  if (membersError) return NextResponse.json({ error: 'Failed to reset member stats: ' + membersError.message }, { status: 500 })

  const { error: profilesError } = await supabase
    .from('profiles')
    .update({ total_points: 0 })
    .neq('id', '')
  if (profilesError) return NextResponse.json({ error: 'Failed to reset profile points: ' + profilesError.message }, { status: 500 })

  return NextResponse.json({
    success: true,
    cleared: ['picks', 'weekly_results', 'games'],
    reset: ['league_members stats', 'profiles.total_points'],
  })
}
