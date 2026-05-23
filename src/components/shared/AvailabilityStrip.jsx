'use client'

const DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
const BLOCKS = ['early_morning', 'brunch', 'afternoon', 'dinner', 'late_night']
const BLOCK_LABELS = {
  early_morning: '🌅',
  brunch:        '☕',
  afternoon:     '🌤',
  dinner:        '🌆',
  late_night:    '🌙',
}

const STATE_STYLE = {
  committed: 'bg-violet-400',
  pending:   'bg-amber-300',
  free:      'bg-emerald-200',
  busy:      'bg-gray-100',
  unknown:   'bg-gray-50 border border-gray-100',
}

export function AvailabilityStrip({ blockStates, activeBlock, onBlockClick }) {
  const todayIdx = ((new Date().getDay() + 6) % 7)

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

      <div className="space-y-1">
        <div className="grid grid-cols-8 gap-1">
          <div />
          {DAYS.map((d, i) => (
            <div key={i} className={`text-center text-[10px] font-bold leading-none pb-0.5 ${i === todayIdx ? 'text-violet-600' : 'text-gray-400'}`}>
              {d}
              {i === todayIdx && <div className="w-1 h-1 rounded-full bg-violet-500 mx-auto mt-0.5" />}
            </div>
          ))}
        </div>

        {BLOCKS.map(block => {
          const isActive = activeBlock === block
          return (
            <div key={block} className="grid grid-cols-8 gap-1 items-center">
              {/* emoji label — tappable if onBlockClick provided */}
              <button
                onClick={() => onBlockClick?.(isActive ? null : block)}
                className={`text-center text-sm leading-none transition-all rounded-md ${
                  onBlockClick ? 'cursor-pointer active:scale-90' : 'cursor-default'
                } ${isActive ? 'scale-125' : ''}`}
                title={isActive ? 'clear filter' : `filter by ${block.replace('_', ' ')}`}
              >
                {BLOCK_LABELS[block]}
                {isActive && <div className="w-1 h-1 rounded-full bg-violet-500 mx-auto mt-0.5" />}
              </button>
              {Array.from({ length: 7 }, (_, d) => {
                const state = blockStates[d]?.[block] ?? 'unknown'
                return (
                  <div
                    key={d}
                    className={`h-5 rounded-md transition-all ${STATE_STYLE[state]} ${
                      d === todayIdx ? 'ring-1 ring-violet-300' : ''
                    } ${isActive ? 'opacity-100 ring-2 ring-violet-300' : ''}`}
                  />
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}
