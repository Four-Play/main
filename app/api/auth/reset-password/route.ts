import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const { email } = await request.json()
  if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 })

  // Search for the user by email via the GoTrue admin REST API.
  // This validates existence without generating a link or sending any email
  // (admin.generateLink was also sending an implicit-flow email we don't want).
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/admin/users?query=${encodeURIComponent(email)}`,
    {
      headers: {
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
      },
    }
  )
  const data = await res.json()
  const exists = (data.users ?? []).some(
    (u: any) => u.email?.toLowerCase() === email.toLowerCase()
  )

  if (!exists) {
    return NextResponse.json(
      { error: 'This email is not currently registered with an account. Please create an account.' },
      { status: 404 }
    )
  }

  return NextResponse.json({ success: true })
}
