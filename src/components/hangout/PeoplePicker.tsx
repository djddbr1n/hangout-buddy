'use client'

import { motion } from 'framer-motion'
import { useCallback } from 'react'
import { PeopleScene } from './PeopleScene'

const VIBE: Record<number, string> = {
  1: 'just you two 🫶',
  2: 'duo hangout 🫂',
  3: 'small crew ✨',
  4: 'squad mode 🎉',
  5: 'crew of five 🔥',
}
const vibeLabel = (n: number) => VIBE[n] ?? (n <= 7 ? 'big group energy 🎊' : 'full squad 🏟️')

interface PeoplePickerProps {
  value: number
  onChange: (n: number) => void
  min?: number
  max?: number
}

export function PeoplePicker({ value, onChange, min = 2, max = 10 }: PeoplePickerProps) {
  const handleInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => onChange(Number(e.target.value)),
    [onChange]
  )

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-600">Max people</span>
        <motion.span
          key={value}
          initial={{ scale: 1.5, color: '#7c3aed' }}
          animate={{ scale: 1, color: '#111827' }}
          transition={{ type: 'spring', stiffness: 500, damping: 20 }}
          className="text-2xl font-bold tabular-nums"
        >
          {value}
        </motion.span>
      </div>

      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={handleInput}
        className="w-full h-2 rounded-full appearance-none cursor-pointer accent-violet-500"
      />

      <PeopleScene count={value} />

      <p className="text-center text-xs text-gray-400 font-medium">{vibeLabel(value)}</p>
    </div>
  )
}
