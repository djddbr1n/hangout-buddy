'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { LogOut, Settings, X, Bell, BellOff, Smartphone, ChevronDown, Archive, ChevronRight } from 'lucide-react'
import { format } from 'date-fns'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-client'
import { usePush } from '@/hooks/usePush'
import { HangoutDetailSheet } from '@/components/hangout/HangoutDetailSheet'

function PastHangoutCard({ hangout, profileId, onOpen }) {
  const isHost    = hangout.creator_id === profileId
  const myRsvp    = hangout.rsvps?.find(r => r.user_id === profileId)
  const wentCount = hangout.rsvps?.filter(r => r.status === 'going').length ?? 0

  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      onClick={() => onOpen(hangout)}
      className="w-full flex items-center gap-3 py-2.5 border-b border-gray-50 last:border-0 text-left"
    >
      <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center text-lg shrink-0">
        {hangout.creator?.avatar_emoji ?? '👤'}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-500 truncate">{hangout.title}</p>
        <p className="text-xs text-gray-400 mt-0.5">
          {format(new Date(hangout.date_time), 'MMM d, yyyy · h:mm a')}
          {wentCount > 0 && ` · ${wentCount} went`}
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {isHost && (
          <span className="text-[10px] font-semibold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">hosted</span>
        )}
        {!isHost && myRsvp?.status === 'going' && (
          <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">went</span>
        )}
        <ChevronRight size={13} className="text-gray-300" />
      </div>
    </motion.button>
  )
}

const TIME_BLOCKS = [
  { key: 'early_morning', emoji: '🌅', label: 'Early', time: 'before 10am' },
  { key: 'brunch',        emoji: '☕', label: 'Brunch', time: '10am – 2pm' },
  { key: 'afternoon',     emoji: '🌤', label: 'Afternoon', time: '2pm – 5pm' },
  { key: 'dinner',        emoji: '🌆', label: 'Dinner', time: '5pm – 8pm' },
  { key: 'late_night',    emoji: '🌙', label: 'Late', time: 'after 8pm' },
]
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const EMOJIS = ['🦊','🐸','🦋','🐻','🦅','🐼','🦁','🐯','🦄','🐙','🐧','🦜','🐺','🦔','🐝','🐮','🐻‍❄️','🦩']

