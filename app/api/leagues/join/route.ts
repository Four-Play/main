import { NextResponse } from 'next/server'
import { createServiceClient, getAuthenticatedUser } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const user = await getAuthenticatedUser(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { inviteCode } = await request.json()
  if (!inviteCode) return NextResponse.json({ error: 'Invite code required' }, { status: 400 })

  const supabase = createServiceClient()

  const { data: league, error: lookupError } = await supabase
    .from('leagues')
    .select('*')
    .eq('invite_code', inviteCode.toUpperCase())
    .maybeSingle()

  if (lookupError) return NextResponse.json({ error: `League lookup failed: ${lookupError.message}` }, { status: 500 })
  if (!league) return NextResponse.json({ error: 'Invalid invite code — double-check the code and try again' }, { status: 404 })
  if (league.is_locked) return NextResponse.json({ error: 'This league is not accepting new members' }, { status: 403 })

  const { data: existing } = await supabase
    .from('league_members')
    .select('id')
    .eq('league_id', league.id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (existing) return NextResponse.json({ error: 'You are already in this league' }, { status: 409 })

  const { error: joinError } = await supabase
    .from('league_members')
    .insert({ league_id: league.id, user_id: user.id, role: 'member' })

  if (joinError) return NextResponse.json({ error: joinError.message }, { status: 500 })

  return NextResponse.json({ league })
}
