// src/services/leagueService.ts
// services/leagueService.ts
import { supabase } from '@/lib/supabase/client'
import { authFetch } from '@/lib/api'
import type { League, LeagueMember, WeeklyResult, WeekSummary } from '@/types/database'


export async function createLeague(
  name: string,
  _adminId: string,
  payoutPerLossCents: number = 5000
): Promise<League> {
  const res = await authFetch('/api/leagues/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, payoutPerLossCents }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? 'Failed to create league')
  return data.league as League
}

export async function joinLeagueWithCode(
  inviteCode: string,
  _userId: string
): Promise<League> {
  const res = await authFetch('/api/leagues/join', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ inviteCode }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? 'Failed to join league')
  return data.league as League
}

export async function getMyLeagues(userId: string): Promise<League[]> {

  const { data, error } = await supabase
    .from('league_members')
    .select('league_id, leagues(*)')
    .eq('user_id', userId)

  if (error) throw new Error(error.message)

  return (data?.map((row: any) => row.leagues).filter(Boolean) ?? []) as League[]
}

export async function getLeagueMembers(leagueId: string): Promise<LeagueMember[]> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('getLeagueMembers timed out')), 8000)
  )

  const work = (async () => {
  
    const { data, error } = await supabase
      .from('league_members')
      .select(`
        *,
        profile:profiles(id, username, avatar_url, total_points)
      `)
      .eq('league_id', leagueId)
      .order('league_points', { ascending: false })

    if (error) throw new Error(error.message)
    return (data ?? []) as LeagueMember[]
  })()

  return Promise.race([work, timeout])
}

export async function getLeagueWeeklyResults(
  leagueId: string,
  week: number,
  year: number
): Promise<WeekSummary> {

  const { data: results, error } = await supabase
    .from('weekly_results')
    .select(`
      *,
      profile:profiles(id, username)
    `)
    .eq('league_id', leagueId)
    .eq('nfl_week', week)
    .eq('season_year', year)

  if (error) throw new Error(error.message)

  const typed = (results ?? []) as WeeklyResult[]
  const winners = typed.filter(r => r.is_winner)
  const losers = typed.filter(r => !r.is_winner)
  const prizePerWinner = losers.length > 0 && winners.length > 0
    ? Math.floor((losers.reduce((s, l) => s + l.amount_owed_cents, 0)) / winners.length)
    : 0

  return {
    week,
    year,
    winners,
    losers,
    prizePerWinner,
    isFinal: typed.some(r => r.calculated_at != null),
  }
}

/** Fetch every week's summary for the season in a single query, grouped by week. */
export async function getAllLeagueWeeklyResults(
  leagueId: string,
  year: number
): Promise<WeekSummary[]> {

  const { data: results, error } = await supabase
    .from('weekly_results')
    .select(`
      *,
      profile:profiles(id, username)
    `)
    .eq('league_id', leagueId)
    .eq('season_year', year)
    .order('nfl_week', { ascending: false })

  if (error) throw new Error(error.message)

  const typed = (results ?? []) as WeeklyResult[]
  const byWeek = new Map<number, WeeklyResult[]>()
  for (const r of typed) {
    const arr = byWeek.get(r.nfl_week) ?? []
    arr.push(r)
    byWeek.set(r.nfl_week, arr)
  }

  return [...byWeek.entries()].map(([week, rows]) => {
    const winners = rows.filter(r => r.is_winner)
    const losers = rows.filter(r => !r.is_winner)
    const prizePerWinner = losers.length > 0 && winners.length > 0
      ? Math.floor((losers.reduce((s, l) => s + l.amount_owed_cents, 0)) / winners.length)
      : 0
    return {
      week,
      year,
      winners,
      losers,
      prizePerWinner,
      isFinal: rows.some(r => r.calculated_at != null),
    }
  })
}

export async function updateLeague(
  leagueId: string,
  updates: Partial<Pick<League, 'name' | 'payout_per_loss_cents' | 'spread_cushion' | 'is_locked'>>
): Promise<League> {
  const res = await authFetch('/api/leagues/update', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ leagueId, updates }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? 'Failed to update league')
  return data.league as League
}

export async function deleteLeague(leagueId: string): Promise<void> {
  const res = await authFetch('/api/leagues/delete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ leagueId }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? 'Failed to delete league')
}