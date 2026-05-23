'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { X, Lock, Plus } from 'lucide-react'

const DAYS = [
  { label: 'Monday', short: 'Mon' },
  { label: 'Tuesday', short: 'Tue' },
  { label: 'Wednesday', short: 'Wed' },
  { label: 'Thursday', short: 'Thu' },
  { label: 'Friday', short: 'Fri' },
  { label: 'Saturday', short: 'Sat' },
  { label: 'Sunday', short: 'Sun' },
]

const BLOCKS = [
  { key: 'early_morning', label: 'Early',     time: 'before 10am', emoji: '🌅' },
  { key: 'brunch',        label: 'Brunch',    time: '10am – 2pm',  emoji: '☕' },
  { key: 'afternoon',     label: 'Afternoon', time: '2pm – 5pm',   emoji: '🌤' },
  { key: 'dinner',        label: 'Dinner',    time: '5pm – 8pm',   emoji: '🌆' },
  { key: 'late_night',    label: 'Late',      time: 'after 8pm',   emoji: '🌙' },
]

function AvailabilityCell({ value }) {
  if (value === true)
    return (
      <div className="w-full h-full rounded-lg bg-emerald-100 flex items-center justify-center">
        <div className="w-2 h-2 rounded-full bg-emerald-400" />
      </div>
    )
  if (value === false)
    return <div className="w-full h-full rounded-lg bg-gray-100" />
  return <div className="w-full h-full rounded-lg border border-dashed border-gray-200" />
}


export function FriendProfileSheet({ friend, availability, canSeeAvailability, open, onClose, onInvite, onAuthLevelChange }) {
  if (!friend) return null

  // count free blocks this week
  const freeCount = availability
    ? Object.values(availability).flatMap(d => Object.values(d ?? {})).filter(Boolean).length
    : 0

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm"
          />
          <motion.div
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl max-h-[88vh] overflow-y-auto"
          >
            {/* handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-gray-200" />
            </div>

            <div className="px-5 pb-10 space-y-5">
              {/* header */}
              <div className="flex items-start justify-between pt-1">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-violet-50 border-2 border-violet-100 flex items-center justify-center text-3xl">
                    {friend.avatar_emoji}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">{friend.name}</h2>
                    <p className="text-sm text-gray-400">@{friend.nickname}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <motion.button
                    whileTap={{ scale: 0.92 }}
                    onClick={() => onInvite(friend.id)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-violet-50 text-violet-600 text-sm font-medium"
                  >
                    <Plus size={14} /> invite
                  </motion.button>
                  <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100">
                    <X size={16} className="text-gray-400" />
                  </button>
                </div>
              </div>

              {/* availability section */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-800">availability this week</h3>
                  {canSeeAvailability && availability && (
                    <span className="text-xs text-emerald-600 font-medium bg-emerald-50 px-2 py-0.5 rounded-full">
                      {freeCount} free slots
                    </span>
                  )}
                </div>

                {!canSeeAvailability ? (
                  <div className="flex flex-col items-center py-8 gap-3 bg-gray-50 rounded-2xl">
                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                      <Lock size={18} className="text-gray-400" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium text-gray-600">availability hidden</p>
                      <p className="text-xs text-gray-400 mt-1">@{friend.nickname} hasn't shared their calendar with you</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {/* day headers */}
                    <div className="grid gap-1" style={{ gridTemplateColumns: '68px repeat(7, 1fr)' }}>
                      <div />
                      {DAYS.map(d => (
                        <div key={d.short} className="text-center text-[10px] font-semibold text-gray-400 pb-1">{d.short}</div>
                      ))}
                    </div>

                    {/* block rows */}
                    {BLOCKS.map(block => (
                      <div key={block.key} className="grid gap-1 items-center" style={{ gridTemplateColumns: '68px repeat(7, 1fr)' }}>
                        {/* label */}
                        <div className="flex items-center gap-1.5 pr-1">
                          <span className="text-base leading-none">{block.emoji}</span>
                          <div>
                            <p className="text-[11px] font-semibold text-gray-600 leading-none">{block.label}</p>
                            <p className="text-[9px] text-gray-400 leading-none mt-0.5">{block.time}</p>
                          </div>
                        </div>
                        {/* cells */}
                        {DAYS.map((_, dayIdx) => (
                          <div key={dayIdx} className="h-8">
                            <AvailabilityCell
                              value={availability?.[dayIdx]?.[block.key]}
                            />
                          </div>
                        ))}
                      </div>
                    ))}

                    {/* legend */}
                    <div className="flex items-center gap-4 pt-2 justify-center">
                      {[
                        { color: 'bg-emerald-100', dot: 'bg-emerald-400', label: 'free' },
                        { color: 'bg-gray-100', dot: null, label: 'busy' },
                        { color: 'border border-dashed border-gray-200', dot: null, label: 'unknown' },
                      ].map(({ color, dot, label }) => (
                        <div key={label} className="flex items-center gap-1.5">
                          <div className={`w-4 h-4 rounded ${color} flex items-center justify-center`}>
                            {dot && <div className={`w-1.5 h-1.5 rounded-full ${dot}`} />}
                          </div>
                          <span className="text-[11px] text-gray-400">{label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
