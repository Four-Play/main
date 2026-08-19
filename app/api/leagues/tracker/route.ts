/**
 * GET /api/leagues/tracker?leagueId=X&week=Y&year=Z
 *
 * Returns the "live week tracker" — a what-if projection based only on picks
 * from games that have already finished (status='final').
 *
 * A member is a "definitive loser" if any of their picks in this week has
 * result='loss' (which only gets set once the game is final).
 * Everyone else (who has submitted picks) is "still in the running."
 *
 * The projection assumes nobody else loses for the remainder of the week:
 *   loser's projected pts   = -(stake × survivorCount)
 *   survivor's projected pts = +(stake × loserCount)
 *
 * If there are zero losers yet, projection is 0 for everyone.
 */

import { NextResponse } from 'next/server'
import { createServiceClient, getAuthenticatedUser } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const user = await getAuthenticatedUser(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const leagueId = searchParams.get('leagueId')
  const week = parseInt(searchParams.get('week') ?? '0')
  const year = parseInt(searchParams.get('year') ?? '0')
  if (!leagueId || !week || !year) {
    return NextResponse.json({ error: 'Missing leagueId, week, or year' }, { status: 400 })
  }

  const supabase = createServiceClient()

  // Fetch league stake and all members
  const [leagueResult, membersResult, picksResult] = await Promise.all([
    supabase.from('leagues').select('payout_per_loss_cents').eq('id', leagueId).maybeSingle(),
    supabase.from('league_members').select('user_id').eq('league_id', leagueId),
    // Picks with result set AND from a final game — these are the only picks that count
    supabase
      .from('picks')
      .select('user_id, result, game:games(status)')
      .eq('league_id', leagueId)
      .eq('nfl_week', week)
      .eq('season_year', year)
      .not('result', 'is', null),
  ])

  if (!leagueResult.data) return NextResponse.json({ error: 'League not found' }, { status: 404 })

  const stake = leagueResult.data.payout_per_loss_cents   // stored in cents (×100)
  const members = membersResult.data ?? []
  const scoredPicks = (picksResult.data ?? []).filter((p: any) => p.game?.status === 'final')

  // Group scored picks by user — identify definitive losers
  const pickResultsByUser = new Map<string, string[]>()
  for (const p of scoredPicks) {
    const arr = pickResultsByUser.get(p.user_id) ?? []
    arr.push(p.result)
    pickResultsByUser.set(p.user_id, arr)
  }

  const memberIds = members.map(m => m.user_id)
  let loserCount = 0
  let survivorCount = 0
  let userIsLoser = false
  let userHasPicks = false

  for (const userId of memberIds) {
    const results = pickResultsByUser.get(userId) ?? []
    if (results.length === 0) continue  // no scored picks yet — not counted either way
    const hasLoss = results.includes('loss')
    if (hasLoss) {
      loserCount++
      if (userId === user.id) { userIsLoser = true; userHasPicks = true }
    } else {
      survivorCount++
      if (userId === user.id) { userHasPicks = true }
    }
  }

  // Projected points if nobody else loses from here
  // loserProjected  = -(stake × survivorCount)  [pays each survivor]
  // survivorProjected = +(stake × loserCount)    [earns from each loser]
  const loserProjected = loserCount > 0 ? -(stake * survivorCount) : 0
  const survivorProjected = loserCount > 0 ? stake * loserCount : 0

  let userProjected = 0
  if (userHasPicks) {
    userProjected = userIsLoser ? loserProjected : survivorProjected
  }

  // Penalty each loser would owe if no more people lose (= stake × survivorCount)
  const penaltyPerLoss = loserCount > 0 ? stake * survivorCount : 0

  return NextResponse.json({
    loserCount,
    survivorCount,
    totalWithPicks: loserCount + survivorCount,
    stake,              // in "cents" (×100) — divide by 100 to display
    userIsLoser,
    userHasPicks,
    userProjected,      // in "cents" — divide by 100
    penaltyPerLoss,     // in "cents" — divide by 100 — for the league tab banner
  })
}
