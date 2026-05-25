/**
 * Push notification template picker.
 * Returns { title, body } for a new hangout post.
 *
 * Psychological hooks used:
 *   casual/texty  — feels like a friend, not an app
 *   FOMO          — spots, time pressure
 *   hype          — playful, punchy
 *   urgency       — time-relative language (tonight / in 2h / this Sat)
 */

function timeRelative(dateStr) {
  const now = new Date()
  const dt  = new Date(dateStr)
  const diffMs = dt - now
  const diffH  = diffMs / (1000 * 60 * 60)
  const diffD  = diffMs / (1000 * 60 * 60 * 24)

  const roundedH = Math.round(diffH)
  if (diffH < 1)       return 'right now'
  if (diffH < 6)       return `in ${roundedH} hour${roundedH === 1 ? '' : 's'}`

  const todayStr     = now.toDateString()
  const tomorrowStr  = new Date(now.getTime() + 86_400_000).toDateString()

  if (dt.toDateString() === todayStr) {
    const h = dt.getHours()
    if (h < 12)  return 'this morning'
    if (h < 17)  return 'this afternoon'
    return 'tonight'
  }
  if (dt.toDateString() === tomorrowStr) {
    const h = dt.getHours()
    if (h < 12)  return 'tomorrow morning'
    if (h < 17)  return 'tomorrow afternoon'
    return 'tomorrow night'
  }
  if (diffD < 7) {
    const day = dt.toLocaleDateString('en-US', { weekday: 'long' })
    return `this ${day}`
  }

  return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

export function pickNotifTemplate({ posterName, title, date_time, max_people }) {
  const when   = timeRelative(date_time)
  const spots  = Math.max(0, (max_people ?? 2) - 1)
  const spotStr = spots === 1 ? '1 spot left' : `${spots} spots open`

  // Templates grouped by hook — one group is randomly chosen, then one template within it
  const groups = [

    // ── casual / texty ────────────────────────────────────────────────────
    [
      { title: `${posterName}: you free ${when}?`,          body: `"${title}"` },
      { title: `${posterName} wants to hang`,               body: `"${title}" · ${when}` },
      { title: `psst — ${posterName} is planning something`,body: `"${title}" · ${when}` },
      { title: `${posterName} just dropped a plan`,         body: `"${title}" · ${when}` },
    ],

    // ── FOMO / scarcity ───────────────────────────────────────────────────
    [
      { title: `don't sleep on this 👀`,    body: `${posterName}'s "${title}" · ${when} · ${spotStr}` },
      { title: `${spotStr} for "${title}"`, body: `${posterName} is hosting · ${when}` },
      { title: `your friends are making plans`, body: `"${title}" with ${posterName} · ${when}` },
      { title: `filling up fast`,           body: `${posterName}'s "${title}" · ${when} · ${spotStr}` },
    ],

    // ── hype / playful ────────────────────────────────────────────────────
    [
      { title: `"${title}"??`,              body: `${posterName} is down · ${when}` },
      { title: `this could be you`,         body: `"${title}" with ${posterName} · ${when}` },
      { title: `${posterName} said yes to fun`, body: `"${title}" · ${when}` },
      { title: `ok but "${title}" tho`,     body: `${posterName} · ${when} · ${spotStr}` },
    ],

    // ── urgency / time-first ──────────────────────────────────────────────
    [
      { title: `happening ${when} 🔔`,      body: `${posterName}'s "${title}"` },
      { title: `${when} · ${posterName} is on`,  body: `"${title}" · ${spotStr}` },
      { title: `a plan just dropped`,              body: `"${title}" · ${posterName} · ${when}` },
      { title: `plans are forming`,         body: `"${title}" ${when} · ${posterName}` },
    ],

  ]

  const group = pick(groups)
  return pick(group)
}
