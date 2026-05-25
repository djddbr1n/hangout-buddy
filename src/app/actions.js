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

// Notify all hangout participants (host + going) except the sender about a new chat message
export async function notifyChatParticipants(hangoutId, senderId, senderName, content) {
  try {
    const service = createServiceClient()
    const { data: hangout } = await service
      .from('hangout_posts')
      .select('creator_id, title, rsvps(user_id, status)')
      .eq('id', hangoutId)
      .single()
    if (!hangout) return { success: false }

    const participants = new Set([hangout.creator_id])
    for (const r of hangout.rsvps ?? []) {
      if (r.status === 'going') participants.add(r.user_id)
    }
    participants.delete(senderId)

    const preview = content.length > 80 ? content.slice(0, 77) + '…' : content
    const url = `/friends?tab=chats&chat=${hangoutId}`

    await Promise.allSettled(
      [...participants].map(uid =>
        sendPushToUser(uid, hangout.title, `${senderName}: ${preview}`, url)
      )
    )
    return { success: true }
  } catch (err) {
    console.error('notifyChatParticipants error', err)
    return { success: false }
  }
}

// urgency: 'normal' (default) | 'high' (new hangout invites — breaks through Focus on iOS)
export async function sendPushToUser(userId, title, body, url = '/notifications', urgency = 'normal') {
  if (!process.env.VAPID_PRIVATE_KEY) return { success: false, reason: 'no VAPID key' }
  try {
    // Must use service client — regular client is RLS-bound and can't read other users' subscriptions
    const supabase = createServiceClient()
    const { data: subs } = await supabase
      .from('push_subscriptions')
      .select('endpoint, subscription')
      .eq('user_id', userId)

    if (!subs || subs.length === 0) return { success: true, sent: 0 }

    const payload = JSON.stringify({ title, body, url, icon: '/icon-192.png' })
    // urgency:'high' → TTL 1h (deliver now or not at all); maps to apns-priority:10 on iOS Safari
    const pushOpts = { urgency, TTL: urgency === 'high' ? 3600 : 86400 }

    await Promise.allSettled(
      subs.map(async ({ endpoint, subscription }) => {
        try {
          await webpush.sendNotification(subscription, payload, pushOpts)
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
