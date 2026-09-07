import { NextResponse } from 'next/server'
import { createServiceClient, getAuthenticatedUser } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const user = await getAuthenticatedUser(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('league_members')
    .select('league_id, leagues(id, name, invite_code, sport, payout_per_loss_cents, spread_cushion, is_locked, admin_id)')
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const leagues = (data?.map((row: any) => row.leagues).filter(Boolean) ?? [])
  return NextResponse.json({ leagues })
}
