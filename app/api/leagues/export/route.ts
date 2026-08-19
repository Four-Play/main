/**
 * GET /api/leagues/export?leagueId=X&year=Y
 *
 * Returns a CSV file with three sections:
 *   1. League info (name, stake, cushion)
 *   2. Standings (member, wins, losses, total pts)
 *   3. Weekly results (member, week, result, pts won/owed)
 *   4. All picks (member, week, game, team picked, result)
 *
 * Available to all league members (not just admin).
 */

import { NextResponse } from 'next/server'
import { createServiceClient, getAuthenticatedUser } from '@/lib/supabase/server'

function csvRow(cells: (string | number | null | undefined)[]): string {
  return cells
    .map(c => {
      const str = String(c ?? '')
      return str.includes(',') || str.includes('"') || str.includes('\n')
        ? `"${str.replace(/"/g, '""')}"`
        : str
    })
    .join(',')
}

export async function GET(request: Request) {
  const user = await getAuthenticatedUser(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const leagueId = searchParams.get('leagueId')
  const year = parseInt(searchParams.get('year') ?? '0')
  if (!leagueId || !year) return NextResponse.json({ error: 'Missing leagueId or year' }, { status: 400 })

  const supabase = createServiceClient()

  // Verify requesting user is a member of this league
  const { data: membership } = await supabase
    .from('league_members')
    .select('id')
    .eq('league_id', leagueId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!membership) return NextResponse.json({ error: 'Not a member of this league' }, { status: 403 })

  // Fetch all the data in parallel
  const [leagueResult, membersResult, resultsResult, picksResult, gamesResult] = await Promise.all([
    supabase.from('leagues').select('name, payout_per_loss_cents, spread_cushion').eq('id', leagueId).single(),
    supabase.from('league_members').select('user_id, wins, losses, league_points, profile:profiles(username)').eq('league_id', leagueId).order('league_points', { ascending: false }),
    supabase.from('weekly_results').select('user_id, nfl_week, is_winner, amount_won_cents, amount_owed_cents, profile:profiles(username)').eq('league_id', leagueId).eq('season_year', year).order('nfl_week'),
    supabase.from('picks').select('user_id, nfl_week, game_id, team_selected, result, profile:profiles(username)').eq('league_id', leagueId).eq('season_year', year).order('nfl_week'),
    supabase.from('games').select('id, nfl_week, home_team, away_team, spread, commence_time, status').eq('season_year', year).order('commence_time'),
  ])

  const league = leagueResult.data
  if (!league) return NextResponse.json({ error: 'League not found' }, { status: 404 })

  const members = membersResult.data ?? []
  const results = resultsResult.data ?? []
  const picks = picksResult.data ?? []
  const games = gamesResult.data ?? []
  const gamesById = new Map(games.map(g => [g.id, g]))

  const stake = league.payout_per_loss_cents / 100
  const lines: string[] = []

  // ── Section 1: League Info ────────────────────────────────────────────
  lines.push('LEAGUE INFO')
  lines.push(csvRow(['Name', league.name]))
  lines.push(csvRow(['Season Year', year]))
  lines.push(csvRow(['Stake (pts per loss)', stake]))
  lines.push(csvRow(['Spread Cushion', `+${league.spread_cushion}`]))
  lines.push('')

  // ── Section 2: Standings ──────────────────────────────────────────────
  lines.push('STANDINGS')
  lines.push(csvRow(['Rank', 'Player', 'Wins', 'Losses', 'Total Points']))
  members.forEach((m, idx) => {
    const name = (m.profile as any)?.username ?? 'Unknown'
    const pts = (m.league_points / 100).toFixed(0)
    lines.push(csvRow([idx + 1, name, m.wins, m.losses, pts]))
  })
  lines.push('')

  // ── Section 3: Weekly Results ─────────────────────────────────────────
  lines.push('WEEKLY RESULTS')
  lines.push(csvRow(['Week', 'Player', 'Outcome', 'Points Won', 'Points Owed', 'Net']))
  for (const r of results) {
    const name = (r.profile as any)?.username ?? 'Unknown'
    const won = (r.amount_won_cents / 100).toFixed(0)
    const owed = (r.amount_owed_cents / 100).toFixed(0)
    const net = ((r.amount_won_cents - r.amount_owed_cents) / 100).toFixed(0)
    lines.push(csvRow([r.nfl_week, name, r.is_winner ? 'WIN' : 'LOSS', won, owed, net]))
  }
  lines.push('')

  // ── Section 4: All Picks ──────────────────────────────────────────────
  lines.push('ALL PICKS')
  lines.push(csvRow(['Week', 'Player', 'Home Team', 'Away Team', 'Spread', 'Team Picked', 'Result']))
  for (const p of picks) {
    const name = (p.profile as any)?.username ?? 'Unknown'
    const game = gamesById.get(p.game_id)
    lines.push(csvRow([
      p.nfl_week,
      name,
      game?.home_team ?? '',
      game?.away_team ?? '',
      game?.spread != null ? game.spread.toFixed(1) : '',
      p.team_selected,
      p.result?.toUpperCase() ?? 'PENDING',
    ]))
  }

  const csv = lines.join('\n')
  const filename = `${league.name.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-${year}-export.csv`

  return new Response(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
