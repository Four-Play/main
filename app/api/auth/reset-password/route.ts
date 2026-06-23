import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const { email } = await request.json()
  if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 })

  const supabase = createServiceClient()

  // Use generateLink only to validate the email exists — it errors 404 for
  // unknown addresses. The actual email is sent client-side via
  // resetPasswordForEmail so it uses PKCE and the standard email template.
  const { error } = await supabase.auth.admin.generateLink({
    type: 'recovery',
    email,
    options: { redirectTo: 'https://www.fourplaypicks.com/auth/callback' },
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

  // Email exists — return success so the client sends via resetPasswordForEmail
  return NextResponse.json({ success: true })
}
