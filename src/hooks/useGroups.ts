import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import type { Group } from '@/lib/types'

export function useGroups() {
  const [groups, setGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    fetchGroups()
  }, [])

  const fetchGroups = async () => {
    try {
      console.log('[useGroups] 📋 Fetching groups...')
      setLoading(true)
      const { data, error: fetchError } = await supabase
        .from('groups')
        .select('*')
        .order('name', { ascending: true })

      if (fetchError) {
        console.error('[useGroups] ❌ Error fetching groups:', fetchError)
        console.error('[useGroups] Error details:', {
          message: fetchError.message,
          code: fetchError.code,
          details: fetchError.details,
          hint: fetchError.hint,
        })
        throw fetchError
      }

      console.log('[useGroups] ✅ Successfully fetched groups:', data?.length || 0, 'groups')
      setGroups((data as Group[]) || [])
      setError(null)
    } catch (err) {
      console.error('[useGroups] ❌ Exception fetching groups:', err)
      setError(err as Error)
    } finally {
      setLoading(false)
    }
  }

  return { groups, loading, error, refetch: fetchGroups }
}

