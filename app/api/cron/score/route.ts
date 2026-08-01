// app/api/cron/score/route.ts
// Called by Vercel Cron daily at 8 AM UTC (4 AM ET) to fetch final scores
// and auto-score picks. Use "Run Scoring Now" in league settings for immediate scoring.

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
    // 1. Skip API call entirely if no games have kicked off and aren't yet final — saves credits
    const { data: activeGames } = await supabase
      .from('games')
      .select('id')
      .neq('status', 'final')
      .lt('commence_time', new Date().toISOString())
      .limit(1)

    if (!activeGames || activeGames.length === 0) {
      return NextResponse.json({ success: true, message: 'No active games', gamesUpdated: 0, picksScored: 0, weeksCalculated: 0 })
    }

    // 2. Fetch scores from Odds API — covers both live and completed games from last 3 days
    const scoresUrl = `https://api.the-odds-api.com/v4/sports/${SPORT_KEY}/scores/?apiKey=${ODDS_API_KEY}&daysFrom=3`
    const controller = new AbortController()
    const apiTimeout = setTimeout(() => controller.abort(), 10000)
    const scoresRes = await fetch(scoresUrl, { signal: controller.signal }).finally(() => clearTimeout(apiTimeout))
    const scoresData = await scoresRes.json()

    if (!scoresData || !Array.isArray(scoresData)) {
      return NextResponse.json({ error: 'No scores data from Odds API' }, { status: 502 })
    }

    // 3. Update game scores — live games get status 'live', completed games get 'final'
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

      if (!error) gamesUpdated++
    }

    // 4. Score picks and calculate weekly results for all final games
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
