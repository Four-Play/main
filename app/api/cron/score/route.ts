// app/api/cron/score/route.ts
// Runs every 3 minutes. For each sport that has active (kicked-off, non-final) games,
// fetches scores independently and auto-scores picks when games go final.

import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { scoreExistingGames } from '@/lib/scoring'
import { ACTIVE_SPORT, NCAAF_SPORT } from '@/lib/weekUtils'

const ODDS_API_KEY = process.env.ODDS_API_KEY!
const CRON_SECRET  = process.env.CRON_SECRET
const ODDS_BASE    = 'https://api.the-odds-api.com/v4'

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()
  const now = new Date().toISOString()

  // Determine which sports have active leagues so we know which to check
  const { data: leagueSports } = await supabase.from('leagues').select('sport')
  const activeSports = [...new Set((leagueSports ?? []).map((l: any) => l.sport ?? ACTIVE_SPORT))]
  if (!activeSports.includes(ACTIVE_SPORT)) activeSports.push(ACTIVE_SPORT)

  let totalGamesUpdated = 0
  let totalPicksScored = 0
  let totalWeeksCalculated = 0
  const sportResults: Record<string, any> = {}

  for (const sportKey of activeSports) {
    // Check if this sport has any games that have kicked off but aren't final
    const { data: activeGames } = await supabase
      .from('games')
      .select('id')
      .eq('sport', sportKey)
      .neq('status', 'final')
      .lt('commence_time', now)
      .limit(1)

    if (!activeGames || activeGames.length === 0) {
      sportResults[sportKey] = { skipped: true, reason: 'no active games' }
      continue
    }

    try {
      const scoresUrl = `${ODDS_BASE}/sports/${sportKey}/scores/?apiKey=${ODDS_API_KEY}&daysFrom=3`
      const controller = new AbortController()
      const apiTimeout = setTimeout(() => controller.abort(), 10000)
      const scoresRes = await fetch(scoresUrl, { signal: controller.signal }).finally(() => clearTimeout(apiTimeout))
      const scoresData = await scoresRes.json()

      if (!scoresData || !Array.isArray(scoresData)) {
        sportResults[sportKey] = { error: 'No scores data from Odds API' }
        continue
      }

      let gamesUpdated = 0
      for (const score of scoresData) {
        const homeScore = score.scores?.find((s: any) => s.name === score.home_team)?.score
        const awayScore = score.scores?.find((s: any) => s.name === score.away_team)?.score
        if (homeScore == null || awayScore == null) continue

        const { error } = await supabase
          .from('games')
          .update({
            home_score: parseInt(homeScore),
            away_score: parseInt(awayScore),
            status: score.completed ? 'final' : 'live',
          })
          .eq('external_id', score.id)
          .eq('sport', sportKey)

        if (!error) gamesUpdated++
      }

      totalGamesUpdated += gamesUpdated
      sportResults[sportKey] = { gamesUpdated }
    } catch (err: any) {
      sportResults[sportKey] = { error: err.message }
    }
  }

  // Score picks and calculate weekly results for all final games (sport-agnostic)
  try {
    const { picksScored, weeksCalculated } = await scoreExistingGames(supabase)
    totalPicksScored = picksScored
    totalWeeksCalculated = weeksCalculated
  } catch (err: any) {
    // non-fatal — scores updated even if scoring fails
  }

  return NextResponse.json({
    success: true,
    sports: activeSports,
    sportResults,
    totalGamesUpdated,
    totalPicksScored,
    totalWeeksCalculated,
    timestamp: new Date().toISOString(),
  })
}
