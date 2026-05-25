'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { UserPlus, Search, ChevronRight, Eye, Shield, Check, X, Calendar, ArrowLeft, MessageCircle, Users } from 'lucide-react'
import { AnimatePresence } from 'framer-motion'
import { format } from 'date-fns'
import { useSearchParams } from 'next/navigation'
import { FriendProfileSheet } from '@/components/friends/FriendProfileSheet'
import { HangoutChat } from '@/components/hangout/HangoutChat'
import { createClient } from '@/lib/supabase-client'
import { useAuth } from '@/hooks/useAuth'
import { getCache, setCache } from '@/lib/page-cache'
import { sendPushToUser } from '@/app/actions'
import { getLastRead, markChatRead, saveUnreadCount } from '@/lib/chat-reads'

const _cachedProfileId = getCache('auth-profile')?.id
function friendsKey(id) { return `friends-${id}` }

function FriendSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 px-4 py-3 flex items-center gap-3">
      <div className="w-10 h-10 rounded-full bg-gray-100 animate-pulse shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-3 bg-gray-100 rounded-full animate-pulse w-28" />
        <div className="h-2.5 bg-gray-100 rounded-full animate-pulse w-20" />
      </div>
      <div className="h-5 w-24 bg-gray-100 rounded-full animate-pulse" />
    </div>
  )
}

