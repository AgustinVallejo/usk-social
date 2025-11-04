import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabaseClient'

const USERNAME_STORAGE_KEY = 'usk_username'

interface LoginFormProps {
  onSuccess?: () => void
  onSwitchToSignup?: () => void
}

export function LoginForm({ onSuccess, onSwitchToSignup }: LoginFormProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const { signIn } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      console.log('[LoginForm] 🔑 Attempting sign in...')
      const { data, error } = await signIn(email, password)
      if (error) {
        console.error('[LoginForm] ❌ Sign in failed:', error)
        throw error
      }

      if (!data.user) {
        throw new Error('Sign in succeeded but no user data returned')
      }

      console.log('[LoginForm] ✅ Sign in successful, fetching profile...')

      // Fetch the user's profile to get their username
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', data.user.id)
        .maybeSingle()

      if (profileError) {
        console.error('[LoginForm] ⚠️ Error fetching profile (non-fatal):', profileError)
      }

      if (profile?.username) {
        // Update localStorage with the authenticated user's username
        console.log('[LoginForm] 💾 Updating localStorage with username:', profile.username)
        localStorage.setItem(USERNAME_STORAGE_KEY, profile.username)
      } else {
        console.log('[LoginForm] ⚠️ No profile found for user, clearing localStorage')
        localStorage.removeItem(USERNAME_STORAGE_KEY)
      }

      console.log('[LoginForm] ✅ Login complete')
      onSuccess?.()
    } catch (err: any) {
      console.error('[LoginForm] ❌ Sign in error:', err)
      setError(err.message || 'Failed to sign in')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-md mx-auto bg-gray-50 p-8 rounded-lg shadow-sm border border-gray-300">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Login</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}
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
            className="w-full px-4 py-2 bg-white border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-500 focus:border-gray-500 text-gray-900"
            placeholder="••••••••"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-gray-700 text-white py-2 px-4 rounded-md hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
        {onSwitchToSignup && (
          <p className="text-center text-sm text-gray-600">
            Don't have an account?{' '}
            <button
              type="button"
              onClick={onSwitchToSignup}
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              Sign up
            </button>
          </p>
        )}
      </form>
    </div>
  )
}

