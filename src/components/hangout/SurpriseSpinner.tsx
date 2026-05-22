'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useState, useCallback } from 'react'
import { Shuffle } from 'lucide-react'

const DEFAULT_OPTIONS = [
  'Bowling alley 🎳',
  'Escape room 🔐',
  'Rooftop bar 🌆',
  'Vintage arcade 🕹️',
  'Night market 🏮',
  'Karaoke bar 🎤',
  'Board game café 🎲',
  'Mini golf ⛳',
  'Food truck crawl 🚚',
  'Bouldering gym 🧗',
]

interface SurpriseSpinnerProps {
  options?: string[]
  onSelect?: (option: string) => void
}

export function SurpriseSpinner({ options = DEFAULT_OPTIONS, onSelect }: SurpriseSpinnerProps) {
  const [current, setCurrent] = useState<string | null>(null)
  const [spinning, setSpinning] = useState(false)
  const [history, setHistory] = useState<string[]>([])

  const spin = useCallback(() => {
    if (spinning) return
    setSpinning(true)
    const remaining = options.filter((o) => !history.includes(o))
    const pool = remaining.length > 0 ? remaining : options
    const picked = pool[Math.floor(Math.random() * pool.length)]
    setTimeout(() => {
      setCurrent(picked)
      setHistory((h) => [...h, picked])
      setSpinning(false)
      onSelect?.(picked)
    }, 700)
  }, [spinning, options, history, onSelect])

  return (
    <div className="space-y-3">
      <div className="relative h-16 flex items-center justify-center rounded-2xl bg-violet-50 border-2 border-dashed border-violet-200 overflow-hidden">
        <AnimatePresence mode="wait">
          {spinning ? (
            <motion.div
              key="spinning"
              initial={{ y: -40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              className="text-violet-400 text-sm font-medium animate-pulse"
            >
              🎲 picking something fun...
            </motion.div>
          ) : current ? (
            <motion.div
              key={current}
              initial={{ y: -30, opacity: 0, scale: 0.8 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 30, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              className="text-lg font-semibold text-gray-800"
            >
              {current}
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              className="text-gray-400 text-sm"
            >
              hit spin to reveal ✨
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="flex gap-2">
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={spin}
          disabled={spinning}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-violet-500 text-white font-medium text-sm hover:bg-violet-600 disabled:opacity-50 transition-colors"
        >
          <motion.div
            animate={spinning ? { rotate: 360 } : { rotate: 0 }}
            transition={spinning ? { duration: 0.6, ease: 'linear' } : {}}
          >
            <Shuffle size={16} />
          </motion.div>
          {current ? 'spin again' : 'spin'}
        </motion.button>

        {current && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => { setHistory([]); setCurrent(null) }}
            className="px-3 py-2.5 rounded-xl bg-gray-100 text-gray-600 text-sm hover:bg-gray-200 transition-colors"
          >
            reset
          </motion.button>
        )}
      </div>

      {history.length > 1 && (
        <div className="flex flex-wrap gap-1">
          {history.slice(0, -1).map((h, i) => (
            <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-400 line-through">
              {h.split(' ')[0]} {h.split(' ').slice(1, -1).join(' ')}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
