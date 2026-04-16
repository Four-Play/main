// services/picksService.ts
import { createClient } from '@/lib/supabase/client'
import type { Pick, Game } from '@/types/database'

export async function getMyPicks(
  userId: string,
  leagueId: string,
  week: number,
  year: number
): Promise<Pick[]> {
  const supabase = createClient()
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
  const supabase = createClient()
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
    }, { onConflict: 'user_id,league_id,game_id,team_selected' })
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data as Pick
}

export async function deletePick(
  userId: string,
  leagueId: string,
  gameId: string,
  teamSelected: string
): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('picks')
    .delete()
    .eq('user_id', userId)
    .eq('league_id', leagueId)
    .eq('game_id', gameId)
    .eq('team_selected', teamSelected)

  if (error) throw new Error(error.message)
}

// Get picks for all members in a league for a week (used in league tab)
// Hides current week picks for other users until locked
export async function getLeaguePicks(
  leagueId: string,
  week: number,
  year: number,
  currentUserId: string
): Promise<Pick[]> {
  const supabase = createClient()
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
