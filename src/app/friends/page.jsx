'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { UserPlus, Search, ChevronRight, Eye, Shield } from 'lucide-react'
import { FriendProfileSheet } from '@/components/friends/FriendProfileSheet'
import { createClient } from '@/lib/supabase-client'
import { useAuth } from '@/hooks/useAuth'

export default function FriendsPage() {
  const { profile } = useAuth()
  const [friendships, setFriendships] = useState([])
  const [friendAvailability, setFriendAvailability] = useState({})
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(null)
  const [showAdd, setShowAdd] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [addedIds, setAddedIds] = useState(new Set())

  useEffect(() => {
    if (!profile) return
    fetchFriends()
  }, [profile?.id])

  async function fetchFriends() {
    const supabase = createClient()
    const { data } = await supabase
      .from('friendships')
      .select('*, friend:profilesfriend_id(id,name,nickname,avatar_emoji)')
      .eq('user_id', profile.id)
      .eq('status', 'accepted')
    setFriendships((data ?? []))
  }

  async function fetchFriendAvailability(friendId) {
    if (friendAvailability[friendId]) return
    const supabase = createClient()
    const { data } = await supabase
      .from('availability')
      .select('day_index,block,available')
      .eq('user_id', friendId)
    const avail = {}
    for (const row of data ?? []) {
      const day = row.day_index
      if (!avail[day]) avail[day] = {}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(avail[day])[row.block] = row.available
    }
    setFriendAvailability(prev => ({ ...prev, [friendId]: avail }))
  }

  async function searchUsers(q) {
    setSearchQuery(q)
    if (q.length < 2) { setSearchResults([]); return }
    const supabase = createClient()
    const { data } = await supabase
      .from('profiles')
      .select('id,name,nickname,avatar_emoji')
      .ilike('nickname', `%${q.replace('@', '')}%`)
      .neq('id', profile?.id ?? '')
      .limit(5)
    setSearchResults((data ?? []))
  }

  async function addFriend(friendId) {
    if (!profile) return
    const supabase = createClient()
    await supabase.from('friendships').insert({
      user_id: profile.id,
      friend_id: friendId,
      status: 'pending',
      auth_level: 'invite_only',
    })
    setAddedIds(prev => new Set([...prev, friendId]))
  }

  async function handleAuthLevel(id, level) {
    const supabase = createClient()
    await supabase.from('friendships').update({ auth_level: level }).eq('id', id)
    setFriendships(prev => prev.map(f => f.id === id ? { ...f, auth_level: level } : f))
    setSelected(s => s ? { ...s, friendship: { ...s.friendship, auth_level: level } } : null)
  }

  const filtered = friendships.filter(f =>
    f.friend?.name.toLowerCase().includes(query.toLowerCase()) ||
    f.friend?.nickname.toLowerCase().includes(query.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white px-5 pt-12 pb-4 border-b border-gray-100 sticky top-0 z-20">
        <div className="max-w-md mx-auto">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-xl font-bold text-gray-900">your crew 🤝</h1>
            <motion.button
              whileTap={{ scale: 0.92 }}
              onClick={() => setShowAdd(v => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-violet-50 text-violet-600 text-sm font-medium"
            >
              <UserPlus size={14} /> add friend
            </motion.button>
          </div>

          {showAdd && (
            <div className="mb-3 space-y-2">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">@</span>
                <input
                  value={searchQuery}
                  onChange={e => searchUsers(e.target.value)}
                  placeholder="search by nickname"
                  autoFocus
                  className="w-full pl-7 pr-4 py-2 rounded-xl bg-gray-50 border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
                />
              </div>
              {searchResults.map(u => (
                <div key={u.id} className="flex items-center gap-3 px-3 py-2 bg-gray-50 rounded-2xl">
                  <span className="text-xl">{u.avatar_emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-gray-800">{u.name}</p>
                    <p className="text-xs text-gray-400">@{u.nickname}</p>
                  </div>
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => addFriend(u.id)}
                    disabled={addedIds.has(u.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold ${addedIds.has(u.id) ? 'bg-emerald-100 text-emerald-600' : 'bg-violet-500 text-white'}`}
                  >
                    {addedIds.has(u.id) ? 'sent ✓' : 'add'}
                  </motion.button>
                </div>
              ))}
            </div>
          )}

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
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-4xl mb-3">👋</p>
            <p className="font-semibold text-gray-500">no friends yet</p>
            <p className="text-sm mt-1">tap "add friend" to find people</p>
          </div>
        ) : (
          <>
            <p className="text-xs text-gray-400 px-1">{filtered.length} friend{filtered.length !== 1 ? 's' : ''} · tap to view profile</p>
            {filtered.map((f, i) => (
              <motion.button
                key={f.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => { setSelected({ friend: f.friend, friendship: f }); fetchFriendAvailability(f.friend_id) }}
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
                    f.auth_level === 'can_see_availability' ? 'bg-sky-50 text-sky-600' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {f.auth_level === 'can_see_availability' ? <Eye size={10} /> : <Shield size={10} />}
                    {f.auth_level === 'can_see_availability' ? 'sees availability' : 'invite only'}
                  </span>
                  <ChevronRight size={14} className="text-gray-300" />
                </div>
              </motion.button>
            ))}
          </>
        )}
      </div>

      <FriendProfileSheet
        friend={selected?.friend ?? null}
        availability={selected ? (friendAvailability[selected.friend.id] ?? null) : null}
        canSeeAvailability={selected?.friendship.auth_level === 'can_see_availability'}
        open={!!selected}
        onClose={() => setSelected(null)}
        onAuthLevelChange={(level) => selected && handleAuthLevel(selected.friendship.id, level)}
        onInvite={(id) => { console.log('invite', id); setSelected(null) }}
      />
    </div>
  )
}