export default function FriendsPage() {
  const { profile } = useAuth()
  const searchParams = useSearchParams()

  const [friendships, setFriendships] = useState(
    () => getCache(friendsKey(_cachedProfileId))?.friendships ?? []
  )
  const [pendingRequests, setPendingRequests] = useState(
    () => getCache(friendsKey(_cachedProfileId))?.pendingRequests ?? []
  )
  const [reverseAuthLevels, setReverseAuthLevels] = useState(
    () => getCache(friendsKey(_cachedProfileId))?.reverseAuthLevels ?? {}
  )

  const [activeTab, setActiveTab]           = useState(() => searchParams.get('tab') === 'chats' ? 'chats' : 'friends')
  const [activeChatHangout, setActiveChatHangout] = useState(null)
  const [chatHangouts, setChatHangouts]     = useState([])
  const [lastMessages, setLastMessages]     = useState({})
  const [chatsLoading, setChatsLoading]       = useState(false)
  const [showChatMembers, setShowChatMembers] = useState(false)
  const [chatMembers, setChatMembers]         = useState([])
  const [unreadChatIds, setUnreadChatIds]     = useState(new Set())

  const [query, setQuery]                   = useState('')
  const [selected, setSelected]             = useState(null)
  const [showAdd, setShowAdd]               = useState(false)
  const [searchQuery, setSearchQuery]       = useState('')
  const [searchResults, setSearchResults]   = useState([])
  const [addedIds, setAddedIds]             = useState(new Set())
  const [inviteTarget, setInviteTarget]     = useState(null)
  const [myHangouts, setMyHangouts]         = useState([])
  const [firstLoad, setFirstLoad]           = useState(!getCache(friendsKey(_cachedProfileId)))

  // ── On profile load: fetch data + handle deep-link ────────────────────────
  useEffect(() => {
    if (!profile) return
    const cached = getCache(friendsKey(profile.id))
    if (cached) {
      setFriendships(cached.friendships)
      setPendingRequests(cached.pendingRequests)
      if (cached.reverseAuthLevels) setReverseAuthLevels(cached.reverseAuthLevels)
      setFirstLoad(false)
    }
    fetchFriends()

    // Handle ?tab=chats&chat=<id> deep-link (e.g. from push notification)
    const chatId = searchParams.get('chat')
    if (chatId) {
      setActiveTab('chats')
      window.history.replaceState({}, '', '/friends?tab=chats')
      createClient()
        .from('hangout_posts')
        .select('id, title, date_time, creator_id, is_surprise, creator:profiles!creator_id(id, name, nickname, avatar_emoji)')
        .eq('id', chatId)
        .single()
        .then(({ data }) => { if (data) { setActiveChatHangout(data); markChatRead(profile.id, chatId) } })
    }
  }, [profile?.id])

  // ── Load chats when switching to chats tab ────────────────────────────────
  useEffect(() => {
    if (activeTab === 'chats' && profile && chatHangouts.length === 0) {
      loadChats()
    }
  }, [activeTab, profile?.id])

  async function loadChats() {
    if (!profile) return
    setChatsLoading(true)
    const supabase = createClient()
    const cutoff = new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString()

    const [{ data: hosted }, { data: rsvpd }] = await Promise.all([
      supabase.from('hangout_posts')
        .select('id, title, date_time, creator_id, is_surprise, creator:profiles!creator_id(id, name, nickname, avatar_emoji)')
        .eq('creator_id', profile.id)
        .gte('date_time', cutoff)
        .order('date_time', { ascending: true }),
      supabase.from('rsvps')
        .select('hangout:hangout_posts(id, title, date_time, creator_id, is_surprise, creator:profiles!creator_id(id, name, nickname, avatar_emoji))')
        .eq('user_id', profile.id)
        .eq('status', 'going'),
    ])

    const hostedList = (hosted ?? []).map(h => ({ ...h, isHost: true }))
    const rsvpdList  = (rsvpd ?? [])
      .map(r => r.hangout).filter(Boolean)
      .filter(h => h && h.date_time >= cutoff)
      .map(h => ({ ...h, isHost: false }))

    const seen = new Set()
    const merged = []
    for (const h of [...hostedList, ...rsvpdList]) {
      if (h && !seen.has(h.id)) { seen.add(h.id); merged.push(h) }
    }
    merged.sort((a, b) => new Date(a.date_time) - new Date(b.date_time))
    setChatHangouts(merged)

    // Fetch last message per hangout (grab recent batch, group client-side)
    if (merged.length > 0) {
      const ids = merged.map(h => h.id)
      const { data: msgs } = await supabase
        .from('messages')
        .select('hangout_id, content, created_at, user_id, user:profiles!user_id(name, nickname)')
        .in('hangout_id', ids)
        .order('created_at', { ascending: false })
        .limit(200)
      const last = {}
      for (const msg of msgs ?? []) {
        if (!last[msg.hangout_id]) last[msg.hangout_id] = msg
      }
      setLastMessages(last)

      // Compute which chats have unread messages
      const uid = profile.id
      const unreadSet = new Set()
      for (const h of merged) {
        const lastMsg = last[h.id]
        if (lastMsg && lastMsg.user_id !== uid) {
          const lastRead = getLastRead(uid, h.id)
          if (!lastRead || new Date(lastMsg.created_at) > new Date(lastRead)) {
            unreadSet.add(h.id)
          }
        }
      }
      setUnreadChatIds(unreadSet)
      saveUnreadCount(uid, unreadSet.size)
    }
    setChatsLoading(false)
  }

  // ── Friends data ──────────────────────────────────────────────────────────
  async function fetchFriends() {
    const supabase = createClient()
    const [{ data: accepted }, { data: pending }, { data: reverseGrants }] = await Promise.all([
      supabase.from('friendships')
        .select('id,user_id,friend_id,status,auth_level,friend:profiles!friend_id(id,name,nickname,avatar_emoji)')
        .eq('user_id', profile.id).eq('status', 'accepted'),
      supabase.from('friendships')
        .select('id,user_id,friend_id,status,requester:profiles!user_id(id,name,nickname,avatar_emoji)')
        .eq('friend_id', profile.id).eq('status', 'pending'),
      supabase.from('friendships')
        .select('user_id,auth_level')
        .eq('friend_id', profile.id).eq('status', 'accepted'),
    ])
    const reverseMap = {}
    for (const row of reverseGrants ?? []) reverseMap[row.user_id] = row.auth_level
    setFriendships(accepted ?? [])
    setPendingRequests(pending ?? [])
    setReverseAuthLevels(reverseMap)
    setFirstLoad(false)
    setCache(friendsKey(profile.id), { friendships: accepted ?? [], pendingRequests: pending ?? [], reverseAuthLevels: reverseMap })
  }

  function openFriend(f) { setSelected({ friend: f.friend, friendship: f }) }

  async function acceptRequest(req) {
    const supabase = createClient()
    await Promise.all([
      supabase.from('friendships').update({ status: 'accepted' }).eq('id', req.id),
      supabase.from('friendships').upsert(
        { user_id: profile.id, friend_id: req.user_id, status: 'accepted', auth_level: 'invite_only' },
        { onConflict: 'user_id,friend_id' }
      ),
    ])
    await supabase.from('notifications').insert({ user_id: req.user_id, type: 'friend_accepted', actor_id: profile.id, actor_name: profile.name })
    sendPushToUser(req.user_id, 'friend request accepted', `${profile.name} accepted your friend request`).catch(() => {})
    setPendingRequests(prev => prev.filter(r => r.id !== req.id))
    setFriendships(prev => {
      const exists = prev.find(f => f.friend_id === req.user_id)
      if (exists) return prev.map(f => f.friend_id === req.user_id ? { ...f, status: 'accepted' } : f)
      return [...prev, { id: `new-${req.id}`, user_id: profile.id, friend_id: req.user_id, status: 'accepted', auth_level: 'invite_only', friend: req.requester }]
    })
  }

  async function declineRequest(req) {
    const supabase = createClient()
    await supabase.from('friendships').delete().eq('id', req.id)
    setPendingRequests(prev => prev.filter(r => r.id !== req.id))
  }

  async function searchUsers(q) {
    setSearchQuery(q)
    if (q.length < 2) { setSearchResults([]); return }
    const supabase = createClient()
    const { data } = await supabase
      .from('profiles').select('id,name,nickname,avatar_emoji')
      .ilike('nickname', `%${q.replace('@', '')}%`)
      .neq('id', profile?.id ?? '').limit(5)
    setSearchResults(data ?? [])
  }

  async function addFriend(friendId) {
    if (!profile) return
    const supabase = createClient()
    const { data: existing } = await supabase.from('friendships').select('id')
      .or(`and(user_id.eq.${profile.id},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${profile.id})`)
    if (existing?.length > 0) { setAddedIds(prev => new Set([...prev, friendId])); return }
    await supabase.from('friendships').insert({ user_id: profile.id, friend_id: friendId, status: 'pending', auth_level: 'invite_only' })
    await supabase.from('notifications').insert({ user_id: friendId, type: 'friend_request', actor_id: profile.id, actor_name: profile.name })
    sendPushToUser(friendId, 'new friend request', `${profile.name} wants to be friends`).catch(() => {})
    setAddedIds(prev => new Set([...prev, friendId]))
  }

  async function handleInvite(friendId) {
    setSelected(null)
    const supabase = createClient()
    const { data } = await supabase
      .from('hangout_posts').select('id,title,date_time')
      .eq('creator_id', profile.id).eq('status', 'open').order('date_time', { ascending: true })
    setMyHangouts(data ?? [])
    setInviteTarget(friendId)
  }

  async function sendInvite(hangout) {
    const supabase = createClient()
    await supabase.from('notifications').insert({ user_id: inviteTarget, type: 'invite', actor_id: profile.id, actor_name: profile.name, hangout_id: hangout.id, hangout_title: hangout.title })
    sendPushToUser(inviteTarget, `${profile.name} invited you`, `"${hangout.title}" — you're on the list`).catch(() => {})
    setInviteTarget(null)
  }

  function openChat(h) {
    setActiveChatHangout(h)
    if (unreadChatIds.has(h.id)) {
      markChatRead(profile.id, h.id)
      setUnreadChatIds(prev => { const next = new Set(prev); next.delete(h.id); return next })
      saveUnreadCount(profile.id, Math.max(0, unreadChatIds.size - 1))
    }
  }

  async function loadChatMembers(hangoutId) {
    const supabase = createClient()
    const { data } = await supabase
      .from('hangout_posts')
      .select('creator_id, creator:profiles!creator_id(id, name, nickname, avatar_emoji), rsvps(status, user:profiles!user_id(id, name, nickname, avatar_emoji))')
      .eq('id', hangoutId)
      .single()
    if (!data) return
    const members = [
      { ...data.creator, role: 'host' },
      ...(data.rsvps ?? [])
        .filter(r => r.status === 'going')
        .map(r => ({ ...r.user, role: 'going' }))
        .filter(u => u.id !== data.creator_id),
    ]
    setChatMembers(members)
    setShowChatMembers(true)
  }

  async function handleAuthLevel(id, level) {
    const supabase = createClient()
    await supabase.from('friendships').update({ auth_level: level }).eq('id', id)
    setFriendships(prev => prev.map(f => f.id === id ? { ...f, auth_level: level } : f))
    setSelected(s => s ? { ...s, friendship: { ...s.friendship, auth_level: level } } : null)
  }

  const filtered = friendships
    .filter((f, i, arr) => arr.findIndex(x => x.friend_id === f.friend_id) === i)
    .filter(f =>
      f.friend?.name?.toLowerCase().includes(query.toLowerCase()) ||
      f.friend?.nickname?.toLowerCase().includes(query.toLowerCase())
    )

  // ── Full-screen chat view ─────────────────────────────────────────────────
  if (activeChatHangout) {
    return (
      <div className="flex flex-col bg-white" style={{ height: '100dvh' }}>
        {/* Header */}
        <div className="px-4 pt-12 pb-3 border-b border-gray-100 flex items-center gap-3 shrink-0 bg-white">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => { setActiveChatHangout(null); setShowChatMembers(false); setChatMembers([]) }}
            className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center shrink-0"
          >
            <ArrowLeft size={16} className="text-gray-600" />
          </motion.button>
          <span className="text-2xl shrink-0">{activeChatHangout.creator?.avatar_emoji ?? '👤'}</span>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-gray-900 text-sm leading-snug truncate">{activeChatHangout.title}</p>
            <p className="text-xs text-gray-400">{format(new Date(activeChatHangout.date_time), 'EEE, MMM d · h:mm a')}</p>
          </div>
          {/* Members button */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => chatMembers.length > 0 ? setShowChatMembers(v => !v) : loadChatMembers(activeChatHangout.id)}
            className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center shrink-0"
          >
            <Users size={16} className="text-gray-600" />
          </motion.button>
        </div>

        {/* Members panel — slides down below header */}
        <AnimatePresence>
          {showChatMembers && chatMembers.length > 0 && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden border-b border-gray-100 bg-gray-50 shrink-0"
            >
              <div className="px-4 py-3">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-2">
                  {chatMembers.length} member{chatMembers.length !== 1 ? 's' : ''}
                </p>
                <div className="flex flex-wrap gap-2">
                  {chatMembers.map(m => (
                    <div key={m.id} className="flex items-center gap-1.5 bg-white rounded-full px-2.5 py-1 border border-gray-100">
                      <span className="text-base leading-none">{m.avatar_emoji}</span>
                      <span className="text-xs font-medium text-gray-700">{m.name ?? `@${m.nickname}`}</span>
                      {m.role === 'host' && <span className="text-[9px] font-semibold text-amber-600">host</span>}
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Chat fills remaining height */}
        {profile && (
          <HangoutChat
            hangoutId={activeChatHangout.id}
            currentUser={profile}
            hangoutTitle={activeChatHangout.title}
          />
        )}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Sticky header ── */}
      <div className="bg-white px-5 pt-12 pb-4 border-b border-gray-100 sticky top-0 z-20">
        <div className="max-w-md mx-auto">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-gray-900">
                {activeTab === 'friends' ? 'friends' : 'chats'}
                {activeTab === 'friends' && pendingRequests.length > 0 && (
                  <span className="ml-2 text-xs bg-violet-500 text-white rounded-full px-1.5 py-0.5 font-semibold">{pendingRequests.length}</span>
                )}
              </h1>
            </div>
            {activeTab === 'friends' && (
              <motion.button
                whileTap={{ scale: 0.92 }}
                onClick={() => setShowAdd(v => !v)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-violet-50 text-violet-600 text-sm font-medium"
              >
                <UserPlus size={14} /> add
              </motion.button>
            )}
          </div>

          {/* Tab switcher */}
          <div className="flex gap-1 mb-3">
            <button
              onClick={() => setActiveTab('friends')}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-sm font-semibold transition-all ${activeTab === 'friends' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500'}`}
            >
              friends
            </button>
            <button
              onClick={() => { setActiveTab('chats'); if (chatHangouts.length === 0) loadChats() }}
              className={`relative flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-sm font-semibold transition-all ${activeTab === 'chats' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500'}`}
            >
              <MessageCircle size={13} />
              chats
              {unreadChatIds.size > 0 && (
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
              )}
            </button>
          </div>

          {/* Add-friend search (friends tab only) */}
          {activeTab === 'friends' && showAdd && (
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

          {/* Friends search bar */}
          {activeTab === 'friends' && (
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="search friends..."
                className="w-full pl-8 pr-4 py-2 rounded-xl bg-gray-50 border border-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
              />
            </div>
          )}
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-4 space-y-2 pb-28">

        {/* ── Chats tab ── */}
        {activeTab === 'chats' && (
          <>
            {chatsLoading && (
              <div className="space-y-2">
                {[0, 1, 2].map(i => <FriendSkeleton key={i} />)}
              </div>
            )}
            {!chatsLoading && chatHangouts.length === 0 && (
              <div className="text-center py-16 text-gray-400">
                <p className="text-3xl mb-2">💬</p>
                <p className="font-semibold text-gray-500">no group chats yet</p>
                <p className="text-sm mt-1">join or host a hangout to start chatting</p>
              </div>
            )}
            {!chatsLoading && chatHangouts.map((h, i) => {
              const last    = lastMessages[h.id]
              const isUnread = unreadChatIds.has(h.id)
              return (
                <motion.button
                  key={h.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => openChat(h)}
                  className={`w-full rounded-2xl border px-4 py-3 flex items-center gap-3 text-left transition-colors ${
                    isUnread ? 'bg-violet-50/60 border-violet-200' : 'bg-white border-gray-100'
                  }`}
                >
                  {/* Avatar with unread ring */}
                  <div className={`w-11 h-11 rounded-full flex items-center justify-center text-2xl shrink-0 border ${
                    isUnread ? 'bg-violet-100/60 border-violet-300 ring-2 ring-violet-400 ring-offset-1' : 'bg-gray-50 border-gray-100'
                  }`}>
                    {h.creator?.avatar_emoji ?? '👤'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm truncate ${isUnread ? 'font-bold text-gray-900' : 'font-semibold text-gray-900'}`}>{h.title}</p>
                    {last ? (
                      <p className={`text-xs truncate ${isUnread ? 'text-gray-700 font-medium' : 'text-gray-400'}`}>
                        {last.user?.name ?? `@${last.user?.nickname}`}: {last.content}
                      </p>
                    ) : (
                      <p className="text-xs text-gray-400">{format(new Date(h.date_time), 'EEE, MMM d · h:mm a')}</p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    {h.isHost && <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700">host</span>}
                    {last ? (
                      <span className={`text-[10px] ${isUnread ? 'text-violet-600 font-semibold' : 'text-gray-400'}`}>
                        {format(new Date(last.created_at), 'h:mm a')}
                      </span>
                    ) : (
                      <ChevronRight size={13} className="text-gray-300" />
                    )}
                    {isUnread && <span className="w-2 h-2 rounded-full bg-red-500" />}
                  </div>
                </motion.button>
              )
            })}
          </>
        )}

        {/* ── Friends tab ── */}
        {activeTab === 'friends' && (
          <>
            {pendingRequests.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-gray-400 px-1 font-semibold uppercase tracking-wide">friend requests</p>
                {pendingRequests.map(req => (
                  <motion.div
                    key={req.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-2xl border border-violet-100 shadow-sm px-4 py-3 flex items-center gap-3"
                  >
                    <div className="w-10 h-10 rounded-full bg-violet-50 border border-violet-100 flex items-center justify-center text-xl shrink-0">
                      {req.requester?.avatar_emoji}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 text-sm">{req.requester?.name}</p>
                      <p className="text-xs text-gray-400">@{req.requester?.nickname}</p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <motion.button whileTap={{ scale: 0.9 }} onClick={() => acceptRequest(req)}
                        className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                        <Check size={14} />
                      </motion.button>
                      <motion.button whileTap={{ scale: 0.9 }} onClick={() => declineRequest(req)}
                        className="w-8 h-8 rounded-xl bg-gray-100 text-gray-400 flex items-center justify-center">
                        <X size={14} />
                      </motion.button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}

            {firstLoad && (
              <div className="space-y-2">
                {[0, 1, 2].map(i => <FriendSkeleton key={i} />)}
              </div>
            )}

            {!firstLoad && filtered.length === 0 && pendingRequests.length === 0 && (
              <div className="text-center py-16 text-gray-400">
                <p className="font-semibold text-gray-500">no friends yet</p>
                <p className="text-sm mt-1 text-gray-400">tap "add" to find people</p>
              </div>
            )}

            {!firstLoad && filtered.length > 0 && (
              <>
                <p className="text-xs text-gray-400 px-1">{filtered.length} friend{filtered.length !== 1 ? 's' : ''} · tap to view profile</p>
                {filtered.map((f, i) => (
                  <motion.button
                    key={f.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => openFriend(f)}
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
          </>
        )}
      </div>

      {/* ── Invite to hangout sheet ── */}
      <AnimatePresence>
        {inviteTarget && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setInviteTarget(null)}
              className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              drag="y" dragConstraints={{ top: 0 }} dragElastic={{ top: 0, bottom: 0.3 }}
              onDragEnd={(_, { offset, velocity }) => { if (offset.y > 80 || velocity.y > 500) setInviteTarget(null) }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl max-h-[70vh] overflow-y-auto overflow-x-hidden"
            >
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 rounded-full bg-gray-200" />
              </div>
              <div className="px-5 pb-8">
                <div className="flex items-center justify-between py-3">
                  <h2 className="font-bold text-gray-900">invite to a hangout</h2>
                  <button onClick={() => setInviteTarget(null)} className="p-2 rounded-full hover:bg-gray-100">
                    <X size={16} className="text-gray-400" />
                  </button>
                </div>
                {myHangouts.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-8">you don't have any open hangouts yet</p>
                ) : (
                  <div className="space-y-2">
                    {myHangouts.map(h => (
                      <motion.button key={h.id} whileTap={{ scale: 0.98 }} onClick={() => sendInvite(h)}
                        className="w-full flex items-center gap-3 bg-gray-50 rounded-2xl px-4 py-3 text-left hover:bg-violet-50 transition-colors">
                        <Calendar size={16} className="text-violet-400 shrink-0" />
                        <div>
                          <p className="font-medium text-sm text-gray-800">{h.title}</p>
                          <p className="text-xs text-gray-400">{format(new Date(h.date_time), 'EEE, MMM d · h:mm a')}</p>
                        </div>
                      </motion.button>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <FriendProfileSheet
        friend={selected?.friend ?? null}
        canSeeAvailability={selected ? reverseAuthLevels[selected.friend.id] === 'can_see_availability' : false}
        myGrantLevel={selected?.friendship.auth_level ?? 'invite_only'}
        open={!!selected}
        onClose={() => setSelected(null)}
        onAuthLevelChange={(level) => selected && handleAuthLevel(selected.friendship.id, level)}
        onInvite={handleInvite}
      />
    </div>
  )
}
