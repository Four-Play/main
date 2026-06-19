import { NextResponse } from 'next/server'
import { createServiceClient, getAuthenticatedUser } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const user = await getAuthenticatedUser(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { leagueId, week, year, toSave, toDelete } = await request.json()
  if (!leagueId || !week || !year) return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })

  const supabase = createServiceClient()

  if (toSave?.length > 0) {
    const rows = toSave.map(({ gameId, team }: { gameId: string; team: string }) => ({
      user_id: user.id,
      league_id: leagueId,
      game_id: gameId,
      team_selected: team,
      nfl_week: week,
      season_year: year,
      is_locked: false,
    }))
    const { error } = await supabase
      .from('picks')
      .upsert(rows, { onConflict: 'user_id,league_id,game_id,team_selected' })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  for (const { gameId, team } of (toDelete ?? [])) {
    const { error } = await supabase
      .from('picks')
      .delete()
      .eq('user_id', user.id)
      .eq('league_id', leagueId)
      .eq('game_id', gameId)
      .eq('team_selected', team)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
