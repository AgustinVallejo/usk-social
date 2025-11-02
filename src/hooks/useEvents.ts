import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import type { Event } from '@/lib/types'

export function useEvents() {
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    fetchEvents()
  }, [])

  const fetchEvents = async () => {
    try {
      console.log('[useEvents] 📅 Fetching events...')
      setLoading(true)
      const { data, error: fetchError } = await supabase
        .from('events')
        .select('*')
        .order('event_date', { ascending: false })

      if (fetchError) {
        console.error('[useEvents] ❌ Error fetching events:', fetchError)
        console.error('[useEvents] Error details:', {
          message: fetchError.message,
          code: fetchError.code,
          details: fetchError.details,
          hint: fetchError.hint,
        })
        throw fetchError
      }

      console.log('[useEvents] ✅ Successfully fetched events:', data?.length || 0, 'events')
      setEvents((data as Event[]) || [])
      setError(null)
    } catch (err) {
      console.error('[useEvents] ❌ Exception fetching events:', err)
      setError(err as Error)
    } finally {
      setLoading(false)
    }
  }

  return { events, loading, error, refetch: fetchEvents }
}

