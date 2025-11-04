import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useSelectedGroup } from './useSelectedGroup'
import type { Event } from '@/lib/types'

export function useEvents() {
  const { selectedGroup } = useSelectedGroup()
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchEvents = useCallback(async () => {
    if (!selectedGroup) return

    try {
      console.log('[useEvents] 📅 Fetching events for group:', selectedGroup.id)
      setLoading(true)
      let query = supabase
        .from('events')
        .select('*')
        .eq('group_id', selectedGroup.id)
        .order('event_date', { ascending: false })

      const { data, error: fetchError } = await query

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
  }, [selectedGroup])

  useEffect(() => {
    if (selectedGroup) {
      fetchEvents()
    } else {
      setEvents([])
      setLoading(false)
    }
  }, [selectedGroup, fetchEvents])

  return { events, loading, error, refetch: fetchEvents }
}

