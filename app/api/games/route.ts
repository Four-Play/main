// app/api/games/route.ts
// Serves game data from the DB cache — no Odds API calls on user visits.
// The /api/cron/games job refreshes the DB on schedule.
// Response-level Redis cache (60s TTL) reduces Supabase load during high traffic.

import { NextResponse } from 'next/server'
import { kv } from '@vercel/kv'
import { createServiceClient } from '@/lib/supabase/server'
import { ACTIVE_SPORT, computeCurrentWeek, toETDateString, getSeasonWeeks, getSeasonYear, getPlayoffRules } from '@/lib/weekUtils'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)

  const sportKey = searchParams.get('sport') ?? ACTIVE_SPORT
  const SEASON_WEEKS = getSeasonWeeks(sportKey)
  const TARGET_SEASON_YEAR = getSeasonYear(sportKey)

  const currentWeek = computeCurrentWeek(sportKey)
  const requestedWeek = parseInt(searchParams.get('week') ?? String(currentWeek))
  const week = isNaN(requestedWeek) ? currentWeek : requestedWeek
  const year = TARGET_SEASON_YEAR

  const cacheKey = `games:${sportKey}:${year}:w${week}`

  // Check Redis cache first — avoids Supabase hit for ~60s per unique week/sport
  try {
    const cached = await kv.get<object>(cacheKey)
    if (cached) {
      return NextResponse.json({ ...cached, source: 'redis' })
    }
  } catch {
    // Redis unavailable — fall through to Supabase
  }

  const supabase = createServiceClient()
  const weekConfig = SEASON_WEEKS.find(w => w.week === week)
  const todayStr = toETDateString(new Date().toISOString())

  // Build DB query scoped to the requested week — avoids full-season scan
  let query = supabase
    .from('games')
    .select('id, external_id, home_team, away_team, favorite_team, underdog_team, spread, total, commence_time, nfl_week, season_year, sport, status, home_score, away_score')
    .eq('season_year', year)
    .eq('sport', sportKey)
    .order('commence_time', { ascending: true })

  if (weekConfig) {
    query = query
      .gte('commence_time', `${weekConfig.startDate}T00:00:00Z`)
      .lte('commence_time', `${weekConfig.endDate}T23:59:59Z`)
  } else {
    query = query.eq('nfl_week', week)
  }

  const { data: weekGames } = await query

  if (!weekGames || weekGames.length === 0) {
    return NextResponse.json({ games: [], week, currentWeek, year, source: 'empty', sport: sportKey })
  }

  const dayNames = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
  const enriched = weekGames.map((g: any) => {
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
  const payload = { games: enriched, week, currentWeek, year, source, sport: sportKey }

  // Store in Redis for 60 seconds — all users share one cached response per week/sport
  try {
    await kv.set(cacheKey, payload, { ex: 60 })
  } catch {
    // Non-fatal — serve the response even if Redis write fails
  }

  return NextResponse.json(payload)
}
