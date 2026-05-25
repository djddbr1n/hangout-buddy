'use client'

import { motion } from 'framer-motion'

export const BLOCKS = [
  { key: 'early_morning', emoji: '🌅', label: 'Morning',   hours: [0,  10] },
  { key: 'brunch',        emoji: '☕',  label: 'Brunch',    hours: [10, 14] },
  { key: 'afternoon',     emoji: '🌤',  label: 'Afternoon', hours: [14, 17] },
  { key: 'dinner',        emoji: '🌆',  label: 'Dinner',    hours: [17, 20] },
  { key: 'late_night',    emoji: '🌙',  label: 'Late',      hours: [20, 24] },
]

function isFreeInBlock(busySlots, hours) {
  const today = new Date()
  const [sh, eh] = hours
  const bs = new Date(today); bs.setHours(sh, 0, 0, 0)
  const be = new Date(today); be.setHours(eh, 0, 0, 0)
  return !(busySlots ?? []).some(slot => {
    const s = new Date(slot.start), e = new Date(slot.end)
    return s < be && e > bs
  })
}

function AvatarStack({ profiles }) {
  const shown = profiles.slice(0, 3)
  const extra = profiles.length - 3
  return (
    <div className="flex mt-1.5">
      {shown.map((p, i) => (
        <div
          key={p.id}
          className="w-[18px] h-[18px] rounded-full bg-white border-[1.5px] border-white flex items-center justify-center text-[10px] leading-none"
          style={{ marginLeft: i === 0 ? 0 : -5, zIndex: shown.length - i }}
        >
          {p.avatar_emoji}
        </div>
      ))}
      {extra > 0 && (
        <div
          className="w-[18px] h-[18px] rounded-full bg-gray-100 border-[1.5px] border-white flex items-center justify-center text-[8px] font-bold text-gray-500"
          style={{ marginLeft: -5 }}
        >
          +{extra}
        </div>
      )}
    </div>
  )
}

export function FriendFreeStrip({ friendFreeBusy, friendProfiles, activeBlock, onBlockClick, calLoading }) {
  const hasCal = Object.keys(friendFreeBusy ?? {}).length > 0

  const blocks = BLOCKS.map(block => ({
    ...block,
    free: Object.entries(friendFreeBusy ?? {})
      .filter(([, busy]) => isFreeInBlock(busy, block.hours))
      .map(([id]) => friendProfiles?.[id])
      .filter(Boolean),
  }))

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
      {blocks.map(block => {
        const isActive = activeBlock === block.key
        return (
          <motion.button
            key={block.key}
            whileTap={{ scale: 0.93 }}
            onClick={() => onBlockClick(isActive ? null : block.key)}
            className={`flex flex-col items-start px-3 pt-2.5 pb-2 rounded-2xl shrink-0 transition-all border ${
              isActive
                ? 'bg-violet-500 border-violet-500 shadow-sm shadow-violet-200'
                : 'bg-white border-gray-100'
            }`}
            style={{ minWidth: 76 }}
          >
            <span className="text-[17px] leading-none">{block.emoji}</span>
            <span className={`text-[11px] font-semibold mt-1 leading-none ${isActive ? 'text-white' : 'text-gray-600'}`}>
              {block.label}
            </span>

            {/* Friend avatars or loading */}
            {calLoading ? (
              <div className="mt-1.5 h-[18px] w-10 bg-gray-100 rounded-full animate-pulse" />
            ) : hasCal ? (
              block.free.length > 0
                ? <AvatarStack profiles={block.free} />
                : <span className={`text-[10px] mt-1.5 leading-none ${isActive ? 'text-violet-200' : 'text-gray-300'}`}>
                    no one
                  </span>
            ) : null}
          </motion.button>
        )
      })}
    </div>
  )
}
