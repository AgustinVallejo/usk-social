import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import type { Profile } from '@/lib/types'

const USERNAME_STORAGE_KEY = 'usk_username'

export function useUsername() {
  const [username, setUsernameState] = useState<string>('')
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  // Load username from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(USERNAME_STORAGE_KEY)
    if (stored) {
      setUsernameState(stored)
      fetchOrCreateProfile(stored)
    } else {
      setLoading(false)
    }
  }, [])

  const fetchOrCreateProfile = async (usernameToUse: string) => {
    if (!usernameToUse.trim()) {
      setProfile(null)
      setLoading(false)
      return
    }

    console.log('[useUsername] 🔍 Looking up profile for username:', usernameToUse)
    setLoading(true)

    try {
      // Try to find existing profile by username
      const { data: existingProfile, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('username', usernameToUse.trim().toLowerCase())
        .single()

      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('[useUsername] ❌ Error fetching profile:', fetchError)
        setProfile(null)
        setLoading(false)
        return
      }

      if (existingProfile) {
        console.log('[useUsername] ✅ Found existing profile:', existingProfile.id)
        setProfile(existingProfile)
        setLoading(false)
        return
      }

      // Profile doesn't exist, create a new one
      console.log('[useUsername] 📝 Creating new profile for username:', usernameToUse)
      
      // Generate a UUID for the profile ID (since we're not using auth)
      const profileId = crypto.randomUUID()
      
      const { data: newProfile, error: createError } = await supabase
        .from('profiles')
        .insert({
          id: profileId,
          username: usernameToUse.trim().toLowerCase(),
          full_name: null,
          bio: null,
          city: null,
          country: null,
          avatar_url: null,
        })
        .select()
        .single()

      if (createError) {
        console.error('[useUsername] ❌ Error creating profile:', createError)
        console.error('[useUsername] Error details:', {
          message: createError.message,
          code: createError.code,
          details: createError.details,
          hint: createError.hint,
        })
        setProfile(null)
      } else if (newProfile) {
        console.log('[useUsername] ✅ Profile created:', newProfile.id)
        setProfile(newProfile)
      } else {
        setProfile(null)
      }
    } catch (err) {
      console.error('[useUsername] ❌ Exception in fetchOrCreateProfile:', err)
      setProfile(null)
    } finally {
      setLoading(false)
    }
  }

  const setUsername = (newUsername: string) => {
    const trimmed = newUsername.trim()
    setUsernameState(trimmed)
    
    if (trimmed) {
      localStorage.setItem(USERNAME_STORAGE_KEY, trimmed)
      fetchOrCreateProfile(trimmed)
    } else {
      localStorage.removeItem(USERNAME_STORAGE_KEY)
      setProfile(null)
    }
  }

  return {
    username,
    profile,
    loading,
    setUsername,
  }
}

