// app/api/admin/refresh-games/route.ts
// Manual trigger for the games refresh (same logic as /api/cron/games).
// Refreshes all upcoming weeks for all sports that have active leagues.

import { NextResponse } from 'next/server'
import { createServiceClient, getAuthenticatedUser } from '@/lib/supabase/server'
import { ACTIVE_SPORT, NCAAF_SPORT, computeWeekFromDate, toETDateString, getSeasonWeeks, getPlayoffRules, getSeasonYear } from '@/lib/weekUtils'
import { NCAAF_ALLOWED_TEAMS } from '@/config/ncaaf-season'

const ODDS_API_KEY = process.env.ODDS_API_KEY!
const ODDS_BASE    = 'https://api.the-odds-api.com/v4'

export async function POST(request: Request) {
  const user = await getAuthenticatedUser(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createServiceClient()
  const todayStr = toETDateString(new Date().toISOString())

  const { data: leagueSports } = await supabase.from('leagues').select('sport')
  const activeSports = [...new Set((leagueSports ?? []).map((l: any) => l.sport ?? ACTIVE_SPORT))]
  if (!activeSports.includes(ACTIVE_SPORT)) activeSports.push(ACTIVE_SPORT)

  const allResults: Record<string, any> = {}

  for (const sportKey of activeSports) {
    const SEASON_WEEKS = getSeasonWeeks(sportKey)
    const PLAYOFF_RULES = getPlayoffRules(sportKey)
    const SEASON_YEAR = getSeasonYear(sportKey)

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
        const markets = week in PLAYOFF_RULES ? 'spreads,totals' : 'spreads'
        const [eventsRes, oddsRes] = await Promise.all([
          fetch(`${ODDS_BASE}/sports/${sportKey}/events/?apiKey=${ODDS_API_KEY}${dateParams}`, { cache: 'no-store', signal: controller.signal }),
          fetch(`${ODDS_BASE}/sports/${sportKey}/odds/?apiKey=${ODDS_API_KEY}&regions=us&markets=${markets}&oddsFormat=american${dateParams}`, { cache: 'no-store', signal: controller.signal }),
        ]).finally(() => clearTimeout(timeout))

        let eventsData: any[] = eventsRes.ok ? await eventsRes.json() : []
        const oddsData: any[]  = oddsRes.ok  ? await oddsRes.json()  : []

        if (sportKey === NCAAF_SPORT) {
          eventsData = eventsData.filter(e =>
            NCAAF_ALLOWED_TEAMS.has(e.home_team) && NCAAF_ALLOWED_TEAMS.has(e.away_team)
          )
        }

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

          const oddsEvent = oddsById.get(event.id)

          if (locked) {
            favTeam = locked.favorite_team
            dogTeam = locked.underdog_team
            spread = locked.spread
          } else {
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

          const totalsMarket = oddsEvent?.bookmakers
            ?.find((b: any) => b.key === 'draftkings' || b.key === 'fanduel' || b.key === 'lowvig')
            ?.markets?.find((m: any) => m.key === 'totals')
          const total: number | undefined = totalsMarket?.outcomes?.find((o: any) => o.name === 'Over')?.point

          return {
            external_id: event.id,
            home_team: event.home_team,
            away_team: event.away_team,
            favorite_team: favTeam,
            underdog_team: dogTeam,
            spread,
            ...(total != null ? { total } : {}),
            commence_time: event.commence_time,
            nfl_week: computeWeekFromDate(event.commence_time, sportKey),
            season_year: SEASON_YEAR,
            sport: sportKey,
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

    allResults[sportKey] = { weeksRefreshed: weeksToFetch, totalUpserted, results }
  }

  return NextResponse.json({ success: true, sports: activeSports, allResults })
}
