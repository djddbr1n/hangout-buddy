'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase-client'
import { useAuth } from '@/hooks/useAuth'

const TIME_BLOCKS = [
  { key: 'early_morning', emoji: '🌅', label: 'Early', time: 'before 10am' },
  { key: 'brunch',        emoji: '☕',  label: 'Brunch', time: '10am – 2pm' },
  { key: 'afternoon',     emoji: '🌤', label: 'Afternoon', time: '2pm – 5pm' },
  { key: 'dinner',        emoji: '🌆', label: 'Dinner', time: '5pm – 8pm' },
  { key: 'late_night',    emoji: '🌙', label: 'Late', time: 'after 8pm' },
]

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']


export default function OnboardingPage() {
  const router = useRouter()
  const { profile } = useAuth()
  const [step, setStep] = useState('availability')
  const [availability, setAvailability] = useState({})
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [addedFriends, setAddedFriends] = useState(new Set())
  const [saving, setSaving] = useState(false)

  function toggleCell(dayIndex, block) {
    const key = `${dayIndex}-${block}`
    setAvailability(prev => ({ ...prev, [key]: !prev[key] }))
  }

  async function saveAvailability() {
    if (!profile) return
    setSaving(true)
    const supabase = createClient()

    const rows = Object.entries(availability).map(([key, available]) => {
      const [day, ...blockParts] = key.split('-')
      return { user_id: profile.id, day_index: parseInt(day), block: blockParts.join('-'), available }
    })

    if (rows.length > 0) {
      await supabase.from('availability').upsert(rows)
    }

    setSaving(false)
    setStep('friends')
  }

  async function searchFriends(query) {
    setSearchQuery(query)
    if (query.length < 2) { setSearchResults([]); return }
    const supabase = createClient()
    const { data } = await supabase
      .from('profiles')
      .select('id, name, nickname, avatar_emoji')
      .ilike('nickname', `%${query.replace('@', '')}%`)
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
    setAddedFriends(prev => new Set([...prev, friendId]))
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-5 py-10">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm"
      >
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">{step === 'availability' ? '📅' : '👯'}</div>
          <h1 className="text-2xl font-bold text-gray-900">
            {step === 'availability' ? 'when are you free?' : 'find your people'}
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            {step === 'availability'
              ? "tap the blocks when you're usually free"
              : 'add friends to share hangouts with'}
          </p>
        </div>

        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-5">
          <AnimatePresence mode="wait">
            {step === 'availability' ? (
              <motion.div key="availability" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <div className="grid gap-1 mb-2" style={{ gridTemplateColumns: '68px repeat(7, 1fr)' }}>
                  <div />
                  {DAYS.map((d, i) => (
                    <div key={i} className="text-center text-[10px] font-semibold text-gray-400">{d}</div>
                  ))}
                </div>
                {TIME_BLOCKS.map(({ key: block, emoji, label, time }) => (
                  <div key={block} className="grid gap-1 mb-1 items-center" style={{ gridTemplateColumns: '68px repeat(7, 1fr)' }}>
                    <div className="flex items-center gap-1.5 pr-1">
                      <span className="text-sm leading-none">{emoji}</span>
                      <div>
                        <p className="text-[11px] font-semibold text-gray-600 leading-none">{label}</p>
                        <p className="text-[9px] text-gray-400 leading-none mt-0.5">{time}</p>
                      </div>
                    </div>
                    {Array.from({ length: 7 }, (_, dayIndex) => {
                      const isFree = availability[`${dayIndex}-${block}`]
                      return (
                        <motion.button
                          key={dayIndex}
                          whileTap={{ scale: 0.85 }}
                          onClick={() => toggleCell(dayIndex, block)}
                          className={`h-8 rounded-lg transition-colors ${isFree ? 'bg-emerald-400' : 'bg-gray-100'}`}
                        />
                      )
                    })}
                  </div>
                ))}
                <p className="text-xs text-gray-400 text-center mt-3">green = free · tap to toggle</p>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={saveAvailability}
                  disabled={saving}
                  className="w-full py-3 rounded-2xl bg-violet-500 text-white font-semibold text-sm mt-4 disabled:opacity-40"
                >
                  {saving ? 'saving...' : 'looks good →'}
                </motion.button>
              </motion.div>
            ) : (
              <motion.div key="friends" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-3">
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm">@</span>
                  <input
                    value={searchQuery}
                    onChange={e => searchFriends(e.target.value)}
                    placeholder="search by nickname"
                    autoFocus
                    className="w-full rounded-xl border border-gray-200 pl-7 pr-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                  />
                </div>

                {searchResults.map(u => (
                  <div key={u.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-2xl">
                    <span className="text-2xl">{u.avatar_emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-gray-800">{u.name}</p>
                      <p className="text-xs text-gray-400">@{u.nickname}</p>
                    </div>
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={() => addFriend(u.id)}
                      disabled={addedFriends.has(u.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                        addedFriends.has(u.id) ? 'bg-emerald-100 text-emerald-600' : 'bg-violet-500 text-white'
                      }`}
                    >
                      {addedFriends.has(u.id) ? 'added ✓' : 'add'}
                    </motion.button>
                  </div>
                ))}

                {searchQuery.length >= 2 && searchResults.length === 0 && (
                  <p className="text-sm text-gray-400 text-center py-4">no one found with that nickname</p>
                )}

                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => router.push('/dashboard')}
                  className="w-full py-3 rounded-2xl bg-gradient-to-r from-violet-500 to-pink-500 text-white font-semibold text-sm shadow-lg shadow-violet-100"
                >
                  {addedFriends.size > 0 ? "let's go 🎉" : 'skip for now →'}
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex items-center justify-center gap-2 mt-5">
          <div className={`h-1.5 w-8 rounded-full transition-colors ${step === 'availability' ? 'bg-violet-400' : 'bg-gray-200'}`} />
          <div className={`h-1.5 w-8 rounded-full transition-colors ${step === 'friends' ? 'bg-violet-400' : 'bg-gray-200'}`} />
        </div>
      </motion.div>
    </div>
  )
}
