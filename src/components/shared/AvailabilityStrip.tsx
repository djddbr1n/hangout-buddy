'use client'

import { DayIndex, TimeBlock } from '@/types'
import { BlockState } from '@/lib/availability-utils'

const DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
const BLOCKS: TimeBlock[] = ['early_morning', 'brunch', 'afternoon', 'dinner', 'late_night']
const BLOCK_LABELS: Record<TimeBlock, string> = {
  early_morning: '🌅',
  brunch:        '☕',
  afternoon:     '🌤',
  dinner:        '🌆',
  late_night:    '🌙',
}

const STATE_STYLE: Record<BlockState, string> = {
  committed: 'bg-violet-400',
  pending:   'bg-amber-300',
  free:      'bg-emerald-200',
  busy:      'bg-gray-100',
  unknown:   'bg-gray-50 border border-gray-100',
}

interface AvailabilityStripProps {
  blockStates: Record<DayIndex, Partial<Record<TimeBlock, BlockState>>>
}

export function AvailabilityStrip({ blockStates }: AvailabilityStripProps) {
  // figure out today's day index (0=Mon)
  const todayIdx = ((new Date().getDay() + 6) % 7) as DayIndex

  return (
    <div className="bg-white rounded-2xl border border-gray-100 px-4 py-3 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">my week</p>
        <div className="flex items-center gap-3 text-[10px] text-gray-400">
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-violet-400 inline-block" /> going</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-amber-300 inline-block" /> invited</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-200 inline-block" /> free</span>
        </div>
      </div>

      {/* grid: rows = blocks, cols = days */}
      <div className="space-y-1">
        {/* day headers */}
        <div className="grid grid-cols-8 gap-1">
          <div /> {/* spacer for block label */}
          {DAYS.map((d, i) => (
            <div
              key={i}
              className={`text-center text-[10px] font-bold leading-none pb-0.5 ${
                i === todayIdx ? 'text-violet-600' : 'text-gray-400'
              }`}
            >
              {d}
              {i === todayIdx && <div className="w-1 h-1 rounded-full bg-violet-500 mx-auto mt-0.5" />}
            </div>
          ))}
        </div>

        {BLOCKS.map(block => (
          <div key={block} className="grid grid-cols-8 gap-1 items-center">
            <div className="text-center text-sm leading-none">{BLOCK_LABELS[block]}</div>
            {Array.from({ length: 7 }, (_, d) => {
              const state = blockStates[d as DayIndex]?.[block] ?? 'unknown'
              return (
                <div
                  key={d}
                  title={state}
                  className={`h-5 rounded-md ${STATE_STYLE[state]} ${d === todayIdx ? 'ring-1 ring-violet-300' : ''}`}
                />
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
