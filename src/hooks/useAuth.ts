'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase-client'
import type { User } from '@supabase/supabase-js'

export interface Profile {
  id: string
  name: string
  nickname: string
  avatar_emoji: string
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()

    async function fetchProfile(userId: string) {
      const { data } = await supabase.from('profiles').select('*').eq('id', userId).single()
      setProfile(data)
      setLoading(false)
    }

    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
      if (user) fetchProfile(user.id)
      else setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      else { setProfile(null); setLoading(false) }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function signOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
  }

  return { user, profile, loading, signOut }
}
