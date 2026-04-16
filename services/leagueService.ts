// src/services/leagueService.ts
// services/leagueService.ts
import { createClient } from '@/lib/supabase/client'
import type { League, LeagueMember, WeeklyResult, WeekSummary } from '@/types/database'


export async function createLeague(
  name: string,
  adminId: string,
  payoutPerLossCents: number = 5000
): Promise<League> {
  const supabase = createClient()
  // Generate invite code via DB function
  const { data: codeData } = await supabase.rpc('generate_invite_code')
  const invite_code = codeData as string

  const { data: league, error } = await supabase
    .from('leagues')
    .insert({
      name,
      invite_code,
      admin_id: adminId,
      payout_per_loss_cents: payoutPerLossCents,
    })
    .select()
    .single()

  if (error) throw new Error(error.message)

  // Auto-join as admin
  await supabase.from('league_members').insert({
    league_id: league.id,
    user_id: adminId,
    role: 'admin',
  })

  return league as League
}

export async function joinLeagueWithCode(
  inviteCode: string,
  userId: string
): Promise<League> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('Request timed out — please try again')), 10000)
  )

  const work = (async () => {
    const supabase = createClient()
    const { data: league, error } = await supabase
      .from('leagues')
      .select('*')
      .eq('invite_code', inviteCode.toUpperCase())
      .maybeSingle()

    if (error) throw new Error(error.message)
    if (!league) throw new Error('Invalid invite code')

    if (league.is_locked) throw new Error('This league is not accepting new members')

    // Check if already a member — use maybeSingle so "no row" isn't an error
    const { data: existing } = await supabase
      .from('league_members')
      .select('id')
      .eq('league_id', league.id)
      .eq('user_id', userId)
      .maybeSingle()

    if (existing) throw new Error('You are already in this league')

    const { error: joinError } = await supabase
      .from('league_members')
      .insert({ league_id: league.id, user_id: userId, role: 'member' })

    if (joinError) throw new Error(joinError.message)

    return league as League
  })()

  return Promise.race([work, timeout])
}

export async function getMyLeagues(userId: string): Promise<League[]> {
  const supabase = createClient()
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
    const supabase = createClient()
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
  const supabase = createClient()
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
  const supabase = createClient()
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
  const supabase = createClient()
  const { data, error } = await supabase
    .from('leagues')
    .update(updates)
    .eq('id', leagueId)
    .select()
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!data) throw new Error('League not found')
  return data as League
}

export async function deleteLeague(leagueId: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('leagues')
    .delete()
    .eq('id', leagueId)

  if (error) throw new Error(error.message)
}