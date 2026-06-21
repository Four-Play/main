import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const REDIRECT_TO = 'https://www.fourplaypicks.com/auth/callback'

export async function POST(request: Request) {
  const { email } = await request.json()
  if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

  // Check existence via admin users search — does NOT create a recovery token
  // so there's no rate-limit collision with the resetPasswordForEmail call below.
  const searchRes = await fetch(
    `${supabaseUrl}/auth/v1/admin/users?search=${encodeURIComponent(email)}`,
    {
      headers: {
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
      },
    }
  )
  const searchData = await searchRes.json()
  const userExists = (searchData.users ?? []).some(
    (u: any) => u.email?.toLowerCase() === email.toLowerCase()
  )

  if (!userExists) {
    return NextResponse.json(
      { error: 'This email is not currently registered with an account. Please create an account.' },
      { status: 404 }
    )
  }

  // User confirmed — send the reset email once via the anon client.
  const anon = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
  const { error: sendError } = await anon.auth.resetPasswordForEmail(email, {
    redirectTo: REDIRECT_TO,
  })

  if (sendError) {
    console.error('Reset email error:', sendError.message)
    return NextResponse.json({ error: 'Failed to send reset email' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
