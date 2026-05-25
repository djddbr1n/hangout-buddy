'use client'

import { motion } from 'framer-motion'
import { Home, Users, User } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase-client'
import { loadUnreadCount } from '@/lib/chat-reads'

const tabs = [
  { href: '/dashboard', icon: Home,  label: 'feed' },
  { href: '/friends',   icon: Users, label: 'friends' },
  { href: '/profile',   icon: User,  label: 'me' },
]

export function BottomNav() {
  const pathname = usePathname()
  const { profile } = useAuth()
  const [friendBadge, setFriendBadge] = useState(0)
  const [chatUnread, setChatUnread]   = useState(0)

  useEffect(() => {
    if (!profile) return
    const supabase = createClient()
    supabase.from('friendships').select('*', { count: 'exact', head: true })
      .eq('friend_id', profile.id).eq('status', 'pending')
      .then(({ count }) => setFriendBadge(count ?? 0))
    // Read cached chat-unread count written by friends/page.jsx
    setChatUnread(loadUnreadCount(profile.id))
  }, [profile?.id, pathname])

  if (pathname.startsWith('/auth') || pathname.startsWith('/onboarding')) return null

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t border-gray-100 z-30 pb-safe">
      <div className="flex items-center justify-around px-2 py-2 max-w-md mx-auto">
        {tabs.map(({ href, icon: Icon, label }) => {
          const active = pathname.startsWith(href)
          const totalBadge = href === '/friends' ? friendBadge + chatUnread : 0
          return (
            <Link key={href} href={href} className="flex flex-col items-center gap-0.5 px-6 py-1 relative">
              {active && (
                <motion.div
                  layoutId="nav-pill"
                  className="absolute inset-0 bg-violet-50 rounded-xl"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              <div className="relative">
                <Icon size={20} className={`relative z-10 transition-colors ${active ? 'text-violet-600' : 'text-gray-400'}`} />
                {totalBadge > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center z-20">
                    {totalBadge > 9 ? '9+' : totalBadge}
                  </span>
                )}
              </div>
              <span className={`relative z-10 text-[10px] font-medium transition-colors ${active ? 'text-violet-600' : 'text-gray-400'}`}>
                {label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
