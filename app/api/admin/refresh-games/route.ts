// app/api/admin/refresh-games/route.ts
// Manual trigger for the games refresh (same logic as /api/cron/games).
// Cron routes are Vercel-internal only; this endpoint is the browser-callable
// equivalent, protected by Supabase auth.

import { NextResponse } from 'next/server'
import { createServiceClient, getAuthenticatedUser } from '@/lib/supabase/server'
import { ACTIVE_SPORT, SPORT_CONFIG, computeWeekFromDate, toETDateString } from '@/lib/weekUtils'
import { SEASON_WEEKS } from '@/config/season'

const ODDS_API_KEY = process.env.ODDS_API_KEY!
const ODDS_BASE    = 'https://api.the-odds-api.com/v4'
const SPORT_KEY    = ACTIVE_SPORT
const SEASON_YEAR  = SPORT_CONFIG[SPORT_KEY].seasonYear

export async function POST(request: Request) {
  const user = await getAuthenticatedUser(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createServiceClient()
  const todayStr = toETDateString(new Date().toISOString())

  // Refresh all weeks that haven't ended yet so any week's spreads can be updated manually.
  const weeksToFetch = SEASON_WEEKS
    .filter(w => w.endDate >= todayStr)
    .map(w => w.week)

  let totalUpserted = 0
  const results: Record<number, { events: number; spreads: number }> = {}

  for (const week of weeksToFetch) {
    const weekConfig = SEASON_WEEKS.find(w => w.week === week)
    if (!weekConfig) continue

    const dateParams = `&commenceTimeFrom=${weekConfig.startDate}T00:00:00Z&commenceTimeTo=${weekConfig.endDate}T23:59:59Z`
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 15000)

    try {
      const [eventsRes, oddsRes] = await Promise.all([
        fetch(`${ODDS_BASE}/sports/${SPORT_KEY}/events/?apiKey=${ODDS_API_KEY}${dateParams}`, { cache: 'no-store', signal: controller.signal }),
        fetch(`${ODDS_BASE}/sports/${SPORT_KEY}/odds/?apiKey=${ODDS_API_KEY}&regions=us&markets=spreads&oddsFormat=american${dateParams}`, { cache: 'no-store', signal: controller.signal }),
      ]).finally(() => clearTimeout(timeout))

      const eventsData: any[] = eventsRes.ok ? await eventsRes.json() : []
      const oddsData: any[]   = oddsRes.ok   ? await oddsRes.json()   : []

      const oddsById = new Map<string, any>()
      for (const o of oddsData) oddsById.set(o.id, o)

      const eventIds = eventsData.map(e => e.id)
      const lockedSpreads = new Map<string, { spread: number; favorite_team: string; underdog_team: string }>()
      if (eventIds.length > 0) {
        const { data: locked } = await supabase
          .from('games')
          .select('external_id, spread, favorite_team, underdog_team')
          .in('external_id', eventIds)
          .neq('spread', 0)
          .lt('commence_time', new Date().toISOString())
        for (const row of locked ?? []) lockedSpreads.set(row.external_id, row)
      }

      const rows = eventsData.map((event: any) => {
        const locked = lockedSpreads.get(event.id)
        let favTeam = event.home_team
        let dogTeam = event.away_team
        let spread = 0

        if (locked) {
          favTeam = locked.favorite_team
          dogTeam = locked.underdog_team
          spread = locked.spread
        } else {
          const oddsEvent = oddsById.get(event.id)
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
        }

        return {
          external_id: event.id,
          home_team: event.home_team,
          away_team: event.away_team,
          favorite_team: favTeam,
          underdog_team: dogTeam,
          spread,
          commence_time: event.commence_time,
          nfl_week: computeWeekFromDate(event.commence_time, SPORT_KEY),
          season_year: SEASON_YEAR,
          status: 'upcoming',
        }
      })

      if (rows.length > 0) {
        await supabase.from('games').upsert(rows, { onConflict: 'external_id' })
        totalUpserted += rows.length
      }

      results[week] = { events: eventsData.length, spreads: oddsData.length }
    } catch {
      results[week] = { events: -1, spreads: -1 }
    }
  }

  return NextResponse.json({ success: true, weeksRefreshed: weeksToFetch, totalUpserted, results })
}
