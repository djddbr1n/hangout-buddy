'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { PeopleScene } from './PeopleScene'

const VIBE = {
  2: 'just you two',
  3: 'small group',
  4: 'squad vibes',
  5: 'crew of five',
  6: 'solid group',
  7: 'big energy',
}
const vibeLabel = (n) => VIBE[n] ?? (n >= 8 ? 'full squad' : 'duo')

export function PeoplePicker({ value, onChange }) {
  // value = { expected, min, max }
  const [showAdvanced, setShowAdvanced] = useState(false)

  const handleExpected = (n) => {
    if (!showAdvanced) {
      onChange({ expected: n, min: Math.max(1, n - 1), max: n + 1 })
    } else {
      onChange({ ...value, expected: n })
    }
  }

  const handleMin = (n) => onChange({ ...value, min: Math.min(n, value.max - 1) })
  const handleMax = (n) => onChange({ ...value, max: Math.max(n, value.min + 1) })

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-sm font-medium text-gray-700">Expected turnout</span>
          <p className="text-xs text-gray-400">how many people total (including you)</p>
        </div>
        <motion.span
          key={value.expected}
          initial={{ scale: 1.4, color: '#7c3aed' }}
          animate={{ scale: 1, color: '#111827' }}
          transition={{ type: 'spring', stiffness: 500, damping: 20 }}
          className="text-2xl font-bold tabular-nums"
        >
          {value.expected}
        </motion.span>
      </div>

      <input
        type="range"
        min={2}
        max={10}
        value={value.expected}
        onChange={e => handleExpected(Number(e.target.value))}
        className="w-full h-2 rounded-full appearance-none cursor-pointer accent-violet-500"
      />

      <PeopleScene count={value.expected} />

      {!showAdvanced && (
        <p className="text-center text-xs text-gray-400 font-medium">
          {vibeLabel(value.expected)} · works with{' '}
          <span className="text-violet-500 font-semibold">{value.min}–{value.max} people</span>
        </p>
      )}

      <button
        type="button"
        onClick={() => setShowAdvanced(v => !v)}
        className="flex items-center gap-1 text-xs text-gray-400 font-medium mx-auto"
      >
        <ChevronDown size={12} className={`transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
        {showAdvanced ? 'use auto range' : 'set custom min / max'}
      </button>

      <AnimatePresence>
        {showAdvanced && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-3 overflow-hidden"
          >
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-500 w-8 shrink-0">min</span>
              <input
                type="range" min={1} max={value.max - 1} value={value.min}
                onChange={e => handleMin(Number(e.target.value))}
                className="flex-1 h-2 rounded-full appearance-none cursor-pointer accent-emerald-500"
              />
              <span className="text-sm font-bold text-gray-700 w-4 text-right">{value.min}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-500 w-8 shrink-0">max</span>
              <input
                type="range" min={value.min + 1} max={12} value={value.max}
                onChange={e => handleMax(Number(e.target.value))}
                className="flex-1 h-2 rounded-full appearance-none cursor-pointer accent-violet-500"
              />
              <span className="text-sm font-bold text-gray-700 w-4 text-right">{value.max}</span>
            </div>
            <p className="text-center text-xs text-gray-400">
              {vibeLabel(value.expected)} · range:{' '}
              <span className="text-violet-500 font-semibold">{value.min}–{value.max} people</span>
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
