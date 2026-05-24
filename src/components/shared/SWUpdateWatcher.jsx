'use client'

import { useEffect } from 'react'

export function SWUpdateWatcher() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    // When a new SW takes control (after skipWaiting + claim), reload once.
    // Guard against the initial registration firing this on first load.
    let firstController = navigator.serviceWorker.controller
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      // If there was already a controller, this is a real update — reload.
      if (firstController) {
        window.location.reload()
      }
      firstController = navigator.serviceWorker.controller
    })

    // Trigger an update check whenever the user switches back to the app.
    // This means: open app → goes to background → Vercel deploys → user
    // comes back → update check fires → new SW installs → reload.
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        navigator.serviceWorker.ready.then(reg => reg.update()).catch(() => {})
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)

    // Also poll every 5 minutes as a fallback for long sessions
    const interval = setInterval(() => {
      navigator.serviceWorker.ready.then(reg => reg.update()).catch(() => {})
    }, 5 * 60 * 1000)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility)
      clearInterval(interval)
    }
  }, [])

  return null
}
