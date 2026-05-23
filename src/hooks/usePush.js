'use client'

import { useState, useEffect } from 'react'
import { subscribeUser, unsubscribeUser } from '@/app/actions'

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i)
  return outputArray
}

export function usePush(userId) {
  const [supported, setSupported] = useState(false)
  const [subscription, setSubscription] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return
    setSupported(true)
    navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' }).then((reg) => {
      reg.pushManager.getSubscription().then(setSubscription)
    })
  }, [])

  async function subscribe() {
    if (!userId) return
    setLoading(true)
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY),
      })
      setSubscription(sub)
      await subscribeUser(JSON.parse(JSON.stringify(sub)), userId)
    } catch (err) {
      console.error('push subscribe error', err)
    } finally {
      setLoading(false)
    }
  }

  async function unsubscribe() {
    if (!subscription || !userId) return
    setLoading(true)
    try {
      await subscription.unsubscribe()
      await unsubscribeUser(subscription.endpoint, userId)
      setSubscription(null)
    } catch (err) {
      console.error('push unsubscribe error', err)
    } finally {
      setLoading(false)
    }
  }

  return { supported, subscription, loading, subscribe, unsubscribe }
}
