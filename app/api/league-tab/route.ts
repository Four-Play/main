import { NextResponse } from 'next/server'
import { createServiceClient, getAuthenticatedUser } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const user = await getAuthenticatedUser(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const leagueId = searchParams.get('leagueId')
  const year = parseInt(searchParams.get('year') ?? '0')
  if (!leagueId || !year) return NextResponse.json({ error: 'Missing leagueId or year' }, { status: 400 })

  const supabase = createServiceClient()

  const [membersResult, resultsResult] = await Promise.all([
    supabase
      .from('league_members')
      .select('*, profile:profiles(id, username, avatar_url, total_points)')
      .eq('league_id', leagueId)
      .order('league_points', { ascending: false }),
    supabase
      .from('weekly_results')
      .select('*, profile:profiles(id, username)')
      .eq('league_id', leagueId)
      .eq('season_year', year)
      .order('nfl_week', { ascending: false }),
  ])

  if (membersResult.error) return NextResponse.json({ error: membersResult.error.message }, { status: 500 })
  if (resultsResult.error) return NextResponse.json({ error: resultsResult.error.message }, { status: 500 })

  const byWeek = new Map<number, any[]>()
  for (const r of (resultsResult.data ?? [])) {
    const arr = byWeek.get(r.nfl_week) ?? []
    arr.push(r)
    byWeek.set(r.nfl_week, arr)
  }
  const weekSummaries = [...byWeek.entries()].map(([week, rows]) => {
    const winners = rows.filter(r => r.is_winner)
    const losers = rows.filter(r => !r.is_winner)
    const prizePerWinner = losers.length > 0 && winners.length > 0
      ? Math.floor(losers.reduce((s, l) => s + l.amount_owed_cents, 0) / winners.length)
      : 0
    return { week, year, winners, losers, prizePerWinner, isFinal: rows.some(r => r.calculated_at != null) }
  })

  return NextResponse.json({ members: membersResult.data ?? [], weekSummaries })
}
