'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase-client'
import { getCache, setCache } from '@/lib/page-cache'

export function useAuth() {
  // Initialise synchronously from cache — no blank-state flash on re-mount
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(() => getCache('auth-profile'))
  const [loading, setLoading] = useState(getCache('auth-profile') === null)

  useEffect(() => {
    const supabase = createClient()

    async function fetchProfile(userId) {
      const { data } = await supabase.from('profiles').select('*').eq('id', userId).single()
      if (data) {
        setProfile(data)
        setCache('auth-profile', data)
      }
      setLoading(false)
    }

    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
      if (user) {
        const cached = getCache('auth-profile')
        // If the cached profile belongs to this user, skip the extra round-trip
        if (cached && cached.id === user.id) {
          setLoading(false)
        } else {
          fetchProfile(user.id)
        }
      } else {
        setCache('auth-profile', null)
        setLoading(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        const cached = getCache('auth-profile')
        if (!cached || cached.id !== session.user.id) fetchProfile(session.user.id)
      } else {
        setProfile(null)
        setCache('auth-profile', null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function signOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    setCache('auth-profile', null)
  }

  return { user, profile, loading, signOut }
}
