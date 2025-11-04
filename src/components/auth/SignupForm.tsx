import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabaseClient'

interface SignupFormProps {
  onSuccess?: () => void
  onSwitchToLogin?: () => void
}

export function SignupForm({ onSuccess, onSwitchToLogin }: SignupFormProps) {
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle')
  const usernameCheckTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Real-time username validation
  useEffect(() => {
    // Clear previous timeout
    if (usernameCheckTimeoutRef.current) {
      clearTimeout(usernameCheckTimeoutRef.current)
    }

    const trimmedUsername = username.trim()
    
    // Reset status if empty
    if (!trimmedUsername) {
      setUsernameStatus('idle')
      return
    }

    // Validate format first
    const usernameRegex = /^[a-zA-Z0-9_-]{3,20}$/
    if (!usernameRegex.test(trimmedUsername)) {
      setUsernameStatus('invalid')
      return
    }

    // Debounce the API check
    setUsernameStatus('checking')
    usernameCheckTimeoutRef.current = setTimeout(async () => {
      try {
        const { data: existingProfile, error: checkError } = await supabase
          .from('profiles')
          .select('id')
          .eq('username', trimmedUsername.toLowerCase())
          .maybeSingle()

        if (checkError && checkError.code !== 'PGRST116') {
          // PGRST116 means no rows found, which is what we want
          console.error('[SignupForm] ❌ Error checking username:', checkError)
          setUsernameStatus('idle')
          return
        }

        if (existingProfile) {
          setUsernameStatus('taken')
        } else {
          setUsernameStatus('available')
        }
      } catch (err) {
        console.error('[SignupForm] ❌ Username check error:', err)
        setUsernameStatus('idle')
      }
    }, 500) // 500ms debounce

    return () => {
      if (usernameCheckTimeoutRef.current) {
        clearTimeout(usernameCheckTimeoutRef.current)
      }
    }
  }, [username])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Step 1: Client-side validation
    const trimmedUsername = username.trim()
    const trimmedEmail = email.trim().toLowerCase()

    // Validate username
    if (!trimmedUsername) {
      setError('Username is required')
      return
    }

    const usernameRegex = /^[a-zA-Z0-9_-]{3,20}$/
    if (!usernameRegex.test(trimmedUsername)) {
      setError('Username must be 3-20 characters and contain only letters, numbers, underscores, or hyphens')
      return
    }

    // Check username status
    if (usernameStatus === 'taken') {
      setError('Username is already taken. Please choose another.')
      return
    }

    if (usernameStatus === 'checking') {
      setError('Please wait while we check username availability...')
      return
    }

    // Validate email
    if (!trimmedEmail) {
      setError('Email is required')
      return
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(trimmedEmail)) {
      setError('Please enter a valid email address')
      return
    }

    // Validate password
    if (!password) {
      setError('Password is required')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    // Validate password confirmation
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)

    try {
      // Step 2: Create auth user in Supabase FIRST
      console.log('[SignupForm] 🔐 Step 1: Creating auth user...')
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: trimmedEmail,
        password: password,
        options: {
          emailRedirectTo: undefined,
          data: {
            username: trimmedUsername,
          },
        },
      })

      if (authError) {
        console.error('[SignupForm] ❌ Auth signup failed:', authError)
        if (authError.message.includes('already registered')) {
          throw new Error('This email is already registered. Please sign in instead.')
        }
        throw new Error(authError.message || 'Failed to create account. Please try again.')
      }

      if (!authData.user) {
        throw new Error('Account creation failed. No user data returned.')
      }

      console.log('[SignupForm] ✅ Auth user created:', authData.user.id)

      // Step 3: Check if profile already exists (might exist from previous failed attempt)
      console.log('[SignupForm] 🔍 Step 2: Checking if profile already exists...')
      const { data: existingProfile, error: checkError } = await supabase
        .from('profiles')
        .select('id, username')
        .eq('id', authData.user.id)
        .maybeSingle()

      if (checkError && checkError.code !== 'PGRST116') {
        console.error('[SignupForm] ❌ Error checking existing profile:', checkError)
        throw new Error('Failed to check profile. Please try again.')
      }

      // Step 4: Create or update profile entry
      console.log('[SignupForm] 👤 Step 3: Creating/updating profile...')
      
      if (existingProfile) {
        // Profile already exists, update it with the new username
        console.log('[SignupForm] 📝 Profile exists, updating username...')
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .update({
            username: trimmedUsername.toLowerCase(),
            email: trimmedEmail,
          })
          .eq('id', authData.user.id)
          .select()
          .single()

        if (profileError) {
          console.error('[SignupForm] ❌ Profile update failed:', profileError)
          // Check if it's a username conflict
          if (profileError.code === '23505' && profileError.message.includes('username')) {
            throw new Error('Username is already taken. Please choose another.')
          }
          throw new Error(profileError.message || 'Failed to update profile. Please try again.')
        }

        if (!profileData) {
          throw new Error('Profile update failed. No data returned.')
        }

        console.log('[SignupForm] ✅ Profile updated:', profileData.id)
      } else {
        // Profile doesn't exist, create it
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: authData.user.id,
            username: trimmedUsername.toLowerCase(),
            email: trimmedEmail,
            full_name: null,
            bio: null,
            city: null,
            country: null,
            avatar_url: null,
          })
          .select()
          .single()

        if (profileError) {
          console.error('[SignupForm] ❌ Profile creation failed:', profileError)
          
          // Check error type
          if (profileError.code === '23505') {
            // Check if it's a username conflict or primary key conflict
            if (profileError.message.includes('username')) {
              throw new Error('Username is already taken. Please choose another.')
            } else {
              // Primary key conflict - profile already exists, try to update instead
              console.log('[SignupForm] 🔄 Profile exists (primary key conflict), updating...')
              const { data: updatedProfile, error: updateError } = await supabase
                .from('profiles')
                .update({
                  username: trimmedUsername.toLowerCase(),
                  email: trimmedEmail,
                })
                .eq('id', authData.user.id)
                .select()
                .single()

              if (updateError) {
                throw new Error(updateError.message || 'Failed to create profile. Please try again.')
              }

              console.log('[SignupForm] ✅ Profile updated after conflict:', updatedProfile?.id)
              onSuccess?.()
              setLoading(false)
              return
            }
          }
          if (profileError.code === '23503') {
            throw new Error('Failed to create profile. Please contact support.')
          }
          throw new Error(profileError.message || 'Failed to create profile. Please try again.')
        }

        if (!profileData) {
          throw new Error('Profile creation failed. No data returned.')
        }

        console.log('[SignupForm] ✅ Profile created:', profileData.id)
      }

      console.log('[SignupForm] ✅ Sign up and profile creation successful!')

      // Step 5: Success - trigger callback
      onSuccess?.()
    } catch (err: any) {
      console.error('[SignupForm] ❌ Sign up error:', err)
      setError(err.message || 'Failed to sign up. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-md mx-auto bg-gray-50 p-8 rounded-lg shadow-sm border border-gray-300">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Sign Up</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}
        <div>
          <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
            Username <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className={`w-full px-4 py-2 bg-white border rounded-md focus:ring-2 focus:border-gray-500 text-gray-900 ${
                usernameStatus === 'available' 
                  ? 'border-green-500 focus:ring-green-500' 
                  : usernameStatus === 'taken' || usernameStatus === 'invalid'
                  ? 'border-red-500 focus:ring-red-500'
                  : 'border-gray-300 focus:ring-gray-500'
              }`}
              placeholder="pedroNelGomez"
              pattern="[a-zA-Z0-9_-]{3,20}"
            />
            {usernameStatus === 'checking' && (
              <span className="absolute right-3 top-2.5 text-xs text-gray-500">Checking...</span>
            )}
            {usernameStatus === 'available' && (
              <span className="absolute right-3 top-2.5 text-xs text-green-600">✓ Available</span>
            )}
            {usernameStatus === 'taken' && (
              <span className="absolute right-3 top-2.5 text-xs text-red-600">✗ Taken</span>
            )}
            {usernameStatus === 'invalid' && username.trim() && (
              <span className="absolute right-3 top-2.5 text-xs text-red-600">Invalid format</span>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {usernameStatus === 'invalid' && username.trim()
              ? 'Username must be 3-20 characters and contain only letters, numbers, underscores, or hyphens'
              : '3-20 characters, letters, numbers, underscores, or hyphens'}
          </p>
        </div>
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-4 py-2 bg-white border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-500 focus:border-gray-500 text-gray-900"
            placeholder="your@email.com"
          />
        </div>
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="w-full px-4 py-2 bg-white border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-500 focus:border-gray-500 text-gray-900"
            placeholder="••••••••"
          />
        </div>
        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
            Confirm Password
          </label>
          <input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            minLength={6}
            className="w-full px-4 py-2 bg-white border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-500 focus:border-gray-500 text-gray-900"
            placeholder="••••••••"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-gray-700 text-white py-2 px-4 rounded-md hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Creating account...' : 'Sign Up'}
        </button>
        {onSwitchToLogin && (
          <p className="text-center text-sm text-gray-600">
            Already have an account?{' '}
            <button
              type="button"
              onClick={onSwitchToLogin}
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              Login
            </button>
          </p>
        )}
      </form>
    </div>
  )
}

