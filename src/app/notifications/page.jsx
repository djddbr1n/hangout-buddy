'use client'

import { Bell } from 'lucide-react'

export default function NotificationsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white px-5 pt-12 pb-4 border-b border-gray-100 sticky top-0 z-20">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">notifications 🔔</h1>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-4 pb-28">
        <div className="text-center py-20 text-gray-400">
          <Bell size={36} className="mx-auto mb-3 text-gray-200" />
          <p className="font-semibold text-gray-500">no notifications yet</p>
          <p className="text-sm mt-1">you'll get notified when friends RSVP or invite you</p>
        </div>
      </div>
    </div>
  )
}
