import { NextResponse } from 'next/server'
import { createServiceClient, getAuthenticatedUser } from '@/lib/supabase/server'

// POST /api/account/push-token — register a device token for the current user
export async function POST(request: Request) {
  const user = await getAuthenticatedUser(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const token: string = body?.token
  const platform: string = body?.platform ?? 'ios'

  if (!token || typeof token !== 'string') {
    return NextResponse.json({ error: 'Missing token' }, { status: 400 })
  }

  const supabase = createServiceClient()

  // Upsert on the unique token — if the same physical device re-registers
  // (token rotation), this safely updates rather than inserting a duplicate.
  const { error } = await supabase
    .from('device_tokens')
    .upsert({ user_id: user.id, token, platform }, { onConflict: 'token' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}

// DELETE /api/account/push-token — remove a token on sign-out
export async function DELETE(request: Request) {
  const user = await getAuthenticatedUser(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const token: string | undefined = body?.token

  const supabase = createServiceClient()

  // Delete a specific token if provided, else remove ALL tokens for this user (full sign-out)
  const query = supabase.from('device_tokens').delete().eq('user_id', user.id)
  const { error } = token ? await query.eq('token', token) : await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
