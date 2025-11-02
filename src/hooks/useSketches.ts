import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import type { Sketch } from '@/lib/types'

export function useSketches(userId?: string) {
  const [sketches, setSketches] = useState<Sketch[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    fetchSketches()
  }, [userId])

  const fetchSketches = async () => {
    try {
      console.log('[useSketches] 📥 Fetching sketches...', userId ? `for user: ${userId}` : 'for all users')
      setLoading(true)
      let query = supabase
        .from('sketches')
        .select(`
          *,
          profiles:user_id (username, avatar_url),
          events:event_id (title, location_name)
        `)
        .order('uploaded_at', { ascending: false })

      if (userId) {
        query = query.eq('user_id', userId)
      }

      const { data, error: fetchError } = await query

      if (fetchError) {
        console.error('[useSketches] ❌ Error fetching sketches:', fetchError)
        console.error('[useSketches] Error details:', {
          message: fetchError.message,
          code: fetchError.code,
          details: fetchError.details,
          hint: fetchError.hint,
        })
        throw fetchError
      }

      console.log('[useSketches] ✅ Successfully fetched sketches:', data?.length || 0, 'sketches')
      setSketches((data as Sketch[]) || [])
      setError(null)
    } catch (err) {
      console.error('[useSketches] ❌ Exception fetching sketches:', err)
      setError(err as Error)
    } finally {
      setLoading(false)
    }
  }

  return { sketches, loading, error, refetch: fetchSketches }
}

