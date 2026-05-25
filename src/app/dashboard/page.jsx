'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Bell, ChevronDown, ChevronRight, CalendarDays, Users, Calendar, Home } from 'lucide-react'
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
import { downloadICS } from '@/lib/ics'
import { pickNotifTemplate } from '@/lib/notif-templates'

// ── My Events: single cohesive card with event rows ──────────────────────────
function MyEventsSection({ events, profile, onOpen }) {
  const [expanded, setExpanded] = useState(true)
  if (events.length === 0) return null

  return (
    <div className="mb-1">
      <div className="bg-gray-50 rounded-2xl overflow-hidden">
        {/* header row — tap to collapse */}
        <button
          onClick={() => setExpanded(v => !v)}
          className="w-full flex items-center justify-between px-5 py-3.5 border-b border-gray-100"
        >
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-violet-500 uppercase tracking-wide">my events</span>
            <span className="text-[11px] bg-violet-500 text-white rounded-full px-1.5 py-0.5 font-semibold leading-none">
              {events.length}
            </span>
          </div>
          <motion.div animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
            <ChevronDown size={14} className="text-violet-400" />
          </motion.div>
        </button>

        {/* event rows */}
        <AnimatePresence initial={false}>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              {events.map((h, i) => {
                const hosting    = h.creator_id === profile.id
                // Host is always "going" — count them + any going RSVPs (excluding host if they somehow RSVPd)
                const goingRsvps = h.rsvps?.filter(r => r.status === 'going' && r.user_id !== h.creator_id).length ?? 0
                const goingCount = goingRsvps + 1
                return (
                  <motion.button
                    key={h.id}
                    whileTap={{ scale: 0.99 }}
                    onClick={() => onOpen(h)}
                    className={`w-full flex items-center gap-3 px-5 py-3.5 text-left transition-colors active:bg-gray-100 ${
                      i < events.length - 1 ? 'border-b border-gray-100' : ''
                    }`}
                  >
                    <span className="text-2xl shrink-0">{h.creator?.avatar_emoji ?? '👤'}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 text-sm leading-snug truncate">{h.title}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {format(new Date(h.date_time), 'EEE, MMM d · h:mm a')}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {goingCount > 0 && (
                        <span className="text-[10px] text-gray-400">{goingCount} going</span>
                      )}
                      <span className={`text-[10px] font-semibold px-2 py-1 rounded-full flex items-center gap-1 ${
                        hosting ? 'bg-violet-100 text-violet-700' : 'bg-emerald-100 text-emerald-700'
                      }`}>
                        {hosting ? <><Home size={9} /> host</> : '✓ going'}
                      </span>
                      <ChevronRight size={13} className="text-gray-300" />
                    </div>
                  </motion.button>
                )
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
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
  const [prefillData, setPrefillData] = useState(null)
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
  const [filterDate, setFilterDate] = useState('')   // YYYY-MM-DD; exclusive with time blocks
  const [filterToday, setFilterToday] = useState(false)
  const dateInputRef = useRef(null)

  // Time block + date are exclusive — helper that clears the other
  const handleTimeBlockClick = (block) => { setActiveTimeBlock(block); if (block) setFilterDate('') }
  const handleDateChange = (val) => { setFilterDate(val); if (val) { setActiveTimeBlock(null); setFilterToday(false) } }

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
    const { data, error: createError } = await supabase
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
        max_people: post.max_people ?? 4,
        allow_plus_ones: post.allow_plus_ones ?? false,
        status: 'open',
        is_surprise: post.is_surprise ?? false,
        surprise_options: post.surprise_options,
      })
      .select('*, creator:profiles!creator_id(id,name,nickname,avatar_emoji), rsvps(*, user:profiles!user_id(id,name,nickname,avatar_emoji))')
      .single()
    if (!data) { console.error('create hangout failed — run migration: alter table hangout_posts add column if not exists allow_plus_ones boolean not null default false;'); return }
    if (data) {
      setHangouts(prev => [{ ...data }, ...prev])
      // notify friends about new hangout (fire-and-forget)
      const supabase2 = createClient()
      supabase2.from('friendships').select('friend_id').eq('user_id', profile.id).eq('status', 'accepted')
        .then(({ data: friends }) => {
          for (const { friend_id } of friends ?? []) {
            // Each friend gets their own randomly-picked template
            const { title: notifTitle, body: notifBody } = pickNotifTemplate({
              posterName: profile.name,
              title: data.title,
              date_time: data.date_time,
              max_people: data.max_people,
            })
            sendPushToUser(friend_id, notifTitle, notifBody, `/dashboard?hangout=${data.id}`, 'high').catch(() => {})
          }
        })
    }
  }

  const handleAddFriend = async (userId) => {
    if (!profile) return
    const supabase = createClient()
    const { data: existing } = await supabase
      .from('friendships').select('id')
      .or(`and(user_id.eq.${profile.id},friend_id.eq.${userId}),and(user_id.eq.${userId},friend_id.eq.${profile.id})`)
    if (existing?.length > 0) return
    await supabase.from('friendships').insert({ user_id: profile.id, friend_id: userId, status: 'pending', auth_level: 'invite_only' })
    await supabase.from('notifications').insert({ user_id: userId, type: 'friend_request', actor_id: profile.id, actor_name: profile.name })
    sendPushToUser(userId, 'new friend request', `${profile.name} wants to be friends`).catch(() => {})
  }

  const handleInviteFriend = async (hangout, friendId) => {
    const supabase = createClient()
    const friend = friendProfiles[friendId]
    await supabase.from('notifications').insert({
      user_id: friendId,
      type: 'invite',
      actor_id: profile.id,
      actor_name: profile.name,
      hangout_id: hangout.id,
      hangout_title: hangout.title,
    })
    sendPushToUser(
      friendId,
      `${profile.name} wants you at "${hangout.title}"`,
      `${format(new Date(hangout.date_time), 'EEE MMM d · h:mm a')} — tap to see it`,
      `/dashboard?hangout=${hangout.id}`
    ).catch(() => {})
  }

  const handleDelete = async (hangoutId) => {
    const hangout = hangouts.find(h => h.id === hangoutId)
    const supabase = createClient()
    await supabase.from('hangout_posts').delete().eq('id', hangoutId)
    setHangouts(prev => prev.filter(h => h.id !== hangoutId))
    setDetailHangout(null)

    // Notify everyone who RSVPed going (except the host)
    const goingRSVPs = (hangout?.rsvps ?? []).filter(r => r.status === 'going' && r.user_id !== profile.id)
    for (const rsvp of goingRSVPs) {
      supabase.from('notifications').insert({
        user_id: rsvp.user_id,
        type: 'canceled',
        actor_id: profile.id,
        actor_name: profile.name,
        hangout_id: hangoutId,
        hangout_title: hangout.title,
      }).catch(() => {})
      sendPushToUser(
        rsvp.user_id,
        `"${hangout.title}" was canceled`,
        `${profile.name} called it off`,
      ).catch(() => {})
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
        allow_plus_ones: post.allow_plus_ones ?? false,
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
    const eventDate = new Date(h.date_time)
    if (activeTimeBlock) {
      // Time block = today only, within that hour window
      if (eventDate.toDateString() !== new Date().toDateString()) return false
      const hr = eventDate.getHours()
      const [min, max] = BLOCK_HOURS[activeTimeBlock]
      if (hr < min || hr >= max) return false
    }
    if (filterDate) {
      // Date picker: YYYY-MM-DD local compare
      const localDate = `${eventDate.getFullYear()}-${String(eventDate.getMonth()+1).padStart(2,'0')}-${String(eventDate.getDate()).padStart(2,'0')}`
      if (localDate !== filterDate) return false
    }
    if (filterToday) {
      if (eventDate.toDateString() !== new Date().toDateString()) return false
    }
    if (filterFriendsGoing) {
      if (!h.rsvps?.some(r => friendIds.includes(r.user_id))) return false
    }
    return true
  }

  const hasActiveFilter = activeTimeBlock || filterFriendsGoing || filterDate || filterToday

  // ── Quick-create prefill ──────────────────────────────────────────────────
  function generatePrefill(timeBlock) {
    // All times/hours are LOCAL to the user's device — new Date() in the browser
    // always uses the user's timezone, so this is correct for everyone worldwide.
    const BLOCKS = {
      early_morning: { hour: 9,  min: 0,  ideas: ['morning coffee run', 'sunrise hike', 'farmers market trip', 'breakfast run', 'early yoga sesh'] },
      brunch:        { hour: 11, min: 0,  ideas: ['brunch run', 'mimosa brunch', 'bagel run', 'bottomless brunch', 'açaí bowl run'] },
      afternoon:     { hour: 14, min: 0,  ideas: ['boba run', 'museum day', 'park hang', 'thrift store trip', 'board game café', 'matcha run'] },
      dinner:        { hour: 18, min: 30, ideas: ['dinner run', 'happy hour', 'cook together', 'sushi night', 'taco night', 'ramen run'] },
      late_night:    { hour: 21, min: 0,  ideas: ['poker night', 'movie night', 'late night ramen', 'karaoke night', 'bar crawl', 'night market run'] },
    }

    const now = new Date()
    const pad = n => String(n).padStart(2, '0')
    const toInputStr = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
    const pick = arr => arr[Math.floor(Math.random() * arr.length)]

    if (timeBlock && BLOCKS[timeBlock]) {
      // Active filter: use that block's canonical time + ideas
      const { hour, min, ideas } = BLOCKS[timeBlock]
      const dt = new Date(now)
      dt.setHours(hour, min, 0, 0)
      if (dt <= now) dt.setDate(dt.getDate() + 1)
      return { title: pick(ideas), date_time: toInputStr(dt) }
    }

    // No filter: suggest 1 hour from now (on the hour), time-appropriate activities
    const dt = new Date(now)
    dt.setHours(now.getHours() + 1, 0, 0, 0)

    // If we've rolled past midnight, switch to tomorrow 9am with morning ideas
    if (dt.getDate() !== now.getDate()) {
      dt.setDate(now.getDate() + 1)
      dt.setHours(9, 0, 0, 0)
      return { title: pick(BLOCKS.early_morning.ideas), date_time: toInputStr(dt) }
    }

    const h = dt.getHours()
    let ideas
    if      (h < 10) ideas = BLOCKS.early_morning.ideas
    else if (h < 14) ideas = BLOCKS.brunch.ideas
    else if (h < 17) ideas = BLOCKS.afternoon.ideas
    else if (h < 21) ideas = BLOCKS.dinner.ideas
    else             ideas = BLOCKS.late_night.ideas

    return { title: pick(ideas), date_time: toInputStr(dt) }
  }

  function openQuickCreate() {
    setPrefillData(generatePrefill(activeTimeBlock))
    setSheetOpen(true)
  }

  if (!profile) return null

  return (
    <div className="min-h-screen bg-violet-100">
      {/* ── Header + filters on a gradient background ── */}
      <div className="bg-gradient-to-b from-violet-100 via-violet-50/60 to-white px-5 pt-12 pb-4">
        {/* Top row: title + actions */}
        <div className="max-w-md mx-auto flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold text-gray-900">
            {(() => {
              const h = new Date().getHours()
              if (h < 10) return 'plans today?'
              if (h < 14) return "who's free?"
              if (h < 17) return 'afternoon plans?'
              if (h < 20) return "what's the move?"
              return 'still down for something?'
            })()}
          </h1>
          <div className="flex items-center gap-2">
            <Link href="/notifications" className="relative w-9 h-9 rounded-xl bg-white/80 border border-white flex items-center justify-center shadow-sm">
              <Bell size={16} className="text-gray-500" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[16px] h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center px-1">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Link>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => setSheetOpen(true)}
              className="w-9 h-9 rounded-xl bg-violet-500 flex items-center justify-center shadow-md shadow-violet-200"
            >
              <Plus size={18} className="text-white" strokeWidth={2.5} />
            </motion.button>
          </div>
        </div>

        {/* Time blocks (FriendFreeStrip) */}
        <div className="max-w-md mx-auto">
          <FriendFreeStrip
            friendFreeBusy={friendFreeBusy}
            friendProfiles={friendProfiles}
            activeBlock={activeTimeBlock}
            onBlockClick={handleTimeBlockClick}
            calLoading={calLoading}
          />
        </div>

        {/* Social + date filter chips */}
        <div className="max-w-md mx-auto flex gap-2 overflow-x-auto pb-1 no-scrollbar mt-2">
          <motion.button
            whileTap={{ scale: 0.94 }}
            onClick={() => { setFilterToday(v => !v); setFilterDate('') }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all shrink-0 ${
              filterToday ? 'bg-violet-500 text-white shadow-sm shadow-violet-200' : 'bg-white text-violet-400 border border-violet-100'
            }`}
          >
            <CalendarDays size={11} /> today
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.94 }}
            onClick={() => setFilterFriendsGoing(v => !v)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all shrink-0 ${
              filterFriendsGoing ? 'bg-violet-500 text-white shadow-sm shadow-violet-200' : 'bg-white text-violet-400 border border-violet-100'
            }`}
          >
            <Users size={11} /> friends going
          </motion.button>

          {/* Date picker — label+input is the only reliable way to open native picker on iOS */}
          <label className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all shrink-0 cursor-pointer ${
            filterDate ? 'bg-violet-500 text-white shadow-sm shadow-violet-200' : 'bg-white text-violet-400 border border-violet-100'
          }`}>
            <Calendar size={11} />
            {filterDate
              ? new Date(filterDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
              : 'pick date'}
            <input
              type="date"
              value={filterDate}
              onChange={e => handleDateChange(e.target.value)}
              className="sr-only"
            />
          </label>

          {hasActiveFilter && (
            <motion.button
              whileTap={{ scale: 0.94 }}
              onClick={() => { setActiveTimeBlock(null); setFilterFriendsGoing(false); setFilterDate(''); setFilterToday(false) }}
              className="px-3 py-1.5 rounded-full text-xs font-semibold text-gray-400 bg-white/80 border border-white shadow-sm whitespace-nowrap shrink-0"
            >
              clear
            </motion.button>
          )}
        </div>
      </div>

      <div className="bg-white">
      <div className="max-w-md mx-auto px-4 pb-28">
        {(() => {
          const now = new Date()
          const hangoutEndTime = h => new Date(new Date(h.date_time).getTime() + (h.duration_minutes ?? 120) * 60_000)
          const upcomingHangouts = hangouts.filter(h => hangoutEndTime(h) > now)
          const myEvents = upcomingHangouts.filter(h =>
            h.creator_id === profile.id ||
            h.rsvps?.some(r => r.user_id === profile.id && r.status === 'going')
          )
          const myEventIds = new Set(myEvents.map(h => h.id))
          // Feed: exclude my events, auto-hide full hangouts, apply active filters
          const feedHangouts = upcomingHangouts
            .filter(h => !myEventIds.has(h.id))
            .filter(h => {
              // Auto-exclude hangouts with no spots remaining
              const going = h.rsvps?.filter(r => r.status === 'going' && r.user_id !== h.creator_id).length ?? 0
              return h.max_people - 1 - going > 0
            })
            .filter(matchesFilters)

          return (
            <div className="space-y-5">
              {/* ── My events (folded) ── */}
              <MyEventsSection
                events={myEvents}
                profile={profile}
                onOpen={setDetailHangout}
              />

              {/* ── All hangouts feed ── */}
              {feedHangouts.length === 0 && myEvents.length === 0 ? (
                <div className="text-center py-20">
                  <p className="font-semibold text-gray-500">nothing yet</p>
                  <p className="text-sm mt-1 text-gray-400">be the first to post something</p>
                  <motion.button
                    whileTap={{ scale: 0.96 }}
                    onClick={openQuickCreate}
                    className="mt-4 px-4 py-2 rounded-2xl bg-violet-500 text-white text-sm font-semibold shadow-sm shadow-violet-200"
                  >
                    start one
                  </motion.button>
                </div>
              ) : (
                <div>
                  <div className="flex items-center justify-between px-1 mb-3">
                    <p className="text-xs font-bold text-violet-400 uppercase tracking-wide">
                      all hangouts
                    </p>
                    {hasActiveFilter && (
                      <span className="text-xs text-violet-500 font-semibold">
                        {feedHangouts.length} match{feedHangouts.length !== 1 ? 'es' : ''}
                      </span>
                    )}
                  </div>

                  {feedHangouts.length === 0 ? (
                    <div className="text-center py-12 bg-gray-50 rounded-2xl">
                      <p className="text-2xl mb-2">🔍</p>
                      <p className="font-semibold text-gray-500 text-sm">no hangouts match</p>
                      <div className="flex items-center justify-center gap-3 mt-3">
                        <button
                          onClick={() => { setActiveTimeBlock(null); setFilterFriendsGoing(false); setFilterDate(''); setFilterToday(false) }}
                          className="text-xs text-gray-400 font-medium"
                        >
                          clear filters
                        </button>
                        <span className="text-gray-200">·</span>
                        <motion.button
                          whileTap={{ scale: 0.96 }}
                          onClick={openQuickCreate}
                          className="text-xs text-violet-500 font-semibold"
                        >
                          start one
                        </motion.button>
                      </div>
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
      </div>

      <CreateHangoutSheet open={sheetOpen} onClose={() => { setSheetOpen(false); setPrefillData(null) }} onCreate={handleCreate} prefill={prefillData} />
      <CreateHangoutSheet open={!!editHangout} onClose={() => setEditHangout(null)} editHangout={editHangout} onEdit={handleEdit} />
      <HangoutDetailSheet
        hangout={detailHangout}
        open={!!detailHangout}
        currentUser={profile}
        friendIds={friendIds}
        friendProfiles={friendProfiles}
        friendFreeBusy={friendFreeBusy}
        onClose={() => setDetailHangout(null)}
        onRSVP={handleRSVP}
        onEdit={h => { setDetailHangout(null); setEditHangout(h) }}
        onDelete={handleDelete}
        onInviteFriend={handleInviteFriend}
        onAddFriend={handleAddFriend}
      />
    </div>
  )
}
