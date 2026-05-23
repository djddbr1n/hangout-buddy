'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { X, MapPin, Clock, Users, Sparkles, Check, HelpCircle, Pencil } from 'lucide-react'
import { format } from 'date-fns'
import { RSVPButtons } from './RSVPButtons'
import { SurpriseSpinner } from './SurpriseSpinner'


export function HangoutDetailSheet({ hangout, open, currentUser, friendIds, onClose, onRSVP, onEdit }) {
  if (!hangout) return null

  const goingRSVPs = hangout.rsvps?.filter(r => r.status === 'going') ?? []
  const maybeRSVPs = hangout.rsvps?.filter(r => r.status === 'maybe') ?? []
  const myRSVP = hangout.rsvps?.find(r => r.user_id === currentUser.id)
  const isMine = hangout.creator_id === currentUser.id
  const spotsLeft = hangout.max_people - 1 - goingRSVPs.length
  const isFull = spotsLeft <= 0 && !myRSVP

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
            className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl max-h-[90vh] overflow-y-auto"
          >
            <div className="flex justify-center pt-3 pb-0">
              <div className="w-10 h-1 rounded-full bg-gray-200" />
            </div>

            {/* color header */}
            <div className={`px-5 pt-4 pb-4 ${hangout.is_surprise ? 'bg-gradient-to-r from-violet-50 to-pink-50' : 'bg-gradient-to-r from-amber-50 to-orange-50'}`}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{hangout.creator?.avatar_emoji ?? '👤'}</span>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 leading-snug">{hangout.title}</h2>
                    <p className="text-sm text-gray-400">{isMine ? 'you posted this' : `posted by @${hangout.creator?.nickname}`}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {isMine && onEdit && (
                    <button onClick={() => { onClose(); onEdit(hangout) }} className="p-2 rounded-full hover:bg-white/60">
                      <Pencil size={15} className="text-gray-400" />
                    </button>
                  )}
                  <button onClick={onClose} className="p-2 rounded-full hover:bg-white/60 mt-0.5">
                    <X size={18} className="text-gray-400" />
                  </button>
                </div>
              </div>
            </div>

            <div className="px-5 py-4 space-y-5 pb-10">
              {/* meta */}
              <div className="flex flex-wrap gap-3">
                <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2">
                  <Clock size={14} className="text-gray-400" />
                  <span className="text-sm text-gray-700 font-medium">
                    {format(new Date(hangout.date_time), 'EEEE, MMM d · h:mm a')}
                  </span>
                </div>
                {hangout.is_surprise ? (
                  <div className="flex items-center gap-2 bg-violet-50 rounded-xl px-3 py-2">
                    <Sparkles size={14} className="text-violet-400" />
                    <span className="text-sm text-violet-600 font-medium">location TBD ✨</span>
                  </div>
                ) : hangout.location ? (
                  <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2">
                    <MapPin size={14} className="text-gray-400" />
                    <span className="text-sm text-gray-700 font-medium">{hangout.location}</span>
                  </div>
                ) : null}
                <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2">
                  <Users size={14} className="text-gray-400" />
                  <span className="text-sm text-gray-700 font-medium">
                    {hangout.max_people} max · {spotsLeft > 0 ? `${spotsLeft} spot${spotsLeft > 1 ? 's' : ''} left` : 'full'}
                  </span>
                </div>
              </div>

              {/* description */}
              {hangout.description && (
                <p className="text-sm text-gray-600 bg-gray-50 rounded-2xl px-4 py-3 leading-relaxed">
                  {hangout.description}
                </p>
              )}

              {/* surprise spinner */}
              {hangout.is_surprise && (
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">activity ideas</p>
                  <SurpriseSpinner options={hangout.surprise_options} />
                </div>
              )}

              {/* attendees */}
              <div className="space-y-3">
                {/* going */}
                {goingRSVPs.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                      <Check size={11} className="text-emerald-500" /> going ({goingRSVPs.length})
                    </p>
                    <div className="space-y-1.5">
                      {goingRSVPs.map(rsvp => {
                        const isFriend = friendIds.includes(rsvp.user_id)
                        const isYou = rsvp.user_id === currentUser.id
                        return (
                          <div key={rsvp.id} className={`flex items-center gap-3 px-3 py-2 rounded-xl ${isFriend ? 'bg-violet-50' : 'bg-gray-50'}`}>
                            <div className="relative">
                              <span className="text-xl">{rsvp.user?.avatar_emoji ?? '👤'}</span>
                              {isFriend && !isYou && (
                                <span className="absolute -bottom-0.5 -right-1 text-[9px] bg-violet-500 text-white rounded-full w-3.5 h-3.5 flex items-center justify-center font-bold">★</span>
                              )}
                            </div>
                            <span className="text-sm font-medium text-gray-800">
                              {isYou ? 'you' : rsvp.user?.name ?? `@${rsvp.user?.nickname}`}
                            </span>
                            {isFriend && !isYou && (
                              <span className="ml-auto text-[10px] text-violet-500 font-semibold bg-violet-100 px-2 py-0.5 rounded-full">friend</span>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* maybe */}
                {maybeRSVPs.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                      <HelpCircle size={11} className="text-amber-500" /> maybe ({maybeRSVPs.length})
                    </p>
                    <div className="space-y-1.5">
                      {maybeRSVPs.map(rsvp => {
                        const isFriend = friendIds.includes(rsvp.user_id)
                        const isYou = rsvp.user_id === currentUser.id
                        return (
                          <div key={rsvp.id} className={`flex items-center gap-3 px-3 py-2 rounded-xl ${isFriend ? 'bg-amber-50' : 'bg-gray-50'} opacity-75`}>
                            <span className="text-xl">{rsvp.user?.avatar_emoji ?? '👤'}</span>
                            <span className="text-sm font-medium text-gray-700">
                              {isYou ? 'you (maybe)' : rsvp.user?.name ?? `@${rsvp.user?.nickname}`}
                            </span>
                            {isFriend && !isYou && (
                              <span className="ml-auto text-[10px] text-violet-500 font-semibold bg-violet-100 px-2 py-0.5 rounded-full">friend</span>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {goingRSVPs.length === 0 && maybeRSVPs.length === 0 && (
                  <div className="text-center py-4 text-gray-400">
                    <p className="text-2xl mb-1">👀</p>
                    <p className="text-sm">no one's joined yet — be the first</p>
                  </div>
                )}
              </div>

              {/* RSVP */}
              {!isMine && hangout.status === 'open' && (
                <div className="pt-1">
                  <RSVPButtons
                    hangoutId={hangout.id}
                    current={myRSVP?.status ?? null}
                    disabled={isFull}
                    onRSVP={onRSVP}
                  />
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
