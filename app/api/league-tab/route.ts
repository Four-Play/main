import { NextResponse } from 'next/server'
import { createServiceClient, getAuthenticatedUser } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const user = await getAuthenticatedUser(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const leagueId = searchParams.get('leagueId')
  const year = parseInt(searchParams.get('year') ?? '0')
  const currentWeek = parseInt(searchParams.get('week') ?? '1')
  const viewWeek = parseInt(searchParams.get('viewWeek') ?? String(currentWeek))
  if (!leagueId || !year) return NextResponse.json({ error: 'Missing leagueId or year' }, { status: 400 })

  const supabase = createServiceClient()

  // Fetch league first so we can filter games by sport in the parallel queries below
  const { data: league } = await supabase
    .from('leagues')
    .select('payout_per_loss_cents, sport')
    .eq('id', leagueId)
    .maybeSingle()

  const stake = league?.payout_per_loss_cents ?? 0
  const leagueSport = league?.sport ?? 'americanfootball_nfl'

  const [membersResult, resultsResult, picksResult, gamesResult] = await Promise.all([
    supabase
      .from('league_members')
      .select('user_id, wins, losses, league_points, total_owed_cents, role, profile:profiles(id, username, avatar_url, total_points)')
      .eq('league_id', leagueId)
      .order('league_points', { ascending: false }),
    supabase
      .from('weekly_results')
      .select('user_id, nfl_week, is_winner, amount_won_cents, amount_owed_cents, calculated_at, profile:profiles(id, username)')
      .eq('league_id', leagueId)
      .eq('season_year', year)
      .order('nfl_week', { ascending: false }),
    supabase
      .from('picks')
      .select('user_id, game_id, team_selected, result, nfl_week')
      .eq('league_id', leagueId)
      .eq('season_year', year)
      .eq('nfl_week', viewWeek),
    supabase
      .from('games')
      .select('id, commence_time, favorite_team, underdog_team, spread, nfl_week, status')
      .eq('season_year', year)
      .eq('sport', leagueSport)
      .eq('nfl_week', viewWeek)
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

  // Single week chart for the requested viewWeek
  const weeklyPickCharts = [{
    week: viewWeek,
    games: allGames,
    picks: allPicks,
  }]

  // Available weeks for the dropdown: current week + any week with scored results
  const resultWeeks = [...new Set((resultsResult.data ?? []).map((r: any) => r.nfl_week as number))]
  const availableWeeks = [...new Set([currentWeek, ...resultWeeks])].sort((a, b) => b - a)

  // Week Tracker: only meaningful for the current week (live in-progress data)
  const memberIds = (membersResult.data ?? []).map(m => m.user_id).filter(Boolean)
  let weekTracker = null
  if (viewWeek === currentWeek) {
    const finalGameIds = new Set(allGames.filter(g => g.status === 'final').map(g => g.id))
    const loserSet = new Set<string>()
    const survivorSet = new Set<string>()
    for (const userId of memberIds) {
      const memberPicks = allPicks.filter(p => p.user_id === userId && finalGameIds.has(p.game_id))
      if (memberPicks.length === 0) continue
      if (memberPicks.some(p => p.result === 'loss')) loserSet.add(userId)
      else survivorSet.add(userId)
    }
    const loserCount = loserSet.size
    const survivorCount = survivorSet.size
    const projectedSurvivorCount = memberIds.length - loserCount
    const penaltyPerLoss = loserCount > 0 ? stake * projectedSurvivorCount : 0
    weekTracker = {
      loserCount,
      survivorCount: projectedSurvivorCount,
      totalWithPicks: loserCount + survivorCount,
      totalMembers: memberIds.length,
      stake,
      penaltyPerLoss,
    }
  }

  return NextResponse.json({
    members: membersResult.data ?? [],
    weekSummaries,
    weeklyPickCharts,
    weekTracker,
    availableWeeks,
    viewWeek,
  })
}
