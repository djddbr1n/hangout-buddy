'use server'

import webpush from 'web-push'
import { createClient } from '@/lib/supabase-server'
import { createServiceClient } from '@/lib/supabase-service'

webpush.setVapidDetails(
  'mailto:hello@hangoutbuddy.app',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? '',
  process.env.VAPID_PRIVATE_KEY ?? ''
)

export async function subscribeUser(subscription, userId) {
  try {
    const supabase = await createClient()
    await supabase.from('push_subscriptions').upsert(
      { user_id: userId, endpoint: subscription.endpoint, subscription },
      { onConflict: 'user_id,endpoint' }
    )
    return { success: true }
  } catch (err) {
    console.error('subscribeUser error', err)
    return { success: false }
  }
}

export async function unsubscribeUser(endpoint, userId) {
  try {
    const supabase = await createClient()
    await supabase.from('push_subscriptions').delete()
      .eq('user_id', userId).eq('endpoint', endpoint)
    return { success: true }
  } catch (err) {
    console.error('unsubscribeUser error', err)
    return { success: false }
  }
}

export async function disconnectGoogle() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false }
  await supabase.from('google_tokens').delete().eq('user_id', user.id)
  return { success: true }
}

// Fetch a friend's Google Calendar free/busy for the current week.
// Uses the service role to read their stored tokens (bypasses RLS safely
// since this runs server-side and we verify the caller is authenticated).
export async function getFriendFreeBusy(friendId) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return { connected: false }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { connected: false }

  const service = createServiceClient()
  const { data: tokenRow } = await service
    .from('google_tokens')
    .select('*')
    .eq('user_id', friendId)
    .single()

  if (!tokenRow) return { connected: false }

  let accessToken = tokenRow.access_token

  // Refresh if expired or expiring within 5 min
  if (new Date(tokenRow.expires_at) < new Date(Date.now() + 5 * 60 * 1000)) {
    if (!tokenRow.refresh_token) return { connected: false }
    const refreshRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        refresh_token: tokenRow.refresh_token,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        grant_type: 'refresh_token',
      }),
    })
    const refreshed = await refreshRes.json()
    if (!refreshed.access_token) return { connected: false }
    accessToken = refreshed.access_token
    await service.from('google_tokens').update({
      access_token: refreshed.access_token,
      expires_at: new Date(Date.now() + (refreshed.expires_in ?? 3600) * 1000).toISOString(),
    }).eq('user_id', friendId)
  }

  // Current week Mon 00:00 → Sun 23:59
  const now = new Date()
  const monday = new Date(now)
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7))
  monday.setHours(0, 0, 0, 0)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 7)
  sunday.setHours(23, 59, 59, 999)

  const fbRes = await fetch('https://www.googleapis.com/calendar/v3/freeBusy', {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      timeMin: monday.toISOString(),
      timeMax: sunday.toISOString(),
      items: [{ id: 'primary' }],
    }),
  })

  if (!fbRes.ok) return { connected: true, busy: [] }

  const data = await fbRes.json()
  return { connected: true, busy: data.calendars?.primary?.busy ?? [] }
}

export async function sendPushToUser(userId, title, body, url = '/notifications') {
  if (!process.env.VAPID_PRIVATE_KEY) return { success: false, reason: 'no VAPID key' }
  try {
    const supabase = await createClient()
    const { data: subs } = await supabase
      .from('push_subscriptions')
      .select('endpoint, subscription')
      .eq('user_id', userId)

    if (!subs || subs.length === 0) return { success: true, sent: 0 }

    const payload = JSON.stringify({ title, body, url, icon: '/icon-192.png' })

    await Promise.allSettled(
      subs.map(async ({ endpoint, subscription }) => {
        try {
          await webpush.sendNotification(subscription, payload)
        } catch (err) {
          if (err.statusCode === 410 || err.statusCode === 404) {
            await supabase.from('push_subscriptions').delete()
              .eq('user_id', userId).eq('endpoint', endpoint)
          }
        }
      })
    )
    return { success: true, sent: subs.length }
  } catch (err) {
    console.error('sendPushToUser error', err)
    return { success: false }
  }
}
