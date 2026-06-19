// Temporary diagnostic route — hit /api/debug/odds in the browser to see
// exactly what the Odds API returns for the current week.
// DELETE THIS FILE once the games issue is resolved.
import { NextResponse } from 'next/server'

const ODDS_API_KEY = process.env.ODDS_API_KEY!
const ODDS_BASE = 'https://api.the-odds-api.com/v4'
const SPORT_KEY = 'americanfootball_nfl'

export async function GET() {
  const weekFrom = '2026-09-09T00:00:00Z'
  const weekTo   = '2026-09-15T23:59:59Z'

  const oddsUrl = `${ODDS_BASE}/sports/${SPORT_KEY}/odds/?apiKey=${ODDS_API_KEY}&regions=us&markets=spreads&oddsFormat=american&commenceTimeFrom=${weekFrom}&commenceTimeTo=${weekTo}`
  const eventsUrl = `${ODDS_BASE}/sports/${SPORT_KEY}/events/?apiKey=${ODDS_API_KEY}&commenceTimeFrom=${weekFrom}&commenceTimeTo=${weekTo}`
  const sportsUrl = `${ODDS_BASE}/sports/?apiKey=${ODDS_API_KEY}`

  const [oddsRes, eventsRes, sportsRes] = await Promise.all([
    fetch(oddsUrl, { cache: 'no-store' }),
    fetch(eventsUrl, { cache: 'no-store' }),
    fetch(sportsUrl, { cache: 'no-store' }),
  ])

  const oddsStatus = oddsRes.status
  const eventsStatus = eventsRes.status
  const sportsStatus = sportsRes.status

  const oddsData   = oddsRes.ok   ? await oddsRes.json()   : await oddsRes.text()
  const eventsData = eventsRes.ok ? await eventsRes.json() : await eventsRes.text()
  const sportsData = sportsRes.ok ? await sportsRes.json() : await sportsRes.text()

  const nflSport = Array.isArray(sportsData)
    ? sportsData.find((s: any) => s.key === SPORT_KEY)
    : null

  return NextResponse.json({
    apiKeyPresent: !!ODDS_API_KEY && ODDS_API_KEY.length > 10,
    nflSportStatus: nflSport ?? 'not found in sports list',
    odds: {
      httpStatus: oddsStatus,
      gameCount: Array.isArray(oddsData) ? oddsData.length : 'not an array',
      sample: Array.isArray(oddsData) ? oddsData.slice(0, 2) : oddsData,
    },
    events: {
      httpStatus: eventsStatus,
      gameCount: Array.isArray(eventsData) ? eventsData.length : 'not an array',
      sample: Array.isArray(eventsData) ? eventsData.slice(0, 2) : eventsData,
    },
  })
}
