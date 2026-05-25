'use client'

import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { Send } from 'lucide-react'
import { format, isToday, isYesterday } from 'date-fns'
import { createClient } from '@/lib/supabase-client'
import { notifyChatParticipants } from '@/app/actions'

function dateDivider(dateStr) {
  const d = new Date(dateStr)
  if (isToday(d))     return 'Today'
  if (isYesterday(d)) return 'Yesterday'
  return format(d, 'MMM d')
}

function shouldShowDivider(msgs, idx) {
  if (idx === 0) return true
  const prev = new Date(msgs[idx - 1].created_at).toDateString()
  const curr = new Date(msgs[idx].created_at).toDateString()
  return prev !== curr
}

export function HangoutChat({ hangoutId, currentUser, hangoutTitle }) {
  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(true)
  const bottomRef = useRef(null)
  const supabase = createClient()

  // Fetch existing messages
  useEffect(() => {
    if (!hangoutId) return
    setLoading(true)

    supabase
      .from('messages')
      .select('*, user:profiles!user_id(id, name, nickname, avatar_emoji)')
      .eq('hangout_id', hangoutId)
      .order('created_at', { ascending: true })
      .limit(200)
      .then(({ data }) => {
        setMessages(data ?? [])
        setLoading(false)
      })

    // Real-time subscription
    const channel = supabase
      .channel(`chat-${hangoutId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `hangout_id=eq.${hangoutId}` },
        async (payload) => {
          // Re-fetch the message with profile join
          const { data: msg } = await supabase
            .from('messages')
            .select('*, user:profiles!user_id(id, name, nickname, avatar_emoji)')
            .eq('id', payload.new.id)
            .single()
          if (msg) setMessages(prev => {
            // Replace optimistic placeholder from the same sender with same content
            const optIdx = prev.findIndex(
              m => m.id.startsWith('opt-') && m.user_id === msg.user_id && m.content === msg.content
            )
            if (optIdx !== -1) {
              const updated = [...prev]
              updated[optIdx] = msg
              return updated
            }
            // Avoid real duplicate (e.g. re-subscription race)
            if (prev.some(m => m.id === msg.id)) return prev
            return [...prev, msg]
          })
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [hangoutId])

  // Scroll to bottom when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = async () => {
    const content = text.trim()
    if (!content) return
    setText('')

    // Optimistic insert
    const optimistic = {
      id: `opt-${Date.now()}`,
      hangout_id: hangoutId,
      user_id: currentUser.id,
      content,
      created_at: new Date().toISOString(),
      user: currentUser,
    }
    setMessages(prev => [...prev, optimistic])

    await supabase.from('messages').insert({ hangout_id: hangoutId, user_id: currentUser.id, content })
    // Fire-and-forget: push notification to all other participants
    notifyChatParticipants(hangoutId, currentUser.id, currentUser.name ?? currentUser.nickname, content).catch(() => {})
  }

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="space-y-3 w-full px-5">
          {[1,2,3].map(i => (
            <div key={i} className={`flex gap-2 ${i % 2 === 0 ? 'flex-row-reverse' : ''}`}>
              <div className="w-7 h-7 rounded-full bg-gray-100 animate-pulse shrink-0" />
              <div className={`h-9 rounded-2xl bg-gray-100 animate-pulse ${i % 2 === 0 ? 'w-32' : 'w-48'}`} />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1" onPointerDownCapture={e => e.stopPropagation()}>
        {messages.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <p className="text-2xl mb-2">💬</p>
            <p className="text-sm">no messages yet — say hi!</p>
          </div>
        )}

        {messages.map((msg, idx) => {
          const isMe = msg.user_id === currentUser.id
          const showAvatar = !isMe && (idx === 0 || messages[idx - 1].user_id !== msg.user_id)
          const showName   = showAvatar
          const consecutive = idx > 0 && messages[idx - 1].user_id === msg.user_id && !shouldShowDivider(messages, idx)

          return (
            <div key={msg.id}>
              {shouldShowDivider(messages, idx) && (
                <div className="flex items-center gap-2 my-3">
                  <div className="flex-1 h-px bg-gray-100" />
                  <span className="text-[10px] text-gray-400 font-medium">{dateDivider(msg.created_at)}</span>
                  <div className="flex-1 h-px bg-gray-100" />
                </div>
              )}

              <div className={`flex items-end gap-2 ${isMe ? 'flex-row-reverse' : ''} ${consecutive ? 'mt-0.5' : 'mt-2'}`}>
                {/* Avatar spacer for consecutive messages */}
                {!isMe && (
                  <div className="w-7 shrink-0">
                    {showAvatar ? (
                      <span className="text-lg">{msg.user?.avatar_emoji ?? '👤'}</span>
                    ) : null}
                  </div>
                )}

                <div className={`max-w-[72%] ${isMe ? 'items-end' : 'items-start'} flex flex-col`}>
                  {showName && (
                    <p className="text-[10px] text-gray-400 font-medium mb-0.5 px-1">
                      {msg.user?.name ?? `@${msg.user?.nickname}`}
                    </p>
                  )}
                  <div className={`px-3 py-2 rounded-2xl text-sm leading-snug break-words ${
                    isMe
                      ? 'bg-violet-500 text-white rounded-br-sm'
                      : 'bg-gray-100 text-gray-900 rounded-bl-sm'
                  } ${msg.id.startsWith('opt-') ? 'opacity-60' : ''}`}>
                    {msg.content}
                  </div>
                  {idx === messages.length - 1 && (
                    <p className="text-[9px] text-gray-300 mt-0.5 px-1">
                      {format(new Date(msg.created_at), 'h:mm a')}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      {/* pb-20 clears the fixed BottomNav (~60px) + safe-area inset */}
      <div className="px-4 pt-2 pb-20 border-t border-gray-100 flex items-end gap-2 shrink-0">
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKey}
          placeholder="say something..."
          rows={1}
          className="flex-1 resize-none rounded-2xl border border-gray-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 max-h-24 overflow-y-auto"
          style={{ fieldSizing: 'content' }}
        />
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={send}
          disabled={!text.trim()}
          className="w-9 h-9 rounded-full bg-violet-500 flex items-center justify-center shadow-sm shadow-violet-200 disabled:opacity-30 shrink-0"
        >
          <Send size={15} className="text-white" />
        </motion.button>
      </div>
    </div>
  )
}
