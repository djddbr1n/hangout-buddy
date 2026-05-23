'use client'

export const dynamic = 'force-dynamic'

import { motion } from 'framer-motion'
import { Calendar, LogOut, ChevronRight } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'

export default function ProfilePage() {
  const { profile, loading, signOut } = useAuth()
  const router = useRouter()

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
        {/* gcal */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-50">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">integrations</p>
          </div>
          <motion.button
            whileTap={{ scale: 0.98 }}
            className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 transition-colors"
          >
            <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
              <Calendar size={18} className="text-blue-500" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-medium text-gray-800">Connect Google Calendar</p>
              <p className="text-xs text-gray-400">Let friends see when you're free</p>
            </div>
            <ChevronRight size={16} className="text-gray-300" />
          </motion.button>
        </div>

        {/* availability */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">my availability this week</p>
          <div className="grid grid-cols-7 gap-1">
            {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, i) => (
              <div key={i} className="flex flex-col items-center gap-1">
                <span className="text-xs text-gray-400">{day}</span>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-medium ${
                  [0, 2, 4].includes(i) ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-50 text-gray-300'
                }`}>
                  {[0, 2, 4].includes(i) ? '✓' : '·'}
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-2 text-center">sync GCal to auto-update ↑</p>
        </div>

        {/* account */}
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
