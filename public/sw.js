// ── Update lifecycle ────────────────────────────────────────────────────────
// Skip the waiting phase immediately so new SW takes over as soon as it installs
self.addEventListener('install', () => self.skipWaiting())

// Claim all open clients so this SW controls them without a manual reload
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

// ── Push notifications ───────────────────────────────────────────────────────
self.addEventListener('push', (event) => {
  if (!event.data) return
  let data = {}
  try { data = event.data.json() } catch { data = { title: 'hangout buddy', body: event.data.text() } }

  const { title = 'hangout buddy', body = '', url = '/', icon = '/icon-192.png' } = data

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon,
      badge: '/icon-192.png',
      data: { url },
      vibrate: [100, 50, 100],
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url ?? '/'
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url)
          return client.focus()
        }
      }
      return clients.openWindow(url)
    })
  )
})
