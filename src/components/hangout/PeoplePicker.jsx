'use client'

import { motion } from 'framer-motion'
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

// value = number (max people, including host)
// onChange = (n: number) => void
export function PeoplePicker({ value, onChange }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-sm font-medium text-gray-700">Max people</span>
          <p className="text-xs text-gray-400">including you</p>
        </div>
        <motion.span
          key={value}
          initial={{ scale: 1.4, color: '#7c3aed' }}
          animate={{ scale: 1,   color: '#111827' }}
          transition={{ type: 'spring', stiffness: 500, damping: 20 }}
          className="text-2xl font-bold tabular-nums"
        >
          {value}
        </motion.span>
      </div>

      <input
        type="range"
        min={2}
        max={12}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full h-2 rounded-full appearance-none cursor-pointer accent-violet-500"
      />

      <PeopleScene count={value} />

      <p className="text-center text-xs text-gray-400 font-medium">{vibeLabel(value)}</p>
    </div>
  )
}
