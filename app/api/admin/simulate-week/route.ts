// app/api/admin/simulate-week/route.ts
// Marks all pending games for a given week as final with random scores,
// then runs the scoring pipeline. Used for testing multi-week standings.

import { NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceClient } from '@/lib/supabase/server'
import { scoreExistingGames } from '@/lib/scoring'

export async function POST(request: Request) {
  const authClient = await createServerSupabaseClient()
  const { data: { user } } = await authClient.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { week, year } = await request.json()

  if (!week || !year) {
    return NextResponse.json({ error: 'week and year are required' }, { status: 400 })
  }

  try {
    const supabase = createServiceClient()

    // Find all non-final games for this week
    const { data: games } = await supabase
      .from('games')
      .select('id, home_team, away_team, spread, favorite_team')
      .eq('nfl_week', week)
      .eq('season_year', year)
      .neq('status', 'final')

    if (!games || games.length === 0) {
      return NextResponse.json(
        { error: `No pending games found for week ${week} / ${year}. Load the week in the Picks tab first.` },
        { status: 404 }
      )
    }

    // Generate random but spread-aware scores (NBA range: 85–130 pts)
    for (const game of games) {
      const homeScore = Math.floor(Math.random() * 46) + 85
      const awayScore = Math.floor(Math.random() * 46) + 85

      await supabase
        .from('games')
        .update({ home_score: homeScore, away_score: awayScore, status: 'final' })
        .eq('id', game.id)
    }

    // Score picks and update standings
    const { picksScored, weeksCalculated } = await scoreExistingGames(supabase)

    return NextResponse.json({
      success: true,
      gamesSimulated: games.length,
      picksScored,
      weeksCalculated,
    })
  } catch (err: any) {
    console.error('Simulate week error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
