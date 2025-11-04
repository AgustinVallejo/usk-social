import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useSelectedGroup } from './useSelectedGroup'
import type { Sketch } from '@/lib/types'

export function useSketches(userId?: string) {
  const { selectedGroup } = useSelectedGroup()
  const [sketches, setSketches] = useState<Sketch[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchSketches = useCallback(async () => {
    // If fetching for a specific user, don't filter by group
    // (users should see all their sketches regardless of group)
    if (userId) {
      try {
        console.log('[useSketches] 📥 Fetching sketches for user:', userId)
        setLoading(true)
        const { data, error: fetchError } = await supabase
          .from('sketches')
          .select(`
            *,
            profiles:user_id (username, avatar_url),
            events:event_id (title, location_name, group_id)
          `)
          .eq('user_id', userId)
          .order('uploaded_at', { ascending: false })

        if (fetchError) {
          console.error('[useSketches] ❌ Error fetching sketches:', fetchError)
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
      return
    }

    // For general sketch fetching, filter by group
    if (!selectedGroup) {
      setSketches([])
      setLoading(false)
      return
    }

    try {
      console.log('[useSketches] 📥 Fetching sketches for group:', selectedGroup.id)
      setLoading(true)
      
      // Fetch sketches that either:
      // 1. Have no event_id (independent sketches)
      // 2. Belong to events with the selected group_id
      const { data, error: fetchError } = await supabase
        .from('sketches')
        .select(`
          *,
          profiles:user_id (username, avatar_url),
          events:event_id (title, location_name, group_id)
        `)
        .order('uploaded_at', { ascending: false })

      if (fetchError) {
        console.error('[useSketches] ❌ Error fetching sketches:', fetchError)
        throw fetchError
      }

      // Filter sketches: show independent sketches OR sketches from events in the selected group
      const filteredSketches = (data as Sketch[] || []).filter((sketch) => {
        // If sketch has no event, show it
        if (!sketch.event_id) return true
        
        // If sketch has an event, check if the event belongs to the selected group
        const event = sketch.events as any
        return event?.group_id === selectedGroup.id
      })

      console.log('[useSketches] ✅ Successfully fetched sketches:', filteredSketches.length, 'sketches')
      setSketches(filteredSketches)
      setError(null)
    } catch (err) {
      console.error('[useSketches] ❌ Exception fetching sketches:', err)
      setError(err as Error)
    } finally {
      setLoading(false)
    }
  }, [userId, selectedGroup])

  useEffect(() => {
    fetchSketches()
  }, [fetchSketches])

  return { sketches, loading, error, refetch: fetchSketches }
}

