import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

console.log('[Supabase Client] Initializing...')
console.log('[Supabase Client] URL present:', !!supabaseUrl)
console.log('[Supabase Client] Anon Key present:', !!supabaseAnonKey)

if (!supabaseUrl || !supabaseAnonKey) {
  const missing = []
  if (!supabaseUrl) missing.push('VITE_SUPABASE_URL')
  if (!supabaseAnonKey) missing.push('VITE_SUPABASE_ANON_KEY')
  console.error('[Supabase Client] ❌ Missing environment variables:', missing.join(', '))
  throw new Error(`Missing Supabase environment variables: ${missing.join(', ')}`)
}

console.log('[Supabase Client] ✅ Environment variables loaded')
console.log('[Supabase Client] URL:', supabaseUrl.substring(0, 30) + '...')

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Test connection on initialization
supabase
  .from('profiles')
  .select('count', { count: 'exact', head: true })
  .then(({ data, error }) => {
    if (error) {
      console.error('[Supabase Client] ❌ Connection test failed:', error)
      console.error('[Supabase Client] Error details:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      })
    } else {
      console.log('[Supabase Client] ✅ Connection successful! Database is reachable.')
    }
  })
  .catch((err) => {
    console.error('[Supabase Client] ❌ Connection test exception:', err)
  })

