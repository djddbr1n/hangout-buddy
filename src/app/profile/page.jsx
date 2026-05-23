'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { LogOut } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-client'

const TIME_BLOCKS = [
  { key: 'early_morning', emoji: '🌅' },
  { key: 'brunch',        emoji: '☕' },
  { key: 'afternoon',     emoji: '🌤' },
  { key: 'dinner',        emoji: '🌆' },
  { key: 'late_night',    emoji: '🌙' },
]
const DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

export default function ProfilePage() {
  const { profile, loading, signOut } = useAuth()
  const router = useRouter()
  const [availability, setAvailability] = useState({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!profile) return
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
        <div className="max-w-md mx-auto text-center">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-20 h-20 rounded-full bg-violet-50 border-4 border-violet-200 flex items-center justify-center text-4xl mx-auto mb-3"
          >
            {profile?.avatar_emoji ?? '🦊'}
          </motion.div>
          <h1 className="text-xl font-bold text-gray-900">{profile?.name ?? '—'}</h1>
          <p className="text-gray-400 text-sm">@{profile?.nickname ?? '—'}</p>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-5 space-y-3 pb-28">
        {/* availability editor */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">my availability</p>
            {saving && <p className="text-xs text-violet-400">saving...</p>}
          </div>

          {/* day headers */}
          <div className="grid grid-cols-8 gap-1 mb-1">
            <div />
            {DAYS.map((d, i) => (
              <div key={i} className="text-center text-xs font-semibold text-gray-400">{d}</div>
            ))}
          </div>

          {/* block rows */}
          {TIME_BLOCKS.map(({ key: block, emoji }) => (
            <div key={block} className="grid grid-cols-8 gap-1 mb-1">
              <div className="flex items-center justify-center text-sm">{emoji}</div>
              {Array.from({ length: 7 }, (_, dayIndex) => {
                const isFree = availability[`${dayIndex}-${block}`]
                return (
                  <motion.button
                    key={dayIndex}
                    whileTap={{ scale: 0.85 }}
                    onClick={() => toggleCell(dayIndex, block)}
                    className={`h-9 rounded-lg transition-colors ${isFree ? 'bg-emerald-400' : 'bg-gray-100'}`}
                  />
                )
              })}
            </div>
          ))}

          <p className="text-xs text-gray-400 text-center mt-2">green = free · tap to toggle</p>
        </div>

        {/* sign out */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 transition-colors text-red-400"
          >
            <LogOut size={18} />
            <span className="text-sm font-medium">Sign out</span>
          </motion.button>
        </div>
      </div>
    </div>
  )
}
