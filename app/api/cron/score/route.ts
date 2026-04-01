// app/api/cron/score/route.ts
// Called by Vercel Cron every Tuesday at 3am ET (after Monday Night Football)
// Add to vercel.json: { "crons": [{ "path": "/api/cron/score", "schedule": "0 8 * * 2" }] }

import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

const ODDS_API_KEY = process.env.ODDS_API_KEY!
const CRON_SECRET = process.env.CRON_SECRET // optional security

// Must match the SPORT_KEY used in app/api/games/route.ts
const SPORT_KEY = 'basketball_nba'

export async function GET(request: Request) {
  // Simple auth check for cron
  const authHeader = request.headers.get('authorization')
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()

  try {
    // 1. Fetch scores from Odds API for completed games
    const scoresUrl = `https://api.the-odds-api.com/v4/sports/${SPORT_KEY}/scores/?apiKey=${ODDS_API_KEY}&daysFrom=3`
    const scoresRes = await fetch(scoresUrl)
    const scoresData = await scoresRes.json()

    if (!scoresData || !Array.isArray(scoresData)) {
      return NextResponse.json({ error: 'No scores data' }, { status: 502 })
    }

    // 2. Update game scores in DB
    let gamesUpdated = 0
    for (const score of scoresData) {
      if (!score.completed) continue

      const homeScore = score.scores?.find((s: any) => s.name === score.home_team)?.score
      const awayScore = score.scores?.find((s: any) => s.name === score.away_team)?.score

      if (homeScore == null || awayScore == null) continue

      const { error } = await supabase
        .from('games')
        .update({
          home_score: parseInt(homeScore),
          away_score: parseInt(awayScore),
          status: 'final',
        })
        .eq('external_id', score.id)

      if (!error) gamesUpdated++
    }

    // 3. Score picks for all final games
    const { data: finalGames } = await supabase
      .from('games')
      .select('*')
      .eq('status', 'final')
      .is('home_score', null)  // catch any not yet scored
      .not('home_score', 'is', null)

    // Get all final games with scores
    const { data: scoredGames } = await supabase
      .from('games')
      .select('*')
      .eq('status', 'final')
      .not('home_score', 'is', null)
      .not('away_score', 'is', null)

    if (!scoredGames) {
      return NextResponse.json({ message: 'No final games to score', gamesUpdated })
    }

    let picksScored = 0
    for (const game of scoredGames) {
      // Fetch picks for this game that haven't been scored yet
      const { data: picks } = await supabase
        .from('picks')
        .select('*')
        .eq('game_id', game.id)
        .is('result', null)

      if (!picks || picks.length === 0) continue

      for (const pick of picks) {
        const result = scorePick(pick, game)

        await supabase
          .from('picks')
          .update({ result })
          .eq('id', pick.id)

        picksScored++
      }
    }

    // 4. Calculate weekly results for affected leagues/weeks
    const { data: affectedPicks } = await supabase
      .from('picks')
      .select('league_id, nfl_week, season_year')
      .not('result', 'is', null)
      .order('nfl_week', { ascending: false })

    if (!affectedPicks) {
      return NextResponse.json({ message: 'Scoring complete', gamesUpdated, picksScored })
    }

    // Get unique league/week combos
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

    return NextResponse.json({
      success: true,
      gamesUpdated,
      picksScored,
      weeksCalculated,
      timestamp: new Date().toISOString(),
    })
  } catch (err: any) {
    console.error('Cron error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// Score a single pick against a game result
// Returns 'win' if picked team covered within the cushion, 'loss' otherwise
function scorePick(pick: any, game: any): 'win' | 'loss' | 'push' {
  const { home_team, away_team, favorite_team, spread, home_score, away_score } = game
  const cushion = 13 // Default, could be fetched from league settings

  const homeMargin = home_score - away_score

  // Determine if the picked team covered WITH the cushion
  // Example: favTeam -7 spread, cushion +13 means you need to lose by < 20
  // i.e. if you pick the favorite, they need to not lose by more than (spread - cushion)
  // if you pick the underdog, they can lose by up to (spread + cushion - 1)

  const pickedHome = pick.team_selected === home_team

  let margin: number
  if (pickedHome) {
    margin = homeMargin // positive = home won
    // Apply spread from home's perspective (negative spread = home is favorite)
  } else {
    margin = -homeMargin // positive = away won
  }

  // Is picked team the favorite?
  const pickedFavorite = pick.team_selected === favorite_team

  // The "adjusted spread" for the picked team
  // If you pick the favorite (spread = -7), you need them to win by more than (7 - 13) = -6
  // meaning they can lose by up to 6 and you still win. Lose by 7 = loss
  // If you pick the underdog (spread = -7 for fav = +7 for dog),
  // you need them to not lose by more than (7 + 13) = 20

  let coverMargin: number
  if (pickedFavorite) {
    // Favorite's spread is negative (e.g. -7)
    // Cushion of 13 means they can lose by up to (|spread| - 1) after subtracting cushion
    // Effective: picked team wins if: margin > (spread - cushion)
    // spread is negative for favorites, so spread - cushion = -7 - 13 = -20? No...
    // Let's think: spread = -7 means fav needs to win by 7 to "cover" normally
    // With +13 cushion: fav needs to win by (7 - 13) = -6, i.e. can lose by 6
    coverMargin = spread + cushion  // e.g. -7 + 13 = 6 (fav can lose by up to 6)
    // Win condition: margin > -coverMargin... let me simplify:
    // Fav covers if: (fav score - dog score) > (|spread| - cushion - 1)
    // = homeMargin > (7 - 13 - 1) = homeMargin > -7 (i.e. lose by less than 7)
    const favoriteMargin = pick.team_selected === home_team ? homeMargin : -homeMargin
    const threshold = Math.abs(spread) - cushion - 1
    if (favoriteMargin > threshold) return 'win'
    if (favoriteMargin === threshold) return 'push'
    return 'loss'
  } else {
    // Underdog: they cover if they don't lose by more than (|spread| + cushion - 1)
    const underdogMargin = pick.team_selected === home_team ? homeMargin : -homeMargin
    const threshold = -(Math.abs(spread) + cushion)
    if (underdogMargin > threshold) return 'win'
    if (underdogMargin === threshold) return 'push'
    return 'loss'
  }
}

async function calculateWeeklyResults(
  supabase: any,
  leagueId: string,
  week: number,
  year: number
) {
  // Get league settings
  const { data: league } = await supabase
    .from('leagues')
    .select('payout_per_loss_cents')
    .eq('id', leagueId)
    .single()

  if (!league) return

  // Get all members
  const { data: members } = await supabase
    .from('league_members')
    .select('user_id')
    .eq('league_id', leagueId)

  if (!members) return

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

    // Check all 4 games are final
    const allFinal = picks.every((p: any) => p.game?.status === 'final')
    if (!allFinal) continue

    const allWon = picks.length === 4 && picks.every((p: any) => p.result === 'win')

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

  // Upsert weekly results
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

    // Update member totals
    await supabase.rpc('update_member_totals', {
      p_user_id: result.user_id,
      p_league_id: leagueId,
      p_won: isWinner,
      p_amount_change: isWinner ? amountWon : -amountOwed,
    })
  }
}