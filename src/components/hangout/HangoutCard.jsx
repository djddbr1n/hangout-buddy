'use client'

import { motion } from 'framer-motion'
import { MapPin, Users, Sparkles, Clock } from 'lucide-react'
import { format } from 'date-fns'

export function HangoutCard({ hangout, currentUser, friendIds, onOpen, isInvited }) {
  const goingRsvps  = hangout.rsvps?.filter(r => r.status === 'going' && r.user_id !== hangout.creator_id).length ?? 0
  const goingCount  = goingRsvps + 1
  const maybeCount  = hangout.rsvps?.filter(r => r.status === 'maybe').length ?? 0
  const myRSVP      = hangout.rsvps?.find(r => r.user_id === currentUser.id)
  const spotsLeft   = hangout.max_people - goingCount
  const isMine      = hangout.creator_id === currentUser.id
  const friendGoers = hangout.rsvps?.filter(r => friendIds.includes(r.user_id) && r.user_id !== currentUser.id) ?? []

  return (
    <motion.button
      layout
      whileTap={{ scale: 0.985 }}
      onClick={() => onOpen(hangout)}
      className={`w-full rounded-2xl border text-left overflow-hidden ${
        isInvited
          ? 'bg-gradient-to-br from-violet-50 to-purple-50/60 border-violet-200'
          : hangout.is_surprise
          ? 'bg-gradient-to-br from-pink-50 to-rose-50/60 border-pink-200'
          : isMine
          ? 'bg-gradient-to-br from-emerald-50 to-teal-50/50 border-emerald-100'
          : 'bg-gradient-to-br from-amber-50 to-orange-50/50 border-amber-100'
      }`}
    >
      {/* Thin top accent bar */}
      <div className={`h-[3px] w-full ${
        isInvited
          ? 'bg-gradient-to-r from-violet-400 to-purple-400'
          : hangout.is_surprise
          ? 'bg-gradient-to-r from-pink-400 to-rose-400'
          : isMine
          ? 'bg-gradient-to-r from-emerald-400 to-teal-400'
          : 'bg-gradient-to-r from-amber-400 to-orange-300'
      }`} />
      <div className="px-4 py-3.5 flex items-start gap-3">
        {/* Avatar */}
        <div className={`w-10 h-10 rounded-xl border flex items-center justify-center text-xl shrink-0 ${
          isInvited
            ? 'bg-violet-100 border-violet-200'
            : hangout.is_surprise
            ? 'bg-pink-100 border-pink-200'
            : isMine
            ? 'bg-emerald-100 border-emerald-200'
            : 'bg-amber-100 border-amber-200'
        }`}>
          {hangout.creator?.avatar_emoji ?? '👤'}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Title row */}
          <div className="flex items-start justify-between gap-2 mb-0.5">
            <p className="font-bold text-gray-900 text-sm leading-snug truncate flex-1">{hangout.title}</p>
            <div className="flex items-center gap-1 shrink-0 mt-0.5">
              {isInvited && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-600 font-semibold">invited</span>
              )}
              {hangout.is_surprise && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-pink-50 text-pink-500 font-semibold flex items-center gap-0.5">
                  <Sparkles size={9} /> surprise
                </span>
              )}
              {myRSVP && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
                  myRSVP.status === 'going' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'
                }`}>
                  {myRSVP.status === 'going' ? '✓' : '?'}
                </span>
              )}
            </div>
          </div>

          {/* Meta row */}
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <Clock size={10} className="shrink-0" />
            <span>{format(new Date(hangout.date_time), 'EEE, MMM d · h:mm a')}</span>
            {hangout.location && !hangout.is_surprise && (
              <>
                <span className="text-gray-200">·</span>
                <MapPin size={10} className="shrink-0" />
                <span className="truncate">{hangout.location}</span>
              </>
            )}
          </div>

          {/* Social row */}
          <div className="flex items-center gap-2 mt-2">
            {/* Avatar stack */}
            {hangout.rsvps && hangout.rsvps.length > 0 && (
              <div className="flex -space-x-1.5">
                {hangout.rsvps.slice(0, 4).map(r => (
                  <div
                    key={r.id}
                    className={`w-5 h-5 rounded-full text-xs flex items-center justify-center border border-white ${
                      r.status === 'going'
                        ? friendIds.includes(r.user_id) ? 'ring-1 ring-violet-300' : 'ring-1 ring-emerald-200'
                        : 'opacity-60'
                    }`}
                  >
                    {r.user?.avatar_emoji ?? '👤'}
                  </div>
                ))}
              </div>
            )}

            <span className="text-xs text-gray-400">
              {goingCount} going
              {maybeCount > 0 && ` · ${maybeCount} maybe`}
            </span>

            <div className="flex items-center gap-1.5 ml-auto shrink-0">
              {friendGoers.length > 0 && (
                <span className="text-[10px] text-violet-500 font-semibold">
                  {friendGoers.length} friend{friendGoers.length > 1 ? 's' : ''}
                </span>
              )}
              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                spotsLeft <= 1 ? 'bg-orange-50 text-orange-500' : 'bg-gray-100 text-gray-500'
              }`}>
                {spotsLeft} open
              </span>
            </div>
          </div>
        </div>
      </div>
    </motion.button>
  )
}
