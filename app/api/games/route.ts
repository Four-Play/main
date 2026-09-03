// app/api/games/route.ts
// Serves game data from the DB cache — no Odds API calls on user visits.
// The /api/cron/games job refreshes the DB on schedule.
// One-time live fetch only when the DB has no games at all for the requested week.

import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { ACTIVE_SPORT, computeCurrentWeek, toETDateString, getSeasonWeeks, getSeasonYear, getPlayoffRules } from '@/lib/weekUtils'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)

  const sportKey = searchParams.get('sport') ?? ACTIVE_SPORT
  const SEASON_WEEKS = getSeasonWeeks(sportKey)
  const TARGET_SEASON_YEAR = getSeasonYear(sportKey)
  const PLAYOFF_RULES = getPlayoffRules(sportKey)

  const currentWeek = computeCurrentWeek(sportKey)
  const requestedWeek = parseInt(searchParams.get('week') ?? String(currentWeek))
  const week = isNaN(requestedWeek) ? currentWeek : requestedWeek
  const year = TARGET_SEASON_YEAR

  const supabase = createServiceClient()
  const weekConfig = SEASON_WEEKS.find(w => w.week === week)
  const todayStr = toETDateString(new Date().toISOString())

  // ── 1. Try to serve from the DB cache ─────────────────────────────────────
  const { data: allCached } = await supabase
    .from('games')
    .select('*')
    .eq('season_year', year)
    .eq('sport', sportKey)
    .order('commence_time', { ascending: true })

  const weekGamesFromCache = (allCached ?? []).filter((g: any) => {
    if (!weekConfig) return g.nfl_week === week
    const gameDate = toETDateString(g.commence_time)
    return gameDate >= weekConfig.startDate && gameDate <= weekConfig.endDate
  })

  const dayNames = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']

  if (weekGamesFromCache.length > 0) {
    const enriched = weekGamesFromCache.map((g: any) => {
      const gameTime = new Date(g.commence_time)
      const timeStr = gameTime.toLocaleTimeString('en-US', {
        hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'America/New_York',
      })
      return {
        ...g,
        fav: g.favorite_team,
        dog: g.underdog_team,
        time: `${dayNames[gameTime.getDay()]} ${timeStr}`,
      }
    })
    const source = weekConfig && weekConfig.endDate < todayStr ? 'cache' : 'cache-live'
    return NextResponse.json({ games: enriched, week, currentWeek, year, source, sport: sportKey })
  }

  // DB is empty for this week — return empty so the UI shows TBD placeholders.
  // Games are populated by the cron job or the admin Refresh Games button.
  return NextResponse.json({ games: [], week, currentWeek, year, source: 'empty', sport: sportKey })
}
