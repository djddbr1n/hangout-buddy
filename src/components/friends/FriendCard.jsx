'use client'

import { motion } from 'framer-motion'
import { Shield, Eye, ChevronDown } from 'lucide-react'
import { useState } from 'react'


export function FriendCard({ friendship, onChangeAuthLevel }) {
  const [expanded, setExpanded] = useState(false)
  const friend = friendship.friend

  return (
    <motion.div
      layout
      className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
    >
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="w-10 h-10 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center text-xl">
          {friend.avatar_emoji}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 text-sm">{friend.name}</p>
          <p className="text-xs text-gray-400">@{friend.nickname}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${
            friendship.auth_level === 'can_see_availability'
              ? 'bg-sky-50 text-sky-600'
              : 'bg-gray-100 text-gray-500'
          }`}>
            {friendship.auth_level === 'can_see_availability' ? <Eye size={10} /> : <Shield size={10} />}
            {friendship.auth_level === 'can_see_availability' ? 'sees availability' : 'invite only'}
          </span>
          <button onClick={() => setExpanded(e => !e)} className="p-1 text-gray-300 hover:text-gray-500">
            <ChevronDown size={14} className={`transition-transform ${expanded ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {expanded && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="px-4 pb-3 border-t border-gray-50"
        >
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mt-3 mb-2">access level</p>
          <div className="grid grid-cols-2 gap-2">
            {(['invite_only', 'can_see_availability']).map(level => (
              <button
                key={level}
                onClick={() => onChangeAuthLevel?.(friendship.id, level)}
                className={`flex flex-col items-start p-3 rounded-xl border text-left transition-all ${
                  friendship.auth_level === level
                    ? 'border-violet-400 bg-violet-50'
                    : 'border-gray-100 hover:border-gray-200'
                }`}
              >
                <span className="text-lg">{level === 'invite_only' ? '📨' : '📅'}</span>
                <span className="text-xs font-medium text-gray-700 mt-1">
                  {level === 'invite_only' ? 'Invite only' : 'See availability'}
                </span>
                <span className="text-[10px] text-gray-400 mt-0.5">
                  {level === 'invite_only'
                    ? 'Can send you hangout invites'
                    : 'Can see your calendar too'}
                </span>
              </button>
            ))}
          </div>
        </motion.div>
      )}
    </motion.div>
  )
}
