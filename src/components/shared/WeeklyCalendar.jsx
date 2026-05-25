'use client'

import { format, startOfWeek, addDays } from 'date-fns'

const START_HOUR  = 7    // 7 am
const END_HOUR    = 24   // 12 am (midnight)
const HOUR_H      = 20   // px per hour
const TOTAL_H     = (END_HOUR - START_HOUR) * HOUR_H   // 340px
const TIME_TICKS  = [7, 10, 13, 16, 19, 22, 24]        // labels every 3 h

function getWeekDays() {
  const monday = startOfWeek(new Date(), { weekStartsOn: 1 })
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i))
}

function formatHour(h) {
  if (h === 0 || h === 24) return '12am'
  if (h === 12) return '12pm'
  return h < 12 ? `${h}am` : `${h - 12}pm`
}

function busyBlocksForDay(date, busySlots) {
  const dayStart = new Date(date); dayStart.setHours(START_HOUR, 0, 0, 0)
  const dayEnd   = new Date(date); dayEnd.setHours(END_HOUR,   0, 0, 0)
  return (busySlots ?? [])
    .map(s => ({ s: new Date(s.start), e: new Date(s.end) }))
    .filter(({ s, e }) => s < dayEnd && e > dayStart)
    .map(({ s, e }) => {
      const cs = Math.max(s.getTime(), dayStart.getTime())
      const ce = Math.min(e.getTime(), dayEnd.getTime())
      return {
        top:    ((cs - dayStart.getTime()) / 3_600_000) * HOUR_H,
        height: Math.max(((ce - cs) / 3_600_000) * HOUR_H, 4),
      }
    })
}

function nowTop() {
  const now = new Date()
  const ref = new Date(); ref.setHours(START_HOUR, 0, 0, 0)
  const end = new Date(); end.setHours(END_HOUR,   0, 0, 0)
  if (now < ref || now > end) return null
  return ((now - ref) / 3_600_000) * HOUR_H
}

// ── Loading skeleton ──────────────────────────────────────────────────────────
function Skeleton() {
  return (
    <div className="space-y-2 py-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className="w-7 h-2.5 bg-gray-100 rounded-full animate-pulse shrink-0" />
          <div className="flex-1 h-6 bg-gray-100 rounded animate-pulse" />
        </div>
      ))}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export function WeeklyCalendar({ busy, loading, notConnected }) {
  const weekDays = getWeekDays()
  const todayStr = new Date().toDateString()
  const yNow     = nowTop()
  const TIME_COL = 28 // px

  if (loading)      return <Skeleton />
  if (notConnected) return (
    <div className="flex flex-col items-center py-8 gap-2 bg-gray-50 rounded-2xl">
      <p className="text-xl">📅</p>
      <p className="text-sm font-medium text-gray-600">calendar not connected</p>
      <p className="text-xs text-gray-400">they haven't linked Google Calendar yet</p>
    </div>
  )

  return (
    <div className="select-none overflow-hidden">

      {/* ── Day header row ── */}
      <div className="flex mb-1" style={{ paddingLeft: TIME_COL }}>
        {weekDays.map(day => {
          const isToday = day.toDateString() === todayStr
          return (
            <div key={day.toISOString()} className="flex-1 text-center">
              <p className={`text-[10px] font-bold uppercase tracking-wide leading-none ${isToday ? 'text-violet-500' : 'text-gray-400'}`}>
                {format(day, 'EEE')}
              </p>
              <p className={`text-[11px] font-semibold leading-tight mt-0.5 ${isToday ? 'text-violet-600' : 'text-gray-500'}`}>
                {format(day, 'M/d')}
              </p>
            </div>
          )
        })}
      </div>

      {/* ── Grid body ── */}
      <div className="flex relative" style={{ height: TOTAL_H }}>

        {/* Time labels */}
        <div className="relative shrink-0" style={{ width: TIME_COL }}>
          {TIME_TICKS.map(h => (
            <span
              key={h}
              className="absolute right-1 text-[9px] text-gray-300 leading-none"
              style={{ top: (h - START_HOUR) * HOUR_H - 4 }}
            >
              {formatHour(h)}
            </span>
          ))}
        </div>

        {/* Day columns */}
        {weekDays.map((day, di) => {
          const isToday = day.toDateString() === todayStr
          const isPast  = day < new Date() && !isToday
          const blocks  = busyBlocksForDay(day, busy)

          return (
            <div
              key={day.toISOString()}
              className={`flex-1 relative border-l border-gray-100 ${isToday ? 'bg-violet-50/50' : 'bg-white'} ${isPast ? 'opacity-50' : ''}`}
            >
              {/* Hour tick lines */}
              {TIME_TICKS.map(h => (
                <div
                  key={h}
                  className="absolute inset-x-0 border-t border-gray-100"
                  style={{ top: (h - START_HOUR) * HOUR_H }}
                />
              ))}

              {/* Busy blocks — visible colored fill */}
              {blocks.map((b, i) => (
                <div
                  key={i}
                  className="absolute inset-x-px rounded-sm bg-slate-400/70"
                  style={{ top: b.top, height: b.height }}
                />
              ))}

              {/* Now line (today only) */}
              {isToday && yNow !== null && (
                <div
                  className="absolute inset-x-0 z-10 flex items-center"
                  style={{ top: yNow - 1 }}
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-red-500 -ml-0.5 shrink-0" />
                  <div className="flex-1 h-px bg-red-400" />
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* ── Legend ── */}
      <div className="flex items-center gap-4 pt-2" style={{ paddingLeft: TIME_COL + 4 }}>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-white border border-gray-200" />
          <span className="text-[10px] text-gray-400">free</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-slate-400/70" />
          <span className="text-[10px] text-gray-400">busy</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-px bg-red-400" />
          <span className="text-[10px] text-gray-400">now</span>
        </div>
      </div>
    </div>
  )
}
