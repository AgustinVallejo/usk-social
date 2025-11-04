import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useAuth } from '@/hooks/useAuth'
import type { Profile } from '@/lib/types'

const USERNAME_STORAGE_KEY = 'usk_username'

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
      // Clear localStorage when user logs out
      localStorage.removeItem(USERNAME_STORAGE_KEY)
      return
    }

    const fetchProfile = async () => {
      console.log('[useProfile] 🔍 Fetching profile for user:', user.id)
      setLoading(true)

      try {
        // First, check if we can query the table at all
        const { error: testError } = await supabase
          .from('profiles')
          .select('id, username')
          .limit(1)

        if (testError) {
          console.error('[useProfile] ❌ Cannot query profiles table:', testError)
          console.error('[useProfile] This might be an RLS (Row Level Security) issue')
          console.error('[useProfile] Error code:', testError.code)
          console.error('[useProfile] Error message:', testError.message)
          setProfile(null)
          setLoading(false)
          return
        }

        // Now try to get the specific profile
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle()

        if (error) {
          // PGRST116 means no rows returned
          if (error.code === 'PGRST116') {
            console.log('[useProfile] ⚠️ No profile found for user ID:', user.id)
            // Try to find any profile with this user's email to debug
            if (user.email) {
              const { data: emailMatch } = await supabase
                .from('profiles')
                .select('id, username, email')
                .eq('email', user.email)
                .maybeSingle()
              if (emailMatch) {
                console.log('[useProfile] ⚠️ Found profile with matching email but different ID:', emailMatch)
                console.log('[useProfile] Profile ID in DB:', emailMatch.id)
                console.log('[useProfile] User ID from auth:', user.id)
              }
            }
            setProfile(null)
          } else {
            console.error('[useProfile] ❌ Error fetching profile:', error)
            console.error('[useProfile] Error details:', {
              message: error.message,
              code: error.code,
              details: error.details,
              hint: error.hint,
            })
            setProfile(null)
          }
        } else if (data) {
          console.log('[useProfile] ✅ Profile found:', {
            id: data.id,
            username: data.username,
            email: data.email,
          })
          setProfile(data)
          
          // Sync localStorage with the authenticated user's username
          if (data.username) {
            localStorage.setItem(USERNAME_STORAGE_KEY, data.username)
            console.log('[useProfile] 💾 Synced localStorage with username:', data.username)
          }
        } else {
          console.log('[useProfile] ⚠️ No profile data returned (null)')
          setProfile(null)
          // Clear localStorage if no profile found
          localStorage.removeItem(USERNAME_STORAGE_KEY)
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
            const updatedProfile = payload.new as Profile
            setProfile(updatedProfile)
            // Sync localStorage when profile is updated
            if (updatedProfile.username) {
              localStorage.setItem(USERNAME_STORAGE_KEY, updatedProfile.username)
              console.log('[useProfile] 💾 Synced localStorage with updated username:', updatedProfile.username)
            }
          } else if (payload.eventType === 'DELETE') {
            setProfile(null)
            localStorage.removeItem(USERNAME_STORAGE_KEY)
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

