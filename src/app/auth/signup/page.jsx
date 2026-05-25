'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Shuffle, Pencil } from 'lucide-react'
import { createClient } from '@/lib/supabase-client'
import Link from 'next/link'

// One row of options shown on screen — roughly 6 fit on a 375px iOS screen
const AVATAR_ROW = ['🦊','🐸','🐼','🦋','🦁','🐙']
// Full pool used by "surprise me"
const EMOJIS = ['🦊','🐸','🦋','🐻','🦅','🐼','🦁','🐯','🦄','🐙','🐧','🦜','🐺','🦔','🐝','🐮','🐻‍❄️','🦩','🐳','🦈','🦚','🦥','🐲','🌸','⭐','🍀','🎸','🎨','🧸','🌊']

export default function SignupPage() {
  const router = useRouter()

  const [step, setStep] = useState('profile')
  const [name, setName] = useState('')
  const [nickname, setNickname] = useState('')
  const [avatar, setAvatar] = useState('🦊')
  const [customMode, setCustomMode] = useState(false)

  function surpriseMe() {
    const pool = EMOJIS.filter(e => e !== avatar)
    setAvatar(pool[Math.floor(Math.random() * pool.length)])
    setCustomMode(false)
  }
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [nicknameError, setNicknameError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleProfileNext() {
    setNicknameError('')
    const supabase = createClient()
    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .eq('nickname', nickname.toLowerCase())
      .maybeSingle()
    if (existing) {
      setNicknameError('that nickname is already taken')
      return
    }
    setStep('account')
  }

  async function handleSubmit() {
    if (!email || !password || !name || !nickname) return
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { data: authData, error: authError } = await supabase.auth.signUp({ email, password })
    if (authError) {
      const msg = authError.message.toLowerCase()
      if (msg.includes('already registered') || msg.includes('already exists')) {
        setError('an account with that email already exists — try signing in')
      } else {
        setError(authError.message)
      }
      setLoading(false)
      return
    }

    if (authData.user) {
      const { error: profileError } = await supabase.from('profiles').insert({
        id: authData.user.id,
        name,
        nickname: nickname.replace('@', '').toLowerCase(),
        avatar_emoji: avatar,
      })
      if (profileError) { setError(profileError.message); setLoading(false); return }
    }

    // if email confirmation is required, session will be null — show confirm screen
    if (!authData.session) {
      setStep('confirm')
      setLoading(false)
      return
    }

    router.push('/onboarding')
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-5">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm"
      >
        {/* logo */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🎉</div>
          <h1 className="text-2xl font-bold text-gray-900">create account</h1>
          <p className="text-gray-400 text-sm mt-1">find your people for anything</p>
        </div>

        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 space-y-4">
          <AnimatePresence mode="wait">
            {step === 'confirm' ? (
              <motion.div key="confirm" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-4 text-center py-2">
                <div className="text-5xl mb-2">📬</div>
                <div>
                  <p className="font-semibold text-gray-800">check your email</p>
                  <p className="text-sm text-gray-400 mt-1">we sent a confirmation link to</p>
                  <p className="text-sm font-medium text-violet-500 mt-0.5">{email}</p>
                </div>
                <p className="text-xs text-gray-400">click the link to activate your account, then come back to sign in</p>
                <Link href="/auth/login" className="block w-full py-3 rounded-2xl bg-violet-500 text-white font-semibold text-sm text-center">
                  go to sign in
                </Link>
              </motion.div>
            ) : step === 'profile' ? (
              <motion.div key="profile" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                <p className="text-sm font-semibold text-gray-500">step 1 of 2 — your vibe</p>

                {/* avatar picker */}
                <div>
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">pick your avatar</label>

                  {/* Big preview */}
                  <div className="flex justify-center mt-3 mb-3">
                    <motion.div
                      key={avatar}
                      initial={{ scale: 0.7, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="w-16 h-16 rounded-2xl bg-violet-50 border-2 border-violet-200 flex items-center justify-center text-4xl shadow-sm"
                    >
                      {avatar}
                    </motion.div>
                  </div>

                  {/* One row of quick-pick options */}
                  <div className="flex gap-2 justify-between">
                    {AVATAR_ROW.map(e => (
                      <motion.button
                        key={e}
                        whileTap={{ scale: 0.85 }}
                        onClick={() => { setAvatar(e); setCustomMode(false) }}
                        className={`flex-1 h-11 rounded-xl text-xl flex items-center justify-center transition-all ${
                          avatar === e && !customMode
                            ? 'bg-violet-100 ring-2 ring-violet-400'
                            : 'bg-gray-50'
                        }`}
                      >
                        {e}
                      </motion.button>
                    ))}
                  </div>

                  {/* Action buttons */}
                  <div className="flex gap-2 mt-2">
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={surpriseMe}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-violet-50 text-violet-600 text-xs font-semibold border border-violet-100"
                    >
                      <Shuffle size={13} /> surprise me
                    </motion.button>
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setCustomMode(v => !v)}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold border ${
                        customMode
                          ? 'bg-violet-50 text-violet-600 border-violet-100'
                          : 'bg-gray-50 text-gray-500 border-gray-100'
                      }`}
                    >
                      <Pencil size={13} /> customize
                    </motion.button>
                  </div>

                  {/* Custom emoji input */}
                  <AnimatePresence>
                    {customMode && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <input
                          autoFocus
                          maxLength={2}
                          placeholder="paste or type any emoji"
                          className="w-full mt-2 rounded-xl border border-violet-300 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                          onChange={e => {
                            const val = [...e.target.value].slice(-1).join('')
                            if (val) setAvatar(val)
                          }}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">display name</label>
                  <input
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Alex Chen"
                    className="mt-1.5 w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">nickname / handle</label>
                  <div className="relative mt-1.5">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm">@</span>
                    <input
                      value={nickname}
                      onChange={e => { setNickname(e.target.value.replace('@', '').toLowerCase()); setNicknameError('') }}
                      placeholder="alex"
                      className={`w-full rounded-xl border pl-7 pr-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 ${nicknameError ? 'border-red-300' : 'border-gray-200'}`}
                    />
                  </div>
                  {nicknameError && <p className="text-xs text-red-500 mt-1">{nicknameError}</p>}
                </div>

                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={handleProfileNext}
                  disabled={!name || !nickname}
                  className="w-full py-3 rounded-2xl bg-violet-500 text-white font-semibold text-sm disabled:opacity-40"
                >
                  next →
                </motion.button>
              </motion.div>
            ) : (
              <motion.div key="account" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                <div className="flex items-center gap-2">
                  <button onClick={() => setStep('profile')} className="text-gray-400 text-sm hover:text-gray-600">←</button>
                  <p className="text-sm font-semibold text-gray-500">step 2 of 2 — your account</p>
                </div>

                {/* preview */}
                <div className="flex items-center gap-3 bg-violet-50 rounded-2xl px-4 py-3">
                  <span className="text-2xl">{avatar}</span>
                  <div>
                    <p className="font-semibold text-gray-800 text-sm">{name}</p>
                    <p className="text-xs text-gray-400">@{nickname}</p>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="mt-1.5 w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="min 6 characters"
                    className="mt-1.5 w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                  />
                </div>

                {error && <p className="text-sm text-red-500 bg-red-50 rounded-xl px-3 py-2">{error}</p>}

                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={handleSubmit}
                  disabled={loading || !email || !password}
                  className="w-full py-3 rounded-2xl bg-gradient-to-r from-violet-500 to-pink-500 text-white font-semibold text-sm shadow-lg shadow-violet-100 disabled:opacity-40"
                >
                  {loading ? 'creating account...' : 'let\'s go 🎉'}
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <p className="text-center text-sm text-gray-400 mt-5">
          already have an account?{' '}
          <Link href="/auth/login" className="text-violet-500 font-medium">sign in</Link>
        </p>
      </motion.div>
    </div>
  )
}
