'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, MapPin, Clock, Users, Sparkles, Check, HelpCircle, Pencil, CalendarPlus, Trash2, UserPlus, MessageCircle } from 'lucide-react'
import { format } from 'date-fns'
import { useRouter } from 'next/navigation'
import { RSVPButtons } from './RSVPButtons'
import { SurpriseSpinner } from './SurpriseSpinner'
import { downloadICS } from '@/lib/ics'

// Returns 'free' | 'busy' | null (null = no GCal data)
function availDuring(busySlots, hangout) {
  if (!busySlots) return null
  const start = new Date(hangout.date_time)
  const end   = new Date(start.getTime() + (hangout.duration_minutes ?? 120) * 60_000)
  const busy  = busySlots.some(slot => {
    const s = new Date(slot.start), e = new Date(slot.end)
    return s < end && e > start
  })
  return busy ? 'busy' : 'free'
}

function AvailTag({ status }) {
  if (!status) return null
  return (
    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${
      status === 'free' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-500'
    }`}>
      {status}
    </span>
  )
}

export function HangoutDetailSheet({
  hangout, open, currentUser, friendIds, friendProfiles, friendFreeBusy,
  onClose, onRSVP, onEdit, onDelete, onInviteFriend, onAddFriend, isPast,
}) {
  const router = useRouter()
  const [confirmDelete, setConfirmDelete]     = useState(false)
  const [showInvitePanel, setShowInvitePanel] = useState(false)
  const [invitedIds, setInvitedIds]           = useState(new Set())
  const [sentRequestIds, setSentRequestIds]   = useState(new Set())

  // Hooks must be called before any early returns
  useEffect(() => {
    if (open) {
      const y = window.scrollY
      document.body.dataset.scrollLockY = String(y)
      document.body.style.top = `-${y}px`
      document.body.classList.add('scroll-locked')
    } else {
      document.body.classList.remove('scroll-locked')
      document.body.style.top = ''
      window.scrollTo(0, parseInt(document.body.dataset.scrollLockY ?? '0'))
    }
    return () => {
      document.body.classList.remove('scroll-locked')
      document.body.style.top = ''
    }
  }, [open])

  if (!hangout) return null

  const goingRSVPs = hangout.rsvps?.filter(r => r.status === 'going' && r.user_id !== hangout.creator_id) ?? []
  const maybeRSVPs = hangout.rsvps?.filter(r => r.status === 'maybe') ?? []
  const myRSVP     = hangout.rsvps?.find(r => r.user_id === currentUser.id)
  const isMine     = hangout.creator_id === currentUser.id
  // host always counts as 1, so spots = max - host - going guests
  const spotsLeft  = hangout.max_people - 1 - goingRSVPs.length
  const isFull     = spotsLeft <= 0 && !myRSVP

  const closeAll = () => {
    setConfirmDelete(false)
    setShowInvitePanel(false)
    setInvitedIds(new Set())
    setSentRequestIds(new Set())
    onClose()
  }

  // Anyone already hosting or RSVPd (going or maybe) is off the invite list
  const alreadyInvolved = new Set([hangout.creator_id, ...(hangout.rsvps ?? []).map(r => r.user_id)])
  const invitableFriends = Object.values(friendProfiles ?? {}).filter(p => !alreadyInvolved.has(p.id))

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={closeAll}
            className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm"
          />
          <motion.div
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            drag="y"
            dragConstraints={{ top: 0, left: 0, right: 0 }}
            dragElastic={{ top: 0, bottom: 0.3 }}
            dragMomentum={false}
            onDragEnd={(_, { offset, velocity }) => { if (offset.y > 80 || velocity.y > 500) closeAll() }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl max-h-[90vh] flex flex-col overflow-hidden"
            style={{ touchAction: 'none', x: 0 }}
          >
            {/* handle — drag target only */}
            <div className="flex justify-center pt-3 pb-0 shrink-0">
              <div className="w-10 h-1 rounded-full bg-gray-200" />
            </div>

            {/* ── header ── */}
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
                    <button onClick={() => { closeAll(); onEdit(hangout) }} className="p-2 rounded-full hover:bg-white/60">
                      <Pencil size={15} className="text-gray-400" />
                    </button>
                  )}
                  {isMine && onDelete && (
                    <motion.button
                      whileTap={{ scale: 0.92 }}
                      onClick={() => confirmDelete ? onDelete(hangout.id) : setConfirmDelete(true)}
                      className={`flex items-center gap-1 px-2 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                        confirmDelete ? 'bg-red-500 text-white' : 'hover:bg-white/60 text-gray-400'
                      }`}
                    >
                      <Trash2 size={14} />
                      {confirmDelete && <span>delete?</span>}
                    </motion.button>
                  )}
                  <button onClick={closeAll} className="p-2 rounded-full hover:bg-white/60 mt-0.5">
                    <X size={18} className="text-gray-400" />
                  </button>
                </div>
              </div>
            </div>

            <div
              className="overflow-y-auto overflow-x-hidden flex-1"
              style={{ overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch' }}
              onPointerDownCapture={e => e.stopPropagation()}
            >
            <div className="px-5 py-4 space-y-5 pb-10">

              {/* ── meta chips ── */}
              <div className="flex flex-wrap gap-2">
                <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2">
                  <Clock size={14} className="text-gray-400" />
                  <span className="text-sm text-gray-700 font-medium">
                    {format(new Date(hangout.date_time), 'EEEE, MMM d · h:mm a')}
                    {hangout.duration_minutes
                      ? ` – ${format(new Date(new Date(hangout.date_time).getTime() + hangout.duration_minutes * 60_000), 'h:mm a')}`
                      : ''}
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
                    max {hangout.max_people} · {spotsLeft > 0 ? `${spotsLeft} spot${spotsLeft > 1 ? 's' : ''} left` : 'full'}
                  </span>
                </div>
              </div>

              {/* ── description ── */}
              {hangout.description && (
                <p className="text-sm text-gray-600 bg-gray-50 rounded-2xl px-4 py-3 leading-relaxed">
                  {hangout.description}
                </p>
              )}

              {/* ── surprise spinner ── */}
              {hangout.is_surprise && (
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">activity ideas</p>
                  <SurpriseSpinner options={hangout.surprise_options} />
                </div>
              )}

              {/* ── attendee lists ── */}
              <div className="space-y-3">
                {(goingRSVPs.length > 0 || hangout.creator) && (
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                      <Check size={11} className="text-emerald-500" /> going ({goingRSVPs.length + 1})
                    </p>
                    <div className="space-y-1.5">
                      {/* Host is always first in the going list */}
                      <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-amber-50">
                        <span className="text-xl">{hangout.creator?.avatar_emoji ?? '👤'}</span>
                        <span className="text-sm font-medium text-gray-800 flex-1">
                          {isMine ? 'you' : (hangout.creator?.name ?? `@${hangout.creator?.nickname}`)}
                        </span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">🏠 host</span>
                        {!isMine && !friendIds.includes(hangout.creator_id) && onAddFriend && (
                          <motion.button
                            whileTap={{ scale: 0.9 }}
                            disabled={sentRequestIds.has(hangout.creator_id)}
                            onClick={() => { onAddFriend(hangout.creator_id); setSentRequestIds(p => new Set([...p, hangout.creator_id])) }}
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 transition-colors ${sentRequestIds.has(hangout.creator_id) ? 'bg-emerald-100 text-emerald-600' : 'bg-violet-500 text-white'}`}
                          >
                            {sentRequestIds.has(hangout.creator_id) ? '✓ sent' : '+ add'}
                          </motion.button>
                        )}
                      </div>
                      {goingRSVPs.map(rsvp => {
                        const isFriend = friendIds.includes(rsvp.user_id)
                        const isYou    = rsvp.user_id === currentUser.id
                        const avail    = !isYou && isFriend ? availDuring(friendFreeBusy?.[rsvp.user_id], hangout) : null
                        return (
                          <div key={rsvp.id} className={`flex items-center gap-3 px-3 py-2 rounded-xl ${isFriend ? 'bg-violet-50' : 'bg-gray-50'}`}>
                            <div className="relative">
                              <span className="text-xl">{rsvp.user?.avatar_emoji ?? '👤'}</span>
                              {isFriend && !isYou && (
                                <span className="absolute -bottom-0.5 -right-1 text-[9px] bg-violet-500 text-white rounded-full w-3.5 h-3.5 flex items-center justify-center font-bold">★</span>
                              )}
                            </div>
                            <span className="text-sm font-medium text-gray-800 flex-1">
                              {isYou ? 'you' : rsvp.user?.name ?? `@${rsvp.user?.nickname}`}
                            </span>
                            <AvailTag status={avail} />
                            {isFriend && !isYou && !avail && (
                              <span className="text-[10px] text-violet-500 font-semibold bg-violet-100 px-2 py-0.5 rounded-full">friend</span>
                            )}
                            {!isFriend && !isYou && onAddFriend && (
                              <motion.button
                                whileTap={{ scale: 0.9 }}
                                disabled={sentRequestIds.has(rsvp.user_id)}
                                onClick={() => { onAddFriend(rsvp.user_id); setSentRequestIds(p => new Set([...p, rsvp.user_id])) }}
                                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 transition-colors ${sentRequestIds.has(rsvp.user_id) ? 'bg-emerald-100 text-emerald-600' : 'bg-violet-500 text-white'}`}
                              >
                                {sentRequestIds.has(rsvp.user_id) ? '✓ sent' : '+ add'}
                              </motion.button>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {maybeRSVPs.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                      <HelpCircle size={11} className="text-amber-500" /> maybe ({maybeRSVPs.length})
                    </p>
                    <div className="space-y-1.5">
                      {maybeRSVPs.map(rsvp => {
                        const isFriend = friendIds.includes(rsvp.user_id)
                        const isYou    = rsvp.user_id === currentUser.id
                        const avail    = !isYou && isFriend ? availDuring(friendFreeBusy?.[rsvp.user_id], hangout) : null
                        return (
                          <div key={rsvp.id} className={`flex items-center gap-3 px-3 py-2 rounded-xl ${isFriend ? 'bg-amber-50' : 'bg-gray-50'} opacity-80`}>
                            <span className="text-xl">{rsvp.user?.avatar_emoji ?? '👤'}</span>
                            <span className="text-sm font-medium text-gray-700 flex-1">
                              {isYou ? 'you (maybe)' : rsvp.user?.name ?? `@${rsvp.user?.nickname}`}
                            </span>
                            <AvailTag status={avail} />
                            {!isFriend && !isYou && onAddFriend && (
                              <motion.button
                                whileTap={{ scale: 0.9 }}
                                disabled={sentRequestIds.has(rsvp.user_id)}
                                onClick={() => { onAddFriend(rsvp.user_id); setSentRequestIds(p => new Set([...p, rsvp.user_id])) }}
                                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 transition-colors ${sentRequestIds.has(rsvp.user_id) ? 'bg-emerald-100 text-emerald-600' : 'bg-violet-500 text-white'}`}
                              >
                                {sentRequestIds.has(rsvp.user_id) ? '✓ sent' : '+ add'}
                              </motion.button>
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

              {/* ── RSVP buttons (non-host, open events) ── */}
              {!isPast && !isMine && hangout.status === 'open' && (
                <div className="pt-1">
                  <RSVPButtons
                    hangoutId={hangout.id}
                    current={myRSVP?.status ?? null}
                    disabled={isFull}
                    onRSVP={onRSVP}
                  />
                </div>
              )}

              {/* ── Host invite section ── */}
              {!isPast && isMine && onInviteFriend && friendProfiles && (
                <div>
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={() => setShowInvitePanel(v => !v)}
                    className="w-full flex items-center justify-between px-4 py-3 rounded-2xl bg-violet-50 text-violet-600 text-sm font-semibold"
                  >
                    <span className="flex items-center gap-2"><UserPlus size={15} /> invite friends</span>
                    <motion.span animate={{ rotate: showInvitePanel ? 180 : 0 }} className="text-violet-400 text-xs">▾</motion.span>
                  </motion.button>

                  <AnimatePresence>
                    {showInvitePanel && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="mt-2 space-y-2">
                          {invitableFriends.length === 0 ? (
                            <p className="text-xs text-gray-400 text-center py-3">all your friends are already in!</p>
                          ) : invitableFriends.map(friend => {
                            const avail = availDuring(friendFreeBusy?.[friend.id], hangout)
                            return (
                              <div key={friend.id} className="flex items-center gap-3 px-3 py-2 bg-gray-50 rounded-xl">
                                <span className="text-xl">{friend.avatar_emoji}</span>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-gray-800 truncate">{friend.name}</p>
                                  <p className="text-xs text-gray-400">@{friend.nickname}</p>
                                </div>
                                <AvailTag status={avail} />
                                <motion.button
                                  whileTap={{ scale: 0.9 }}
                                  disabled={invitedIds.has(friend.id)}
                                  onClick={() => {
                                    onInviteFriend(hangout, friend.id)
                                    setInvitedIds(prev => new Set([...prev, friend.id]))
                                  }}
                                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors shrink-0 ${
                                    invitedIds.has(friend.id)
                                      ? 'bg-emerald-100 text-emerald-600'
                                      : 'bg-violet-500 text-white'
                                  }`}
                                >
                                  {invitedIds.has(friend.id) ? '✓' : 'invite'}
                                </motion.button>
                              </div>
                            )
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {/* ── Attendee invite panel (allow_plus_ones) ── */}
              {!isPast && !isMine && myRSVP?.status === 'going' && hangout.allow_plus_ones && friendProfiles && (
                <div>
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={() => setShowInvitePanel(v => !v)}
                    className="w-full flex items-center justify-between px-4 py-3 rounded-2xl bg-violet-50 text-violet-600 text-sm font-semibold"
                  >
                    <span className="flex items-center gap-2"><UserPlus size={15} /> invite your friends</span>
                    <motion.span animate={{ rotate: showInvitePanel ? 180 : 0 }} className="text-violet-400 text-xs">▾</motion.span>
                  </motion.button>

                  <AnimatePresence>
                    {showInvitePanel && (() => {
                      const uninvited = Object.values(friendProfiles).filter(p => !alreadyInvolved.has(p.id))
                      return (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="mt-2 space-y-2">
                            {uninvited.length === 0 ? (
                              <p className="text-xs text-gray-400 text-center py-3">all your friends are already in!</p>
                            ) : uninvited.map(friend => {
                              const avail = availDuring(friendFreeBusy?.[friend.id], hangout)
                              return (
                                <div key={friend.id} className="flex items-center gap-3 px-3 py-2 bg-gray-50 rounded-xl">
                                  <span className="text-xl">{friend.avatar_emoji}</span>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-800 truncate">{friend.name}</p>
                                    <p className="text-xs text-gray-400">@{friend.nickname}</p>
                                  </div>
                                  <AvailTag status={avail} />
                                  <motion.button
                                    whileTap={{ scale: 0.9 }}
                                    disabled={invitedIds.has(friend.id)}
                                    onClick={() => {
                                      onInviteFriend(hangout, friend.id)
                                      setInvitedIds(prev => new Set([...prev, friend.id]))
                                    }}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors shrink-0 ${
                                      invitedIds.has(friend.id)
                                        ? 'bg-emerald-100 text-emerald-600'
                                        : 'bg-violet-500 text-white'
                                    }`}
                                  >
                                    {invitedIds.has(friend.id) ? '✓' : 'invite'}
                                  </motion.button>
                                </div>
                              )
                            })}
                          </div>
                        </motion.div>
                      )
                    })()}
                  </AnimatePresence>
                </div>
              )}

              {/* ── Group chat + calendar (host or going) ── */}
              {(isMine || myRSVP?.status === 'going') && (
                <div className="flex gap-2">
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={() => { closeAll(); router.push(`/friends?tab=chats&chat=${hangout.id}`) }}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-2xl bg-violet-50 text-violet-600 text-sm font-semibold"
                  >
                    <MessageCircle size={15} />
                    group chat
                  </motion.button>
                  {!isPast && (
                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      onClick={() => downloadICS(hangout)}
                      className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl border border-dashed border-gray-200 text-gray-400 text-sm font-medium"
                    >
                      <CalendarPlus size={15} />
                    </motion.button>
                  )}
                </div>
              )}

              {/* ── Past event ── */}
              {isPast && (
                <div className="flex items-center justify-center gap-2 py-3 px-4 bg-gray-50 rounded-2xl">
                  <span className="text-base">📦</span>
                  <p className="text-sm text-gray-400 font-medium">this hangout has passed</p>
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
