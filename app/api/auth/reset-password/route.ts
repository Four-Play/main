import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

const REDIRECT_TO = 'https://www.fourplaypicks.com/auth/callback'

export async function POST(request: Request) {
  const { email } = await request.json()
  if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 })

  const supabase = createServiceClient()

  // admin.generateLink validates the email (errors for unknown addresses)
  // and sends the recovery email. options.redirectTo is where the user
  // lands after clicking the link — must be in Supabase's allowed redirect URLs.
  const { error } = await supabase.auth.admin.generateLink({
    type: 'recovery',
    email,
    options: { redirectTo: REDIRECT_TO },
  })

  if (error) {
    const isNotFound = error.status === 404 ||
      error.message.toLowerCase().includes('not found')
    return NextResponse.json(
      {
        error: isNotFound
          ? 'This email is not currently registered with an account. Please create an account.'
          : 'Failed to send reset email',
      },
      { status: isNotFound ? 404 : 500 }
    )
  }

  return NextResponse.json({ success: true })
}
