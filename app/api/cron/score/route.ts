// app/api/cron/score/route.ts
// Called by Vercel Cron every 3 hours to fetch final scores and auto-score picks.
// Weekly results are calculated once all games in a user's slate are final.

import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { scoreExistingGames } from '@/lib/scoring'
import { getCurrentSportKey } from '@/config/season'

const ODDS_API_KEY = process.env.ODDS_API_KEY!
const CRON_SECRET = process.env.CRON_SECRET

const SPORT_KEY = getCurrentSportKey()

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()

  try {
    // 1. Fetch scores from Odds API for recently completed games
    const scoresUrl = `https://api.the-odds-api.com/v4/sports/${SPORT_KEY}/scores/?apiKey=${ODDS_API_KEY}&daysFrom=3`
    const scoresRes = await fetch(scoresUrl)
    const scoresData = await scoresRes.json()

    if (!scoresData || !Array.isArray(scoresData)) {
      return NextResponse.json({ error: 'No scores data from Odds API' }, { status: 502 })
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

    // 3. Score picks and calculate weekly results for all final games
    const { picksScored, weeksCalculated } = await scoreExistingGames(supabase)

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
