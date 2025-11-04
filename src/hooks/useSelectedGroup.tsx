import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useGroups } from './useGroups'
import type { Group } from '@/lib/types'

interface SelectedGroupContextType {
  selectedGroup: Group | null
  setSelectedGroup: (group: Group | null) => void
  loading: boolean
}

const SelectedGroupContext = createContext<SelectedGroupContextType | undefined>(undefined)

const SELECTED_GROUP_STORAGE_KEY = 'usk-social-selected-group'

export function SelectedGroupProvider({ children }: { children: ReactNode }) {
  const { groups, loading: groupsLoading } = useGroups()
  const [selectedGroup, setSelectedGroupState] = useState<Group | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (groupsLoading) return

    // Try to load from localStorage first
    const storedGroupId = localStorage.getItem(SELECTED_GROUP_STORAGE_KEY)
    
    if (storedGroupId && groups.length > 0) {
      const storedGroup = groups.find(g => g.id === storedGroupId)
      if (storedGroup) {
        setSelectedGroupState(storedGroup)
        setLoading(false)
        return
      }
    }

    // Default to "USK Medellín" if available
    const defaultGroup = groups.find(g => 
      g.name.toLowerCase().includes('medellín') || 
      g.name.toLowerCase().includes('medellin')
    )

    if (defaultGroup) {
      setSelectedGroupState(defaultGroup)
      localStorage.setItem(SELECTED_GROUP_STORAGE_KEY, defaultGroup.id)
      setLoading(false)
    } else if (groups.length > 0) {
      // Fallback to first group if USK Medellín not found
      setSelectedGroupState(groups[0])
      localStorage.setItem(SELECTED_GROUP_STORAGE_KEY, groups[0].id)
      setLoading(false)
    } else {
      setLoading(false)
    }
  }, [groups, groupsLoading])

  const setSelectedGroup = (group: Group | null) => {
    setSelectedGroupState(group)
    if (group) {
      localStorage.setItem(SELECTED_GROUP_STORAGE_KEY, group.id)
    } else {
      localStorage.removeItem(SELECTED_GROUP_STORAGE_KEY)
    }
  }

  return (
    <SelectedGroupContext.Provider value={{ selectedGroup, setSelectedGroup, loading }}>
      {children}
    </SelectedGroupContext.Provider>
  )
}

export function useSelectedGroup() {
  const context = useContext(SelectedGroupContext)
  if (context === undefined) {
    throw new Error('useSelectedGroup must be used within a SelectedGroupProvider')
  }
  return context
}

