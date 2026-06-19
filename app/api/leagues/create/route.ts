import { NextResponse } from 'next/server'
import { createServiceClient, getAuthenticatedUser } from '@/lib/supabase/server'

function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

export async function POST(request: Request) {
  const user = await getAuthenticatedUser(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { name, payoutPerLossCents = 5000 } = await request.json()
  if (!name || name.trim().length < 3) return NextResponse.json({ error: 'League name must be at least 3 characters' }, { status: 400 })

  const supabase = createServiceClient()

  const { data: league, error } = await supabase
    .from('leagues')
    .insert({
      name: name.trim(),
      invite_code: generateInviteCode(),
      admin_id: user.id,
      payout_per_loss_cents: payoutPerLossCents,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { error: memberError } = await supabase
    .from('league_members')
    .insert({ league_id: league.id, user_id: user.id, role: 'admin' })

  if (memberError) return NextResponse.json({ error: memberError.message }, { status: 500 })

  return NextResponse.json({ league })
}
