// app/api/picks/lock/route.ts
// Lock picks server-side via RPC so the validation is atomic and trusted

import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient()

  // Verify auth
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { leagueId, week, year } = body

  if (!leagueId || !week || !year) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  // Verify user is in this league
  const { data: membership } = await supabase
    .from('league_members')
    .select('id')
    .eq('user_id', user.id)
    .eq('league_id', leagueId)
    .single()

  if (!membership) {
    return NextResponse.json({ error: 'You are not a member of this league' }, { status: 403 })
  }

  // Call the atomic lock RPC
  const { error: lockError } = await supabase.rpc('lock_picks_for_week', {
    p_user_id: user.id,
    p_league_id: leagueId,
    p_week: week,
    p_year: year,
  })

  if (lockError) {
    return NextResponse.json({ error: lockError.message }, { status: 400 })
  }

  // Return the locked picks
  const { data: picks } = await supabase
    .from('picks')
    .select('*, game:games(*)')
    .eq('user_id', user.id)
    .eq('league_id', leagueId)
    .eq('nfl_week', week)
    .eq('season_year', year)

  return NextResponse.json({ picks })
}