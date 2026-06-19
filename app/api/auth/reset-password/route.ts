import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: Request) {
  const { email } = await request.json()
  if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

  // Check if this email has an account
  const adminRes = await fetch(
    `${supabaseUrl}/auth/v1/admin/users?search=${encodeURIComponent(email)}&limit=10`,
    { headers: { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}` } }
  )
  const adminData = await adminRes.json()
  const userExists = (adminData.users ?? []).some(
    (u: any) => u.email?.toLowerCase() === email.toLowerCase()
  )

  if (!userExists) {
    return NextResponse.json(
      { error: 'This email is not currently registered with an account. Please create an account.' },
      { status: 404 }
    )
  }

  // Send the reset email pointing to our callback route
  const anonClient = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
  const { error } = await anonClient.auth.resetPasswordForEmail(email, {
    redirectTo: 'https://www.fourplaypicks.com/auth/callback',
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
