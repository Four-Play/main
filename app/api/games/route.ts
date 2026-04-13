// app/api/games/route.ts
import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { ACTIVE_SPORT, SPORT_CONFIG, computeWeekFromDate, computeCurrentWeek, toETDateString } from '@/lib/weekUtils'
import { SEASON_WEEKS } from '@/config/season'

const ODDS_API_KEY = process.env.ODDS_API_KEY!
const ODDS_BASE = 'https://api.the-odds-api.com/v4'

const SPORT_KEY = ACTIVE_SPORT
const TARGET_SEASON_YEAR = SPORT_CONFIG[SPORT_KEY].seasonYear

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)

  // currentWeek is always derived from today's date — independent of what week is being browsed
  const currentWeek = computeCurrentWeek(SPORT_KEY)
  const requestedWeek = parseInt(searchParams.get('week') ?? String(currentWeek))
  const week = isNaN(requestedWeek) ? currentWeek : requestedWeek
  const year = TARGET_SEASON_YEAR

  const supabase = createServiceClient()

  // 1. Check cache for the requested week
  const { data: cached } = await supabase
    .from('games')
    .select('*')
    .eq('nfl_week', week)
    .eq('season_year', year)
    .order('commence_time', { ascending: true })

  if (cached && cached.length > 0) {
    // Filter to only games that fall within this week's date window
    const weekConfig = SEASON_WEEKS.find(w => w.week === week)
    const filtered = weekConfig
      ? cached.filter((g: any) => {
          const gameDate = toETDateString(g.commence_time)
          return gameDate >= weekConfig.startDate && gameDate <= weekConfig.endDate
        })
      : cached

    // Serve cached games if any exist within the date window
    if (filtered.length > 0) {
      return NextResponse.json({ games: filtered, week, currentWeek, year, source: 'cache' })
    }
  }

  // 2. Fetch upcoming games (odds) AND completed games (scores) from Odds API
  try {
    const weekConfig = SEASON_WEEKS.find(w => w.week === week)

    // Fetch both endpoints in parallel
    const [oddsRes, scoresRes] = await Promise.all([
      fetch(`${ODDS_BASE}/sports/${SPORT_KEY}/odds/?apiKey=${ODDS_API_KEY}&regions=us&markets=spreads&oddsFormat=american`),
      fetch(`${ODDS_BASE}/sports/${SPORT_KEY}/scores/?apiKey=${ODDS_API_KEY}&daysFrom=3`),
    ])

    const oddsData = oddsRes.ok ? await oddsRes.json() : []
    const scoresData = scoresRes.ok ? await scoresRes.json() : []

    // Track external_ids we've seen so scores don't duplicate odds entries
    const seenIds = new Set<string>()

    // Parse upcoming games from odds endpoint (has spread data)
    const upcomingGames = (Array.isArray(oddsData) ? oddsData : []).map((event: any) => {
      seenIds.add(event.id)

      const spreadMarket = event.bookmakers
        ?.find((b: any) => b.key === 'draftkings' || b.key === 'fanduel' || b.key === 'lowvig')
        ?.markets?.find((m: any) => m.key === 'spreads')

      let favTeam = event.home_team
      let dogTeam = event.away_team
      let spread = 0

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

      const gameWeek = computeWeekFromDate(event.commence_time, SPORT_KEY)
      const gameTime = new Date(event.commence_time)
      const dayNames = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
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
        nfl_week: gameWeek,
        season_year: year,
        status: 'upcoming' as string,
        fav: favTeam,
        dog: dogTeam,
        time: `${dayNames[gameTime.getDay()]} ${timeStr}`,
      }
    })

    // Parse completed games from scores endpoint (has final scores)
    const completedGames = (Array.isArray(scoresData) ? scoresData : [])
      .filter((s: any) => s.completed && !seenIds.has(s.id))
      .map((score: any) => {
        const homeScore = score.scores?.find((s: any) => s.name === score.home_team)?.score
        const awayScore = score.scores?.find((s: any) => s.name === score.away_team)?.score
        const gameWeek = computeWeekFromDate(score.commence_time, SPORT_KEY)
        const gameTime = new Date(score.commence_time)
        const dayNames = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
        const timeStr = gameTime.toLocaleTimeString('en-US', {
          hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'America/New_York',
        })

        return {
          external_id: score.id,
          home_team: score.home_team,
          away_team: score.away_team,
          favorite_team: score.home_team,
          underdog_team: score.away_team,
          spread: 0,
          commence_time: score.commence_time,
          nfl_week: gameWeek,
          season_year: year,
          status: 'final' as string,
          home_score: homeScore != null ? parseInt(homeScore) : null,
          away_score: awayScore != null ? parseInt(awayScore) : null,
          fav: score.home_team,
          dog: score.away_team,
          time: `${dayNames[gameTime.getDay()]} ${timeStr}`,
        }
      })

    const allGames = [...upcomingGames, ...completedGames]

    if (allGames.length === 0) {
      return NextResponse.json({ games: [], week, currentWeek, year, message: 'No games found' })
    }

    // 3. Upsert all fetched games to cache
    const dbRows = allGames.map(({ fav, dog, time, ...rest }: any) => rest)
    await supabase.from('games').upsert(dbRows, { onConflict: 'external_id' })

    // 4. Return only the games for the requested week within the date window
    const weekGames = allGames.filter((g: any) => {
      if (!weekConfig) return g.nfl_week === week
      const gameDate = toETDateString(g.commence_time)
      return gameDate >= weekConfig.startDate && gameDate <= weekConfig.endDate
    })
    return NextResponse.json({ games: weekGames, week, currentWeek, year, source: 'api' })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}