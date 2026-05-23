'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase-client'
import Link from 'next/link'

const EMOJIS = ['🦊','🐸','🦋','🐻','🦅','🐼','🦁','🐯','🦄','🐙','🦋','🐧','🦜','🐺','🦔','🐝','🦊','🐮','🐻‍❄️','🦩']

export default function SignupPage() {
  const router = useRouter()

  const [step, setStep] = useState<'profile' | 'account'>('profile')
  const [name, setName] = useState('')
  const [nickname, setNickname] = useState('')
  const [avatar, setAvatar] = useState('🦊')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit() {
    if (!email || !password || !name || !nickname) return
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { data: authData, error: authError } = await supabase.auth.signUp({ email, password })
    if (authError) { setError(authError.message); setLoading(false); return }

    if (authData.user) {
      const { error: profileError } = await supabase.from('profiles').insert({
        id: authData.user.id,
        name,
        nickname: nickname.replace('@', '').toLowerCase(),
        avatar_emoji: avatar,
      })
      if (profileError) { setError(profileError.message); setLoading(false); return }
    }

    router.push('/dashboard')
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
            {step === 'profile' ? (
              <motion.div key="profile" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                <p className="text-sm font-semibold text-gray-500">step 1 of 2 — your vibe</p>

                {/* emoji picker */}
                <div>
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">pick your avatar</label>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {EMOJIS.map(e => (
                      <motion.button
                        key={e}
                        whileTap={{ scale: 0.85 }}
                        onClick={() => setAvatar(e)}
                        className={`w-10 h-10 rounded-xl text-xl flex items-center justify-center transition-all ${
                          avatar === e ? 'bg-violet-100 ring-2 ring-violet-400 scale-110' : 'bg-gray-50 hover:bg-gray-100'
                        }`}
                      >
                        {e}
                      </motion.button>
                    ))}
                  </div>
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
                      onChange={e => setNickname(e.target.value.replace('@', '').toLowerCase())}
                      placeholder="alex"
                      className="w-full rounded-xl border border-gray-200 pl-7 pr-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                    />
                  </div>
                </div>

                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setStep('account')}
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
