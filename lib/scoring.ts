// Shared scoring logic used by both the cron job and admin simulation tools

/**
 * Score a single pick against a final game result.
 * Cushion is per-league (default 13) and must be passed in.
 */
export function scorePick(pick: any, game: any, cushion: number): 'win' | 'loss' {
  const { home_team, favorite_team, spread, home_score, away_score } = game
  const homeMargin = home_score - away_score
  const pickedFavorite = pick.team_selected === favorite_team
  const pickedMargin = pick.team_selected === home_team ? homeMargin : -homeMargin

  if (pickedFavorite) {
    // Favorite: adjusted line = cushion - |spread|. Win requires strictly beating it.
    // e.g. -7 spread + 13 cushion → adjusted +6, threshold = -6, fav can lose by up to 5; lose by 6+ = loss
    const threshold = -(cushion - Math.abs(spread))
    if (pickedMargin > threshold) return 'win'
    return 'loss'
  } else {
    // Underdog: adjusted line = |spread| + cushion. Win requires strictly beating it.
    // e.g. +7 spread + 13 cushion → adjusted +20, threshold = -20, dog can lose by up to 19; lose by 20+ = loss
    const threshold = -(Math.abs(spread) + cushion)
    if (pickedMargin > threshold) return 'win'
    return 'loss'
  }
}

/**
 * Calculate and persist weekly results for a single league/week.
 * Safe to call multiple times — uses alreadyScored set to prevent
 * double-counting wins/losses in league_members totals.
 */
export async function calculateWeeklyResults(
  supabase: any,
  leagueId: string,
  week: number,
  year: number
) {
  const { data: league } = await supabase
    .from('leagues')
    .select('payout_per_loss_cents, spread_cushion')
    .eq('id', leagueId)
    .maybeSingle()

  if (!league) return

  const { data: members } = await supabase
    .from('league_members')
    .select('user_id')
    .eq('league_id', leagueId)

  if (!members || members.length === 0) return

  // Single batched fetch of every member's picks for this week.
  // Replaces the per-member query loop (was O(members) round-trips).
  const { data: allPicks } = await supabase
    .from('picks')
    .select('user_id, result, game:games(status)')
    .eq('league_id', leagueId)
    .eq('nfl_week', week)
    .eq('season_year', year)

  const picksByUser = new Map<string, any[]>()
  for (const p of allPicks ?? []) {
    const arr = picksByUser.get(p.user_id) ?? []
    arr.push(p)
    picksByUser.set(p.user_id, arr)
  }

  const results: any[] = []
  for (const member of members) {
    const picks = picksByUser.get(member.user_id) ?? []
    const wins = picks.filter((p: any) => p.result === 'win').length

    // Any wrong pick = loss for the week, regardless of how many picks were made.
    const hasWrong = picks.some((p: any) => p.result === 'loss')
    if (hasWrong) {
      results.push({ user_id: member.user_id, is_winner: false, picks_correct: wins })
      continue
    }

    // No wrong picks. Only a win if they made all 4 picks and every one is final.
    // Otherwise (fewer than 4 picks, or some still pending) → no result yet.
    if (picks.length < 4) continue
    const allFinal = picks.every((p: any) => p.game?.status === 'final')
    if (!allFinal) continue
    results.push({ user_id: member.user_id, is_winner: true, picks_correct: wins })
  }

  if (results.length === 0) return

  const winners = results.filter(r => r.is_winner)
  const losers = results.filter(r => !r.is_winner)

  // If nobody went 4-for-4, the round is a wash — no points change
  const hasWinners = winners.length > 0
  const totalPot = hasWinners ? losers.length * league.payout_per_loss_cents : 0
  const prizePerWinner = hasWinners ? Math.floor(totalPot / winners.length) : 0

  // Batch upsert all weekly_results in one round-trip
  const calculatedAt = new Date().toISOString()
  const upsertRows = results.map(result => {
    const isWinner = result.is_winner
    return {
      user_id: result.user_id,
      league_id: leagueId,
      nfl_week: week,
      season_year: year,
      picks_correct: result.picks_correct,
      is_winner: isWinner,
      amount_won_cents: isWinner ? prizePerWinner : 0,
      amount_owed_cents: !isWinner && hasWinners ? league.payout_per_loss_cents : 0,
      calculated_at: calculatedAt,
    }
  })

  await supabase
    .from('weekly_results')
    .upsert(upsertRows, { onConflict: 'user_id,league_id,nfl_week,season_year' })

  // Recalculate every member's totals from the full set of weekly_results.
  // Idempotent — safe to re-run, self-corrects when the scored set changes.
  // Fetch all rows for this league once, group in memory, update in parallel.
  const { data: allResults } = await supabase
    .from('weekly_results')
    .select('user_id, is_winner, amount_won_cents, amount_owed_cents')
    .eq('league_id', leagueId)

  const resultsByUser = new Map<string, any[]>()
  for (const r of allResults ?? []) {
    const arr = resultsByUser.get(r.user_id) ?? []
    arr.push(r)
    resultsByUser.set(r.user_id, arr)
  }

  await Promise.all(members.map((member: any) => {
    const rows = resultsByUser.get(member.user_id) ?? []
    const wins = rows.filter((r: any) => r.is_winner).length
    const losses = rows.filter((r: any) => !r.is_winner).length
    const points = rows.reduce((sum: number, r: any) =>
      sum + (r.amount_won_cents ?? 0) - (r.amount_owed_cents ?? 0), 0)

    return supabase
      .from('league_members')
      .update({ wins, losses, league_points: points })
      .eq('user_id', member.user_id)
      .eq('league_id', leagueId)
  }))

  // Sync profiles.total_points — sum across ALL leagues so the Settings tab
  // always reflects the user's true season total. One batch fetch, then parallel updates.
  const memberIds = members.map((m: any) => m.user_id)
  const { data: crossLeagueResults } = await supabase
    .from('weekly_results')
    .select('user_id, amount_won_cents, amount_owed_cents')
    .in('user_id', memberIds)

  const totalByUser = new Map<string, number>()
  for (const r of crossLeagueResults ?? []) {
    totalByUser.set(
      r.user_id,
      (totalByUser.get(r.user_id) ?? 0) + (r.amount_won_cents ?? 0) - (r.amount_owed_cents ?? 0)
    )
  }

  await Promise.all(members.map((member: any) =>
    supabase
      .from('profiles')
      .update({ total_points: totalByUser.get(member.user_id) ?? 0 })
      .eq('id', member.user_id)
  ))
}

