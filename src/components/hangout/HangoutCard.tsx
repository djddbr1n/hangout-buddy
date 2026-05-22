'use client'

import { motion } from 'framer-motion'
import { MapPin, Clock, Users, Sparkles, ChevronRight } from 'lucide-react'
import { HangoutPost, User } from '@/types'
import { format } from 'date-fns'

const ACTIVITY_COLORS: Record<string, string> = {
  'Coffee & Chill': 'from-amber-50 to-orange-50',
  'default':        'from-violet-50 to-pink-50',
}

interface HangoutCardProps {
  hangout: HangoutPost
  currentUser: User
  friendIds: string[]
  onOpen: (hangout: HangoutPost) => void
}

export function HangoutCard({ hangout, currentUser, friendIds, onOpen }: HangoutCardProps) {
  const goingCount = hangout.rsvps?.filter(r => r.status === 'going').length ?? 0
  const maybeCount = hangout.rsvps?.filter(r => r.status === 'maybe').length ?? 0
  const myRSVP = hangout.rsvps?.find(r => r.user_id === currentUser.id)
  const spotsLeft = hangout.max_people - goingCount
  const isMine = hangout.creator_id === currentUser.id
  const isFull = spotsLeft <= 0 && !myRSVP
  const gradientClass = ACTIVITY_COLORS[hangout.activity ?? ''] ?? ACTIVITY_COLORS['default']
  const friendAttendees = hangout.rsvps?.filter(r => friendIds.includes(r.user_id) && r.user_id !== currentUser.id) ?? []

  return (
    <motion.button
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onOpen(hangout)}
      className="w-full bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden text-left"
    >
      {/* color header */}
      <div className={`bg-gradient-to-r ${gradientClass} px-5 pt-3 pb-3`}>
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex gap-1">
            {hangout.is_surprise && (
              <span className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-white/70 text-violet-600 font-semibold">
                <Sparkles size={10} /> surprise
              </span>
            )}
            {myRSVP && (
              <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${myRSVP.status === 'going' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                {myRSVP.status === 'going' ? '✓ going' : '? maybe'}
              </span>
            )}
          </div>
          <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${
            isFull ? 'bg-red-100 text-red-500' : spotsLeft === 1 ? 'bg-orange-100 text-orange-500' : 'bg-white/70 text-gray-500'
          }`}>
            {isFull ? 'full' : `${spotsLeft} left`}
          </span>
        </div>

        <div className="flex items-center gap-2.5">
          <span className="text-2xl shrink-0">{hangout.creator?.avatar_emoji ?? '👤'}</span>
          <div className="min-w-0 flex-1">
            <p className="font-bold text-gray-900 text-base leading-snug">{hangout.title}</p>
            <p className="text-xs text-gray-400">{isMine ? 'you' : `@${hangout.creator?.nickname}`}</p>
          </div>
          <ChevronRight size={16} className="text-gray-300 shrink-0" />
        </div>
      </div>

      {/* body */}
      <div className="px-5 py-3 space-y-2.5">
        {/* time + location */}
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500">
          <span className="flex items-center gap-1.5">
            <Clock size={12} className="text-gray-300" />
            {format(new Date(hangout.date_time), 'EEE, MMM d · h:mm a')}
          </span>
          {(hangout.location || hangout.is_surprise) && (
            <span className="flex items-center gap-1">
              {hangout.is_surprise
                ? <><Sparkles size={11} className="text-violet-400" /><span className="text-violet-400">TBD</span></>
                : <><MapPin size={11} />{hangout.location}</>}
            </span>
          )}
        </div>

        {/* attendees */}
        <div className="flex items-center gap-2">
          {hangout.rsvps && hangout.rsvps.length > 0 ? (
            <>
              <div className="flex -space-x-1.5">
                {hangout.rsvps.slice(0, 5).map(r => (
                  <div key={r.id} title={`@${r.user?.nickname}`} className={`w-6 h-6 rounded-full text-sm flex items-center justify-center border-2 border-white ring-1 ${
                    r.status === 'going' ? 'ring-emerald-300' : 'ring-gray-200'
                  } ${friendIds.includes(r.user_id) ? 'ring-violet-300' : ''}`}>
                    {r.user?.avatar_emoji ?? '👤'}
                  </div>
                ))}
              </div>
              <span className="text-xs text-gray-400">
                {goingCount > 0 && `${goingCount} going`}
                {goingCount > 0 && maybeCount > 0 && ' · '}
                {maybeCount > 0 && `${maybeCount} maybe`}
              </span>
              {friendAttendees.length > 0 && (
                <span className="ml-auto text-xs text-violet-500 font-medium">
                  {friendAttendees.length} friend{friendAttendees.length > 1 ? 's' : ''} going
                </span>
              )}
            </>
          ) : (
            <span className="text-xs text-gray-400 flex items-center gap-1">
              <Users size={11} /> be the first to join
            </span>
          )}
        </div>
      </div>
    </motion.button>
  )
}
