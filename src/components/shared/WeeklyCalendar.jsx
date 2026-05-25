'use client'

import { format, startOfWeek, addDays } from 'date-fns'

const START_HOUR = 7   // 7am
const END_HOUR = 22    // 10pm
const TOTAL_MS = (END_HOUR - START_HOUR) * 60 * 60 * 1000

function getWeekDays() {
  const monday = startOfWeek(new Date(), { weekStartsOn: 1 })
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i))
}

function busyBlocksForDay(date, busySlots) {
  const dayStart = new Date(date); dayStart.setHours(START_HOUR, 0, 0, 0)
  const dayEnd   = new Date(date); dayEnd.setHours(END_HOUR, 0, 0, 0)

  return busySlots
    .map(s => ({ start: new Date(s.start), end: new Date(s.end) }))
    .filter(({ start, end }) => start < dayEnd && end > dayStart)
    .map(({ start, end }) => {
      const cs = Math.max(start.getTime(), dayStart.getTime())
      const ce = Math.min(end.getTime(), dayEnd.getTime())
      return {
        left:  ((cs - dayStart.getTime()) / TOTAL_MS) * 100,
        width: ((ce - cs) / TOTAL_MS) * 100,
      }
    })
}

function NowLine({ date }) {
  const now = new Date()
  if (now.toDateString() !== date.toDateString()) return null
  const dayStart = new Date(date); dayStart.setHours(START_HOUR, 0, 0, 0)
  const dayEnd   = new Date(date); dayEnd.setHours(END_HOUR, 0, 0, 0)
  if (now < dayStart || now > dayEnd) return null
  const left = ((now.getTime() - dayStart.getTime()) / TOTAL_MS) * 100
  return (
    <div
      className="absolute top-0 bottom-0 w-0.5 bg-violet-500 z-10"
      style={{ left: `${left}%` }}
    />
  )
}

export function WeeklyCalendar({ busy, loading, notConnected }) {
  const weekDays = getWeekDays()
  const todayStr = new Date().toDateString()

  if (loading) {
    return (
      <div className="space-y-2 py-1">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="w-[58px] shrink-0 space-y-1">
              <div className="h-2.5 bg-gray-100 rounded-full animate-pulse w-7" />
              <div className="h-2 bg-gray-100 rounded-full animate-pulse w-11" />
            </div>
            <div className="flex-1 h-7 bg-gray-100 rounded-lg animate-pulse" />
          </div>
        ))}
      </div>
    )
  }

  if (notConnected) {
    return (
      <div className="flex flex-col items-center py-8 gap-2 bg-gray-50 rounded-2xl">
        <p className="text-xl">📅</p>
        <p className="text-sm font-medium text-gray-600">calendar not connected</p>
        <p className="text-xs text-gray-400">they haven't linked Google Calendar yet</p>
      </div>
    )
  }

  return (
    <div>
      {/* time axis */}
      <div className="flex items-center mb-1.5" style={{ paddingLeft: 70 }}>
        <div className="flex-1 flex justify-between">
          <span className="text-[9px] text-gray-300">7am</span>
          <span className="text-[9px] text-gray-300">10pm</span>
        </div>
      </div>

      {/* day rows */}
      <div className="space-y-1.5">
        {weekDays.map(day => {
          const isToday = day.toDateString() === todayStr
          const isPast  = day < new Date() && !isToday
          const blocks  = busyBlocksForDay(day, busy ?? [])

          return (
            <div key={day.toISOString()} className={`flex items-center gap-3 ${isPast ? 'opacity-40' : ''}`}>
              {/* label */}
              <div className="w-[58px] shrink-0 text-right">
                <p className={`text-[11px] font-bold leading-none ${isToday ? 'text-violet-600' : 'text-gray-500'}`}>
                  {format(day, 'EEE')}
                </p>
                <p className={`text-[10px] leading-none mt-0.5 ${isToday ? 'text-violet-400' : 'text-gray-400'}`}>
                  {format(day, 'MMM d')}
                </p>
              </div>

              {/* bar */}
              <div className="flex-1 relative h-7 rounded-lg overflow-hidden">
                {/* free background */}
                <div className="absolute inset-0 bg-emerald-50" />

                {/* busy blocks */}
                {blocks.map((b, i) => (
                  <div
                    key={i}
                    className="absolute top-0 bottom-0 bg-gray-200"
                    style={{ left: `${b.left}%`, width: `${b.width}%` }}
                  />
                ))}

                <NowLine date={day} />

                {/* today highlight ring */}
                {isToday && (
                  <div className="absolute inset-0 rounded-lg ring-2 ring-violet-300 ring-inset pointer-events-none" />
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* legend */}
      <div className="flex items-center gap-4 pt-3" style={{ paddingLeft: 70 }}>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-emerald-50 ring-1 ring-emerald-200" />
          <span className="text-[10px] text-gray-400">free</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-gray-200" />
          <span className="text-[10px] text-gray-400">busy</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-0.5 h-3 rounded-full bg-violet-500" />
          <span className="text-[10px] text-gray-400">now</span>
        </div>
      </div>
    </div>
  )
}
