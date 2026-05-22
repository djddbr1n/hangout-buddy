'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { X, MapPin, Calendar, Sparkles, ChevronDown } from 'lucide-react'
import { useState } from 'react'
import { PeoplePicker } from './PeoplePicker'
import { SurpriseSpinner } from './SurpriseSpinner'
import { HangoutPost } from '@/types'

interface CreateHangoutSheetProps {
  open: boolean
  onClose: () => void
  onCreate: (post: Partial<HangoutPost>) => void
}

export function CreateHangoutSheet({ open, onClose, onCreate }: CreateHangoutSheetProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState('')
  const [dateTime, setDateTime] = useState('')
  const [maxPeople, setMaxPeople] = useState(2)
  const [isSurprise, setIsSurprise] = useState(false)
  const [selectedSurprise, setSelectedSurprise] = useState<string | undefined>()

  const handleSubmit = () => {
    if (!title || !dateTime) return
    onCreate({
      title,
      description,
      location: isSurprise ? undefined : location,
      date_time: new Date(dateTime).toISOString(),
      max_people: maxPeople,
      is_surprise: isSurprise,
      activity: isSurprise ? selectedSurprise : undefined,
      status: 'open',
    })
    onClose()
    setTitle(''); setDescription(''); setLocation(''); setDateTime('')
    setMaxPeople(3); setIsSurprise(false); setSelectedSurprise(undefined)
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm"
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl max-h-[92vh] overflow-y-auto"
          >
            {/* drag handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-gray-200" />
            </div>

            <div className="px-5 pb-8 space-y-5">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">new hangout 🎉</h2>
                <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100">
                  <X size={18} className="text-gray-400" />
                </button>
              </div>

              {/* title */}
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">what's the vibe?</label>
                <input
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="Monday coffee run ☕"
                  className="mt-1.5 w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                />
              </div>

              {/* description */}
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">add some context (optional)</label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="quick note to your friends..."
                  rows={2}
                  className="mt-1.5 w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 resize-none"
                />
              </div>

              {/* date/time */}
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1.5"><Calendar size={12} /> when?</label>
                <input
                  type="datetime-local"
                  value={dateTime}
                  onChange={e => setDateTime(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                />
              </div>

              {/* surprise toggle */}
              <div className="flex items-center justify-between bg-violet-50 rounded-2xl px-4 py-3">
                <div>
                  <p className="font-medium text-sm text-gray-800 flex items-center gap-1.5"><Sparkles size={14} className="text-violet-500" /> surprise me mode</p>
                  <p className="text-xs text-gray-400 mt-0.5">keep the location a mystery until later</p>
                </div>
                <button
                  onClick={() => setIsSurprise(s => !s)}
                  className={`w-12 h-6 rounded-full transition-colors ${isSurprise ? 'bg-violet-500' : 'bg-gray-200'}`}
                >
                  <motion.div
                    animate={{ x: isSurprise ? 24 : 2 }}
                    className="w-5 h-5 rounded-full bg-white shadow-sm"
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                </button>
              </div>

              {/* location or surprise spinner */}
              <AnimatePresence mode="wait">
                {isSurprise ? (
                  <motion.div
                    key="surprise"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">spin for ideas (or keep it secret)</label>
                    <div className="mt-1.5">
                      <SurpriseSpinner onSelect={setSelectedSurprise} />
                    </div>
                    {selectedSurprise && (
                      <p className="text-xs text-center text-violet-500 mt-2">picked: {selectedSurprise} (only visible to you for now)</p>
                    )}
                  </motion.div>
                ) : (
                  <motion.div
                    key="location"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1.5"><MapPin size={12} /> where?</label>
                    <input
                      value={location}
                      onChange={e => setLocation(e.target.value)}
                      placeholder="Bloom Coffee, 12 Elm St"
                      className="mt-1.5 w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* people picker */}
              <div className="bg-gray-50 rounded-2xl p-4">
                <PeoplePicker value={maxPeople} onChange={setMaxPeople} />
              </div>

              {/* submit */}
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handleSubmit}
                disabled={!title || !dateTime}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-violet-500 to-pink-500 text-white font-semibold text-base shadow-lg shadow-violet-100 disabled:opacity-40 disabled:shadow-none transition-all"
              >
                send to friends ✨
              </motion.button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
