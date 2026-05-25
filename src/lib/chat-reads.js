// Lightweight localStorage-based chat read tracking.
// No DB migration needed — reads persist per device.

function readsKey(userId)   { return `chat-reads-${userId}` }
function unreadKey(userId)  { return `chat-unread-${userId}` }

/** Returns ISO string of when user last read this chat, or null if never. */
export function getLastRead(userId, hangoutId) {
  if (typeof window === 'undefined') return null
  try {
    const map = JSON.parse(localStorage.getItem(readsKey(userId)) ?? '{}')
    return map[hangoutId] ?? null
  } catch { return null }
}

/** Stamps the current time as the last-read time for this chat. */
export function markChatRead(userId, hangoutId) {
  if (typeof window === 'undefined') return
  try {
    const map = JSON.parse(localStorage.getItem(readsKey(userId)) ?? '{}')
    map[hangoutId] = new Date().toISOString()
    localStorage.setItem(readsKey(userId), JSON.stringify(map))
  } catch {}
}

/** Persist a pre-computed unread count so BottomNav can read it cheaply. */
export function saveUnreadCount(userId, count) {
  if (typeof window === 'undefined') return
  try { localStorage.setItem(unreadKey(userId), String(count)) } catch {}
}

/** Read the cached unread count (for BottomNav badge). */
export function loadUnreadCount(userId) {
  if (typeof window === 'undefined') return 0
  try { return parseInt(localStorage.getItem(unreadKey(userId)) ?? '0', 10) || 0 } catch { return 0 }
}
