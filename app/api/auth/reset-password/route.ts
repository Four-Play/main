import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const { email } = await request.json()
  if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 })

  const supabase = createServiceClient()

  // generateLink errors when the email isn't registered, and sends the
  // recovery email when it is — one call handles both concerns.
  const { error } = await supabase.auth.admin.generateLink({
    type: 'recovery',
    email,
    options: { redirectTo: 'https://www.fourplaypicks.com/auth/callback' },
  })

  if (error) {
    return NextResponse.json(
      { error: 'This email is not currently registered with an account. Please create an account.' },
      { status: 404 }
    )
  }

  return NextResponse.json({ success: true })
}
