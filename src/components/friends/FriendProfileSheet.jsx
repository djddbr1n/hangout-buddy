'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Lock, Plus, Eye, Shield } from 'lucide-react'
import { getFriendFreeBusy } from '@/app/actions'
import { WeeklyCalendar } from '@/components/shared/WeeklyCalendar'

export function FriendProfileSheet({ friend, canSeeAvailability, myGrantLevel, open, onClose, onInvite, onAuthLevelChange }) {
  const [busySlots, setBusySlots] = useState(null)
  const [calLoading, setCalLoading] = useState(false)
  const [calConnected, setCalConnected] = useState(null)

  // Fetch live free/busy whenever this sheet opens (and permission is granted)
  useEffect(() => {
    if (!open || !canSeeAvailability || !friend) return
    setCalLoading(true)
    setBusySlots(null)
    setCalConnected(null)
    getFriendFreeBusy(friend.id)
      .then(result => {
        setCalConnected(result.connected)
        setBusySlots(result.busy ?? [])
      })
      .catch(() => setCalConnected(false))
      .finally(() => setCalLoading(false))
  }, [open, friend?.id, canSeeAvailability])

  if (!friend) return null

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
            drag="y" dragConstraints={{ top: 0 }} dragElastic={{ top: 0, bottom: 0.3 }}
            onDragEnd={(_, { offset, velocity }) => { if (offset.y > 80 || velocity.y > 500) onClose() }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl max-h-[88vh] flex flex-col overflow-x-hidden"
          >
            <div className="flex justify-center pt-3 pb-1 shrink-0">
              <div className="w-10 h-1 rounded-full bg-gray-200" />
            </div>

            <div className="overflow-y-auto flex-1" onPointerDownCapture={e => e.stopPropagation()}>
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

              {/* access level toggle */}
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">their access to your calendar</p>
                <div className="flex gap-2">
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={() => onAuthLevelChange('invite_only')}
                    className={`flex-1 rounded-2xl border-2 px-3 py-3 text-left transition-all ${
                      myGrantLevel !== 'can_see_availability'
                        ? 'border-violet-300 bg-violet-50'
                        : 'border-gray-100 bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Shield size={14} className={myGrantLevel !== 'can_see_availability' ? 'text-violet-500' : 'text-gray-400'} />
                      <span className={`text-sm font-semibold ${myGrantLevel !== 'can_see_availability' ? 'text-violet-700' : 'text-gray-500'}`}>
                        invite only
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-400 leading-snug">they can only see hangouts you invite them to</p>
                  </motion.button>

                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={() => onAuthLevelChange('can_see_availability')}
                    className={`flex-1 rounded-2xl border-2 px-3 py-3 text-left transition-all ${
                      myGrantLevel === 'can_see_availability'
                        ? 'border-violet-300 bg-violet-50'
                        : 'border-gray-100 bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Eye size={14} className={myGrantLevel === 'can_see_availability' ? 'text-violet-500' : 'text-gray-400'} />
                      <span className={`text-sm font-semibold ${myGrantLevel === 'can_see_availability' ? 'text-violet-700' : 'text-gray-500'}`}>
                        see calendar
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-400 leading-snug">they can see your Google Calendar free/busy</p>
                  </motion.button>
                </div>
              </div>

              {/* availability section */}
              <div>
                <h3 className="font-semibold text-gray-800 mb-3">availability this week</h3>

                {!canSeeAvailability ? (
                  <div className="flex flex-col items-center py-8 gap-3 bg-gray-50 rounded-2xl">
                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                      <Lock size={18} className="text-gray-400" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium text-gray-600">calendar hidden</p>
                      <p className="text-xs text-gray-400 mt-1">@{friend.nickname} hasn't shared their calendar with you</p>
                    </div>
                  </div>
                ) : (
                  <WeeklyCalendar
                    busy={busySlots}
                    loading={calLoading}
                    notConnected={calConnected === false}
                  />
                )}
              </div>
            </div>
            </div>{/* end scrollable content */}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