/**
 * Score all unscored picks for final games, then calculate weekly results.
 * Used by both the cron job (after fetching real scores) and the admin trigger.
 */
export async function scoreExistingGames(supabase: any) {
  const { data: scoredGames } = await supabase
    .from('games')
    .select('*')
    .eq('status', 'final')
    .not('home_score', 'is', null)
    .not('away_score', 'is', null)

  if (!scoredGames || scoredGames.length === 0) {
    return { picksScored: 0, weeksCalculated: 0 }
  }

  const gameIds = scoredGames.map((g: any) => g.id)
  const gamesById = new Map<string, any>(scoredGames.map((g: any) => [g.id, g]))

  // Single batched fetch of every unscored pick across all final games.
  // Replaces the per-game query loop.
  const { data: picks } = await supabase
    .from('picks')
    .select('*, league:leagues(spread_cushion)')
    .in('game_id', gameIds)
    .is('result', null)

  let picksScored = 0
  if (picks && picks.length > 0) {
    // Score in memory, then batch updates by result type so we issue at most
    // 3 update calls instead of one per pick.
    const winIds: string[] = []
    const lossIds: string[] = []
    for (const pick of picks) {
      const game = gamesById.get(pick.game_id)
      if (!game) continue
      const cushion = pick.league?.spread_cushion ?? 13
      const result = scorePick(pick, game, cushion)
      if (result === 'win') winIds.push(pick.id)
      else lossIds.push(pick.id)
      picksScored++
    }

    const updates: Promise<any>[] = []
    if (winIds.length > 0) updates.push(supabase.from('picks').update({ result: 'win' }).in('id', winIds))
    if (lossIds.length > 0) updates.push(supabase.from('picks').update({ result: 'loss' }).in('id', lossIds))
    await Promise.all(updates)
  }

  // Find all league/week combos with scored picks and calculate results
  const { data: affectedPicks } = await supabase
    .from('picks')
    .select('league_id, nfl_week, season_year')
    .not('result', 'is', null)

  if (!affectedPicks) return { picksScored, weeksCalculated: 0 }

  const combos = new Map<string, { leagueId: string; week: number; year: number }>()
  for (const p of affectedPicks) {
    const key = `${p.league_id}:${p.nfl_week}:${p.season_year}`
    if (!combos.has(key)) {
      combos.set(key, { leagueId: p.league_id, week: p.nfl_week, year: p.season_year })
    }
  }

  let weeksCalculated = 0
  for (const { leagueId, week, year } of combos.values()) {
    await calculateWeeklyResults(supabase, leagueId, week, year)
    weeksCalculated++
  }

  return { picksScored, weeksCalculated }
}
