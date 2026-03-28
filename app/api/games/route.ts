// app/api/games/route.ts
// app/api/games/route.ts
import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

const ODDS_API_KEY = process.env.ODDS_API_KEY!
const ODDS_BASE = 'https://api.the-odds-api.com/v4'

/**
 * --- CONFIGURATION ---
 * Current Sport: NBA (basketball_nba) or MLB (baseball_mlb) or NFL (americanfootball_NFL)
 */
const SPORT_KEY = 'basketball_nba'; 
const TARGET_SEASON_YEAR = 2026 

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  
  // For NBA/MLB, we can default to a 'week' of 1 in the database 
  // since they don't use standard NFL week numbering.
  const week = parseInt(searchParams.get('week') ?? '1')
  const year = TARGET_SEASON_YEAR

  const supabase = createServiceClient()

  // 1. Check Cache
  const { data: cached } = await supabase
    .from('games')
    .select('*')
    .eq('nfl_week', week) // Still using the column name, but storing current games here
    .eq('season_year', year)
    .order('commence_time', { ascending: true })

  if (cached && cached.length > 0) {
    return NextResponse.json({ games: cached, week, year, source: 'cache' })
  }

  // 2. Fetch from API (Live/Upcoming NBA/MLB Games)
  try {
    // Note: We remove the 'week' filtering in the URL because 
    // the Odds API returns all upcoming games for these sports.
    const url = `${ODDS_BASE}/sports/${SPORT_KEY}/odds/?apiKey=${ODDS_API_KEY}&regions=us&markets=spreads&oddsFormat=american`
    const res = await fetch(url, { next: { revalidate: 3600 } })

    if (!res.ok) {
      return NextResponse.json({ error: 'Failed to fetch odds' }, { status: 502 })
    }

    const oddsData = await res.json()

    const games = oddsData.map((event: any) => {
        // Find the spread from a reliable bookmaker
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
            // If home spread is positive (e.g. +5), they are the underdog
            if (spread > 0) {
              favTeam = event.away_team
              dogTeam = event.home_team
              spread = Math.abs(spread) * -1 // Standardize favorite as a negative number
            }
          }
        }

        const gameTime = new Date(event.commence_time)
        const dayNames = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
        const timeStr = gameTime.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
          timeZone: 'America/New_York',
        })

        return {
          external_id: event.id,
          home_team: event.home_team,
          away_team: event.away_team,
          favorite_team: favTeam,
          underdog_team: dogTeam,
          spread,
          commence_time: event.commence_time,
          nfl_week: week, // Assigning to the current 'test week'
          season_year: year,
          status: 'upcoming',
          // Frontend helper fields
          fav: favTeam,
          dog: dogTeam,
          time: `${dayNames[gameTime.getDay()]} ${timeStr}`,
        }
      })

    if (games.length === 0) {
      return NextResponse.json({ games: [], week, year, message: 'No games found' })
    }

    // 3. Update Cache in Supabase
    const dbRows = games.map(({ fav, dog, time, ...rest }: any) => rest)
    await supabase.from('games').upsert(dbRows, { onConflict: 'external_id' })

    return NextResponse.json({ games, week, year, source: 'api' })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}