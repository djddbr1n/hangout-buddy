'use client'

import { useState, useMemo, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Plus } from 'lucide-react'
import { HangoutCard } from '@/components/hangout/HangoutCard'
import { CreateHangoutSheet } from '@/components/hangout/CreateHangoutSheet'
import { HangoutDetailSheet } from '@/components/hangout/HangoutDetailSheet'
import { AvailabilityStrip } from '@/components/shared/AvailabilityStrip'
import { computeMyBlockStates } from '@/lib/availability-utils'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase-client'
import { getCache, setCache } from '@/lib/page-cache'

export default function DashboardPage() {
  const { profile } = useAuth()
  const [hangouts, setHangouts] = useState([])
  const [availability, setAvailability] = useState({})
  const [friendIds, setFriendIds] = useState([])
  const [invitedHangoutIds, setInvitedHangoutIds] = useState(new Set())
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

    const [{ data: friendships }, { data: hangoutsData }, { data: availData }, { data: inviteData }] = await Promise.all([
      supabase.from('friendships').select('friend_id').eq('user_id', profile.id).eq('status', 'accepted'),
      supabase.from('hangout_posts')
        .select('*, creator:profiles!creator_id(id,name,nickname,avatar_emoji), rsvps(*, user:profiles!user_id(id,name,nickname,avatar_emoji))')
        .order('date_time', { ascending: true }),
      supabase.from('availability').select('day_index,block,available').eq('user_id', profile.id),
      supabase.from('notifications').select('hangout_id').eq('user_id', profile.id).eq('type', 'invite').not('hangout_id', 'is', null),
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
        max_people: post.max_people ?? 2,
        status: 'open',
        is_surprise: post.is_surprise ?? false,
        surprise_options: post.surprise_options,
      })
      .select('*, creator:profiles!creator_id(id,name,nickname,avatar_emoji)')
      .single()
    if (data) setHangouts(prev => [{ ...data, rsvps: [] }, ...prev])
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
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => setSheetOpen(true)}
            className="w-12 h-12 rounded-2xl bg-violet-500 flex items-center justify-center shadow-lg shadow-violet-200"
          >
            <Plus size={22} className="text-white" strokeWidth={2.5} />
          </motion.button>
        </div>
        <div className="max-w-md mx-auto">
          <AvailabilityStrip blockStates={blockStates} />
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 space-y-3 pb-32">
        {hangouts.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <p className="font-semibold text-gray-500">nothing yet</p>
            <p className="text-sm mt-1 text-gray-400">post something and get the crew together</p>
          </div>
        ) : (
          hangouts.map((h, i) => (
            <motion.div key={h.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
              <HangoutCard hangout={h} currentUser={profile} friendIds={friendIds} onOpen={setDetailHangout} />
            </motion.div>
          ))
        )}
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
