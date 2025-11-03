import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useAuth } from '@/hooks/useAuth'
import type { Profile } from '@/lib/types'

/**
 * Hook to get the authenticated user's profile
 * Replaces the old useUsername hook for authenticated users
 */
export function useProfile() {
  const { user } = useAuth()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      setProfile(null)
      setLoading(false)
      return
    }

    const fetchProfile = async () => {
      console.log('[useProfile] 🔍 Fetching profile for user:', user.id)
      setLoading(true)

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()

        if (error) {
          if (error.code === 'PGRST116') {
            console.log('[useProfile] ⚠️ No profile found for user')
            setProfile(null)
          } else {
            console.error('[useProfile] ❌ Error fetching profile:', error)
            setProfile(null)
          }
        } else if (data) {
          console.log('[useProfile] ✅ Profile found:', data.username)
          setProfile(data)
        } else {
          setProfile(null)
        }
      } catch (err) {
        console.error('[useProfile] ❌ Exception fetching profile:', err)
        setProfile(null)
      } finally {
        setLoading(false)
      }
    }

    fetchProfile()

    // Listen for profile changes
    const channel = supabase
      .channel(`profile:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${user.id}`,
        },
        (payload) => {
          console.log('[useProfile] 📡 Profile changed:', payload)
          if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
            setProfile(payload.new as Profile)
          } else if (payload.eventType === 'DELETE') {
            setProfile(null)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user])

  return {
    profile,
    username: profile?.username || null,
    loading,
  }
}

