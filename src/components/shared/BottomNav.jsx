'use client'

import { motion } from 'framer-motion'
import { Home, Users, Bell, User } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const tabs = [
  { href: '/dashboard', icon: Home, label: 'Feed' },
  { href: '/friends', icon: Users, label: 'Friends' },
  { href: '/notifications', icon: Bell, label: 'Alerts' },
  { href: '/profile', icon: User, label: 'Me' },
]

export function BottomNav() {
  const pathname = usePathname()

  if (pathname.startsWith('/auth') || pathname.startsWith('/onboarding')) return null

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t border-gray-100 z-30 pb-safe">
      <div className="flex items-center justify-around px-2 py-2 max-w-md mx-auto">
        {tabs.map(({ href, icon: Icon, label }) => {
          const active = pathname.startsWith(href)
          return (
            <Link key={href} href={href} className="flex flex-col items-center gap-0.5 px-4 py-1 relative">
              {active && (
                <motion.div
                  layoutId="nav-pill"
                  className="absolute inset-0 bg-violet-50 rounded-xl"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              <Icon
                size={20}
                className={`relative z-10 transition-colors ${active ? 'text-violet-600' : 'text-gray-400'}`}
              />
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
