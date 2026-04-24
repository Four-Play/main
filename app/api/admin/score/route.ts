// app/api/admin/score/route.ts
// Manual scoring trigger — fetches latest scores from the Odds API,
// updates game rows, then scores all picks and calculates weekly results.

import { NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceClient } from '@/lib/supabase/server'
import { scoreExistingGames } from '@/lib/scoring'
import { getCurrentSportKey } from '@/config/season'

const ODDS_API_KEY = process.env.ODDS_API_KEY!
const SPORT_KEY = getCurrentSportKey()

export async function POST() {
  const authClient = await createServerSupabaseClient()
  const { data: { user } } = await authClient.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const supabase = createServiceClient()

    // 1. Fetch latest scores from Odds API
    const scoresUrl = `https://api.the-odds-api.com/v4/sports/${SPORT_KEY}/scores/?apiKey=${ODDS_API_KEY}&daysFrom=3`
    const controller = new AbortController()
    const apiTimeout = setTimeout(() => controller.abort(), 10000)
    const scoresRes = await fetch(scoresUrl, { signal: controller.signal }).finally(() => clearTimeout(apiTimeout))
    const scoresData = await scoresRes.json()

    let gamesUpdated = 0
    if (Array.isArray(scoresData)) {
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
    }

    // 2. Score picks and calculate weekly results
    const { picksScored, weeksCalculated } = await scoreExistingGames(supabase)

    return NextResponse.json({
      success: true,
      gamesUpdated,
      picksScored,
      weeksCalculated,
    })
  } catch (err: any) {
    console.error('Admin score error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
