'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Clock } from 'lucide-react'
import { format } from 'date-fns'
import { createClient } from '@/lib/supabase-client'
import { useAuth } from '@/hooks/useAuth'

function label(n) {
  if (n.type === 'rsvp') return `${n.actor_name} is going to "${n.hangout_title}"`
  if (n.type === 'friend_request') return `${n.actor_name} sent you a friend request`
  if (n.type === 'friend_accepted') return `${n.actor_name} accepted your friend request`
  if (n.type === 'invite') return `${n.actor_name} invited you to "${n.hangout_title}"`
  return 'new notification'
}

export default function NotificationsPage() {
  const { profile } = useAuth()
  const [notifs, setNotifs] = useState([])

  useEffect(() => {
    if (!profile) return
    const supabase = createClient()
    supabase
      .from('notifications')
      .select('*')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(50)
      .then(({ data }) => setNotifs(data ?? []))
  }, [profile?.id])

  async function markRead(id) {
    const supabase = createClient()
    await supabase.from('notifications').update({ read: true }).eq('id', id)
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
  }

  async function markAllRead() {
    const supabase = createClient()
    await supabase.from('notifications').update({ read: true }).eq('user_id', profile.id).eq('read', false)
    setNotifs(prev => prev.map(n => ({ ...n, read: true })))
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
            <button onClick={markAllRead} className="text-xs text-violet-500 font-medium">
              mark all read
            </button>
          )}
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-4 space-y-2 pb-28">
        {notifs.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-4xl mb-3 text-gray-200">—</p>
            <p className="font-semibold text-gray-500">nothing yet</p>
            <p className="text-sm mt-1 text-gray-400">you'll be notified when friends RSVP or add you</p>
          </div>
        ) : (
          notifs.map((n, i) => (
            <motion.div
              key={n.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
              onClick={() => !n.read && markRead(n.id)}
              className={`bg-white rounded-2xl border p-4 cursor-pointer transition-all ${
                n.read ? 'border-gray-100 opacity-60' : 'border-violet-100'
              }`}
            >
              <div className="flex gap-3 items-start">
                {!n.read && <div className="w-1.5 h-1.5 rounded-full bg-violet-500 mt-2 shrink-0" />}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-800 leading-snug">{label(n)}</p>
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
    </div>
  )
}
