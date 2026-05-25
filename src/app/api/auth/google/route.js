import { createClient } from '@/lib/supabase-server'

const SCOPE = 'https://www.googleapis.com/auth/calendar.freebusy'

export async function GET(request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return Response.redirect(new URL('/auth/login', request.url))
  }

  const host = request.headers.get('host')
  const protocol = host?.includes('localhost') ? 'http' : 'https'
  const redirectUri = `${protocol}://${host}/api/auth/google/callback`

  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  url.searchParams.set('client_id', process.env.GOOGLE_CLIENT_ID)
  url.searchParams.set('redirect_uri', redirectUri)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('scope', SCOPE)
  url.searchParams.set('access_type', 'offline')
  url.searchParams.set('prompt', 'consent') // always get refresh_token

  return Response.redirect(url.toString())
}
