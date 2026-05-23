'use client'

import { motion } from 'framer-motion'
import { Bell, Clock, Check } from 'lucide-react'
import { useState } from 'react'
import { format } from 'date-fns'


const mock = [
  {
    id: 'n1',
    type: 'reminder',
    title: '⏰ Reminder — maybe RSVP',
    body: 'You marked "Surprise adventure 🎲". Still in? It starts in 3 hrs.',
    time: new Date(),
    read: false,
    urgent: true,
  },
  {
    id: 'n2',
    type: 'rsvp',
    title: '🎉 @tay is going',
    body: 'Taylor Kim joined your "Monday Cafe Crawl ☕" — 1 spot left.',
    time: new Date(Date.now() - 20 * 60 * 1000),
    read: false,
  },
  {
    id: 'n3',
    type: 'invite',
    title: '📨 New hangout from @jamie',
    body: 'Jamie Park posted "Surprise adventure 🎲" — check it out.',
    time: new Date(Date.now() - 2 * 60 * 60 * 1000),
    read: true,
  },
  {
    id: 'n4',
    type: 'friend',
    title: '👋 Friend request',
    body: 'Morgan Lee wants to be friends.',
    time: new Date(Date.now() - 5 * 60 * 60 * 1000),
    read: true,
  },
]

export default function NotificationsPage() {
  const [notifs, setNotifs] = useState(mock)

  const markRead = (id) => setNotifs(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))

  const handleMaybeConfirm = (id, confirmed) => {
    setNotifs(prev => prev.map(n => n.id === id
      ? { ...n, read: true, body: confirmed ? '✅ Confirmed' : '❌ Removed from the hangout.' }
      : n
    ))
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white px-5 pt-12 pb-4 border-b border-gray-100 sticky top-0 z-20">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">notifications 🔔</h1>
          <button
            onClick={() => setNotifs(prev => prev.map(n => ({ ...n, read: true })))}
            className="text-xs text-violet-500 font-medium"
          >
            mark all read
          </button>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-4 space-y-2 pb-28">
        {notifs.map((n, i) => (
          <motion.div
            key={n.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.04 }}
            onClick={() => markRead(n.id)}
            className={`bg-white rounded-2xl border p-4 transition-all cursor-pointer ${
              n.urgent ? 'border-orange-200 bg-orange-50' : n.read ? 'border-gray-100' : 'border-violet-100'
            }`}
          >
            <div className="flex gap-3">
              {!n.read && <div className="w-2 h-2 rounded-full bg-violet-500 mt-1.5 shrink-0" />}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-gray-900">{n.title}</p>
                <p className="text-sm text-gray-500 mt-0.5">{n.body}</p>
                <p className="text-xs text-gray-300 mt-1.5 flex items-center gap-1">
                  <Clock size={10} /> {format(n.time, 'h:mm a')}
                </p>
                {n.urgent && !n.read && (
                  <div className="flex gap-2 mt-3">
                    <motion.button
                      whileTap={{ scale: 0.93 }}
                      onClick={e => { e.stopPropagation(); handleMaybeConfirm(n.id, true) }}
                      className="flex-1 py-2 rounded-xl bg-emerald-500 text-white text-sm font-medium flex items-center justify-center gap-1.5"
                    >
                      <Check size={13} /> yep, i'm going
                    </motion.button>
                    <motion.button
                      whileTap={{ scale: 0.93 }}
                      onClick={e => { e.stopPropagation(); handleMaybeConfirm(n.id, false) }}
                      className="flex-1 py-2 rounded-xl bg-gray-100 text-gray-600 text-sm font-medium"
                    >
                      can't make it
                    </motion.button>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
