'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { UserPlus, Search, ChevronRight, Eye, Shield } from 'lucide-react'
import { FriendProfileSheet } from '@/components/friends/FriendProfileSheet'
import { mockFriendships, mockAvailability } from '@/lib/mock-data'
import { Friendship, User } from '@/types'

export default function FriendsPage() {
  const [friendships, setFriendships] = useState<Friendship[]>(mockFriendships)
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<{ friend: User; friendship: Friendship } | null>(null)

  const filtered = friendships.filter(f =>
    f.friend?.name.toLowerCase().includes(query.toLowerCase()) ||
    f.friend?.nickname.toLowerCase().includes(query.toLowerCase())
  )

  const handleAuthLevel = (id: string, level: 'invite_only' | 'can_see_availability') => {
    setFriendships(prev => prev.map(f => f.id === id ? { ...f, auth_level: level } : f))
    if (selected) {
      const updated = friendships.find(f => f.id === id)
      if (updated) setSelected(s => s ? { ...s, friendship: { ...updated, auth_level: level } } : null)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white px-5 pt-12 pb-4 border-b border-gray-100 sticky top-0 z-20">
        <div className="max-w-md mx-auto">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-xl font-bold text-gray-900">your crew 🤝</h1>
            <motion.button
              whileTap={{ scale: 0.92 }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-violet-50 text-violet-600 text-sm font-medium"
            >
              <UserPlus size={14} /> add friend
            </motion.button>
          </div>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="search friends..."
              className="w-full pl-8 pr-4 py-2 rounded-xl bg-gray-50 border border-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
            />
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-4 space-y-2 pb-28">
        <p className="text-xs text-gray-400 px-1">{filtered.length} friends · tap to view profile</p>
        {filtered.map((f, i) => (
          <motion.button
            key={f.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setSelected({ friend: f.friend!, friendship: f })}
            className="w-full bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3 flex items-center gap-3 text-left"
          >
            <div className="w-10 h-10 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center text-xl shrink-0">
              {f.friend?.avatar_emoji}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900 text-sm">{f.friend?.name}</p>
              <p className="text-xs text-gray-400">@{f.friend?.nickname}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${
                f.auth_level === 'can_see_availability'
                  ? 'bg-sky-50 text-sky-600'
                  : 'bg-gray-100 text-gray-500'
              }`}>
                {f.auth_level === 'can_see_availability' ? <Eye size={10} /> : <Shield size={10} />}
                {f.auth_level === 'can_see_availability' ? 'sees availability' : 'invite only'}
              </span>
              <ChevronRight size={14} className="text-gray-300" />
            </div>
          </motion.button>
        ))}
      </div>

      <FriendProfileSheet
        friend={selected?.friend ?? null}
        availability={selected ? mockAvailability[selected.friend.id] ?? null : null}
        canSeeAvailability={selected?.friendship.auth_level === 'can_see_availability'}
        open={!!selected}
        onClose={() => setSelected(null)}
        onInvite={(id) => { console.log('invite', id); setSelected(null) }}
      />
    </div>
  )
}
