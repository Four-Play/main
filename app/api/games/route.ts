// app/api/games/route.ts
// Serves game data from the DB cache — no Odds API calls on user visits.
// The /api/cron/games job refreshes the DB every 4 hours.
// One-time live fetch only when the DB has no games at all for the requested
// week (first deploy, or after a DB reset).

import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { ACTIVE_SPORT, SPORT_CONFIG, computeWeekFromDate, computeCurrentWeek, toETDateString } from '@/lib/weekUtils'
import { SEASON_WEEKS } from '@/config/season'

export const dynamic = 'force-dynamic'

const ODDS_API_KEY = process.env.ODDS_API_KEY!
const ODDS_BASE = 'https://api.the-odds-api.com/v4'

const SPORT_KEY = ACTIVE_SPORT
const TARGET_SEASON_YEAR = SPORT_CONFIG[SPORT_KEY].seasonYear

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)

  const currentWeek = computeCurrentWeek(SPORT_KEY)
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
    .order('commence_time', { ascending: true })

  const weekGamesFromCache = (allCached ?? []).filter((g: any) => {
    if (!weekConfig) return g.nfl_week === week
    const gameDate = toETDateString(g.commence_time)
    return gameDate >= weekConfig.startDate && gameDate <= weekConfig.endDate
  })

  if (weekGamesFromCache.length > 0) {
    // Compute fav/dog/time display fields that aren't stored in the DB.
    const dayNames = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
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
    return NextResponse.json({ games: enriched, week, currentWeek, year, source })
  }

  // ── 2. DB is empty for this week — one-time live fetch ────────────────────
  // This only happens on first deploy or after a DB reset. The cron job will
  // keep the DB populated going forward so this path is rarely hit.
  try {
    const controller = new AbortController()
    const apiTimeout = setTimeout(() => controller.abort(), 12000)

    const dateParams = weekConfig
      ? `&commenceTimeFrom=${weekConfig.startDate}T00:00:00Z&commenceTimeTo=${weekConfig.endDate}T23:59:59Z`
      : ''

    const [eventsRes, oddsRes] = await Promise.all([
      fetch(`${ODDS_BASE}/sports/${SPORT_KEY}/events/?apiKey=${ODDS_API_KEY}${dateParams}`, { cache: 'no-store', signal: controller.signal }),
      fetch(`${ODDS_BASE}/sports/${SPORT_KEY}/odds/?apiKey=${ODDS_API_KEY}&regions=us&markets=spreads&oddsFormat=american${dateParams}`, { cache: 'no-store', signal: controller.signal }),
    ]).finally(() => clearTimeout(apiTimeout))

    const eventsData: any[] = eventsRes.ok ? await eventsRes.json() : []
    const oddsData: any[]   = oddsRes.ok   ? await oddsRes.json()   : []

    if (eventsData.length === 0) {
      return NextResponse.json({ games: [], week, currentWeek, year, message: 'No games found' })
    }

    const oddsById = new Map<string, any>()
    for (const o of oddsData) oddsById.set(o.id, o)

    const dayNames = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']

    const rows = eventsData.map((event: any) => {
      const oddsEvent = oddsById.get(event.id)
      let favTeam = event.home_team
      let dogTeam = event.away_team
      let spread = 0

      const spreadMarket = oddsEvent?.bookmakers
        ?.find((b: any) => b.key === 'draftkings' || b.key === 'fanduel' || b.key === 'lowvig')
        ?.markets?.find((m: any) => m.key === 'spreads')

      if (spreadMarket) {
        const homeOutcome = spreadMarket.outcomes?.find((o: any) => o.name === event.home_team)
        if (homeOutcome) {
          spread = homeOutcome.point
          if (spread > 0) {
            favTeam = event.away_team
            dogTeam = event.home_team
            spread = Math.abs(spread) * -1
          }
        }
      }

      const gameTime = new Date(event.commence_time)
      const timeStr = gameTime.toLocaleTimeString('en-US', {
        hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'America/New_York',
      })

      return {
        external_id: event.id,
        home_team: event.home_team,
        away_team: event.away_team,
        favorite_team: favTeam,
        underdog_team: dogTeam,
        spread,
        commence_time: event.commence_time,
        nfl_week: computeWeekFromDate(event.commence_time, SPORT_KEY),
        season_year: year,
        status: 'upcoming' as string,
        fav: favTeam,
        dog: dogTeam,
        time: `${dayNames[gameTime.getDay()]} ${timeStr}`,
      }
    })

    // Upsert so the cron doesn't need to run before the first user visit.
    const dbRows = rows.map(({ fav, dog, time, ...rest }: any) => rest)
    await supabase.from('games').upsert(dbRows, { onConflict: 'external_id' })

    // Re-query to get DB-assigned ids (used as foreign keys in picks).
    const { data: refreshed } = await supabase
      .from('games')
      .select('*')
      .eq('season_year', year)
      .order('commence_time', { ascending: true })

    const weekGames = (refreshed ?? []).filter((g: any) => {
      if (!weekConfig) return g.nfl_week === week
      const gameDate = toETDateString(g.commence_time)
      return gameDate >= weekConfig.startDate && gameDate <= weekConfig.endDate
    }).map((g: any) => {
      const gameTime = new Date(g.commence_time)
      const dayNames2 = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
      const timeStr = gameTime.toLocaleTimeString('en-US', {
        hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'America/New_York',
      })
      return { ...g, fav: g.favorite_team, dog: g.underdog_team, time: `${dayNames2[gameTime.getDay()]} ${timeStr}` }
    })

    return NextResponse.json({ games: weekGames, week, currentWeek, year, source: 'api-bootstrap' })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
