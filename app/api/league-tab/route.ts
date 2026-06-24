import { NextResponse } from 'next/server'
import { createServiceClient, getAuthenticatedUser } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const user = await getAuthenticatedUser(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const leagueId = searchParams.get('leagueId')
  const year = parseInt(searchParams.get('year') ?? '0')
  const currentWeek = parseInt(searchParams.get('week') ?? '1')
  if (!leagueId || !year) return NextResponse.json({ error: 'Missing leagueId or year' }, { status: 400 })

  const supabase = createServiceClient()

  const [membersResult, resultsResult, picksResult, gamesResult] = await Promise.all([
    supabase
      .from('league_members')
      .select('*, profile:profiles(id, username, avatar_url, total_points)')
      .eq('league_id', leagueId)
      .order('league_points', { ascending: false }),
    supabase
      .from('weekly_results')
      .select('*, profile:profiles(id, username)')
      .eq('league_id', leagueId)
      .eq('season_year', year)
      .order('nfl_week', { ascending: false }),
    supabase
      .from('picks')
      .select('user_id, game_id, team_selected, result, nfl_week')
      .eq('league_id', leagueId)
      .eq('season_year', year),
    supabase
      .from('games')
      .select('id, commence_time, favorite_team, underdog_team, spread, nfl_week, status')
      .eq('season_year', year)
      .order('commence_time', { ascending: true }),
  ])

  if (membersResult.error) return NextResponse.json({ error: membersResult.error.message }, { status: 500 })
  if (resultsResult.error) return NextResponse.json({ error: resultsResult.error.message }, { status: 500 })

  // Build weekSummaries (standings tab still uses this)
  const byWeek = new Map<number, any[]>()
  for (const r of (resultsResult.data ?? [])) {
    const arr = byWeek.get(r.nfl_week) ?? []
    arr.push(r)
    byWeek.set(r.nfl_week, arr)
  }
  const weekSummaries = [...byWeek.entries()].map(([week, rows]) => {
    const winners = rows.filter(r => r.is_winner)
    const losers = rows.filter(r => !r.is_winner)
    const prizePerWinner = losers.length > 0 && winners.length > 0
      ? Math.floor(losers.reduce((s: number, l: any) => s + l.amount_owed_cents, 0) / winners.length)
      : 0
    return { week, year, winners, losers, prizePerWinner, isFinal: rows.some(r => r.calculated_at != null) }
  })

  // Build weeklyPickCharts for the RESULTS tab
  const allGames = gamesResult.data ?? []
  const allPicks = picksResult.data ?? []

  const gamesByWeek = new Map<number, any[]>()
  for (const g of allGames) {
    const arr = gamesByWeek.get(g.nfl_week) ?? []
    arr.push(g)
    gamesByWeek.set(g.nfl_week, arr)
  }

  const picksByWeek = new Map<number, any[]>()
  for (const p of allPicks) {
    const arr = picksByWeek.get(p.nfl_week) ?? []
    arr.push(p)
    picksByWeek.set(p.nfl_week, arr)
  }

  // Always show current week; also show every past week that has picks
  const weeksToShow = new Set<number>([currentWeek, ...allPicks.map((p: any) => p.nfl_week as number)])
  const weeklyPickCharts = [...weeksToShow]
    .sort((a, b) => b - a) // most recent week first
    .map(week => ({
      week,
      games: gamesByWeek.get(week) ?? [],
      picks: picksByWeek.get(week) ?? [],
    }))

  return NextResponse.json({ members: membersResult.data ?? [], weekSummaries, weeklyPickCharts })
}
