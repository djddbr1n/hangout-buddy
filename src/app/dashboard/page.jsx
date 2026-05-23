'use client'

import { useState, useMemo, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Plus, Bell } from 'lucide-react'
import Link from 'next/link'
import { HangoutCard } from '@/components/hangout/HangoutCard'
import { CreateHangoutSheet } from '@/components/hangout/CreateHangoutSheet'
import { HangoutDetailSheet } from '@/components/hangout/HangoutDetailSheet'
import { AvailabilityStrip } from '@/components/shared/AvailabilityStrip'
import { computeMyBlockStates } from '@/lib/availability-utils'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase-client'
import { getCache, setCache } from '@/lib/page-cache'
import { sendPushToUser } from '@/app/actions'

export default function DashboardPage() {
  const { profile } = useAuth()
  const [hangouts, setHangouts] = useState([])
  const [availability, setAvailability] = useState({})
  const [friendIds, setFriendIds] = useState([])
  const [invitedHangoutIds, setInvitedHangoutIds] = useState(new Set())
  const [unreadCount, setUnreadCount] = useState(0)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [detailHangout, setDetailHangout] = useState(null)
  const [editHangout, setEditHangout] = useState(null)

  useEffect(() => {
    if (!profile) return
    const cached = getCache(`dashboard-${profile.id}`)
    if (cached) {
      setHangouts(cached.hangouts)
      setAvailability(cached.availability)
      setFriendIds(cached.friendIds)
      setInvitedHangoutIds(cached.invitedHangoutIds)
    }
    fetchData()
  }, [profile?.id])

  async function fetchData() {
    const supabase = createClient()

    const [{ data: friendships }, { data: hangoutsData }, { data: availData }, { data: inviteData }, { count: unread }] = await Promise.all([
      supabase.from('friendships').select('friend_id').eq('user_id', profile.id).eq('status', 'accepted'),
      supabase.from('hangout_posts')
        .select('*, creator:profiles!creator_id(id,name,nickname,avatar_emoji), rsvps(*, user:profiles!user_id(id,name,nickname,avatar_emoji))')
        .order('date_time', { ascending: true }),
      supabase.from('availability').select('day_index,block,available').eq('user_id', profile.id),
      supabase.from('notifications').select('hangout_id').eq('user_id', profile.id).eq('type', 'invite').not('hangout_id', 'is', null),
      supabase.from('notifications').select('*', { count: 'exact', head: true }).eq('user_id', profile.id).eq('read', false),
    ])

    const ids = (friendships ?? []).map((f) => f.friend_id)
    const hangoutList = hangoutsData ?? []
    const invitedIds = new Set((inviteData ?? []).map(n => n.hangout_id))

    setFriendIds(ids)
    setHangouts(hangoutList)
    setInvitedHangoutIds(invitedIds)

    const avail = {}
    for (const row of availData ?? []) {
      const day = row.day_index
      if (!avail[day]) avail[day] = {}
      ;(avail[day])[row.block] = row.available
    }
    setAvailability(avail)
    setUnreadCount(unread ?? 0)
    setCache(`dashboard-${profile.id}`, { hangouts: hangoutList, availability: avail, friendIds: ids, invitedHangoutIds: invitedIds })
  }

  const blockStates = useMemo(
    () => profile ? computeMyBlockStates(profile.id, hangouts, availability) : {},
    [profile, hangouts, availability]
  )

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
          for (const { friend_id } of friends ?? []) {
            sendPushToUser(friend_id, `${profile.name} posted a hangout`, `"${data.title}" — tap to see it`).catch(() => {})
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
          <AvailabilityStrip blockStates={blockStates} />
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 pb-32">
        {hangouts.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <p className="font-semibold text-gray-500">nothing yet</p>
            <p className="text-sm mt-1 text-gray-400">post a hangout and see who's down</p>
          </div>
        ) : (() => {
          const invited = hangouts.filter(h => invitedHangoutIds.has(h.id) && h.creator_id !== profile.id)
          const others  = hangouts.filter(h => !invitedHangoutIds.has(h.id) || h.creator_id === profile.id)
          return (
            <div className="space-y-5">
              {invited.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-violet-500 uppercase tracking-wide px-1 mb-2.5">invited for you</p>
                  <div className="space-y-3">
                    {invited.map((h, i) => (
                      <motion.div key={h.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
                        <HangoutCard hangout={h} currentUser={profile} friendIds={friendIds} onOpen={setDetailHangout} isInvited />
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}
              {others.length > 0 && (
                <div>
                  {invited.length > 0 && <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-1 mb-2.5">all hangouts</p>}
                  <div className="space-y-3">
                    {others.map((h, i) => (
                      <motion.div key={h.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
                        <HangoutCard hangout={h} currentUser={profile} friendIds={friendIds} onOpen={setDetailHangout} />
                      </motion.div>
                    ))}
                  </div>
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
