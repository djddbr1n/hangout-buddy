'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { createClient } from '@/lib/supabase-client'
import Link from 'next/link'

export default function LoginPage() {
  const router = useRouter()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email || !password) return
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })
    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
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
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">👋</div>
          <h1 className="text-2xl font-bold text-gray-900">welcome back</h1>
          <p className="text-gray-400 text-sm mt-1">your friends are waiting</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 space-y-4">
          <div>
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              className="mt-1.5 w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              className="mt-1.5 w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
            />
          </div>

          {error && <p className="text-sm text-red-500 bg-red-50 rounded-xl px-3 py-2">{error}</p>}

          <motion.button
            whileTap={{ scale: 0.97 }}
            type="submit"
            disabled={loading || !email || !password}
            className="w-full py-3 rounded-2xl bg-gradient-to-r from-violet-500 to-pink-500 text-white font-semibold text-sm shadow-lg shadow-violet-100 disabled:opacity-40"
          >
            {loading ? 'signing in...' : 'sign in'}
          </motion.button>
        </form>

        <p className="text-center text-sm text-gray-400 mt-5">
          don't have an account?{' '}
          <Link href="/auth/signup" className="text-violet-500 font-medium">create one</Link>
        </p>
      </motion.div>
    </div>
  )
}
