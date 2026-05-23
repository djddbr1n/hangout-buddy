'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Clock } from 'lucide-react'
import { format } from 'date-fns'
import { createClient } from '@/lib/supabase-client'
import { useAuth } from '@/hooks/useAuth'
import { HangoutDetailSheet } from '@/components/hangout/HangoutDetailSheet'
import { getCache, setCache } from '@/lib/page-cache'

function label(n) {
  if (n.type === 'rsvp')           return `${n.actor_name} is going to "${n.hangout_title}"`
  if (n.type === 'new_hangout')    return `${n.actor_name} posted a new hangout: "${n.hangout_title}"`
  if (n.type === 'friend_request') return `${n.actor_name} sent you a friend request`
  if (n.type === 'friend_accepted')return `${n.actor_name} accepted your friend request`
  if (n.type === 'invite')         return `${n.actor_name} invited you to "${n.hangout_title}"`
  return 'new notification'
}

const hasHangout = (n) => (n.type === 'rsvp' || n.type === 'invite' || n.type === 'new_hangout') && n.hangout_id

export default function NotificationsPage() {
  const { profile } = useAuth()
  const [notifs, setNotifs] = useState([])
  const [selectedHangout, setSelectedHangout] = useState(null)
  const [friendIds, setFriendIds] = useState([])
  const [loadingHangout, setLoadingHangout] = useState(false)

  useEffect(() => {
    if (!profile) return
    const cached = getCache(`notifs-${profile.id}`)
    if (cached) setNotifs(cached)

    const supabase = createClient()
    Promise.all([
      supabase.from('notifications').select('*').eq('user_id', profile.id).order('created_at', { ascending: false }).limit(50),
      supabase.from('friendships').select('friend_id').eq('user_id', profile.id).eq('status', 'accepted'),
    ]).then(([{ data: nData }, { data: fData }]) => {
      const n = nData ?? []
      setNotifs(n)
      setCache(`notifs-${profile.id}`, n)
      setFriendIds((fData ?? []).map(f => f.friend_id))
    })
  }, [profile?.id])

  async function handleNotifClick(n) {
    if (!n.read) markRead(n.id)
    if (!hasHangout(n)) return
    setLoadingHangout(true)
    const supabase = createClient()
    const { data } = await supabase
      .from('hangout_posts')
      .select('*, creator:profiles!creator_id(id,name,nickname,avatar_emoji), rsvps(*, user:profiles!user_id(id,name,nickname,avatar_emoji))')
      .eq('id', n.hangout_id)
      .single()
    setLoadingHangout(false)
    if (data) setSelectedHangout(data)
  }

  async function handleRSVP(hangoutId, status) {
    if (!profile) return
    const supabase = createClient()
    if (status) {
      await supabase.from('rsvps').upsert({ hangout_id: hangoutId, user_id: profile.id, status })
      if (selectedHangout && selectedHangout.creator_id !== profile.id) {
        await supabase.from('notifications').insert({
          user_id: selectedHangout.creator_id, type: 'rsvp',
          actor_id: profile.id, actor_name: profile.name,
          hangout_id: hangoutId, hangout_title: selectedHangout.title,
        })
      }
    } else {
      await supabase.from('rsvps').delete().eq('hangout_id', hangoutId).eq('user_id', profile.id)
    }
    const { data } = await supabase
      .from('hangout_posts')
      .select('*, creator:profiles!creator_id(id,name,nickname,avatar_emoji), rsvps(*, user:profiles!user_id(id,name,nickname,avatar_emoji))')
      .eq('id', hangoutId).single()
    if (data) setSelectedHangout(data)
  }

  async function markRead(id) {
    const supabase = createClient()
    await supabase.from('notifications').update({ read: true }).eq('id', id)
    setNotifs(prev => {
      const next = prev.map(n => n.id === id ? { ...n, read: true } : n)
      if (profile) setCache(`notifs-${profile.id}`, next)
      return next
    })
  }

  async function markAllRead() {
    if (!profile) return
    const supabase = createClient()
    await supabase.from('notifications').update({ read: true }).eq('user_id', profile.id).eq('read', false)
    setNotifs(prev => {
      const next = prev.map(n => ({ ...n, read: true }))
      setCache(`notifs-${profile.id}`, next)
      return next
    })
  }

  const unread = notifs.filter(n => !n.read).length

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white px-5 pt-12 pb-4 border-b border-gray-100 sticky top-0 z-20">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">
            alerts
            {unread > 0 && (
              <span className="ml-2 text-xs bg-violet-500 text-white rounded-full px-1.5 py-0.5 font-semibold align-middle">{unread}</span>
            )}
          </h1>
          {unread > 0 && (
            <button onClick={markAllRead} className="text-xs text-violet-500 font-medium">mark all read</button>
          )}
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-4 space-y-2 pb-28">
        {notifs.length === 0 ? (
          <div className="text-center py-20">
            <p className="font-semibold text-gray-500">nothing yet</p>
            <p className="text-sm mt-1 text-gray-400">you'll be notified when friends post or RSVP</p>
          </div>
        ) : (
          notifs.map((n, i) => (
            <motion.div
              key={n.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
              onClick={() => handleNotifClick(n)}
              className={`bg-white rounded-2xl border p-4 transition-all ${
                n.read ? 'border-gray-100 opacity-60' : 'border-violet-100'
              } ${hasHangout(n) ? 'cursor-pointer active:scale-[0.99]' : 'cursor-default'}`}
            >
              <div className="flex gap-3 items-start">
                {!n.read && <div className="w-1.5 h-1.5 rounded-full bg-violet-500 mt-2 shrink-0" />}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-800 leading-snug">{label(n)}</p>
                  {hasHangout(n) && (
                    <p className="text-xs text-violet-400 mt-0.5 font-medium">
                      {loadingHangout ? 'loading…' : 'tap to view →'}
                    </p>
                  )}
                  <p className="text-xs text-gray-300 mt-1.5 flex items-center gap-1">
                    <Clock size={10} />
                    {format(new Date(n.created_at), 'h:mm a · MMM d')}
                  </p>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {profile && (
        <HangoutDetailSheet
          hangout={selectedHangout}
          open={!!selectedHangout}
          currentUser={profile}
          friendIds={friendIds}
          onClose={() => setSelectedHangout(null)}
          onRSVP={handleRSVP}
        />
      )}
    </div>
  )
}
