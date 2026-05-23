'use client'

import { motion } from 'framer-motion'

const SHIRTS = ['bg-pink-300', 'bg-violet-300', 'bg-sky-300', 'bg-emerald-300', 'bg-amber-300', 'bg-rose-300', 'bg-teal-300', 'bg-indigo-300']
const HAIRS = ['bg-amber-900', 'bg-stone-800', 'bg-yellow-600', 'bg-orange-800', 'bg-gray-900']
const SKIN = '#FFD7A8'

const D = {
  sm: { w: 26, hair: 11, eye: 3.5, smile: 8, bw: 22, bh: 24 },
  md: { w: 34, hair: 15, eye: 4.5, smile: 10, bw: 30, bh: 32 },
  lg: { w: 40, hair: 18, eye: 5, smile: 12, bw: 36, bh: 38 },
}

function Person({ index, size = 'md' }) {
  const d = D[size]
  return (
    <div className="flex flex-col items-center" style={{ gap: 0 }}>
      <div className="rounded-full relative overflow-hidden flex items-end justify-center" style={{ width: d.w, height: d.w, backgroundColor: SKIN }}>
        <div className={`absolute top-0 left-0 right-0 rounded-t-full ${HAIRS[index % HAIRS.length]}`} style={{ height: d.hair }} />
        <div className="absolute flex" style={{ gap: d.eye * 0.8, top: d.hair + 2 }}>
          <div className="rounded-full bg-gray-800" style={{ width: d.eye, height: d.eye }} />
          <div className="rounded-full bg-gray-800" style={{ width: d.eye, height: d.eye }} />
        </div>
        <div className="absolute border-b-2 border-gray-700 rounded-b-full" style={{ width: d.smile, height: d.smile * 0.55, bottom: 4 }} />
      </div>
      <div className={`rounded-2xl ${SHIRTS[index % SHIRTS.length]}`} style={{ width: d.bw, height: d.bh, marginTop: -2 }} />
    </div>
  )
}

function Row({ indices, size = 'md', gap = 12 }) {
  return (
    <div className="flex items-end" style={{ gap }}>
      {indices.map(i => <Person key={i} index={i} size={size} />)}
    </div>
  )
}

/* ── 1: solo coffee ── */
function Solo() {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative">
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-14 h-7 border-4 border-violet-300 rounded-t-full opacity-80" />
        <Person index={0} size="lg" />
      </div>
      <div className="flex flex-col items-center" style={{ gap: 2 }}>
        <div className="flex gap-0.5 justify-center"><div className="w-px h-4 bg-gray-300 rounded-full" /><div className="w-px h-3 bg-gray-300 rounded-full mt-1" /></div>
        <div className="w-14 h-9 bg-white border border-gray-200 rounded-xl relative overflow-hidden shadow-sm">
          <div className="absolute bottom-0 inset-x-0 bg-amber-200 rounded-b-xl" style={{ height: '45%' }} />
        </div>
        <div className="w-16 h-2 bg-stone-200 rounded-full" />
      </div>
    </div>
  )
}

/* ── 2: coffee date ── */
function CoffeeDate() {
  return (
    <div className="flex flex-col items-center gap-1">
      <Row indices={[0, 1]} gap={32} />
      <div className="flex flex-col items-center" style={{ gap: 2 }}>
        <div className="flex items-end gap-8 mb-1">
          {[0, 1].map(i => (
            <div key={i} className="flex flex-col items-center" style={{ gap: 2 }}>
              <div className="flex gap-0.5"><div className="w-px h-3 bg-gray-300 rounded-full" /><div className="w-px h-2 bg-gray-300 rounded-full mt-1" /></div>
              <div className="w-9 h-7 bg-white border border-gray-200 rounded-lg shadow-sm relative overflow-hidden">
                <div className="absolute bottom-0 inset-x-0 bg-amber-200 rounded-b-lg" style={{ height: '45%' }} />
              </div>
              <div className="w-10 h-1.5 bg-stone-200 rounded-full" />
            </div>
          ))}
          <div className="mb-2 text-xl leading-none">🌸</div>
        </div>
        <div className="w-40 h-3 bg-amber-100 border border-amber-200 rounded-full" />
        <div className="w-2 h-5 bg-amber-200 rounded-b-full" />
      </div>
    </div>
  )
}

