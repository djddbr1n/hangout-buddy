const BLOCK_HOURS = {
  early_morning: [0, 10],
  brunch:        [10, 14],
  afternoon:     [14, 17],
  dinner:        [17, 20],
  late_night:    [20, 24],
}

function getBlock(hour) {
  for (const [key, [start, end]] of Object.entries(BLOCK_HOURS)) {
    if (hour >= start && hour < end) return key
  }
  return null
}

// JS getDay: 0=Sun,1=Mon... → convert to 0=Mon,6=Sun
function jsDayToIndex(jsDay) {
  return ((jsDay + 6) % 7)
}

export function computeMyBlockStates(myUserId, hangouts, myAvailability) {
  const result = {}

  // Seed from base availability
  for (let d = 0; d < 7; d++) {
    result[d] = {}
    const dayAvail = myAvailability[d]
    for (const block of Object.keys(BLOCK_HOURS)) {
      const avail = dayAvail?.[block]
      result[d][block] = avail === true ? 'free' : avail === false ? 'busy' : 'unknown'
    }
  }

  // Overlay hangout states
  for (const h of hangouts) {
    const dt = new Date(h.date_time)
    const dayIdx = jsDayToIndex(dt.getDay())
    const block = getBlock(dt.getHours())
    if (block === null) continue

    const myRSVP = h.rsvps?.find(r => r.user_id === myUserId)
    const isMine = h.creator_id === myUserId

    if (isMine || myRSVP?.status === 'going') {
      result[dayIdx][block] = 'committed'
    } else if (!myRSVP && h.status === 'open') {
      // pending invitation — only upgrade free/unknown, don't override committed
      const current = result[dayIdx][block]
      if (current !== 'committed') result[dayIdx][block] = 'pending'
    }
  }

  return result
}
