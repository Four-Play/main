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

  // All supported sports — avoids a full leagues table scan every 3 minutes.
  // The active-games probe below skips any sport with nothing in progress.
  const activeSports = [ACTIVE_SPORT, NCAAF_SPORT]

  let totalGamesUpdated = 0
  let totalPicksScored = 0
  let totalWeeksCalculated = 0
  const sportResults: Record<string, any> = {}

  for (const sportKey of activeSports) {
    // Fetch all non-final kicked-off games for this sport.
    // Using external_id lets us filter Odds API results to only games we need
    // to update — skips already-final games and avoids redundant PATCHes.
    const { data: nonFinalGames } = await supabase
      .from('games')
      .select('external_id')
      .eq('sport', sportKey)
      .neq('status', 'final')
      .lt('commence_time', now)

    if (!nonFinalGames || nonFinalGames.length === 0) {
      sportResults[sportKey] = { skipped: true, reason: 'no active games' }
      continue
    }

    const nonFinalIds = new Set(nonFinalGames.map((g: any) => g.external_id))

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

      // Build update rows only for games not yet final in our DB.
      // Cannot use upsert here — if external_id doesn't exist in our DB the
      // upsert would try to INSERT an incomplete row and hit NOT NULL constraints.
      const updateRows: any[] = []
      for (const score of scoresData) {
        if (!nonFinalIds.has(score.id)) continue  // already final in our DB, skip
        const homeScore = score.scores?.find((s: any) => s.name === score.home_team)?.score
        const awayScore = score.scores?.find((s: any) => s.name === score.away_team)?.score
        if (homeScore == null || awayScore == null) continue
        updateRows.push({
          external_id: score.id,
          home_score: parseInt(homeScore),
          away_score: parseInt(awayScore),
          status: score.completed ? 'final' : 'live',
        })
      }

      let gamesUpdated = 0
      if (updateRows.length > 0) {
        const results = await Promise.all(
          updateRows.map(row =>
            supabase
              .from('games')
              .update({ home_score: row.home_score, away_score: row.away_score, status: row.status })
              .eq('external_id', row.external_id)
          )
        )
        gamesUpdated = results.filter(r => !r.error).length
      }

      totalGamesUpdated += gamesUpdated
      sportResults[sportKey] = { gamesUpdated }
    } catch (err: any) {
      sportResults[sportKey] = { error: err.message }
    }
  }

  // Only score picks if at least one sport had active games — skips the
  // expensive final-games scan entirely when no games are in progress.
  const anyActiveGames = Object.values(sportResults).some((r: any) => !r.skipped)
  if (anyActiveGames) {
    try {
      const { picksScored, weeksCalculated } = await scoreExistingGames(supabase)
      totalPicksScored = picksScored
      totalWeeksCalculated = weeksCalculated
    } catch (err: any) {
      // non-fatal — scores updated even if scoring fails
    }
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
