'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { LogOut, Settings, X, Check } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-client'

const TIME_BLOCKS = [
  { key: 'early_morning', emoji: '🌅', label: 'Early', time: 'before 10am' },
  { key: 'brunch',        emoji: '☕', label: 'Brunch', time: '10am – 2pm' },
  { key: 'afternoon',     emoji: '🌤', label: 'Afternoon', time: '2pm – 5pm' },
  { key: 'dinner',        emoji: '🌆', label: 'Dinner', time: '5pm – 8pm' },
  { key: 'late_night',    emoji: '🌙', label: 'Late', time: 'after 8pm' },
]
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const EMOJIS = ['🦊','🐸','🦋','🐻','🦅','🐼','🦁','🐯','🦄','🐙','🐧','🦜','🐺','🦔','🐝','🐮','🐻‍❄️','🦩']

export default function ProfilePage() {
  const { profile, loading, signOut } = useAuth()
  const router = useRouter()
  const [availability, setAvailability] = useState({})
  const [saving, setSaving] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [editName, setEditName] = useState('')
  const [editAvatar, setEditAvatar] = useState('')
  const [customEmoji, setCustomEmoji] = useState('')
  const [customMode, setCustomMode] = useState(false)
  const [profileSaving, setProfileSaving] = useState(false)

  useEffect(() => {
    if (!profile) return
    setEditName(profile.name ?? '')
    setEditAvatar(profile.avatar_emoji ?? '🦊')
    const supabase = createClient()
    supabase
      .from('availability')
      .select('day_index,block,available')
      .eq('user_id', profile.id)
      .then(({ data }) => {
        const avail = {}
        for (const row of data ?? []) {
          avail[`${row.day_index}-${row.block}`] = row.available
        }
        setAvailability(avail)
      })
  }, [profile?.id])

  async function toggleCell(dayIndex, block) {
    if (!profile) return
    const key = `${dayIndex}-${block}`
    const next = !availability[key]
    setAvailability(prev => ({ ...prev, [key]: next }))
    setSaving(true)
    const supabase = createClient()
    await supabase.from('availability').upsert({
      user_id: profile.id,
      day_index: dayIndex,
      block,
      available: next,
    })
    setSaving(false)
  }

  async function saveProfile() {
    if (!profile || !editName.trim()) return
    setProfileSaving(true)
    const supabase = createClient()
    await supabase.from('profiles').update({ name: editName.trim(), avatar_emoji: editAvatar }).eq('id', profile.id)
    setProfileSaving(false)
    setShowSettings(false)
    window.location.reload()
  }

  async function handleSignOut() {
    await signOut()
    router.push('/auth/login')
  }

  if (loading) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><p className="text-gray-400 text-sm">loading...</p></div>
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white px-5 pt-12 pb-6 border-b border-gray-100">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-violet-50 border-4 border-violet-100 flex items-center justify-center text-3xl">
              {profile?.avatar_emoji ?? '🦊'}
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">{profile?.name ?? '—'}</h1>
              <p className="text-gray-400 text-sm">@{profile?.nickname ?? '—'}</p>
            </div>
          </div>
          <button
            onClick={() => setShowSettings(true)}
            className="p-2.5 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors"
          >
            <Settings size={18} className="text-gray-400" />
          </button>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-5 space-y-4 pb-28">
        {/* availability editor */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">my availability</p>
            {saving && <p className="text-xs text-violet-400">saving...</p>}
          </div>

          {/* day headers */}
          <div className="grid gap-1 mb-1" style={{ gridTemplateColumns: '72px repeat(7, 1fr)' }}>
            <div />
            {DAYS.map((d, i) => (
              <div key={i} className="text-center text-[10px] font-semibold text-gray-400">{d}</div>
            ))}
          </div>

          {/* block rows */}
          {TIME_BLOCKS.map(({ key: block, emoji, label, time }) => (
            <div key={block} className="grid gap-1 mb-1 items-center" style={{ gridTemplateColumns: '72px repeat(7, 1fr)' }}>
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

          <p className="text-[10px] text-gray-400 text-center mt-2">green = free · tap to toggle</p>
        </div>

        {/* sign out */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 transition-colors text-red-400"
          >
            <LogOut size={18} />
            <span className="text-sm font-medium">sign out</span>
          </motion.button>
        </div>
      </div>

      {/* settings sheet */}
      <AnimatePresence>
        {showSettings && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowSettings(false)}
              className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl max-h-[85vh] overflow-y-auto"
            >
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 rounded-full bg-gray-200" />
              </div>
              <div className="px-5 pb-10 space-y-5">
                <div className="flex items-center justify-between pt-2">
                  <h2 className="text-lg font-bold text-gray-900">edit profile</h2>
                  <button onClick={() => setShowSettings(false)} className="p-2 rounded-full hover:bg-gray-100">
                    <X size={16} className="text-gray-400" />
                  </button>
                </div>

                {/* avatar picker */}
                <div>
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">avatar</label>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {EMOJIS.map(e => (
                      <motion.button
                        key={e}
                        whileTap={{ scale: 0.85 }}
                        onClick={() => { setEditAvatar(e); setCustomMode(false) }}
                        className={`w-10 h-10 rounded-xl text-xl flex items-center justify-center transition-all ${
                          editAvatar === e && !customMode ? 'bg-violet-100 ring-2 ring-violet-400 scale-110' : 'bg-gray-50 hover:bg-gray-100'
                        }`}
                      >
                        {e}
                      </motion.button>
                    ))}
                    <motion.button
                      whileTap={{ scale: 0.85 }}
                      onClick={() => setCustomMode(true)}
                      className={`w-10 h-10 rounded-xl text-xs font-semibold flex items-center justify-center transition-all ${
                        customMode ? 'bg-violet-100 ring-2 ring-violet-400' : 'bg-gray-50 hover:bg-gray-100 text-gray-400'
                      }`}
                    >
                      ✏️
                    </motion.button>
                  </div>
                  {customMode && (
                    <div className="mt-2">
                      <input
                        autoFocus
                        maxLength={2}
                        placeholder="type any emoji"
                        className="w-full rounded-xl border border-violet-300 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                        onChange={e => {
                          const val = [...e.target.value].slice(-1).join('')
                          if (val) { setEditAvatar(val); setCustomEmoji(val) }
                        }}
                      />
                      <p className="text-xs text-gray-400 mt-1">preview: <span className="text-lg">{editAvatar}</span></p>
                    </div>
                  )}
                </div>

                {/* name */}
                <div>
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">display name</label>
                  <input
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                  />
                </div>

                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={saveProfile}
                  disabled={profileSaving || !editName.trim()}
                  className="w-full py-3 rounded-2xl bg-violet-500 text-white font-semibold text-sm disabled:opacity-40"
                >
                  {profileSaving ? 'saving...' : 'save changes'}
                </motion.button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
