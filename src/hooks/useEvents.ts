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
      setLoading(true)
      const { data, error: fetchError } = await supabase
        .from('events')
        .select('*')
        .order('event_date', { ascending: false })

      if (fetchError) throw fetchError

      setEvents((data as Event[]) || [])
      setError(null)
    } catch (err) {
      setError(err as Error)
      console.error('Error fetching events:', err)
    } finally {
      setLoading(false)
    }
  }

  return { events, loading, error, refetch: fetchEvents }
}

