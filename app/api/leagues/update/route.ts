import { NextResponse } from 'next/server'
import { createServiceClient, getAuthenticatedUser } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const user = await getAuthenticatedUser(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { leagueId, updates } = await request.json()
  if (!leagueId || !updates) return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })

  const supabase = createServiceClient()

  // Verify caller is the league admin before updating
  const { data: league, error: lookupError } = await supabase
    .from('leagues')
    .select('admin_id')
    .eq('id', leagueId)
    .single()

  if (lookupError || !league) return NextResponse.json({ error: 'League not found' }, { status: 404 })
  if (league.admin_id !== user.id) return NextResponse.json({ error: 'Only the league admin can edit settings' }, { status: 403 })

  const { error: updateError } = await supabase
    .from('leagues')
    .update(updates)
    .eq('id', leagueId)

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

  const { data: updated, error: fetchError } = await supabase
    .from('leagues')
    .select()
    .eq('id', leagueId)
    .single()

  if (fetchError || !updated) return NextResponse.json({ error: 'League not found after update' }, { status: 500 })

  return NextResponse.json({ league: updated })
}
