'use client'

import { motion } from 'framer-motion'
import { Check, HelpCircle, X } from 'lucide-react'
import { RSVPStatus } from '@/types'

interface RSVPButtonsProps {
  hangoutId: string
  current: RSVPStatus | null
  disabled?: boolean
  onRSVP?: (hangoutId: string, status: RSVPStatus | null) => void
}

export function RSVPButtons({ hangoutId, current, disabled, onRSVP }: RSVPButtonsProps) {
  const handle = (status: RSVPStatus) => {
    if (disabled && !current) return
    onRSVP?.(hangoutId, current === status ? null : status)
  }

  return (
    <div className="flex gap-2">
      <motion.button
        whileTap={{ scale: 0.92 }}
        onClick={() => handle('going')}
        disabled={disabled && current !== 'going'}
        className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-medium transition-all ${
          current === 'going'
            ? 'bg-emerald-500 text-white shadow-md shadow-emerald-100'
            : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
        } disabled:opacity-40`}
      >
        <Check size={14} />
        going
      </motion.button>

      <motion.button
        whileTap={{ scale: 0.92 }}
        onClick={() => handle('maybe')}
        disabled={disabled && current !== 'maybe'}
        className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-medium transition-all ${
          current === 'maybe'
            ? 'bg-amber-500 text-white shadow-md shadow-amber-100'
            : 'bg-amber-50 text-amber-600 hover:bg-amber-100'
        } disabled:opacity-40`}
      >
        <HelpCircle size={14} />
        maybe
        {current === 'maybe' && <span className="text-xs opacity-75">· reminder set</span>}
      </motion.button>

      {current && (
        <motion.button
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          whileTap={{ scale: 0.92 }}
          onClick={() => onRSVP?.(hangoutId, null)}
          className="px-2.5 rounded-xl bg-gray-100 text-gray-400 hover:bg-gray-200 transition-colors"
        >
          <X size={14} />
        </motion.button>
      )}
    </div>
  )
}
