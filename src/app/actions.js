'use server'

import webpush from 'web-push'
import { createClient } from '@/lib/supabase-server'

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
