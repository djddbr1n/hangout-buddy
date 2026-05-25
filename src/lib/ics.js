/**
 * Generate and download an .ics calendar file for a hangout.
 * Works client-side — no API needed.
 */

function toICSDate(date) {
  // Format: YYYYMMDDTHHMMSSZ (always UTC)
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
}

function escapeICS(str) {
  if (!str) return ''
  return str
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n')
}

export function downloadICS(hangout) {
  const start = new Date(hangout.date_time)
  const end = new Date(start.getTime() + (hangout.duration_minutes ?? 120) * 60_000)
  const now = new Date()

  // Build notes field: attendees list + original description
  // Host is always attending — include them first
  const hostName = hangout.creator?.name ?? hangout.creator?.nickname
  const goingNames = [
    ...(hostName ? [hostName] : []),
    ...(hangout.rsvps ?? [])
      .filter(r => r.status === 'going' && r.user_id !== hangout.creator_id)
      .map(r => r.user?.name ?? r.user?.nickname ?? 'someone'),
  ]
  const attendeeLine = goingNames.length > 0
    ? `Going (not up to date): ${goingNames.join(', ')}`
    : null
  const descLine = hangout.description ? `Notes: ${hangout.description}` : null
  const parts = [attendeeLine, descLine].filter(Boolean)
  // Use actual newline characters — escapeICS will convert them to \n for ICS format
  const notes = parts.length > 0 ? parts.join('\n\n') : null

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Hangout Buddy//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${hangout.id}@hangoutbuddy.app`,
    `DTSTAMP:${toICSDate(now)}`,
    `DTSTART:${toICSDate(start)}`,
    `DTEND:${toICSDate(end)}`,
    `SUMMARY:${escapeICS(hangout.title)}`,
    notes ? `DESCRIPTION:${escapeICS(notes)}` : null,
    hangout.location ? `LOCATION:${escapeICS(hangout.location)}` : null,
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean).join('\r\n')

  const blob = new Blob([lines], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${hangout.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.ics`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
