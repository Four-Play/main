// services/picksService.ts
import { createClient } from '@/lib/supabase/client'
import type { Pick, Game } from '@/types/database'

const supabase = createClient()

export async function getMyPicks(
  userId: string,
  leagueId: string,
  week: number,
  year: number
): Promise<Pick[]> {
  const { data, error } = await supabase
    .from('picks')
    .select(`
      *,
      game:games(*)
    `)
    .eq('user_id', userId)
    .eq('league_id', leagueId)
    .eq('nfl_week', week)
    .eq('season_year', year)

  if (error) throw new Error(error.message)
  return (data ?? []) as Pick[]
}

export async function savePick(
  userId: string,
  leagueId: string,
  gameId: string,
  teamSelected: string,
  week: number,
  year: number
): Promise<Pick> {
  const { data, error } = await supabase
    .from('picks')
    .upsert({
      user_id: userId,
      league_id: leagueId,
      game_id: gameId,
      team_selected: teamSelected,
      nfl_week: week,
      season_year: year,
      is_locked: false,
    }, { onConflict: 'user_id,league_id,game_id' })
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data as Pick
}

export async function deletePick(
  userId: string,
  leagueId: string,
  gameId: string
): Promise<void> {
  const { error } = await supabase
    .from('picks')
    .delete()
    .eq('user_id', userId)
    .eq('league_id', leagueId)
    .eq('game_id', gameId)
    .eq('is_locked', false)

  if (error) throw new Error(error.message)
}

export async function lockInPicks(
  _userId: string,
  leagueId: string,
  week: number,
  year: number
): Promise<Pick[]> {
  // Delegate to server-side API route which uses an atomic RPC with auth check
  const res = await fetch('/api/picks/lock', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ leagueId, week, year }),
  })

  const data = await res.json()

  if (!res.ok) {
    throw new Error(data.error ?? 'Failed to lock picks')
  }

  return (data.picks ?? []) as Pick[]
}

// Get picks for all members in a league for a week (used in league tab)
// Hides current week picks for other users until locked
export async function getLeaguePicks(
  leagueId: string,
  week: number,
  year: number,
  currentUserId: string
): Promise<Pick[]> {
  const { data, error } = await supabase
    .from('picks')
    .select(`
      *,
      game:games(*)
    `)
    .eq('league_id', leagueId)
    .eq('nfl_week', week)
    .eq('season_year', year)

  if (error) throw new Error(error.message)

  // Hide other players' picks for current week unless the game has started
  const now = new Date()
  return ((data ?? []) as Pick[]).filter(pick => {
    if (pick.user_id === currentUserId) return true
    const game = pick.game as Game | undefined
    if (!game) return false
    // Show pick if game has started
    return game.commence_time ? new Date(game.commence_time) < now : false
  })
}