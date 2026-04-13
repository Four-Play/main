// Shared scoring logic used by both the cron job and admin simulation tools

/**
 * Score a single pick against a final game result.
 * Cushion is per-league (default 13) and must be passed in.
 */
export function scorePick(pick: any, game: any, cushion: number): 'win' | 'loss' | 'push' {
  const { home_team, favorite_team, spread, home_score, away_score } = game
  const homeMargin = home_score - away_score
  const pickedFavorite = pick.team_selected === favorite_team
  const pickedMargin = pick.team_selected === home_team ? homeMargin : -homeMargin

  if (pickedFavorite) {
    // Favorite wins if they outperform: (|spread| - cushion - 1)
    // e.g. -7 spread + 13 cushion → threshold = -7, fav can lose by up to 6
    const threshold = Math.abs(spread) - cushion - 1
    if (pickedMargin > threshold) return 'win'
    if (pickedMargin === threshold) return 'push'
    return 'loss'
  } else {
    // Underdog wins if they don't lose by more than (|spread| + cushion)
    // e.g. +7 spread + 13 cushion → threshold = -20, dog can lose by up to 19
    const threshold = -(Math.abs(spread) + cushion)
    if (pickedMargin > threshold) return 'win'
    if (pickedMargin === threshold) return 'push'
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

  if (!members) return

  // Snapshot which users already have a scored weekly_result row.
  // We'll only call update_member_totals for newly inserted rows,
  // preventing double-counting when the cron re-runs.
  const { data: existingRows } = await supabase
    .from('weekly_results')
    .select('user_id')
    .eq('league_id', leagueId)
    .eq('nfl_week', week)
    .eq('season_year', year)

  const alreadyScored = new Set((existingRows ?? []).map((r: any) => r.user_id))

  const results: any[] = []

  for (const member of members) {
    const { data: picks } = await supabase
      .from('picks')
      .select('result, game:games(status)')
      .eq('user_id', member.user_id)
      .eq('league_id', leagueId)
      .eq('nfl_week', week)
      .eq('season_year', year)

    if (!picks || picks.length < 4) continue

    const allFinal = picks.every((p: any) => p.game?.status === 'final')
    if (!allFinal) continue

    const allWon = picks.every((p: any) => p.result === 'win')

    results.push({
      user_id: member.user_id,
      is_winner: allWon,
      picks_correct: picks.filter((p: any) => p.result === 'win').length,
    })
  }

  if (results.length === 0) return

  const winners = results.filter(r => r.is_winner)
  const losers = results.filter(r => !r.is_winner)
  const totalPot = losers.length * league.payout_per_loss_cents
  const prizePerWinner = winners.length > 0 ? Math.floor(totalPot / winners.length) : 0

  for (const result of results) {
    const isWinner = result.is_winner
    const amountWon = isWinner ? prizePerWinner : 0
    const amountOwed = !isWinner ? league.payout_per_loss_cents : 0

    await supabase.from('weekly_results').upsert({
      user_id: result.user_id,
      league_id: leagueId,
      nfl_week: week,
      season_year: year,
      picks_correct: result.picks_correct,
      is_winner: isWinner,
      amount_won_cents: amountWon,
      amount_owed_cents: amountOwed,
      calculated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,league_id,nfl_week,season_year' })

    // Only increment member totals for weeks that weren't already finalized
    if (!alreadyScored.has(result.user_id)) {
      await supabase.rpc('update_member_totals', {
        p_user_id: result.user_id,
        p_league_id: leagueId,
        p_won: isWinner,
        p_amount_change: isWinner ? amountWon : -amountOwed,
      })
    }
  }
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

  if (!scoredGames) return { picksScored: 0, weeksCalculated: 0 }

  let picksScored = 0

  for (const game of scoredGames) {
    // Join league data to get the correct cushion per pick
    const { data: picks } = await supabase
      .from('picks')
      .select('*, league:leagues(spread_cushion)')
      .eq('game_id', game.id)
      .is('result', null)

    if (!picks || picks.length === 0) continue

    for (const pick of picks) {
      const cushion = pick.league?.spread_cushion ?? 13
      const result = scorePick(pick, game, cushion)
      await supabase.from('picks').update({ result }).eq('id', pick.id)
      picksScored++
    }
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
