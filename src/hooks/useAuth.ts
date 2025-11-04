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

  const signIn = async (email: string, password: string) => {
    console.log('[useAuth] 🔑 Signing in user with email:', email)
    
    const { data, error } = await supabase.auth.signInWithPassword({ 
      email: email.trim(), 
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
      // Clear localStorage on logout
      const USERNAME_STORAGE_KEY = 'usk_username'
      localStorage.removeItem(USERNAME_STORAGE_KEY)
      console.log('[useAuth] 💾 Cleared localStorage username')
    }
    return { error }
  }

  return { user, loading, signUp, signIn, signOut }
}

