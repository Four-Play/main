import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

const REDIRECT_TO = 'https://www.fourplaypicks.com/auth/callback'

export async function POST(request: Request) {
  const { email } = await request.json()
  if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 })

  const supabase = createServiceClient()

  // generateLink validates the email exists (errors for unknown addresses)
  // but does NOT send an email — it only returns the link for custom providers.
  const { error } = await supabase.auth.admin.generateLink({
    type: 'recovery',
    email,
  })

  if (error) {
    return NextResponse.json(
      { error: 'This email is not currently registered with an account. Please create an account.' },
      { status: 404 }
    )
  }

  // Email exists — trigger the actual password reset email via GoTrue's
  // /recover endpoint, which sends through Supabase's email service.
  await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/recover?redirect_to=${encodeURIComponent(REDIRECT_TO)}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}`,
      },
      body: JSON.stringify({ email }),
    }
  )

  return NextResponse.json({ success: true })
}
