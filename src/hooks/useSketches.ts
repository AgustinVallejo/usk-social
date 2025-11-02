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

      if (fetchError) throw fetchError

      setSketches((data as Sketch[]) || [])
      setError(null)
    } catch (err) {
      setError(err as Error)
      console.error('Error fetching sketches:', err)
    } finally {
      setLoading(false)
    }
  }

  return { sketches, loading, error, refetch: fetchSketches }
}

