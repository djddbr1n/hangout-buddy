import { HangoutPost, TimeBlock, DayIndex, WeekAvailability } from '@/types'

export type BlockState = 'committed' | 'pending' | 'free' | 'busy' | 'unknown'

const BLOCK_HOURS: Record<TimeBlock, [number, number]> = {
  early_morning: [0, 10],
  brunch:        [10, 14],
  afternoon:     [14, 17],
  dinner:        [17, 20],
  late_night:    [20, 24],
}

function getBlock(hour: number): TimeBlock | null {
  for (const [key, [start, end]] of Object.entries(BLOCK_HOURS) as [TimeBlock, [number, number]][]) {
    if (hour >= start && hour < end) return key
  }
  return null
}

// JS getDay: 0=Sun,1=Mon... → convert to 0=Mon,6=Sun
function jsDayToIndex(jsDay: number): DayIndex {
  return ((jsDay + 6) % 7) as DayIndex
}

export function computeMyBlockStates(
  myUserId: string,
  hangouts: HangoutPost[],
  myAvailability: WeekAvailability,
): Record<DayIndex, Partial<Record<TimeBlock, BlockState>>> {
  const result: Record<number, Partial<Record<TimeBlock, BlockState>>> = {}

  // Seed from base availability
  for (let d = 0; d < 7; d++) {
    result[d] = {}
    const dayAvail = myAvailability[d as DayIndex]
    for (const block of Object.keys(BLOCK_HOURS) as TimeBlock[]) {
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

  return result as Record<DayIndex, Partial<Record<TimeBlock, BlockState>>>
}