/* ── 3: picnic ── */
function Picnic() {
  return (
    <div className="flex flex-col items-center gap-1">
      <Row indices={[0, 1, 2]} gap={16} />
      <div
        className="flex items-center justify-around rounded-2xl px-4"
        style={{
          width: 220, height: 44,
          backgroundImage: `repeating-conic-gradient(#fca5a5 0% 25%, #fff5f5 0% 50%)`,
          backgroundSize: '14px 14px',
        }}
      >
        {['🍎', '🧁', '🥪', '🍇'].map((e, i) => <span key={i} className="text-base leading-none">{e}</span>)}
      </div>
      <div className="w-56 h-2 rounded-full bg-emerald-200" />
    </div>
  )
}

/* ── 4: card game ── */
function CardGame() {
  const cards = [['A', '♥', 'text-red-500'], ['K', '♠', 'text-gray-800'], ['Q', '♣', 'text-gray-800'], ['J', '♦', 'text-red-400']]
  return (
    <div className="flex flex-col items-center gap-2">
      <Row indices={[0, 1]} size="sm" gap={48} />
      <div className="relative w-44 h-14 bg-emerald-700 rounded-2xl flex items-center justify-center gap-2 shadow-inner">
        {cards.map(([rank, suit, color], i) => (
          <div key={i} className="w-7 h-9 bg-white rounded border border-gray-200 shadow-sm flex flex-col items-start justify-between p-0.5">
            <span className={`text-[9px] font-bold leading-none ${color}`}>{rank}</span>
            <span className={`text-sm leading-none self-center ${color}`}>{suit}</span>
          </div>
        ))}
        <div className="absolute -right-1 -top-1 flex flex-col gap-0.5">
          {['bg-red-400', 'bg-blue-400', 'bg-gray-700'].map((c, i) => <div key={i} className={`w-4 h-1.5 rounded-full ${c} border border-white/60`} />)}
        </div>
      </div>
      <Row indices={[2, 3]} size="sm" gap={48} />
    </div>
  )
}

/* ── 5: movie night ── */
function MovieNight() {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="w-44 h-16 bg-gray-900 rounded-xl flex items-center justify-center relative overflow-hidden border border-gray-700 shadow-lg">
        <div className="w-36 h-12 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #1e1b4b, #4c1d95, #831843)' }}>
          <span className="text-2xl leading-none">🎬</span>
        </div>
      </div>
      <div className="flex gap-1.5">
        {[0, 1, 2, 3, 4].map(i => (
          <div key={i} className="flex flex-col items-center" style={{ gap: 0 }}>
            <Person index={i} size="sm" />
            <div className="w-7 h-3 bg-gray-700 rounded-b-lg -mt-1" />
          </div>
        ))}
      </div>
      <div className="flex gap-6">
        {[0, 2, 4].map(i => <span key={i} className="text-sm leading-none">🍿</span>)}
      </div>
    </div>
  )
}

/* ── 6+: backyard bbq ── */
function BBQ({ count }) {
  const top = Math.ceil(count / 2), bottom = Math.floor(count / 2)
  return (
    <div className="flex flex-col items-center gap-2">
      <Row indices={Array.from({ length: top }, (_, i) => i)} size="sm" gap={8} />
      <div className="flex items-center gap-4">
        <span className="text-2xl leading-none">🪑</span>
        <div className="flex flex-col items-center" style={{ gap: 1 }}>
          <span className="text-xs text-gray-400">💨💨</span>
          <div className="w-14 h-8 bg-gray-700 rounded-lg flex items-center justify-center"><span className="text-sm">🔥</span></div>
          <div className="w-16 h-1.5 bg-gray-500 rounded-full" />
          <div className="flex justify-between" style={{ width: 56 }}>
            <div className="w-1.5 h-4 bg-gray-500 rounded-b" /><div className="w-1.5 h-4 bg-gray-500 rounded-b" />
          </div>
        </div>
        <span className="text-2xl leading-none">🪑</span>
      </div>
      <Row indices={Array.from({ length: bottom }, (_, i) => i + top)} size="sm" gap={8} />
    </div>
  )
}

function getScene(count) {
  if (count === 1) return <Solo />
  if (count === 2) return <CoffeeDate />
  if (count === 3) return <Picnic />
  if (count === 4) return <CardGame />
  if (count === 5) return <MovieNight />
  return <BBQ count={count} />
}

export function PeopleScene({ count }) {
  return (
    <div className="w-full flex items-center justify-center min-h-[130px] py-1">
      <motion.div
        key={count}
        initial={{ opacity: 0, scale: 0.85, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 24 }}
      >
        {getScene(count)}
      </motion.div>
    </div>
  )
}
