'use client'

import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Plus } from 'lucide-react'
import { HangoutCard } from '@/components/hangout/HangoutCard'
import { CreateHangoutSheet } from '@/components/hangout/CreateHangoutSheet'
import { HangoutDetailSheet } from '@/components/hangout/HangoutDetailSheet'
import { AvailabilityStrip } from '@/components/shared/AvailabilityStrip'
import { mockCurrentUser, mockHangouts, mockFriendships, mockAvailability } from '@/lib/mock-data'
import { computeMyBlockStates } from '@/lib/availability-utils'
import { HangoutPost, RSVP } from '@/types'

export default function DashboardPage() {
  const [hangouts, setHangouts] = useState<HangoutPost[]>(mockHangouts)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [detailHangout, setDetailHangout] = useState<HangoutPost | null>(null)
  const friendIds = mockFriendships.map(f => f.friend_id)

  const blockStates = useMemo(() =>
    computeMyBlockStates(
      mockCurrentUser.id,
      hangouts,
      mockAvailability['user-1'] ?? {},
    ),
    [hangouts]
  )

  const handleRSVP = (hangoutId: string, status: 'going' | 'maybe' | null) => {
    setHangouts(prev => prev.map(h => {
      if (h.id !== hangoutId) return h
      const filtered = (h.rsvps ?? []).filter(r => r.user_id !== mockCurrentUser.id)
      const updated: RSVP[] = status
        ? [...filtered, {
            id: `rsvp-${Date.now()}`,
            hangout_id: hangoutId,
            user_id: mockCurrentUser.id,
            status,
            created_at: new Date().toISOString(),
            user: mockCurrentUser,
          }]
        : filtered
      return { ...h, rsvps: updated }
    }))
    // sync detail sheet if open
    setDetailHangout(prev => {
      if (!prev || prev.id !== hangoutId) return prev
      const filtered = (prev.rsvps ?? []).filter(r => r.user_id !== mockCurrentUser.id)
      const updated: RSVP[] = status
        ? [...filtered, {
            id: `rsvp-${Date.now()}`,
            hangout_id: hangoutId,
            user_id: mockCurrentUser.id,
            status,
            created_at: new Date().toISOString(),
            user: mockCurrentUser,
          }]
        : filtered
      return { ...prev, rsvps: updated }
    })
  }

  const handleCreate = (post: Partial<HangoutPost>) => {
    const newPost: HangoutPost = {
      id: `hang-${Date.now()}`,
      creator_id: mockCurrentUser.id,
      title: post.title!,
      description: post.description,
      activity: post.activity,
      location: post.location,
      date_time: post.date_time!,
      max_people: post.max_people ?? 2,
      status: 'open',
      is_surprise: post.is_surprise ?? false,
      created_at: new Date().toISOString(),
      creator: mockCurrentUser,
      rsvps: [],
    }
    setHangouts(prev => [newPost, ...prev])
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* header */}
      <div className="px-5 pt-14 pb-4">
        <div className="flex items-center justify-between max-w-md mx-auto mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">what's up 👀</h1>
            <p className="text-sm text-gray-400 mt-0.5">{hangouts.length} hangouts from your crew</p>
          </div>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => setSheetOpen(true)}
            className="w-12 h-12 rounded-2xl bg-violet-500 flex items-center justify-center shadow-lg shadow-violet-200"
          >
            <Plus size={22} className="text-white" strokeWidth={2.5} />
          </motion.button>
        </div>

        {/* availability strip */}
        <div className="max-w-md mx-auto">
          <AvailabilityStrip blockStates={blockStates} />
        </div>
      </div>

      {/* feed */}
      <div className="max-w-md mx-auto px-4 space-y-3 pb-32">
        {hangouts.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <p className="text-5xl mb-3">🫙</p>
            <p className="font-semibold text-gray-500">nothing yet</p>
            <p className="text-sm mt-1">post something and get the crew together</p>
          </div>
        ) : (
          hangouts.map((h, i) => (
            <motion.div
              key={h.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
            >
              <HangoutCard
                hangout={h}
                currentUser={mockCurrentUser}
                friendIds={friendIds}
                onOpen={setDetailHangout}
              />
            </motion.div>
          ))
        )}
      </div>

      <CreateHangoutSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onCreate={handleCreate}
      />

      <HangoutDetailSheet
        hangout={detailHangout}
        open={!!detailHangout}
        currentUser={mockCurrentUser}
        friendIds={friendIds}
        onClose={() => setDetailHangout(null)}
        onRSVP={handleRSVP}
      />
    </div>
  )
}
