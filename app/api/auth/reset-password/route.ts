import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServiceClient } from '@/lib/supabase/server'

const REDIRECT_TO = 'https://www.fourplaypicks.com/auth/callback'

export async function POST(request: Request) {
  const { email } = await request.json()
  if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 })

  // admin.generateLink errors for unknown emails — use it purely as an existence check.
  // It does NOT send an email itself.
  const service = createServiceClient()
  const { error: checkError } = await service.auth.admin.generateLink({
    type: 'recovery',
    email,
  })

  if (checkError) {
    return NextResponse.json(
      { error: 'This email is not currently registered with an account. Please create an account.' },
      { status: 404 }
    )
  }

  // Email exists — use the anon client to trigger the reset email.
  // resetPasswordForEmail sends through Supabase's email service.
  const anon = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const { error: sendError } = await anon.auth.resetPasswordForEmail(email, {
    redirectTo: REDIRECT_TO,
  })

  if (sendError) {
    console.error('Reset email error:', sendError.message)
    return NextResponse.json({ error: 'Failed to send reset email' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
