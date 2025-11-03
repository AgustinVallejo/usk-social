import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import type { User } from '@supabase/supabase-js'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    console.log('[useAuth] Getting initial session...')
    // Get initial session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error('[useAuth] ❌ Error getting session:', error)
        console.error('[useAuth] Error details:', {
          message: error.message,
          status: error.status,
        })
      } else {
        console.log('[useAuth] ✅ Session retrieved:', session ? `User: ${session.user?.email}` : 'No session')
      }
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Listen for auth changes
    console.log('[useAuth] Setting up auth state listener...')
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[useAuth] Auth state changed:', event, session ? `User: ${session.user?.email}` : 'No session')
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => {
      console.log('[useAuth] Cleaning up auth state listener')
      subscription.unsubscribe()
    }
  }, [])

  const signUp = async (email: string, password: string, username?: string) => {
    console.log('[useAuth] 🔐 Signing up user:', email, username ? `with username: ${username}` : '')
    // Disable email confirmation
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: undefined,
        data: username ? { username } : undefined,
      },
    })
    if (error) {
      console.error('[useAuth] ❌ Sign up failed:', error)
      console.error('[useAuth] Error details:', {
        message: error.message,
        status: error.status,
      })
    } else {
      console.log('[useAuth] ✅ Sign up successful:', data.user ? `User ID: ${data.user.id}` : 'No user data')
    }
    return { data, error }
  }

  const signIn = async (emailOrUsername: string, password: string) => {
    console.log('[useAuth] 🔑 Signing in user:', emailOrUsername)
    
    // Check if input looks like an email (contains @)
    const isEmail = emailOrUsername.includes('@')
    
    if (isEmail) {
      // Direct email login
      const { data, error } = await supabase.auth.signInWithPassword({ 
        email: emailOrUsername, 
        password 
      })
      if (error) {
        console.error('[useAuth] ❌ Sign in failed:', error)
        console.error('[useAuth] Error details:', {
          message: error.message,
          status: error.status,
        })
      } else {
        console.log('[useAuth] ✅ Sign in successful:', data.user ? `User ID: ${data.user.id}` : 'No user data')
      }
      return { data, error }
    } else {
      // Username login - look up email from profile
      // Note: We'll need to store email in profiles for this to work
      // For now, we'll query the profile and use a database function or stored email
      console.log('[useAuth] 🔍 Looking up profile for username:', emailOrUsername)
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, email')
        .eq('username', emailOrUsername.trim().toLowerCase())
        .single()
      
      if (profileError || !profile) {
        console.error('[useAuth] ❌ Username not found:', profileError)
        return { 
          data: null, 
          error: { 
            message: 'Username not found', 
            status: 404,
            name: 'AuthApiError'
          } as any 
        }
      }
      
      // Check if profile has email stored (we'll add this during signup)
      if (!profile.email) {
        console.error('[useAuth] ❌ Profile found but no email stored')
        return { 
          data: null, 
          error: { 
            message: 'Could not find account email. Please use your email to log in.', 
            status: 404,
            name: 'AuthApiError'
          } as any 
        }
      }
      
      // Sign in with the found email
      const { data, error } = await supabase.auth.signInWithPassword({ 
        email: profile.email, 
        password 
      })
      if (error) {
        console.error('[useAuth] ❌ Sign in failed:', error)
        console.error('[useAuth] Error details:', {
          message: error.message,
          status: error.status,
        })
      } else {
        console.log('[useAuth] ✅ Sign in successful:', data.user ? `User ID: ${data.user.id}` : 'No user data')
      }
      return { data, error }
    }
  }

  const signOut = async () => {
    console.log('[useAuth] 🚪 Signing out user')
    const { error } = await supabase.auth.signOut()
    if (error) {
      console.error('[useAuth] ❌ Sign out failed:', error)
      console.error('[useAuth] Error details:', {
        message: error.message,
        status: error.status,
      })
    } else {
      console.log('[useAuth] ✅ Sign out successful')
    }
    return { error }
  }

  return { user, loading, signUp, signIn, signOut }
}

