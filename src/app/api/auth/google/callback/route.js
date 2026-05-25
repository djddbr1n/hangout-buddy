import { createClient } from '@/lib/supabase-server'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')

  const host = request.headers.get('host')
  const protocol = host?.includes('localhost') ? 'http' : 'https'
  const baseUrl = `${protocol}://${host}`

  if (error || !code) {
    return Response.redirect(`${baseUrl}/profile?gcal=error`)
  }

  // Get authenticated user from session cookie
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return Response.redirect(`${baseUrl}/auth/login`)
  }

  // Exchange authorization code for tokens
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: `${baseUrl}/api/auth/google/callback`,
      grant_type: 'authorization_code',
    }),
  })

  const tokens = await tokenRes.json()

  if (!tokens.access_token) {
    console.error('GCal token exchange failed:', tokens)
    return Response.redirect(`${baseUrl}/profile?gcal=error`)
  }

  // Store tokens — upsert so reconnecting refreshes them
  await supabase.from('google_tokens').upsert(
    {
      user_id: user.id,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token ?? null,
      expires_at: new Date(Date.now() + (tokens.expires_in ?? 3600) * 1000).toISOString(),
    },
    { onConflict: 'user_id' }
  )

  return Response.redirect(`${baseUrl}/profile?gcal=connected`)
}
