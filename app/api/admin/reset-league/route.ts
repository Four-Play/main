// app/api/admin/reset-league/route.ts
// Resets all picks, results, and member stats for a league.
// Also optionally clears the games cache for the active season.
// Requires a valid logged-in Supabase session.

import { NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceClient } from '@/lib/supabase/server'
import { SPORT_CONFIG, ACTIVE_SPORT } from '@/lib/weekUtils'

export async function POST(request: Request) {
  const authClient = await createServerSupabaseClient()
  const { data: { user } } = await authClient.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { leagueId, clearGames = false } = await request.json()

  if (!leagueId) {
    return NextResponse.json({ error: 'leagueId is required' }, { status: 400 })
  }

  // Verify the requesting user is an admin of this league
  const { data: membership } = await authClient
    .from('league_members')
    .select('role')
    .eq('league_id', leagueId)
    .eq('user_id', user.id)
    .single()

  if (!membership || membership.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const supabase = createServiceClient()

  // 1. Delete all picks for the league
  const { error: picksError } = await supabase
    .from('picks')
    .delete()
    .eq('league_id', leagueId)

  if (picksError) {
    return NextResponse.json({ error: 'Failed to clear picks' }, { status: 500 })
  }

  // 2. Delete all weekly results for the league
  const { error: resultsError } = await supabase
    .from('weekly_results')
    .delete()
    .eq('league_id', leagueId)

  if (resultsError) {
    return NextResponse.json({ error: 'Failed to clear weekly results' }, { status: 500 })
  }

  // 3. Reset member stats (wins, losses, points, owed)
  const { data: members, error: membersError } = await supabase
    .from('league_members')
    .update({ wins: 0, losses: 0, league_points: 0, total_owed_cents: 0 })
    .eq('league_id', leagueId)
    .select('user_id')

  if (membersError) {
    return NextResponse.json({ error: 'Failed to reset member stats' }, { status: 500 })
  }

  // 4. Zero out profiles.total_points for each member in this league.
  //    This reflects the cleared league_points — scoring re-runs will rebuild it.
  if (members && members.length > 0) {
    const userIds = members.map((m: any) => m.user_id)
    await supabase
      .from('profiles')
      .update({ total_points: 0 })
      .in('id', userIds)
  }

  // 5. Optionally clear the games cache for the active season
  let gamesCleared = 0
  if (clearGames) {
    const { seasonYear } = SPORT_CONFIG[ACTIVE_SPORT]
    const { count, error: gamesError } = await supabase
      .from('games')
      .delete({ count: 'exact' })
      .eq('season_year', seasonYear)

    if (gamesError) {
      return NextResponse.json({ error: 'Failed to clear games cache' }, { status: 500 })
    }
    gamesCleared = count ?? 0
  }

  return NextResponse.json({
    success: true,
    picksCleared: true,
    resultsCleared: true,
    memberStatsReset: true,
    gamesCleared,
  })
}
