import { NextResponse } from 'next/server'
import { createServiceClient, getAuthenticatedUser } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const user = await getAuthenticatedUser(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { leagueId } = await request.json()
  if (!leagueId) return NextResponse.json({ error: 'Missing leagueId' }, { status: 400 })

  const supabase = createServiceClient()

  const { data: league, error: lookupError } = await supabase
    .from('leagues')
    .select('admin_id')
    .eq('id', leagueId)
    .single()

  if (lookupError || !league) return NextResponse.json({ error: 'League not found' }, { status: 404 })
  if (league.admin_id !== user.id) return NextResponse.json({ error: 'Only the league admin can delete this league' }, { status: 403 })

  const { error } = await supabase.from('leagues').delete().eq('id', leagueId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