export default function ProfilePage() {
  const { profile, loading, signOut } = useAuth()
  const router = useRouter()
  const { supported: pushSupported, subscription: pushSub, loading: pushLoading, subscribe: pushSubscribe, unsubscribe: pushUnsubscribe } = usePush(profile?.id)
  const [availability, setAvailability] = useState({})
  const [saving, setSaving] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [editName, setEditName] = useState('')
  const [editAvatar, setEditAvatar] = useState('')
  const [customEmoji, setCustomEmoji] = useState('')
  const [customMode, setCustomMode] = useState(false)
  const [profileSaving, setProfileSaving] = useState(false)
  const [pastHangouts, setPastHangouts] = useState([])
  const [showArchive, setShowArchive] = useState(false)
  const [selectedPast, setSelectedPast] = useState(null)

  useEffect(() => {
    if (!profile) return
    setEditName(profile.name ?? '')
    setEditAvatar(profile.avatar_emoji ?? '🦊')
    const supabase = createClient()
    const now = new Date().toISOString()

    // Fetch availability + past hangouts in parallel
    Promise.all([
      supabase.from('availability').select('day_index,block,available').eq('user_id', profile.id),
      // Past hangouts I hosted
      supabase.from('hangout_posts')
        .select('*, creator:profiles!creator_id(id,name,nickname,avatar_emoji), rsvps(*, user:profiles!user_id(id,name,nickname,avatar_emoji))')
        .eq('creator_id', profile.id)
        .lt('date_time', now)
        .order('date_time', { ascending: false })
        .limit(30),
      // My past RSVPs (to find hangouts I attended but didn't host)
      supabase.from('rsvps').select('hangout_id').eq('user_id', profile.id),
    ]).then(async ([{ data: availData }, { data: hosted }, { data: myRsvps }]) => {
      // Availability
      const avail = {}
      for (const row of availData ?? []) {
        avail[`${row.day_index}-${row.block}`] = row.available
      }
      setAvailability(avail)

      // Past attended hangouts (not hosted by me)
      const rsvpIds = (myRsvps ?? []).map(r => r.hangout_id)
      let attended = []
      if (rsvpIds.length > 0) {
        const { data } = await supabase
          .from('hangout_posts')
          .select('*, creator:profiles!creator_id(id,name,nickname,avatar_emoji), rsvps(*, user:profiles!user_id(id,name,nickname,avatar_emoji))')
          .in('id', rsvpIds)
          .neq('creator_id', profile.id)
          .lt('date_time', now)
          .order('date_time', { ascending: false })
          .limit(30)
        attended = data ?? []
      }

      // Merge, dedupe, sort newest first
      // Only keep events whose end time (start + duration) has passed
      const nowMs = Date.now()
      const hasEnded = h => new Date(h.date_time).getTime() + (h.duration_minutes ?? 120) * 60_000 <= nowMs
      const merged = [...(hosted ?? []), ...attended]
        .filter(hasEnded)
        .sort((a, b) => new Date(b.date_time) - new Date(a.date_time))
      setPastHangouts(merged)
    })
  }, [profile?.id])

  async function toggleCell(dayIndex, block) {
    if (!profile) return
    const key = `${dayIndex}-${block}`
    const next = !availability[key]
    setAvailability(prev => ({ ...prev, [key]: next }))
    setSaving(true)
    const supabase = createClient()
    await supabase.from('availability').upsert({
      user_id: profile.id,
      day_index: dayIndex,
      block,
      available: next,
    })
    setSaving(false)
  }

  async function saveProfile() {
    if (!profile || !editName.trim()) return
    setProfileSaving(true)
    const supabase = createClient()
    await supabase.from('profiles').update({ name: editName.trim(), avatar_emoji: editAvatar }).eq('id', profile.id)
    setProfileSaving(false)
    setShowSettings(false)
    window.location.reload()
  }

  async function handleSignOut() {
    await signOut()
    router.push('/auth/login')
  }

  if (loading) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><p className="text-gray-400 text-sm">loading...</p></div>
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white px-5 pt-12 pb-6 border-b border-gray-100">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-violet-50 border-4 border-violet-100 flex items-center justify-center text-3xl">
              {profile?.avatar_emoji ?? '🦊'}
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">{profile?.name ?? '—'}</h1>
              <p className="text-gray-400 text-sm">@{profile?.nickname ?? '—'}</p>
            </div>
          </div>
          <button
            onClick={() => setShowSettings(true)}
            className="p-2.5 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors"
          >
            <Settings size={18} className="text-gray-400" />
          </button>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-5 space-y-4 pb-28">
        {/* availability editor */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">my availability</p>
            {saving && <p className="text-xs text-violet-400">saving...</p>}
          </div>

          {/* day headers */}
          <div className="grid gap-1 mb-1" style={{ gridTemplateColumns: '72px repeat(7, 1fr)' }}>
            <div />
            {DAYS.map((d, i) => (
              <div key={i} className="text-center text-[10px] font-semibold text-gray-400">{d}</div>
            ))}
          </div>

          {/* block rows */}
          {TIME_BLOCKS.map(({ key: block, emoji, label, time }) => (
            <div key={block} className="grid gap-1 mb-1 items-center" style={{ gridTemplateColumns: '72px repeat(7, 1fr)' }}>
              <div className="flex items-center gap-1.5 pr-1">
                <span className="text-sm leading-none">{emoji}</span>
                <div>
                  <p className="text-[11px] font-semibold text-gray-600 leading-none">{label}</p>
                  <p className="text-[9px] text-gray-400 leading-none mt-0.5">{time}</p>
                </div>
              </div>
              {Array.from({ length: 7 }, (_, dayIndex) => {
                const isFree = availability[`${dayIndex}-${block}`]
                return (
                  <motion.button
                    key={dayIndex}
                    whileTap={{ scale: 0.85 }}
                    onClick={() => toggleCell(dayIndex, block)}
                    className={`h-8 rounded-lg transition-colors ${isFree ? 'bg-emerald-400' : 'bg-gray-100'}`}
                  />
                )
              })}
            </div>
          ))}

          <p className="text-[10px] text-gray-400 text-center mt-2">green = free · tap to toggle</p>
        </div>

        {/* archived hangouts */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <motion.button
            whileTap={{ scale: 0.99 }}
            onClick={() => setShowArchive(v => !v)}
            className="w-full flex items-center justify-between px-4 py-3.5"
          >
            <div className="flex items-center gap-2">
              <Archive size={15} className="text-gray-400" />
              <span className="text-sm font-semibold text-gray-600">past hangouts</span>
              {pastHangouts.length > 0 && (
                <span className="text-[11px] bg-gray-100 text-gray-400 rounded-full px-1.5 py-0.5 font-semibold">
                  {pastHangouts.length}
                </span>
              )}
            </div>
            <motion.div animate={{ rotate: showArchive ? 180 : 0 }} transition={{ duration: 0.2 }}>
              <ChevronDown size={14} className="text-gray-300" />
            </motion.div>
          </motion.button>

          <AnimatePresence>
            {showArchive && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="px-4 pb-3 border-t border-gray-50">
                  {pastHangouts.length === 0 ? (
                    <div className="py-8 text-center">
                      <p className="text-2xl mb-2">📭</p>
                      <p className="text-sm text-gray-400">no past hangouts yet</p>
                    </div>
                  ) : (
                    pastHangouts.map(h => (
                      <PastHangoutCard
                        key={h.id}
                        hangout={h}
                        profileId={profile.id}
                        onOpen={setSelectedPast}
                      />
                    ))
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* sign out */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 transition-colors text-red-400"
          >
            <LogOut size={18} />
            <span className="text-sm font-medium">sign out</span>
          </motion.button>
        </div>
      </div>

      {/* settings sheet */}
      <AnimatePresence>
        {showSettings && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowSettings(false)}
              className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl max-h-[85vh] overflow-y-auto"
            >
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 rounded-full bg-gray-200" />
              </div>
              <div className="px-5 pb-10 space-y-5">
                <div className="flex items-center justify-between pt-2">
                  <h2 className="text-lg font-bold text-gray-900">edit profile</h2>
                  <button onClick={() => setShowSettings(false)} className="p-2 rounded-full hover:bg-gray-100">
                    <X size={16} className="text-gray-400" />
                  </button>
                </div>

                {/* avatar picker */}
                <div>
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">avatar</label>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {EMOJIS.map(e => (
                      <motion.button
                        key={e}
                        whileTap={{ scale: 0.85 }}
                        onClick={() => { setEditAvatar(e); setCustomMode(false) }}
                        className={`w-10 h-10 rounded-xl text-xl flex items-center justify-center transition-all ${
                          editAvatar === e && !customMode ? 'bg-violet-100 ring-2 ring-violet-400 scale-110' : 'bg-gray-50 hover:bg-gray-100'
                        }`}
                      >
                        {e}
                      </motion.button>
                    ))}
                    <motion.button
                      whileTap={{ scale: 0.85 }}
                      onClick={() => setCustomMode(true)}
                      className={`w-10 h-10 rounded-xl text-xs font-semibold flex items-center justify-center transition-all ${
                        customMode ? 'bg-violet-100 ring-2 ring-violet-400' : 'bg-gray-50 hover:bg-gray-100 text-gray-400'
                      }`}
                    >
                      ✏️
                    </motion.button>
                  </div>
                  {customMode && (
                    <div className="mt-2">
                      <input
                        autoFocus
                        maxLength={2}
                        placeholder="type any emoji"
                        className="w-full rounded-xl border border-violet-300 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                        onChange={e => {
                          const val = [...e.target.value].slice(-1).join('')
                          if (val) { setEditAvatar(val); setCustomEmoji(val) }
                        }}
                      />
                      <p className="text-xs text-gray-400 mt-1">preview: <span className="text-lg">{editAvatar}</span></p>
                    </div>
                  )}
                </div>

                {/* name */}
                <div>
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">display name</label>
                  <input
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                  />
                </div>

                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={saveProfile}
                  disabled={profileSaving || !editName.trim()}
                  className="w-full py-3 rounded-2xl bg-violet-500 text-white font-semibold text-sm disabled:opacity-40"
                >
                  {profileSaving ? 'saving...' : 'save changes'}
                </motion.button>

                {/* push notifications */}
                {pushSupported && (
                  <div className="pt-2 border-t border-gray-100">
                    <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">notifications</label>
                    <div className="mt-2 flex items-center justify-between bg-gray-50 rounded-2xl px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        {pushSub ? <Bell size={16} className="text-violet-500" /> : <BellOff size={16} className="text-gray-400" />}
                        <div>
                          <p className="text-sm font-medium text-gray-800">{pushSub ? 'notifications on' : 'notifications off'}</p>
                          <p className="text-xs text-gray-400">{pushSub ? 'you\'ll get push alerts' : 'tap to enable'}</p>
                        </div>
                      </div>
                      <motion.button
                        whileTap={{ scale: 0.92 }}
                        onClick={pushSub ? pushUnsubscribe : pushSubscribe}
                        disabled={pushLoading}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors disabled:opacity-40 ${
                          pushSub ? 'bg-gray-200 text-gray-600' : 'bg-violet-500 text-white'
                        }`}
                      >
                        {pushLoading ? '…' : pushSub ? 'turn off' : 'enable'}
                      </motion.button>
                    </div>
                    {!pushSub && (
                      <p className="text-[10px] text-gray-400 mt-1.5 flex items-center gap-1 px-1">
                        <Smartphone size={10} /> on iPhone: add to home screen first, then enable here
                      </p>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* past hangout detail sheet */}
      <HangoutDetailSheet
        hangout={selectedPast}
        open={!!selectedPast}
        currentUser={profile}
        friendIds={[]}
        onClose={() => setSelectedPast(null)}
        onRSVP={null}
        onEdit={null}
        isPast
      />
    </div>
  )
}
