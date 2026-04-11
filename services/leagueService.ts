// src/services/leagueService.ts
// services/leagueService.ts
import { createClient } from '@/lib/supabase/client'
import type { League, LeagueMember, WeeklyResult, WeekSummary } from '@/types/database'
import { formatCents } from '@/types/database'

const supabase = createClient()

export async function createLeague(
  name: string,
  adminId: string,
  payoutPerLossCents: number = 5000
): Promise<League> {
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
  const { data: league, error } = await supabase
    .from('leagues')
    .select('*')
    .eq('invite_code', inviteCode.toUpperCase())
    .single()

  if (error || !league) throw new Error('Invalid invite code')

  if (league.is_locked) throw new Error('This league is not accepting new members')

  // Check if already a member
  const { data: existing } = await supabase
    .from('league_members')
    .select('id')
    .eq('league_id', league.id)
    .eq('user_id', userId)
    .single()

  if (existing) throw new Error('You are already in this league')

  const { error: joinError } = await supabase
    .from('league_members')
    .insert({ league_id: league.id, user_id: userId, role: 'member' })

  if (joinError) throw new Error(joinError.message)

  return league as League
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
  const { data, error } = await supabase
    .from('league_members')
    .select(`
      *,
      profile:profiles(id, username, avatar_url, total_points)
    `)
    .eq('league_id', leagueId)
    .order('league_points', { ascending: false })

  if (error) throw new Error(error.message)

  console.log(`Successfully fetched ${data?.length} members:`, data);

  return (data ?? []) as LeagueMember[]
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

export async function updateLeague(
  leagueId: string,
  updates: Partial<Pick<League, 'name' | 'payout_per_loss_cents' | 'spread_cushion' | 'is_locked'>>
): Promise<League> {
  const { data, error } = await supabase
    .from('leagues')
    .update(updates)
    .eq('id', leagueId)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data as League
}

export async function deleteLeague(leagueId: string): Promise<void> {
  const { error } = await supabase
    .from('leagues')
    .delete()
    .eq('id', leagueId)

  if (error) throw new Error(error.message)
}