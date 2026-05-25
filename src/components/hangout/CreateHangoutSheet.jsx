'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { X, MapPin, Calendar, Sparkles, Users } from 'lucide-react'
import { useState, useEffect } from 'react'
import { PeoplePicker } from './PeoplePicker'
import { SurpriseSpinner } from './SurpriseSpinner'

// datetime-local inputs require LOCAL time strings, not UTC ISO strings
function toLocalInputStr(d) {
  const pad = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function CreateHangoutSheet({ open, onClose, onCreate, editHangout, onEdit, prefill }) {
  const isEdit = !!editHangout
  // Can't reduce max below current headcount (host + going guests)
  const currentHeadcount = isEdit
    ? 1 + (editHangout?.rsvps?.filter(r => r.status === 'going' && r.user_id !== editHangout.creator_id).length ?? 0)
    : 2
  const minMaxPeople = Math.max(2, currentHeadcount)

  const DURATIONS = [
    { label: '30m',     value: 30  },
    { label: '1h',      value: 60  },
    { label: '1.5h',    value: 90  },
    { label: '2h',      value: 120 },
    { label: '3h',      value: 180 },
    { label: '4h',      value: 240 },
    { label: 'all day', value: 480 },
  ]

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState('')
  const [dateTime, setDateTime] = useState('')
  const [duration, setDuration] = useState(120)
  const [maxPeople, setMaxPeople] = useState(4)
  const [allowPlusOnes, setAllowPlusOnes] = useState(false)
  const [isSurprise, setIsSurprise] = useState(false)
  const [selectedSurprise, setSelectedSurprise] = useState()

  // Lock background page scroll while sheet is open (iOS-safe: needs position:fixed)
  useEffect(() => {
    if (open) {
      const y = window.scrollY
      document.body.dataset.scrollLockY = String(y)
      document.body.style.top = `-${y}px`
      document.body.classList.add('scroll-locked')
    } else {
      document.body.classList.remove('scroll-locked')
      document.body.style.top = ''
      window.scrollTo(0, parseInt(document.body.dataset.scrollLockY ?? '0'))
    }
    return () => {
      document.body.classList.remove('scroll-locked')
      document.body.style.top = ''
    }
  }, [open])

  useEffect(() => {
    if (editHangout) {
      setTitle(editHangout.title ?? '')
      setDescription(editHangout.description ?? '')
      setLocation(editHangout.location ?? '')
      setDateTime(editHangout.date_time ? toLocalInputStr(new Date(editHangout.date_time)) : '')
      setDuration(editHangout.duration_minutes ?? 120)
      setIsSurprise(editHangout.is_surprise ?? false)
      setMaxPeople(editHangout.max_people ?? 4)
      setAllowPlusOnes(editHangout.allow_plus_ones ?? false)
    }
  }, [editHangout])

  // Apply prefill when sheet opens with suggested data
  useEffect(() => {
    if (open && prefill && !isEdit) {
      setTitle(prefill.title ?? '')
      setDateTime(prefill.date_time ?? '')
      setLocation(prefill.location ?? '')
      setDuration(prefill.duration ?? 120)
    }
  }, [open, prefill])

  const reset = () => {
    setTitle(''); setDescription(''); setLocation(''); setDateTime('')
    setDuration(120)
    setMaxPeople(4)
    setAllowPlusOnes(false)
    setIsSurprise(false); setSelectedSurprise(undefined)
  }

  const handleSubmit = () => {
    if (!title || !dateTime) return
    const data = {
      title,
      description,
      location: isSurprise ? undefined : location,
      date_time: new Date(dateTime).toISOString(),
      duration_minutes: duration,
      min_people: 1,
      max_people: maxPeople,
      allow_plus_ones: allowPlusOnes,
      is_surprise: isSurprise,
      activity: isSurprise ? selectedSurprise : undefined,
    }
    if (isEdit) {
      onEdit(data)
    } else {
      onCreate({ ...data, status: 'open' })
      reset()
    }
    onClose()
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm"
          />
          <motion.div
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            drag="y"
            dragConstraints={{ top: 0, left: 0, right: 0 }}
            dragElastic={{ top: 0, bottom: 0.3 }}
            dragMomentum={false}
            onDragEnd={(_, { offset, velocity }) => { if (offset.y > 80 || velocity.y > 500) onClose() }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl max-h-[92vh] flex flex-col overflow-hidden"
            style={{ touchAction: 'none', x: 0 }}
          >
            {/* ── handle — only this area allows drag-to-dismiss ── */}
            <div className="flex justify-center pt-3 pb-1 shrink-0 cursor-grab active:cursor-grabbing">
              <div className="w-10 h-1 rounded-full bg-gray-200" />
            </div>

            {/* ── scrollable content — captures pointer so drag doesn't fire ── */}
            <div
              className="overflow-y-auto overflow-x-hidden flex-1"
              style={{ overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch' }}
              onPointerDownCapture={e => e.stopPropagation()}
            >
            <div className="px-5 pb-8 space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-gray-900">{isEdit ? 'edit hangout' : 'new hangout'}</h2>
                  {!isEdit && prefill && (
                    <button
                      onClick={reset}
                      className="text-xs text-gray-400 font-medium px-2 py-1 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      clear fields
                    </button>
                  )}
                </div>
                <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100">
                  <X size={18} className="text-gray-400" />
                </button>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">what's the vibe?</label>
                <input
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="Monday coffee run"
                  className="mt-1.5 w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                />
              </div>

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

              <div>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1.5"><Calendar size={12} /> when?</label>
                  <span className="text-[10px] text-gray-400 font-medium">
                    {Intl.DateTimeFormat().resolvedOptions().timeZone}
                  </span>
                </div>
                <input
                  type="datetime-local"
                  value={dateTime}
                  onChange={e => setDateTime(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">how long?</label>
                <div className="mt-1.5 flex flex-wrap gap-2">
                  {DURATIONS.map(d => (
                    <motion.button
                      key={d.value}
                      type="button"
                      whileTap={{ scale: 0.9 }}
                      onClick={() => setDuration(d.value)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                        duration === d.value
                          ? 'bg-violet-500 text-white shadow-sm shadow-violet-200'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {d.label}
                    </motion.button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between bg-violet-50 rounded-2xl px-4 py-3">
                <div>
                  <p className="font-medium text-sm text-gray-800 flex items-center gap-1.5"><Sparkles size={14} className="text-violet-500" /> surprise mode</p>
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

              <AnimatePresence mode="wait">
                {isSurprise ? (
                  <motion.div key="surprise" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">spin for ideas</label>
                    <div className="mt-1.5"><SurpriseSpinner onSelect={setSelectedSurprise} /></div>
                  </motion.div>
                ) : (
                  <motion.div key="location" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
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

              <div className="bg-gray-50 rounded-2xl p-4">
                <PeoplePicker value={maxPeople} onChange={setMaxPeople} min={minMaxPeople} />
              </div>

              {/* Allow attendees to invite friends */}
              <div className="flex items-center justify-between bg-gray-50 rounded-2xl px-4 py-3">
                <div>
                  <p className="font-medium text-sm text-gray-800 flex items-center gap-1.5">
                    <Users size={14} className="text-violet-500" /> open invites
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">going attendees can invite their own friends too</p>
                </div>
                <button
                  type="button"
                  onClick={() => setAllowPlusOnes(v => !v)}
                  className={`w-12 h-6 rounded-full transition-colors shrink-0 ${allowPlusOnes ? 'bg-violet-500' : 'bg-gray-200'}`}
                >
                  <motion.div
                    animate={{ x: allowPlusOnes ? 24 : 2 }}
                    className="w-5 h-5 rounded-full bg-white shadow-sm"
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                </button>
              </div>

              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handleSubmit}
                disabled={!title || !dateTime}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-violet-500 to-pink-500 text-white font-semibold text-base shadow-lg shadow-violet-100 disabled:opacity-40 disabled:shadow-none transition-all"
              >
                {isEdit ? 'save changes' : 'send to friends'}
              </motion.button>
            </div>
            </div>{/* end scrollable content */}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
