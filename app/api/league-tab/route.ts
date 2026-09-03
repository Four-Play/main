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

  const [membersResult, resultsResult, picksResult, gamesResult, leagueResult] = await Promise.all([
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
      .select('id, commence_time, favorite_team, underdog_team, spread, nfl_week, sport, status')
      .eq('season_year', year)
      .order('commence_time', { ascending: true }),
    supabase
      .from('leagues')
      .select('payout_per_loss_cents, sport')
      .eq('id', leagueId)
      .maybeSingle(),
  ])

  if (membersResult.error) return NextResponse.json({ error: membersResult.error.message }, { status: 500 })
  if (resultsResult.error) return NextResponse.json({ error: resultsResult.error.message }, { status: 500 })

  const stake = leagueResult.data?.payout_per_loss_cents ?? 0
  const leagueSport = leagueResult.data?.sport ?? 'americanfootball_nfl'

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

  // Build weeklyPickCharts for the RESULTS tab — only games matching this league's sport
  const allGames = (gamesResult.data ?? []).filter((g: any) => g.sport === leagueSport)
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

  // ── Week Tracker: compute from current week picks (final games only) ──────────
  const finalGameIds = new Set(allGames.filter(g => g.status === 'final').map(g => g.id))
  const currentWeekPicks = allPicks.filter(p => p.nfl_week === currentWeek)
  const memberIds = (membersResult.data ?? []).map(m => m.user_id)

  // For each member, check if they have any pick with result='loss' from a final game
  const loserSet = new Set<string>()
  const survivorSet = new Set<string>()
  for (const userId of memberIds) {
    const memberPicks = currentWeekPicks.filter(p => p.user_id === userId && finalGameIds.has(p.game_id))
    if (memberPicks.length === 0) continue  // no final picks yet
    if (memberPicks.some(p => p.result === 'loss')) loserSet.add(userId)
    else survivorSet.add(userId)
  }

  const loserCount = loserSet.size
  const survivorCount = survivorSet.size
  const penaltyPerLoss = loserCount > 0 ? stake * survivorCount : 0

  const weekTracker = {
    loserCount,
    survivorCount,
    totalWithPicks: loserCount + survivorCount,
    totalMembers: memberIds.length,
    stake,
    penaltyPerLoss,
  }

  return NextResponse.json({
    members: membersResult.data ?? [],
    weekSummaries,
    weeklyPickCharts,
    weekTracker,
  })
}
