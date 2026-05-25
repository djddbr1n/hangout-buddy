'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Bell, ChevronDown } from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'
import { HangoutCard } from '@/components/hangout/HangoutCard'
import { CreateHangoutSheet } from '@/components/hangout/CreateHangoutSheet'
import { HangoutDetailSheet } from '@/components/hangout/HangoutDetailSheet'
import { FriendFreeStrip } from '@/components/shared/FriendFreeStrip'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase-client'
import { getCache, setCache } from '@/lib/page-cache'
import { sendPushToUser, getFriendFreeBusy } from '@/app/actions'

// ── My Events: folded stack that expands ──────────────────────────────────────
function MyEventsSection({ events, profile, friendIds, onOpen }) {
  const [expanded, setExpanded] = useState(false)
  if (events.length === 0) return null

  const peek = Math.min(events.length - 1, 2)
  const top = events[0]
  const isTopHosting = top.creator_id === profile.id

  return (
    <div className="mb-1">
      {/* section header */}
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center justify-between px-1 mb-3 group"
      >
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-gray-600 uppercase tracking-wide">my events</span>
          <span className="text-[11px] bg-gray-100 text-gray-500 rounded-full px-1.5 py-0.5 font-semibold">
            {events.length}
          </span>
        </div>
        <motion.div animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown size={14} className="text-gray-400" />
        </motion.div>
      </button>

      <AnimatePresence mode="wait">
        {!expanded ? (
          /* ── Collapsed: stacked card peek ── */
          <motion.div
            key="collapsed"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.1 } }}
            className="relative cursor-pointer select-none"
            style={{ paddingBottom: peek * 7 }}
            onClick={() => setExpanded(true)}
          >
            {/* Ghost cards behind (bottom ones first) */}
            {Array.from({ length: peek }).map((_, i) => (
              <div
                key={i}
                className="absolute inset-x-0 bottom-0 bg-white rounded-3xl border border-gray-100"
                style={{
                  height: 88,
                  bottom: i * 7,
                  transform: `scaleX(${1 - (peek - i) * 0.03})`,
                  transformOrigin: 'bottom center',
                  zIndex: i,
                  opacity: 0.35 + i * 0.25,
                }}
              />
            ))}

            {/* Top card — compact preview */}
            <div className="relative z-10 bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="bg-gradient-to-r from-slate-50 to-gray-50 px-5 pt-3.5 pb-3.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                        isTopHosting
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-emerald-100 text-emerald-700'
                      }`}>
                        {isTopHosting ? '🏠 hosting' : '✓ going'}
                      </span>
                      {events.length > 1 && (
                        <span className="text-[11px] text-gray-400 font-medium">+{events.length - 1} more</span>
                      )}
                    </div>
                    <p className="font-bold text-gray-900 text-[15px] leading-snug">{top.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {format(new Date(top.date_time), 'EEE, MMM d · h:mm a')}
                    </p>
                  </div>
                  <span className="text-2xl shrink-0">{top.creator?.avatar_emoji ?? '👤'}</span>
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          /* ── Expanded: labeled full cards ── */
          <motion.div
            key="expanded"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.1 } }}
            className="space-y-4"
          >
            {events.map((h, i) => {
              const hosting = h.creator_id === profile.id
              return (
                <motion.div
                  key={h.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <div className="flex items-center gap-1.5 mb-1.5 px-1">
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                      hosting ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                    }`}>
                      {hosting ? '🏠 hosting' : '✓ going'}
                    </span>
                  </div>
                  <HangoutCard hangout={h} currentUser={profile} friendIds={friendIds} onOpen={onOpen} />
                </motion.div>
              )
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function DashboardPage() {
  const { profile } = useAuth()
  const [hangouts, setHangouts] = useState([])
  const [friendIds, setFriendIds] = useState([])
  const [friendProfiles, setFriendProfiles] = useState({})
  const [friendFreeBusy, setFriendFreeBusy] = useState({})
  const [calLoading, setCalLoading] = useState(false)
  const [invitedHangoutIds, setInvitedHangoutIds] = useState(new Set())
  const [unreadCount, setUnreadCount] = useState(0)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [detailHangout, setDetailHangout] = useState(null)
  const [editHangout, setEditHangout] = useState(null)

  // ── Deep-link: ?hangout=<id> from push notification click ────────────────
  const [pendingHangoutId, setPendingHangoutId] = useState(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const id = params.get('hangout')
    if (id) {
      setPendingHangoutId(id)
      // Clean the URL without a reload
      window.history.replaceState({}, '', '/dashboard')
    }
  }, [])

  useEffect(() => {
    if (!pendingHangoutId || hangouts.length === 0) return
    const found = hangouts.find(h => h.id === pendingHangoutId)
    if (found) {
      setDetailHangout(found)
      setPendingHangoutId(null)
    }
  }, [pendingHangoutId, hangouts])

  // ── Filters ───────────────────────────────────────────────────────────────
  const [activeTimeBlock, setActiveTimeBlock] = useState(null)
  const [filterFriendsGoing, setFilterFriendsGoing] = useState(false)
  const [filterHasSpots, setFilterHasSpots] = useState(false)
  const [filterToday, setFilterToday] = useState(false)

  useEffect(() => {
    if (!profile) return
    const cached = getCache(`dashboard-${profile.id}`)
    if (cached) {
      setHangouts(cached.hangouts)
      setFriendIds(cached.friendIds)
      setInvitedHangoutIds(cached.invitedHangoutIds)
    }
    fetchData()
  }, [profile?.id])

  async function fetchData() {
    const supabase = createClient()

    const [{ data: friendships }, { data: hangoutsData }, { data: inviteData }, { count: unread }, { data: reverseGrants }] = await Promise.all([
      supabase.from('friendships')
        .select('friend_id, friend:profiles!friend_id(id,name,nickname,avatar_emoji)')
        .eq('user_id', profile.id).eq('status', 'accepted'),
      supabase.from('hangout_posts')
        .select('*, creator:profiles!creator_id(id,name,nickname,avatar_emoji), rsvps(*, user:profiles!user_id(id,name,nickname,avatar_emoji))')
        .gte('date_time', new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString())
        .order('date_time', { ascending: true }),
      supabase.from('notifications').select('hangout_id').eq('user_id', profile.id).eq('type', 'invite').not('hangout_id', 'is', null),
      supabase.from('notifications').select('*', { count: 'exact', head: true }).eq('user_id', profile.id).eq('read', false),
      // What each friend has granted ME (for GCal access)
      supabase.from('friendships').select('user_id, auth_level').eq('friend_id', profile.id).eq('status', 'accepted'),
    ])

    const ids = (friendships ?? []).map(f => f.friend_id)
    const hangoutList = hangoutsData ?? []
    const invitedIds = new Set((inviteData ?? []).map(n => n.hangout_id))

    // Build friend profile map
    const profileMap = {}
    for (const f of friendships ?? []) {
      if (f.friend) profileMap[f.friend_id] = f.friend
    }

    // Build reverse auth map
    const reverseMap = {}
    for (const r of reverseGrants ?? []) reverseMap[r.user_id] = r.auth_level

    setFriendIds(ids)
    setFriendProfiles(profileMap)
    setHangouts(hangoutList)
    setInvitedHangoutIds(invitedIds)
    setUnreadCount(unread ?? 0)
    setCache(`dashboard-${profile.id}`, { hangouts: hangoutList, friendIds: ids, invitedHangoutIds: invitedIds })

    // Fire off GCal fetches for friends who granted us access — non-blocking
    const calFriends = ids.filter(id => reverseMap[id] === 'can_see_availability')
    if (calFriends.length > 0) {
      setCalLoading(true)
      Promise.all(calFriends.map(id => getFriendFreeBusy(id).then(r => ({ id, ...r }))))
        .then(results => {
          const fbMap = {}
          for (const r of results) { if (r.connected) fbMap[r.id] = r.busy ?? [] }
          setFriendFreeBusy(fbMap)
        })
        .finally(() => setCalLoading(false))
    }
  }

  const updateHangoutRsvps = (hangoutId, userId, status, userObj) =>
    (h) => {
      if (h.id !== hangoutId) return h
      const filtered = (h.rsvps ?? []).filter(r => r.user_id !== userId)
      const rsvps = status
        ? [...filtered, { id: `rsvp-${Date.now()}`, hangout_id: hangoutId, user_id: userId, status, created_at: new Date().toISOString(), user: userObj }]
        : filtered
      return { ...h, rsvps }
    }

  const handleRSVP = async (hangoutId, status) => {
    if (!profile) return
    const supabase = createClient()
    if (status) {
      await supabase.from('rsvps').upsert({ hangout_id: hangoutId, user_id: profile.id, status })
      const hangout = hangouts.find(h => h.id === hangoutId)
      if (hangout && hangout.creator_id !== profile.id) {
        await supabase.from('notifications').insert({
          user_id: hangout.creator_id,
          type: 'rsvp',
          actor_id: profile.id,
          actor_name: profile.name,
          hangout_id: hangoutId,
          hangout_title: hangout.title,
        })
        sendPushToUser(hangout.creator_id, `${profile.name} is going!`, `"${hangout.title}" has a new RSVP`).catch(() => {})
      }
    } else {
      await supabase.from('rsvps').delete().eq('hangout_id', hangoutId).eq('user_id', profile.id)
    }
    const updater = updateHangoutRsvps(hangoutId, profile.id, status, profile)
    setHangouts(prev => prev.map(updater))
    setDetailHangout(prev => prev ? updater(prev) : null)
  }

  const handleCreate = async (post) => {
    if (!profile) return
    const supabase = createClient()
    const { data } = await supabase
      .from('hangout_posts')
      .insert({
        creator_id: profile.id,
        title: post.title,
        description: post.description,
        activity: post.activity,
        location: post.location,
        date_time: post.date_time,
        duration_minutes: post.duration_minutes ?? 120,
        min_people: post.min_people ?? 1,
        max_people: post.max_people ?? 2,
        status: 'open',
        is_surprise: post.is_surprise ?? false,
        surprise_options: post.surprise_options,
      })
      .select('*, creator:profiles!creator_id(id,name,nickname,avatar_emoji)')
      .single()
    if (data) {
      setHangouts(prev => [{ ...data, rsvps: [] }, ...prev])
      // notify friends about new hangout (fire-and-forget)
      const supabase2 = createClient()
      supabase2.from('friendships').select('friend_id').eq('user_id', profile.id).eq('status', 'accepted')
        .then(({ data: friends }) => {
          const timeStr = format(new Date(data.date_time), 'EEE MMM d · h:mm a')
          for (const { friend_id } of friends ?? []) {
            sendPushToUser(
              friend_id,
              `${profile.name} posted a hangout`,
              `"${data.title}" · ${timeStr}`,
              `/dashboard?hangout=${data.id}`
            ).catch(() => {})
          }
        })
    }
  }

  const handleEdit = async (post) => {
    if (!editHangout) return
    const supabase = createClient()
    const { data } = await supabase
      .from('hangout_posts')
      .update({
        title: post.title,
        description: post.description,
        location: post.location,
        date_time: post.date_time,
        duration_minutes: post.duration_minutes ?? 120,
        min_people: post.min_people,
        max_people: post.max_people,
        is_surprise: post.is_surprise,
        activity: post.activity,
      })
      .eq('id', editHangout.id)
      .select('*, creator:profiles!creator_id(id,name,nickname,avatar_emoji)')
      .single()
    if (data) {
      const updated = { ...data, rsvps: editHangout.rsvps }
      setHangouts(prev => prev.map(h => h.id === editHangout.id ? updated : h))
    }
    setEditHangout(null)
  }

  // ── Filter logic ─────────────────────────────────────────────────────────
  const BLOCK_HOURS = {
    early_morning: [0, 10],
    brunch:        [10, 14],
    afternoon:     [14, 17],
    dinner:        [17, 20],
    late_night:    [20, 24],
  }

  function matchesFilters(h) {
    if (activeTimeBlock) {
      const hr = new Date(h.date_time).getHours()
      const [min, max] = BLOCK_HOURS[activeTimeBlock]
      if (hr < min || hr >= max) return false
    }
    if (filterToday) {
      const today = new Date().toDateString()
      if (new Date(h.date_time).toDateString() !== today) return false
    }
    if (filterFriendsGoing) {
      if (!h.rsvps?.some(r => friendIds.includes(r.user_id))) return false
    }
    if (filterHasSpots) {
      const going = h.rsvps?.filter(r => r.status === 'going').length ?? 0
      if (h.max_people - 1 - going <= 0) return false
    }
    return true
  }

  const hasActiveFilter = activeTimeBlock || filterFriendsGoing || filterHasSpots || filterToday

  if (!profile) return null

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="px-5 pt-14 pb-4">
        <div className="flex items-center justify-between max-w-md mx-auto mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">what's up</h1>
            <p className="text-sm text-gray-400 mt-0.5">
              {hangouts.length > 0 ? `${hangouts.length} open hangout${hangouts.length === 1 ? '' : 's'}` : 'nothing yet'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/notifications" className="relative w-10 h-10 rounded-2xl bg-white border border-gray-100 flex items-center justify-center shadow-sm">
              <Bell size={18} className="text-gray-500" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4.5 h-4.5 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center min-w-[18px] px-1">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Link>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => setSheetOpen(true)}
              className="w-10 h-10 rounded-2xl bg-violet-500 flex items-center justify-center shadow-lg shadow-violet-200"
            >
              <Plus size={20} className="text-white" strokeWidth={2.5} />
            </motion.button>
          </div>
        </div>
        <div className="max-w-md mx-auto">
          <FriendFreeStrip
            friendFreeBusy={friendFreeBusy}
            friendProfiles={friendProfiles}
            activeBlock={activeTimeBlock}
            onBlockClick={setActiveTimeBlock}
            calLoading={calLoading}
          />
        </div>
      </div>

      {/* ── Filter chips bar ─────────────────────────────────────────────── */}
      <div className="max-w-md mx-auto px-4 mb-1">
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {/* Social / status filters */}
          {[
            { key: 'today',        label: '📅 today',          active: filterToday,        toggle: () => setFilterToday(v => !v) },
            { key: 'friends',      label: '👥 friends going',   active: filterFriendsGoing, toggle: () => setFilterFriendsGoing(v => !v) },
            { key: 'spots',        label: '🟢 has spots',       active: filterHasSpots,     toggle: () => setFilterHasSpots(v => !v) },
          ].map(f => (
            <motion.button
              key={f.key}
              whileTap={{ scale: 0.94 }}
              onClick={f.toggle}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                f.active
                  ? 'bg-violet-500 text-white shadow-sm shadow-violet-200'
                  : 'bg-white text-gray-500 border border-gray-200'
              }`}
            >
              {f.label}
            </motion.button>
          ))}

          {/* Clear all */}
          {hasActiveFilter && (
            <motion.button
              whileTap={{ scale: 0.94 }}
              onClick={() => { setActiveTimeBlock(null); setFilterFriendsGoing(false); setFilterHasSpots(false); setFilterToday(false) }}
              className="px-3 py-1.5 rounded-full text-xs font-semibold text-gray-400 border border-dashed border-gray-300 whitespace-nowrap"
            >
              clear
            </motion.button>
          )}
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 pb-32">
        {(() => {
          const now = new Date()
          const hangoutEndTime = h => new Date(new Date(h.date_time).getTime() + (h.duration_minutes ?? 120) * 60_000)
          const upcomingHangouts = hangouts.filter(h => hangoutEndTime(h) > now)
          const myEvents = upcomingHangouts.filter(h =>
            h.creator_id === profile.id ||
            h.rsvps?.some(r => r.user_id === profile.id && r.status === 'going')
          )
          const myEventIds = new Set(myEvents.map(h => h.id))
          // Apply filters only to the feed (my events always visible)
          const feedHangouts = upcomingHangouts
            .filter(h => !myEventIds.has(h.id))
            .filter(matchesFilters)

          return (
            <div className="space-y-5">
              {/* ── My events (folded) ── */}
              <MyEventsSection
                events={myEvents}
                profile={profile}
                friendIds={friendIds}
                onOpen={setDetailHangout}
              />

              {/* ── All hangouts feed ── */}
              {feedHangouts.length === 0 && myEvents.length === 0 ? (
                <div className="text-center py-20">
                  <p className="font-semibold text-gray-500">nothing yet</p>
                  <p className="text-sm mt-1 text-gray-400">post a hangout and see who's down</p>
                </div>
              ) : (
                <div>
                  <div className="flex items-center justify-between px-1 mb-3">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">
                      all hangouts
                    </p>
                    {hasActiveFilter && (
                      <span className="text-xs text-violet-500 font-semibold">
                        {feedHangouts.length} match{feedHangouts.length !== 1 ? 'es' : ''}
                      </span>
                    )}
                  </div>

                  {feedHangouts.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-2xl border border-gray-100">
                      <p className="text-2xl mb-2">🔍</p>
                      <p className="font-semibold text-gray-500 text-sm">no hangouts match</p>
                      <button
                        onClick={() => { setActiveTimeBlock(null); setFilterFriendsGoing(false); setFilterHasSpots(false); setFilterToday(false) }}
                        className="text-xs text-violet-500 font-medium mt-2"
                      >
                        clear filters
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {feedHangouts.map((h, i) => (
                        <motion.div
                          key={h.id}
                          initial={{ opacity: 0, y: 16 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.05 }}
                        >
                          <HangoutCard
                            hangout={h}
                            currentUser={profile}
                            friendIds={friendIds}
                            onOpen={setDetailHangout}
                            isInvited={invitedHangoutIds.has(h.id)}
                          />
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })()}
      </div>

      <CreateHangoutSheet open={sheetOpen} onClose={() => setSheetOpen(false)} onCreate={handleCreate} />
      <CreateHangoutSheet open={!!editHangout} onClose={() => setEditHangout(null)} editHangout={editHangout} onEdit={handleEdit} />
      <HangoutDetailSheet
        hangout={detailHangout}
        open={!!detailHangout}
        currentUser={profile}
        friendIds={friendIds}
        onClose={() => setDetailHangout(null)}
        onRSVP={handleRSVP}
        onEdit={h => { setDetailHangout(null); setEditHangout(h) }}
      />
    </div>
  )
}
